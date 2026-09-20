// Workspace archive. Archiving hides a workspace everywhere (lists, landing
// page, portal login) and freezes it; nothing is deleted. Every row that
// belongs to the workspace is exported first to R2 under
// archive/workspaces/<client>/<timestamp>.json so it can be inspected or
// restored later. Restore flips the status back; the export stays.
import { cleanId, nowIso, str } from "./common.js";

// Tables keyed by client, with the column that holds it. Discovered from the
// live schema at call time so new tables are never missed.
async function clientTables(env) {
  const rows = (await env.DB.prepare(
    "SELECT m.name AS tbl, p.name AS col FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%' AND m.name NOT LIKE '_cf%' AND p.name IN ('client_id','client') ORDER BY m.name",
  ).all()).results || [];
  const seen = new Map();
  for (const r of rows) if (!seen.has(r.tbl)) seen.set(r.tbl, r.col);
  return [...seen.entries()];
}

export async function exportWorkspace(env, clientId) {
  const client = cleanId(clientId);
  if (!client) throw new Error("valid client id required");
  const tables = await clientTables(env);
  const bundle = { client, exported_at: nowIso(), tables: {} };
  for (const [tbl, col] of tables) {
    const rows = (await env.DB.prepare(`SELECT * FROM ${tbl} WHERE ${col}=?`).bind(client).all()).results || [];
    if (rows.length) bundle.tables[tbl] = rows;
  }
  bundle.row_count = Object.values(bundle.tables).reduce((n, rows) => n + rows.length, 0);
  return bundle;
}

export async function archiveWorkspace(env, clientId, actor = "operator") {
  const client = cleanId(clientId);
  const config = await env.DB.prepare("SELECT client, client_name, status, page_active FROM client_config WHERE client=?").bind(client).first();
  if (!config) return { ok: false, error: "unknown client" };
  if (config.status === "archived") return { ok: true, already: true, client };
  if (!env.MEDIA) throw new Error("Archive storage is unavailable; workspace unchanged");
  const bundle = await exportWorkspace(env, client);
  const stamp = nowIso().replace(/[:.]/g, "-");
  const key = `archive/workspaces/${client}/${stamp}.json`;
  await env.MEDIA.put(key, JSON.stringify(bundle, null, 2), { httpMetadata: { contentType: "application/json" } });
  await env.DB.batch([
    env.DB.prepare("UPDATE client_config SET status='archived', page_active=0, portal_token_hash=NULL, updated_at=? WHERE client=?").bind(nowIso(), client),
    env.DB.prepare("DELETE FROM client_sessions WHERE client_id=?").bind(client),
    env.DB.prepare("DELETE FROM client_setup_tokens WHERE client_id=?").bind(client),
    env.DB.prepare("DELETE FROM impersonation_sessions WHERE client_id=?").bind(client),
    env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
      .bind(str(actor), "workspace-archived", client, JSON.stringify({ export_key: key, rows: bundle.row_count, previous_status: config.status, previous_page_active: config.page_active }), nowIso()),
  ]);
  return { ok: true, client, export_key: key, rows: bundle.row_count, bundle };
}

export async function restoreWorkspace(env, clientId, actor = "operator") {
  const client = cleanId(clientId);
  const config = await env.DB.prepare("SELECT client, status FROM client_config WHERE client=?").bind(client).first();
  if (!config) return { ok: false, error: "unknown client" };
  if (config.status !== "archived") return { ok: true, already: true, client };
  const event = await env.DB.prepare("SELECT detail FROM operator_events WHERE client=? AND action='workspace-archived' ORDER BY id DESC LIMIT 1").bind(client).first();
  const prior = JSON.parse(event?.detail || "{}");
  let status = prior.previous_status, pageActive = prior.previous_page_active;
  if (pageActive == null && prior.export_key && env.MEDIA) {
    const object = await env.MEDIA.get(prior.export_key);
    const bundle = object ? await object.json() : null;
    const original = bundle?.tables?.client_config?.[0];
    status = original?.status ?? status;
    pageActive = original?.page_active;
  }
  if (!status || status === "archived" || pageActive == null) throw new Error("Archive prior state unavailable; workspace unchanged");
  await env.DB.batch([
    env.DB.prepare("UPDATE client_config SET status=?, page_active=?, updated_at=? WHERE client=?").bind(status, pageActive, nowIso(), client),
    env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
      .bind(str(actor), "workspace-restored", client, "{}", nowIso()),
  ]);
  return { ok: true, client };
}

export async function listArchives(env) {
  const rows = (await env.DB.prepare(
    "SELECT client, client_name, updated_at FROM client_config WHERE status='archived' ORDER BY updated_at DESC",
  ).all()).results || [];
  const out = [];
  for (const r of rows) {
    let exports = [];
    if (env.MEDIA) {
      const listed = await env.MEDIA.list({ prefix: `archive/workspaces/${r.client}/` }).catch(() => ({ objects: [] }));
      exports = (listed.objects || []).map((o) => ({ key: o.key, size: o.size, uploaded: o.uploaded })).sort((a, b) => String(b.key).localeCompare(String(a.key)));
    }
    out.push({ ...r, exports });
  }
  return out;
}
