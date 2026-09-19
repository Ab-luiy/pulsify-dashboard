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
    try {
      const rows = (await env.DB.prepare(`SELECT * FROM ${tbl} WHERE ${col}=?`).bind(client).all()).results || [];
      if (rows.length) bundle.tables[tbl] = rows;
    } catch { /* a table without that column shape; skip */ }
  }
  bundle.row_count = Object.values(bundle.tables).reduce((n, rows) => n + rows.length, 0);
  return bundle;
}

export async function archiveWorkspace(env, clientId, actor = "operator") {
  const client = cleanId(clientId);
  const config = await env.DB.prepare("SELECT client, client_name, status FROM client_config WHERE client=?").bind(client).first();
  if (!config) return { ok: false, error: "unknown client" };
  if (config.status === "archived") return { ok: true, already: true, client };
  const bundle = await exportWorkspace(env, client);
  const stamp = nowIso().replace(/[:.]/g, "-");
  const key = `archive/workspaces/${client}/${stamp}.json`;
  if (env.MEDIA) await env.MEDIA.put(key, JSON.stringify(bundle, null, 2), { httpMetadata: { contentType: "application/json" } });
  await env.DB.prepare("UPDATE client_config SET status='archived', page_active=0, updated_at=? WHERE client=?").bind(nowIso(), client).run();
  // Any open client session or setup link for this workspace stops working.
  await env.DB.prepare("DELETE FROM client_sessions WHERE client_id=?").bind(client).run().catch(() => null);
  await env.DB.prepare("DELETE FROM client_setup_tokens WHERE client_id=?").bind(client).run().catch(() => null);
  await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
    .bind(str(actor), "workspace-archived", client, JSON.stringify({ export_key: key, rows: bundle.row_count, previous_status: config.status }), nowIso()).run().catch(() => null);
  return { ok: true, client, export_key: key, rows: bundle.row_count, bundle };
}

export async function restoreWorkspace(env, clientId, actor = "operator") {
  const client = cleanId(clientId);
  const config = await env.DB.prepare("SELECT client, status FROM client_config WHERE client=?").bind(client).first();
  if (!config) return { ok: false, error: "unknown client" };
  if (config.status !== "archived") return { ok: true, already: true, client };
  await env.DB.prepare("UPDATE client_config SET status='prospect', page_active=1, updated_at=? WHERE client=?").bind(nowIso(), client).run();
  await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
    .bind(str(actor), "workspace-restored", client, "{}", nowIso()).run().catch(() => null);
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
