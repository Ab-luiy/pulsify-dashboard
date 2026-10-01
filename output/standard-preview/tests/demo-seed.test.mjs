// The Example workspace for sales calls: the seed builds a believable funnel and videos-by-cash view, reruns
// cleanly, never touches another client, and every cross-client total leaves it out.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { funnelHealthReport } from "../functions/_shared/funnel-health.js";
import { videoCashReport } from "../functions/_shared/video-cash.js";

const sql = new DatabaseSync(":memory:");
const mig = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, status TEXT, portal_token_hash TEXT,
  wistia_media_id TEXT, typeform_url TEXT, typeform_webhook_secret TEXT, kit_api_key TEXT, kit_tag_id TEXT,
  allowed_origin TEXT, prospect_email TEXT, acquisition_token TEXT, updated_at TEXT)`);
sql.exec(`CREATE TABLE leads(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, email TEXT, name TEXT, revenue TEXT,
  situation TEXT, applied_at TEXT, status TEXT DEFAULT 'new', visitor_id TEXT, session_id TEXT, page_id TEXT,
  source TEXT DEFAULT 'typeform', response_id TEXT, phone TEXT, answers_json TEXT, kit_status TEXT, utm_json TEXT, updated_at TEXT)`);
sql.exec(`CREATE TABLE watch_events(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, email TEXT, media_id TEXT,
  event TEXT, percent INTEGER, at TEXT, visitor_id TEXT, session_id TEXT, page_id TEXT, wistia_visitor_key TEXT, watch_seconds REAL DEFAULT 0)`);
sql.exec(`CREATE TABLE page_events(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, visitor_id TEXT, session_id TEXT,
  page_id TEXT, event TEXT NOT NULL, email TEXT, path TEXT, referrer TEXT, utm_json TEXT, metadata_json TEXT, at TEXT NOT NULL,
  country TEXT, city TEXT)`);
sql.exec("CREATE TABLE lead_models(client_id TEXT PRIMARY KEY, model_json TEXT, fitted_at TEXT)");
sql.exec("CREATE TABLE client_sessions(token_hash TEXT, client_id TEXT, expires_at TEXT, created_at TEXT)");
for (const name of ["0008_integrations_hub.sql", "0010_view_tracking.sql", "0014_client_brain.sql", "0021_workspace_records.sql", "0025_data_spine.sql", "0027_revenue_automation.sql", "0028_onboarding.sql", "0043_cash_by_video.sql"]) {
  sql.exec(mig(name).replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/, "").replace(/ALTER TABLE page_events ADD COLUMN (ip|country|city|user_agent) TEXT;/g, ""));
}
sql.exec("ALTER TABLE page_events ADD COLUMN lat REAL; ALTER TABLE page_events ADD COLUMN lng REAL;");
sql.exec("ALTER TABLE asset_links ADD COLUMN source TEXT;");

const env = {
  DB: {
    prepare(query) {
      let args = [];
      const stmt = {
        bind(...values) { args = values; return stmt; },
        async first() { return sql.prepare(query).get(...args) || null; },
        async all() { return { results: sql.prepare(query).all(...args) }; },
        async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: r.changes } }; },
      };
      return stmt;
    },
  },
};

// A real client whose rows the seed must never touch.
sql.prepare("INSERT INTO client_config(client, client_name, status) VALUES ('acme','Acme','client')").run();
sql.prepare("INSERT INTO page_events(client, visitor_id, event, at) VALUES ('acme','a1','page_view','2026-09-30T00:00:00.000Z')").run();
sql.prepare("INSERT INTO payments(client, amount_cents, currency, rail, reference, occurred_at, recorded_by, created_at) VALUES ('acme',50000,'USD','manual','acme-1','2026-09-30T00:00:00.000Z','op','2026-09-30T00:00:00.000Z')").run();

const seedSql = () => execFileSync("node", [new URL("../tools/seed-demo-workspace.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")], { encoding: "utf8" });
sql.exec(seedSql());

const client = "demo-example";
assert.equal(sql.prepare("SELECT status FROM client_config WHERE client=?").get(client).status, "demo");

// The funnel: believable, ranked, with the money matched.
const funnel = await funnelHealthReport(env, client, { range: "30d" });
const count = (key) => funnel.steps.find((step) => step.key === key)?.count;
assert.equal(count("visit"), 200);
assert.equal(count("play"), 120);
assert.equal(count("application"), 60);
assert.equal(count("booking"), 24);
assert.equal(count("buyer"), 4);
assert.equal(funnel.cash.collected_cents, 750000);
assert.ok(funnel.score?.value > 0, "the example funnel has a score");
assert.ok(funnel.fixes.length > 0, "the example funnel has something to fix");

// Videos by cash: every video listed, the buyers credited to the videos that earned them.
const videos = await videoCashReport(env, client, { range: "all" });
assert.equal(videos.handle, "@exampletradingco");
assert.equal(videos.videos.length, 4);
assert.equal(videos.videos.reduce((n, v) => n + v.buyers, 0) <= 4, true);
assert.equal(videos.videos[0].cash_cents >= videos.videos[1].cash_cents, true, "ranked by cash");

// The channel sync never looks the example workspace up (it would replace the made-up videos).
const { dueVideoClients } = await import("../functions/_shared/video-cash.js");
assert.deepEqual(await dueVideoClients(env, { force: true }), []);

// Rerun: no duplicates, same shape, the real client untouched.
sql.exec(seedSql());
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM client_config WHERE client=?").get(client).n, 1);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM payments WHERE client=?").get(client).n, 4);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM yt_videos WHERE client_id=?").get(client).n, 4);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM page_events WHERE client='acme'").get().n, 1);
assert.equal(sql.prepare("SELECT amount_cents FROM payments WHERE client='acme'").get().amount_cents, 50000);

// No private data anywhere: only example.com addresses.
const emails = sql.prepare("SELECT DISTINCT contact_email FROM pipeline_touches WHERE client_id=?").all(client).map((r) => r.contact_email);
assert.ok(emails.length > 0 && emails.every((e) => e.endsWith("@example.com")));

console.log("demo-seed.test.mjs ok");
