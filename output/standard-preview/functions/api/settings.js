/**
 * Per-client integration settings.
 *
 * GET/POST/DELETE /api/settings?client=<client-id>
 * Header: x-admin-key: <ADMIN_KEY>
 */

import { checkAdmin, cleanId, json } from "../_shared/common.js";
import { deleteClientMedia } from "../_shared/media-storage.js";

const CLIENT_TABLES = [
  ["client_config", "client"],
  ["client_auth", "client_id"],
  ["client_sessions", "client_id"],
  ["client_setup_tokens", "client_id"],
  ["client_email_codes", "client_id"],
  ["client_dashboard_content", "client_id"],
  ["studio_sequences", "client_id"],
  ["studio_carousels", "client_id"],
  ["sequence_variants", "client_id"],
  ["sequence_log", "client_id"],
  ["account_snapshots", "client_id"],
  ["client_brain", "client_id"],
  ["proof_items", "client_id"],
  ["content_items", "client"],
  ["call_notes", "client"],
  ["client_assets", "client"],
  ["payments", "client"],
  ["integrations", "client_id"],
  ["integration_events", "client"],
  ["delivery_failures", "client"],
  ["email_drafts", "client"],
  ["page_events", "client"],
];

export async function onRequestGet({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const client = cleanId(url.searchParams.get("client"), "unknown");
  const row = await env.DB.prepare(
    `SELECT client,client_name,wistia_media_id,typeform_url,typeform_webhook_secret,
            kit_tag_id,kit_api_key,allowed_origin,proof_images_json,
            template_variant,page_content_json,updated_at
       FROM client_config WHERE client=?`,
  ).bind(client).first();
  const authRow = await env.DB.prepare(
    `SELECT email, pass_hash, updated_at
       FROM client_auth
      WHERE client_id=?`,
  ).bind(client).first();
  const dashboardRows = await env.DB.prepare(
    `SELECT section, json, updated_at
       FROM client_dashboard_content
      WHERE client_id=?`,
  ).bind(client).all();

  if (!row) {
    return json({
      ok: true,
      client,
      config: null,
      dashboard_auth: authRow ? {
        email: authRow.email || "",
        has_password: Boolean(authRow.pass_hash),
        updated_at: authRow.updated_at || null,
        email_delivery_available: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
        email_delivery_enabled: Boolean(env.RESEND_API_KEY),
        email_delivery_hint: env.RESEND_API_KEY
          ? (env.EMAIL_FROM
            ? `Setup links can be emailed from ${env.EMAIL_FROM}.`
            : "RESEND_API_KEY is set but EMAIL_FROM is missing.")
          : "Setup-link emails are off until RESEND_API_KEY is set.",
      } : null,
      dashboard_content: parseDashboardRows(dashboardRows.results || []),
    });
  }
  row.kit_api_key_set = Boolean(row.kit_api_key);
  row.typeform_webhook_secret_set = Boolean(row.typeform_webhook_secret);
  row.proof_images = parseJson(row.proof_images_json);
  row.page_content = parseJson(row.page_content_json);
  row.template_variant = row.template_variant || "canonical";
  delete row.kit_api_key;
  delete row.typeform_webhook_secret;
  delete row.proof_images_json;
  delete row.page_content_json;
  return json({
    ok: true,
    client,
    config: row,
    dashboard_auth: authRow ? {
      email: authRow.email || "",
      has_password: Boolean(authRow.pass_hash),
      updated_at: authRow.updated_at || null,
      email_delivery_available: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
      email_delivery_enabled: Boolean(env.RESEND_API_KEY),
      email_delivery_hint: env.RESEND_API_KEY
        ? (env.EMAIL_FROM
          ? `Setup links can be emailed from ${env.EMAIL_FROM}.`
          : "RESEND_API_KEY is set but EMAIL_FROM is missing.")
        : "Setup-link emails are off until RESEND_API_KEY is set.",
    } : null,
    dashboard_content: parseDashboardRows(dashboardRows.results || []),
  });
}

export async function onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client, "unknown");
  if (client === "unknown") return json({ ok: false, error: "valid client id required" }, 422);

  const existing = await env.DB.prepare(
    `SELECT client_name,wistia_media_id,typeform_url,typeform_webhook_secret,
            kit_tag_id,kit_api_key,allowed_origin,proof_images_json,
            template_variant,page_content_json
       FROM client_config WHERE client=?`,
  ).bind(client).first();
  const kitKey = body.kit_api_key || existing?.kit_api_key || null;
  const webhookSecret =
    body.typeform_webhook_secret || existing?.typeform_webhook_secret || null;

  const proofImages = hasOwn(body, "proof_images") && body.proof_images && typeof body.proof_images === "object"
    ? JSON.stringify(
        Object.fromEntries(
          Object.entries(body.proof_images).filter(([, url]) => url && String(url).trim()),
        ),
      )
    : existing?.proof_images_json || null;

  const pageContent = hasOwn(body, "page_content") && body.page_content && typeof body.page_content === "object"
    ? JSON.stringify(
        Object.fromEntries(
          Object.entries(body.page_content).filter(([, val]) => val != null && String(val).trim()),
        ),
      )
    : existing?.page_content_json || null;

  const templateVariant = hasOwn(body, "template_variant")
    ? (body.template_variant === "variant-02" ? "variant-02" : "canonical")
    : existing?.template_variant || "canonical";
  const keep = (key, fallback = null) => hasOwn(body, key) ? (body[key] || null) : (existing?.[key] ?? fallback);

  await env.DB.prepare(
    `INSERT INTO client_config (
      client,client_name,wistia_media_id,typeform_url,typeform_webhook_secret,
      kit_tag_id,kit_api_key,allowed_origin,proof_images_json,
      template_variant,page_content_json,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(client) DO UPDATE SET
      client_name=excluded.client_name,
      wistia_media_id=excluded.wistia_media_id,
      typeform_url=excluded.typeform_url,
      typeform_webhook_secret=excluded.typeform_webhook_secret,
      kit_tag_id=excluded.kit_tag_id,
      kit_api_key=excluded.kit_api_key,
      allowed_origin=excluded.allowed_origin,
      proof_images_json=excluded.proof_images_json,
      template_variant=excluded.template_variant,
      page_content_json=excluded.page_content_json,
      updated_at=excluded.updated_at`,
  ).bind(
    client,
    keep("client_name", client) || client,
    keep("wistia_media_id"),
    keep("typeform_url"),
    webhookSecret,
    keep("kit_tag_id"),
    kitKey,
    keep("allowed_origin"),
    proofImages,
    templateVariant,
    pageContent,
    new Date().toISOString(),
  ).run();

  if (hasOwn(body, "dashboard_content") && body.dashboard_content && typeof body.dashboard_content === "object") {
    const now = new Date().toISOString();
    const sectionStatements = [];
    for (const section of ["plans", "todos", "team", "momentum"]) {
      if (!hasOwn(body.dashboard_content, section)) continue;
      const value = body.dashboard_content[section];
      if (value == null) {
        sectionStatements.push(
          env.DB.prepare(
            "DELETE FROM client_dashboard_content WHERE client_id=? AND section=?",
          ).bind(client, section),
        );
        continue;
      }
      sectionStatements.push(
        env.DB.prepare(
          `INSERT INTO client_dashboard_content (client_id, section, json, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(client_id, section) DO UPDATE SET
             json=excluded.json,
             updated_at=excluded.updated_at`,
        ).bind(client, section, JSON.stringify(value), now),
      );
    }
    if (sectionStatements.length) await env.DB.batch(sectionStatements);
  }

  return json({
    ok: true,
    saved: true,
    webhook_url: `${new URL(request.url).origin}/event?client=${encodeURIComponent(client)}`,
  });
}

