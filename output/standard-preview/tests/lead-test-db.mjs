// A real SQLite database with the real migrations, wired up like D1, for the lead tests
// (identity, journey, regions, Instagram DMs). Not a test itself.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { sha256Hex } from "../functions/_shared/common.js";

export function makeLeadDb() {
  const sql = new DatabaseSync(":memory:");
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
  for (const name of ["0010_view_tracking.sql", "0021_workspace_records.sql", "0025_data_spine.sql", "0026_workspace_preferences.sql", "0027_revenue_automation.sql", "0028_onboarding.sql", "0031_notifications.sql", "0043_cash_by_video.sql", "0045_lead_score.sql", "0046_links_team.sql", "0075_lead_identity.sql", "0076_client_dms.sql", "0077_follower_places.sql"]) sql.exec(mig(name));

  const env = {
    ADMIN_KEY: "admin-test-key",
    DB: {
      prepare(query) {
        // D1 rejects a compound SELECT with more than 5 terms; local SQLite allows 500.
        if ((query.match(/\b(UNION|INTERSECT|EXCEPT)\b/gi) || []).length > 4) throw new Error("D1_ERROR: too many terms in compound SELECT");
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

  const DAY = 86400000;
  const NOW = Date.now();
  const ago = (days, hours = 0) => new Date(NOW - days * DAY - hours * 3600000).toISOString();
  const ahead = (days) => new Date(NOW + days * DAY).toISOString();
  const addClient = async (id, token) => sql.prepare("INSERT INTO client_config(client,client_name,status,portal_token_hash) VALUES(?,?,?,?)").run(id, id, "client", await sha256Hex(token));
  const page = (client, visitor, event, at, extra = {}) => sql.prepare(
    `INSERT INTO page_events(client,visitor_id,session_id,page_id,event,email,referrer,utm_json,utm_source,utm_content,metadata_json,at,country,city,user_agent)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(client, visitor, extra.session || `${visitor}-s`, "main", event, extra.email || null, extra.referrer || null, JSON.stringify(extra.utm || {}),
    extra.utm?.utm_source || null, extra.utm?.utm_content || null, extra.meta ? JSON.stringify(extra.meta) : null, at,
    extra.country === undefined ? "US" : extra.country, extra.city === undefined ? "Austin" : extra.city,
    extra.ua === undefined ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1" : extra.ua);
  const engage = (client, visitor, at, meta, extra = {}) => page(client, visitor, "engagement", at, { ...extra, meta });
  const watch = (client, visitor, event, percent, at, email = null) => sql.prepare(
    "INSERT INTO watch_events(client,visitor_id,email,event,percent,at,duration_seconds) VALUES(?,?,?,?,?,?,?)",
  ).run(client, visitor, email, event, percent, at, 600);
  const lead = (client, email, at, extra = {}) => sql.prepare(
    "INSERT INTO leads(client,email,name,phone,ig_handle,visitor_id,source,applied_at) VALUES(?,?,?,?,?,?,?,?)",
  ).run(client, email, extra.name || null, extra.phone || null, extra.handle || null, extra.visitor || null, extra.source || "typeform", at);
  const touch = (client, email, kind, at, externalId, payload = {}) => sql.prepare(
    "INSERT INTO pipeline_touches(client_id,contact_email,kind,ts,source,external_id,payload_json) VALUES(?,?,?,?,?,?,?)",
  ).run(client, email, kind, at, "test", externalId, JSON.stringify(payload));
  const contact = (client, id, extra = {}) => sql.prepare(
    `INSERT INTO ig_contacts(id,client_id,ig_user_id,ig_username,ig_name,lead_email,lead_phone,first_dm_at,last_dm_at,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(id, client, `igsid-${id}`, extra.username || null, extra.name || null, extra.email || null, extra.phone || null, extra.at || ago(1), extra.at || ago(1), ago(1), ago(1));
  let ref = 0;
  const pay = (client, email, cents, at) => {
    ref += 1;
    const r = sql.prepare(
      `INSERT INTO payments(client,amount_cents,currency,rail,reference,occurred_at,recorded_by,created_at,customer_email,kind,refunded_cents)
       VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(client, cents, "usd", "stripe", `r${ref}`, at, "test", at, email, "charge", 0);
    sql.prepare(
      "INSERT INTO payment_matches(payment_id,client_id,target_kind,target_id,confidence,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
    ).run(Number(r.lastInsertRowid), client, "contact_email", email, 1, "confirmed", at, at);
  };

  return { sql, env, NOW, DAY, ago, ahead, addClient, page, engage, watch, lead, touch, contact, pay };
}
