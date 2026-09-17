import { withOperator } from '../_shared/access.js';
import { hasOperator } from '../_shared/access.js';
import { checkAdmin, cleanId, json, parseJson } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

async function handle_onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const isAdmin = hasOperator(request, env);
  if (isAdmin && url.searchParams.get("status") === "review") {
    const rows = await env.DB.prepare(
      `SELECT id, client_id, type, intent, topic, goal, trigger_word, params_json, output_json,
              manual_prompt, status, review_note, created_at, updated_at
         FROM studio_sequences
        WHERE status='review'
        ORDER BY updated_at DESC, id DESC`,
    ).all();
    return json({ ok: true, rows: (rows.results || []).map(serializeRow) });
  }

  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: true,
    allowImpersonated: true,
  });
  if (access.error) return access.error;

  const client = cleanId(access.client);
  const rows = await env.DB.prepare(
    `SELECT id, client_id, type, intent, topic, goal, trigger_word, params_json, output_json,
            manual_prompt, status, review_note, created_at, updated_at
       FROM studio_sequences
      WHERE client_id=?
      ORDER BY updated_at DESC, id DESC`,
  ).bind(client).all();
  return json({ ok: true, rows: (rows.results || []).map(serializeRow) });
}

async function handle_onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim().toLowerCase();
  const id = Number(body.id || 0);

  if (action === "approve" || action === "reject") {
    const auth = checkAdmin(request, env);
    if (auth) return auth;
    if (!id) return json({ ok: false, error: "sequence id is required" }, 422);
    const note = String(body.note || "").trim();
    if (action === "reject" && !note) {
      return json({ ok: false, error: "review note is required when rejecting" }, 422);
    }
    const status = action === "approve" ? "approved" : "rejected";
    const result = await env.DB.prepare(
      `UPDATE studio_sequences
          SET status=?, review_note=?, updated_at=?
        WHERE id=?`,
    ).bind(status, note || null, new Date().toISOString(), id).run();
    if (!Number(result.meta?.changes || 0)) {
      return json({ ok: false, error: "sequence not found" }, 404);
    }
    return json({ ok: true, status });
  }

  const adminError = checkAdmin(request, env);
  const isAdmin = action === "attach-output" && !adminError;
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (!isAdmin && access.error) return access.error;
  if (!id) return json({ ok: false, error: "sequence id is required" }, 422);

  if (action === "attach-output" || action === "save-draft") {
    return attachOutput(env, body, id, isAdmin ? null : access, isAdmin, action === "save-draft");
  }

  const client = cleanId(access.client);

  const row = await env.DB.prepare(
    `SELECT id, client_id, status, output_json
       FROM studio_sequences
      WHERE id=?`,
  ).bind(id).first();
  if (!row || cleanId(row.client_id) !== client) {
    return json({ ok: false, error: "sequence not found" }, 404);
  }

  if (action === "submit-for-review") {
    if (row.status !== "draft" && row.status !== "rejected") {
      return json({ ok: false, error: "only draft or rejected sequences can be sent for review" }, 422);
    }
    const output = parseJson(row.output_json, {});
    if (output.template_id && (output.slides || []).some(slide =>
      /\[[^\]]+\]/.test([...(slide.text_pills || []), slide.headline || '', slide.body || '', slide.cta || ''].join(' ')))) {
      return json({ ok: false, error: "Replace the bracketed template prompts with your own copy before review." }, 422);
    }
    await env.DB.prepare(
      `UPDATE studio_sequences
          SET status='review', review_note=NULL, updated_at=?
        WHERE id=?`,
    ).bind(new Date().toISOString(), id).run();
    return json({ ok: true, status: "review" });
  }

  if (action === "delete") {
    if (row.status !== "draft") {
      return json({ ok: false, error: "only draft sequences can be deleted" }, 422);
    }
    await env.DB.prepare("DELETE FROM studio_sequences WHERE id=?").bind(id).run();
    return json({ ok: true, deleted: true });
  }

  return json({ ok: false, error: "unknown action" }, 422);
}

async function handle_onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

function serializeRow(row) {
  return {
    id: Number(row.id || 0),
    client_id: row.client_id,
    type: row.type || "",
    intent: row.intent || "",
    topic: row.topic || "",
    goal: row.goal || "",
    trigger_word: row.trigger_word || "",
    params: parseJson(row.params_json, {}),
    output: parseJson(row.output_json, null),
    manual_prompt: row.manual_prompt || "",
    status: row.status || "draft",
    review_note: row.review_note || "",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
  };
}

async function attachOutput(env, body, id, access, isAdmin, draftOnly = false) {
  const rawText = String(body.raw_text || "").trim();
  if (!rawText) return json({ ok: false, error: "raw_text is required" }, 422);

  const row = await env.DB.prepare(
    `SELECT id, client_id, status, output_json
       FROM studio_sequences
      WHERE id=?`,
  ).bind(id).first();
  if (!row) return json({ ok: false, error: "sequence not found" }, 404);

  if (!isAdmin) {
    if (cleanId(row.client_id) !== cleanId(access.client)) {
      return json({ ok: false, error: "sequence not found" }, 404);
    }
    if (row.status !== "draft" && row.status !== "rejected") {
      return json({ ok: false, error: "only draft or rejected sequences can be edited" }, 422);
    }
  }

  const parsed = parseAttachedOutput(rawText);
  const nextStatus = isAdmin ? (row.status || "draft") : draftOnly ? "draft" : "review";
  await env.DB.prepare(
    `UPDATE studio_sequences
        SET output_json=?, status=?, review_note=NULL, updated_at=?
      WHERE id=?`,
  ).bind(
    JSON.stringify(parsed),
    nextStatus,
    new Date().toISOString(),
    id,
  ).run();

  return json({ ok: true, status: nextStatus, output: parsed });
}

function parseAttachedOutput(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return { raw_text: "" };
  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (looksLikeSequenceOutput(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through to raw_text payload.
  }
  return { raw_text: text };
}

function looksLikeSequenceOutput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (!Array.isArray(value.slides) && typeof value.raw_text !== "string") return false;
  return true;
}


export const onRequestGet = withOperator(handle_onRequestGet);
export const onRequestPost = withOperator(handle_onRequestPost);
export const onRequestOptions = withOperator(handle_onRequestOptions);