export async function onRequestDelete({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const client = cleanId(new URL(request.url).searchParams.get("client"), "unknown");
  const exists = await env.DB.prepare(
    "SELECT 1 AS found FROM client_config WHERE client=?",
  ).bind(client).first();

  if (!exists) return json({ ok: false, error: "client not found" }, 404);

  const mediaDeleted = await deleteClientMedia(env, client);
  const proofMediaDeleted = await deleteClientProofMedia(env, client);
  const results = await env.DB.batch(
    CLIENT_TABLES.map(([table, column]) =>
      env.DB.prepare(`DELETE FROM ${table} WHERE ${column}=?`).bind(client),
    ),
  );
  const deleted = Object.fromEntries(
    CLIENT_TABLES.map(([table], index) => [table, Number(results[index]?.meta?.changes || 0)]),
  );
  deleted.media = mediaDeleted;
  deleted.proof_media = proofMediaDeleted;

  return json({ ok: true, deleted });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

function parseJson(value) {
  if (!value) return {};
  try { return JSON.parse(value); } catch { return {}; }
}

function parseDashboardRows(rows) {
  const content = {};
  for (const row of rows) {
    if (!row?.section) continue;
    try {
      content[row.section] = JSON.parse(row.json);
    } catch {
      content[row.section] = null;
    }
  }
  return content;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

export async function deleteClientProofMedia(env, client) {
  if (!env.MEDIA) return 0;
  const prefix = `${client}/`;
  let cursor;
  let deleted = 0;

  do {
    const page = await env.MEDIA.list({ prefix, ...(cursor ? { cursor } : {}) });
    const keys = (page?.objects || []).map((object) => object?.key).filter(Boolean);
    if (keys.length) {
      await env.MEDIA.delete(keys);
      deleted += keys.length;
    }
    cursor = page?.truncated ? page.cursor : undefined;
  } while (cursor);

  return deleted;
}
