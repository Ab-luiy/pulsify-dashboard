import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { onRequestPost as requestAccess } from "../functions/api/access-request.js";
import { onRequestGet as listApi, onRequestPost as decideApi } from "../functions/api/access-requests.js";

// Register on the sign-in page, then the operator approves or declines from the console.
const sql = new DatabaseSync(":memory:");
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT)");
for (const name of ["0011_client_dashboard_auth.sql", "0007_delivery_failures.sql", "0008_integrations_hub.sql", "0015_operator_events.sql", "0024_contract_provisioning.sql", "0027_revenue_automation.sql", "0028_onboarding.sql", "0031_notifications.sql", "0047_access_requests.sql"]) {
  sql.exec(readFileSync(new URL("../migrations/" + name, import.meta.url), "utf8").replace(/ALTER TABLE client_config ADD COLUMN [^;]*;/g, ""));
}
sql.exec("CREATE TABLE IF NOT EXISTS webhook_outbox(id TEXT PRIMARY KEY,scope TEXT,client_id TEXT,event TEXT,payload_json TEXT,is_test INTEGER,created_at TEXT,dispatched_at TEXT)");
const DB = {
  prepare(query) {
    let args = [];
    const p = {
      bind(...a) { args = a; return p; },
      async first() { return sql.prepare(query).get(...args) || null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
      async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: r.changes } }; },
    };
    return p;
  },
  async batch(statements) { const out = []; for (const s of statements) out.push(await s.run()); return out; },
};
const env = { DB, ADMIN_KEY: "test-admin", RESEND_API_KEY: "test-mail", EMAIL_FROM: "Pulsify <hello@example.test>", INTEGRATION_ENCRYPTION_KEY: btoa("x".repeat(32)) };

const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  assert.equal(url, "https://api.resend.com/emails");
  sent.push(JSON.parse(options.body));
  return new Response("{}", { status: 200 });
};

const post = (path, body, headers = {}) => new Request("https://pulsify-ai.com" + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const ask = (body, headers) => requestAccess({ request: post("/api/access-request", body, headers), env });
const admin = { "x-admin-key": "test-admin" };

try {
  // Validation and bots
  assert.equal((await ask({ name: "", email: "a@b.co" })).status, 422);
  assert.equal((await ask({ name: "Ada", email: "nope" })).status, 422);
  assert.equal((await ask({ name: "Ada", email: "ada@example.com" }, { origin: "https://evil.test" })).status, 403);
  assert.equal((await ask({ name: "Bot", email: "bot@example.com", website: "http://spam" })).status, 200);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM access_requests").get().n, 0, "honeypot stores nothing");

  // A real request: stored, announced in the bell, emailed to the founder
  const ok = await ask({ name: "Ada Lovelace", email: "Ada@Example.com", link: "https://youtube.com/@ada", note: "Trading coach" });
  assert.equal(ok.status, 200);
  assert.match((await ok.json()).message, /Request received/);
  const stored = sql.prepare("SELECT * FROM access_requests").get();
  assert.equal(stored.email, "ada@example.com");
  assert.equal(stored.status, "pending");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM client_auth").get().n, 0, "no login exists before approval");
  assert.match(sql.prepare("SELECT title FROM notifications WHERE kind='access.request'").get().title, /Ada Lovelace asked for access/);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["hello@example.test"]);

  // Asking twice updates the same row and does not announce again
  await ask({ name: "Ada L", email: "ada@example.com" });
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM access_requests").get().n, 1);
  assert.equal(sent.length, 1);

  // Operator only
  assert.equal((await listApi({ request: new Request("https://pulsify-ai.com/api/access-requests"), env, data: {} })).status, 401);
  assert.equal((await decideApi({ request: post("/api/access-requests", { id: stored.id, action: "approve" }), env, data: {} })).status, 401);
  const list = await (await listApi({ request: new Request("https://pulsify-ai.com/api/access-requests", { headers: admin }), env, data: {} })).json();
  assert.equal(list.pending.length, 1);
  assert.equal(list.pending[0].name, "Ada L");
  assert.equal((await decideApi({ request: post("/api/access-requests", { id: stored.id, action: "maybe" }, admin), env, data: {} })).status, 422);

  // Approve: workspace, setup link, welcome email
  const approved = await decideApi({ request: post("/api/access-requests", { id: stored.id, action: "approve" }, admin), env, data: {} });
  assert.equal(approved.status, 200);
  const out = await approved.json();
  assert.equal(out.request.status, "approved");
  assert.equal(out.request.client, "ada-l");
  assert.equal(out.welcome_state, "sent");
  assert.equal(sql.prepare("SELECT status FROM client_config WHERE client='ada-l'").get().status, "onboarding");
  assert.equal(sql.prepare("SELECT email FROM client_auth WHERE client_id='ada-l'").get().email, "ada@example.com");
  const welcome = sent.at(-1);
  assert.deepEqual(welcome.to, ["ada@example.com"]);
  assert.match(welcome.text, /https:\/\/pulsify-ai\.com\//);
  const sentBefore = sent.length;

  // Deciding twice changes nothing; a person who already has a login is told the same thing and no row is made
  const again = await (await decideApi({ request: post("/api/access-requests", { id: stored.id, action: "approve" }, admin), env, data: {} })).json();
  assert.equal(again.already, true);
  assert.equal(sent.length, sentBefore);
  assert.equal((await ask({ name: "Ada", email: "ada@example.com" })).status, 200);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM access_requests").get().n, 1);

  // Decline sends nothing and creates nothing
  await ask({ name: "Grace Hopper", email: "grace@example.com" });
  const grace = sql.prepare("SELECT id FROM access_requests WHERE email='grace@example.com'").get();
  const declined = await (await decideApi({ request: post("/api/access-requests", { id: grace.id, action: "decline" }, admin), env, data: {} })).json();
  assert.equal(declined.request.status, "declined");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM client_auth WHERE email='grace@example.com'").get().n, 0);
  assert.equal(sent.at(-1).to[0] === "grace@example.com", false);

  // Two people with the same name get different workspaces
  await ask({ name: "Ada L", email: "ada2@example.com" });
  const second = sql.prepare("SELECT id FROM access_requests WHERE email='ada2@example.com'").get();
  const out2 = await (await decideApi({ request: post("/api/access-requests", { id: second.id, action: "approve" }, admin), env, data: {} })).json();
  assert.equal(out2.request.client, "ada-l-2");

  // Throttle: the fourth request from one address in an hour is quietly dropped
  for (let i = 0; i < 6; i++) await ask({ name: `Spam ${i}`, email: `spam${i}@example.com` }, { "cf-connecting-ip": "203.0.113.9" });
  assert.ok(sql.prepare("SELECT COUNT(*) n FROM access_requests WHERE email LIKE 'spam%'").get().n <= 5);
  console.log("access-requests: ok");
} finally {
  globalThis.fetch = realFetch;
}
