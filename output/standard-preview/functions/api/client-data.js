import { hasOperator } from '../_shared/access.js';
import { getClientIntegrationStatuses } from "../_shared/integrations.js";

/**
 * Client portal delivery data: content pipeline, call notes, delivered assets.
 *
 * GET  /api/client-data?client=<id>
 *   Header: x-portal-token (client path — token decides the client, ?client= ignored)
 *        or x-admin-key (operator path — any client via ?client=)
 *   -> { ok:true, client, content:[...], calls:[...], assets:[...] }
 *
 * POST /api/client-data   body: { client, type: "content"|"call"|"asset", item:{...} }
 *   Admin only. Inserts, or updates when item.id is present.
 *
 * DELETE /api/client-data  body: { client, type, id }
 *   Admin only. Deletes only when id AND client both match.
 *
 * Pipeline (deals/revenue) is deliberately absent — that data lives in a
 * different system and the portal's Pipeline tab stays a pending state.
 */

const CONTENT_STAGES = new Set(["production", "scheduled", "published"]);
const ASSET_KINDS = new Set(["script", "hook", "swipe", "doc", "other"]);

const FIELDS = {
  content: {
    table: "content_items",
    columns: ["title", "stage", "platform", "url", "notes", "scheduled_for"],
    timestampColumn: "updated_at",
    required: ["title"],
    normalize(item) {
      return {
        title: str(item.title),
        stage: CONTENT_STAGES.has(item.stage) ? item.stage : "production",
        platform: strOrNull(item.platform),
        url: strOrNull(item.url),
        notes: strOrNull(item.notes),
        scheduled_for: strOrNull(item.scheduled_for),
      };
    },
  },
  call: {
    table: "call_notes",
    columns: ["call_date", "title", "summary", "decisions", "actions", "recording_url"],
    timestampColumn: "created_at",
    required: [],
    normalize(item) {
      return {
        call_date: strOrNull(item.call_date),
        title: strOrNull(item.title),
        summary: strOrNull(item.summary),
        decisions: strOrNull(item.decisions),
        actions: strOrNull(item.actions),
        recording_url: strOrNull(item.recording_url),
      };
    },
  },
  asset: {
    table: "client_assets",
    columns: ["label", "kind", "url", "notes"],
    timestampColumn: "created_at",
    required: ["label"],
    normalize(item) {
      return {
        label: str(item.label),
        kind: ASSET_KINDS.has(item.kind) ? item.kind : "other",
        url: strOrNull(item.url),
        notes: strOrNull(item.notes),
      };
    },
  },
};

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const access = await resolveAccess(request, env, url);
  if (access.error) return access.error;
  const client = access.client;

  const [content, calls, assets, integrations] = await Promise.all([
    safeAll(
      env.DB.prepare(
        `SELECT id,client,title,stage,platform,url,notes,scheduled_for,updated_at
           FROM content_items WHERE client=?
           ORDER BY CASE stage WHEN 'production' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'published' THEN 2 ELSE 3 END,
                    updated_at DESC`,
      ).bind(client),
    ),
    safeAll(
      env.DB.prepare(
        `SELECT id,client,call_date,title,summary,decisions,actions,recording_url,created_at
           FROM call_notes WHERE client=? ORDER BY call_date DESC, created_at DESC`,
      ).bind(client),
    ),
    safeAll(
      env.DB.prepare(
        `SELECT id,client,label,kind,url,notes,created_at
           FROM client_assets WHERE client=? ORDER BY created_at DESC`,
      ).bind(client),
    ),
    getClientIntegrationStatuses(env, client).catch(() => []),
  ]);

  return json({
    ok: true,
    client,
    content: content.rows,
    calls: calls.rows,
    assets: assets.rows,
    integrations,
    pending: content.pending || calls.pending || assets.pending,
  });
}

export async function onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client || "");
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);

  const type = body.type;
  const spec = FIELDS[type];
  if (!spec) return json({ ok: false, error: `unknown type: ${type}` }, 422);

  const item = body.item && typeof body.item === "object" ? body.item : {};
  const values = spec.normalize(item);
  for (const field of spec.required) {
    if (!values[field]) return json({ ok: false, error: `${field} is required` }, 422);
  }

  const now = new Date().toISOString();
  const id = item.id ? Number(item.id) : null;

  if (id) {
    const setClause = spec.columns.map((col) => `${col}=?`).join(",");
    const result = await env.DB.prepare(
      `UPDATE ${spec.table} SET ${setClause}, ${spec.timestampColumn}=? WHERE id=? AND client=?`,
    ).bind(...spec.columns.map((col) => values[col]), now, id, client).run();

    if (!result.meta?.changes) {
      return json({ ok: false, error: "not found for this client" }, 404);
    }
    return json({ ok: true, id, updated: true });
  }

  const insertColumns = ["client", ...spec.columns, spec.timestampColumn];
  const placeholders = insertColumns.map(() => "?").join(",");
  const result = await env.DB.prepare(
    `INSERT INTO ${spec.table} (${insertColumns.join(",")}) VALUES (${placeholders})`,
  ).bind(client, ...spec.columns.map((col) => values[col]), now).run();

  return json({ ok: true, id: result.meta?.last_row_id ?? null, created: true });
}

export async function onRequestDelete({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client || "");
  const type = body.type;
  const id = Number(body.id);
  const spec = FIELDS[type];
  if (!client || !spec || !id) {
    return json({ ok: false, error: "client, type, and id are required" }, 422);
  }

  const result = await env.DB.prepare(
    `DELETE FROM ${spec.table} WHERE id=? AND client=?`,
  ).bind(id, client).run();

  if (!result.meta?.changes) {
    return json({ ok: false, error: "not found for this client" }, 404);
  }
  return json({ ok: true, deleted: true });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

/**
 * Same dual-auth pattern as functions/leads.js:
 * - x-portal-token: the token itself decides the client; ?client= is ignored.
 * - x-admin-key: operator, any client via ?client=.
 */
async function resolveAccess(request, env, url) {
  const portalToken = request.headers.get("x-portal-token");
  if (portalToken) {
    const hash = await sha256Hex(portalToken.trim());
    const row = await env.DB.prepare(
      "SELECT client FROM client_config WHERE portal_token_hash=?",
    ).bind(hash).first();
    if (!row) {
      return { error: json({ ok: false, error: "invalid or expired portal link" }, 401) };
    }
    return { client: cleanId(row.client), scope: "client" };
  }

  if (!hasOperator(request, env)) {
    return { error: json({ ok: false, error: "unauthorized" }, 401) };
  }
  return { client: cleanId(url.searchParams.get("client") || "unknown"), scope: "admin" };
}

function checkAdmin(request, env) {
  if (!hasOperator(request, env)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}

async function safeAll(stmt) {
  try {
    const result = await stmt.all();
    return { rows: result.results || [], pending: false };
  } catch (e) {
    return { rows: [], pending: true };
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function str(value) {
  return String(value ?? "").trim();
}

function strOrNull(value) {
  const s = str(value);
  return s || null;
}

function cleanId(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || "unknown";
}

function json(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}
