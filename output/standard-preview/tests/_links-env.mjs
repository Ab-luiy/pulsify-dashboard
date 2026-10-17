// Shared setup for the tracked-link tests (pulsify-saas #72, #73): real SQLite with the real migrations,
// two clients (acme, other) and a way to call an endpoint as a client. Not a test itself.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { sha256Hex } from "../functions/_shared/common.js";

export const sql = new DatabaseSync(":memory:");
const mig = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");

sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, status TEXT, portal_token_hash TEXT,
  wistia_media_id TEXT, typeform_url TEXT, typeform_webhook_secret TEXT, kit_api_key TEXT, kit_tag_id TEXT,
  allowed_origin TEXT, prospect_email TEXT, acquisition_token TEXT, updated_at TEXT)`);
sql.exec("CREATE TABLE client_sessions(token_hash TEXT, client_id TEXT, expires_at TEXT, created_at TEXT)");
sql.exec(`CREATE TABLE leads(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, email TEXT, name TEXT, revenue TEXT,
  situation TEXT, applied_at TEXT, status TEXT DEFAULT 'new', visitor_id TEXT, session_id TEXT, page_id TEXT,
  source TEXT DEFAULT 'typeform', response_id TEXT, phone TEXT, answers_json TEXT, kit_status TEXT, utm_json TEXT, updated_at TEXT)`);
sql.exec(`CREATE TABLE watch_events(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, email TEXT, media_id TEXT,
  event TEXT, percent INTEGER, at TEXT, visitor_id TEXT, session_id TEXT, page_id TEXT, wistia_visitor_key TEXT,
  position_seconds REAL, duration_seconds REAL, watch_seconds REAL DEFAULT 0, unique_seconds REAL)`);
sql.exec(`CREATE TABLE page_events(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, visitor_id TEXT, session_id TEXT,
  page_id TEXT, event TEXT NOT NULL, email TEXT, path TEXT, referrer TEXT, utm_json TEXT, metadata_json TEXT, at TEXT NOT NULL)`);
sql.exec(mig("0008_integrations_hub.sql").replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/, ""));
sql.exec(mig("0010_view_tracking.sql"));
sql.exec(mig("0021_workspace_records.sql"));
sql.exec(mig("0025_data_spine.sql"));
sql.exec(mig("0027_revenue_automation.sql"));
sql.exec(mig("0028_onboarding.sql"));
sql.exec(mig("0031_notifications.sql"));
sql.exec(mig("0043_cash_by_video.sql"));
sql.exec(mig("0045_lead_score.sql"));
sql.exec(mig("0046_links_team.sql"));
sql.exec(mig("0070_link_slugs_youtube.sql"));
sql.exec(mig("0071_link_domains.sql"));

export const env = {
  YT_API_KEY: "yt-test",
  DB: {
    prepare(query) {
      let args = [];
      const p = {
        bind(...values) { args = values; return p; },
        async first() { return sql.prepare(query).get(...args) || null; },
        async all() { return { results: sql.prepare(query).all(...args) }; },
        async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
      };
      return p;
    },
    async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; },
  },
};

export const addClient = async (id, token) => sql.prepare("INSERT INTO client_config(client,client_name,status,portal_token_hash) VALUES(?,?,?,?)")
  .run(id, id, "client", token ? await sha256Hex(token) : null);
await addClient("acme", "token-acme");
await addClient("other", "token-other");

// Call an endpoint as a client (portal token) or with extra headers. Returns { status, body }.
export async function call(handler, method, path, { body, token = "token-acme", headers = {} } = {}) {
  const response = await handler({
    request: new Request(`https://pulsify-ai.com${path}`, {
      method,
      headers: { ...(token ? { "x-portal-token": token } : {}), ...(body ? { "content-type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: response.status, body: parsed, response };
}
