import { checkAdmin, cleanId, escapeHtml, json, nowIso, str, strOrNull } from "../_shared/common.js";
import { getIntegration, recordFailure, recordIntegrationEvent } from "../_shared/integrations.js";

const KIT_TAGS_URL = "https://api.kit.com/v4/tags";
const KIT_BROADCASTS_URL = "https://api.kit.com/v4/broadcasts";
const FAILURE_KIND = "kit_email_compose";

export async function onRequestGet({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const action = str(url.searchParams.get("action") || "drafts").toLowerCase();
  if (action === "drafts") return listDrafts(env, url.searchParams.get("client"));
  if (action !== "tags") return json({ ok: false, error: "unknown action" }, 422);

  const kit = await getIntegration(env, "operator", "", "kit");
  const apiKey = kit?.secrets?.api_key;
  if (!apiKey) {
    return json({
      ok: true,
      configured: false,
      api_key_set: false,
      tags: [],
      message: "Connect the operator Kit account in Integrations to load tags and send email.",
    });
  }

  try {
    const response = await fetch(`${KIT_TAGS_URL}?per_page=100`, {
      headers: { "X-Kit-Api-Key": apiKey },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({
        ok: false,
        configured: true,
        api_key_set: true,
        tags: [],
        error: `Kit tags request failed with status ${response.status}.`,
      }, 502);
    }

    const tags = Array.isArray(data.tags)
      ? data.tags.map((tag) => ({ id: String(tag.id), name: str(tag.name) || `Tag ${tag.id}` }))
      : [];
    return json({ ok: true, configured: true, api_key_set: true, tags });
  } catch (error) {
    return json({
      ok: false,
      configured: true,
      api_key_set: true,
      tags: [],
      error: `Kit tags request failed: ${error?.message || error}`,
    }, 502);
  }
}

export async function onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const action = str(url.searchParams.get("action") || body.action).toLowerCase();
  if (action !== "draft" && action !== "send") {
    return json({ ok: false, error: "action must be draft or send" }, 422);
  }

  const input = normalizeDraftInput(body);
  if (!input.subject) return json({ ok: false, error: "subject is required" }, 422);
  if (!input.body) return json({ ok: false, error: "body_html or body_text is required" }, 422);
  if (action === "send" && !input.tag_id) {
    return json({ ok: false, error: "tag_id is required to send" }, 422);
  }

  if (action === "draft") {
    const draft = await saveDraft(env, input, "draft", null);
    return json({ ok: true, sent: false, status: "draft", draft });
  }

  const kit = await getIntegration(env, "operator", "", "kit");
  const apiKey = kit?.secrets?.api_key;
  if (!apiKey) {
    const draft = await saveDraft(env, input, "draft", null);
    await recordFailure(
      env,
      input.client,
      FAILURE_KIND,
      "operator Kit integration not configured; email saved as draft",
      { skipDiscord: true },
    );
    return json({
      ok: true,
      sent: false,
      configured: false,
      api_key_set: false,
      status: "draft",
      message: "Kit is not connected. The email was saved as a draft for copy and paste.",
      draft,
    });
  }

  try {
    const sendAt = new Date(Date.now() + 60 * 1000).toISOString();
    const response = await fetch(KIT_BROADCASTS_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      // Kit creates the broadcast now and schedules it one minute ahead for the selected tag only.
      body: JSON.stringify(buildBroadcast(input, kit, sendAt)),
    });
    const data = await response.json().catch(() => ({}));
    const broadcastId = data?.broadcast?.id;
    if (!response.ok || !broadcastId) {
      const detail = `broadcast_${response.status}: ${summarize(data)}`;
      const draft = await saveDraft(env, input, "failed", null);
      await recordFailure(env, input.client, FAILURE_KIND, detail, { skipDiscord: true });
      return json({
        ok: false,
        sent: false,
        configured: true,
        api_key_set: true,
        status: "failed",
        error: "Kit rejected the broadcast. The email is stored below for copy and paste.",
        draft,
      }, 502);
    }

    const sentAt = nowIso();
    const draft = await saveDraft(env, input, "sent", sentAt);
    await recordIntegrationEvent(env, {
      provider: "kit",
      kind: "operator_email",
      client: input.client,
      externalId: String(broadcastId),
      payloadSummary: {
        subject: input.subject,
        tag_id: input.tag_id,
        send_at: sendAt,
      },
    });
    return json({
      ok: true,
      sent: true,
      configured: true,
      api_key_set: true,
      status: "sent",
      broadcast_id: broadcastId,
      send_at: sendAt,
      draft,
    });
  } catch (error) {
    const detail = `network_error: ${error?.message || error}`;
    const draft = await saveDraft(env, input, "failed", null);
    await recordFailure(env, input.client, FAILURE_KIND, detail, { skipDiscord: true });
    return json({
      ok: false,
      sent: false,
      configured: true,
      api_key_set: true,
      status: "failed",
      error: "Kit could not be reached. The email is stored below for copy and paste.",
      draft,
    }, 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

async function listDrafts(env, clientValue) {
  const client = cleanId(clientValue);
  const statement = client
    ? env.DB.prepare(
      `SELECT id, client, subject, body, tag_id, status, created_at, sent_at
         FROM email_drafts WHERE client=? ORDER BY created_at DESC, id DESC LIMIT 30`,
    ).bind(client)
    : env.DB.prepare(
      `SELECT id, client, subject, body, tag_id, status, created_at, sent_at
         FROM email_drafts ORDER BY created_at DESC, id DESC LIMIT 30`,
    );
  const result = await statement.all();
  return json({ ok: true, drafts: result.results || [] });
}

function normalizeDraftInput(body) {
  const bodyHtml = str(body.body_html);
  const bodyText = str(body.body_text);
  return {
    client: cleanId(body.client, "operator"),
    subject: str(body.subject).slice(0, 240),
    body: bodyHtml || bodyText,
    body_html: bodyHtml || textToHtml(bodyText),
    body_text: bodyText || null,
    tag_id: strOrNull(body.tag_id),
  };
}

function textToHtml(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function buildBroadcast(input, kit, sendAt) {
  return {
    content: input.body_html,
    description: `Pulsify operator email for ${input.client}`,
    public: false,
    published_at: nowIso(),
    subject: input.subject,
    send_at: sendAt,
    email_template_id: kit?.config?.email_template_id
      ? Number(kit.config.email_template_id)
      : undefined,
    email_address: kit?.config?.onboarding_sender_email || null,
    subscriber_filter: [
      {
        all: [{ type: "tag", ids: [input.tag_id] }],
        any: null,
        none: null,
      },
    ],
  };
}

async function saveDraft(env, input, status, sentAt) {
  const createdAt = nowIso();
  const result = await env.DB.prepare(
    `INSERT INTO email_drafts (client, subject, body, tag_id, status, created_at, sent_at)
     VALUES (?,?,?,?,?,?,?)`,
  ).bind(
    input.client,
    input.subject,
    input.body,
    input.tag_id,
    status,
    createdAt,
    sentAt,
  ).run();
  return {
    id: result.meta?.last_row_id ?? null,
    client: input.client,
    subject: input.subject,
    body: input.body,
    body_html: input.body_html,
    body_text: input.body_text,
    tag_id: input.tag_id,
    status,
    created_at: createdAt,
    sent_at: sentAt,
  };
}

function summarize(value) {
  try {
    return JSON.stringify(value).slice(0, 300);
  } catch {
    return String(value || "").slice(0, 300);
  }
}
