// Notification routing (functions/_shared/notify-routing.js) and the Settings
// actions that drive it (functions/api/account.js), pulsify-saas #32. Real
// SQLite and a fetch stub: nothing leaves the machine.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { cleanChannels, groupOf, routeOutside, webhookUrl } from "../functions/_shared/notify-routing.js";
import { notify } from "../functions/_shared/notifications.js";
import { onRequestGet as accountGet, onRequestPost as accountPost } from "../functions/api/account.js";
import { CLIENT_SESSION_COOKIE } from "../functions/_shared/client-auth.js";
import { rememberOperator } from "../functions/_shared/access.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
const mig = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT,portal_token_hash TEXT)");
sql.exec("CREATE TABLE client_auth(client_id TEXT PRIMARY KEY,email TEXT UNIQUE,pass_hash TEXT,pass_salt TEXT,iterations INTEGER,created_at TEXT,updated_at TEXT)");
sql.exec("CREATE TABLE client_sessions(token_hash TEXT PRIMARY KEY,client_id TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE impersonation_sessions(token_hash TEXT,exchange_hash TEXT,client_id TEXT,created_at TEXT,expires_at TEXT,created_by TEXT,consumed_at TEXT)");
sql.exec("CREATE TABLE proof_items(id INTEGER PRIMARY KEY,client_id TEXT,created_at TEXT)");
for (const name of ["0008_integrations_hub.sql", "0014_client_brain.sql", "0015_operator_events.sql", "0021_workspace_records.sql", "0025_data_spine.sql", "0026_workspace_preferences.sql", "0031_notifications.sql"]) {
  for (const statement of mig(name).replace(/--[^\n]*/g, "").split(";")) {
    if (statement.trim()) try { sql.exec(statement.replace(/ALTER TABLE client_config ADD COLUMN status[^;]*/, "")); } catch { /* already there */ }
  }
}
sql.prepare("INSERT INTO client_config(client,client_name,status,updated_at) VALUES(?,?,?,?)").run("acme", "Acme", "client", "x");
sql.prepare("INSERT INTO client_auth VALUES(?,?,?,?,?,?,?)").run("acme", "coach@acme.com", null, null, 1, "x", "x");
const far = "2099-01-01T00:00:00.000Z";
sql.prepare("INSERT INTO client_sessions VALUES(?,?,?,?)").run(await sha256Hex("sess-client"), "acme", far, "x");
sql.prepare("INSERT INTO impersonation_sessions VALUES(?,?,?,?,?,?,?)").run(await sha256Hex("sess-preview"), "x", "acme", "x", far, "abod.louai@gmail.com", "2026-09-25T00:00:00.000Z");

const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  sent.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
  return new Response('{"ok":true}', { status: 200 });
};
test.after(() => { globalThis.fetch = realFetch; });

const env = {
  OPERATOR_EMAILS: "abod.louai@gmail.com, second@pulsify.test",
  RESEND_API_KEY: "re",
  EMAIL_FROM: "Pulsify <hi@pulsify-ai.com>",
  ADMIN_KEY: "k",
  DB: {
    prepare(query) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        async first() { return sql.prepare(query).get(...args) || null; },
        async all() { return { results: sql.prepare(query).all(...args) }; },
        async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: result.changes } }; },
      };
      return statement;
    },
    async batch(list) { const out = []; for (const item of list) out.push(await item.run()); return out; },
  },
};
const call = (fn, request) => fn({ request, env, data: {} });
const op = (request) => { rememberOperator(request, { email: "abod.louai@gmail.com", via: "access" }); return request; };
const post = (body, headers = {}) => new Request("https://x/api/account", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const asOperator = (body) => op(post(body, { "x-pulsify-operator": "1" }));
const asClient = (body, token = "sess-client") => post(body, { cookie: `${CLIENT_SESSION_COOKIE}=${token}` });

const DISCORD = "https://discord.com/api/webhooks/123/abc";
const SLACK = "https://hooks.slack.com/services/T0/B0/xyz";

test("webhooks: only Discord's and Slack's own endpoints pass; groups map kinds", () => {
  assert.equal(webhookUrl("discord", DISCORD), DISCORD);
  assert.equal(webhookUrl("slack", SLACK), SLACK);
  assert.equal(webhookUrl("discord", "https://evil.example/api/webhooks/1"), "");
  assert.equal(webhookUrl("slack", "http://hooks.slack.com/services/x"), "", "https only");
  assert.equal(webhookUrl("discord", SLACK), "", "a Slack URL is not a Discord webhook");
  assert.equal(groupOf("payment"), "payments");
  assert.equal(groupOf("lead.replied"), "replies");
  assert.equal(groupOf("system"), null);
  assert.deepEqual(cleanChannels({ email: ["payments", "nonsense", "payments"] }, { email: [], discord: ["replies"], slack: [] }), { email: ["payments"], discord: ["replies"], slack: [] });
});

test("operator: defaults keep Discord for replies; switches and webhooks save; the URL never comes back", async () => {
  let view = await (await call(accountGet, op(new Request("https://x/api/account", { headers: { "x-pulsify-operator": "1" } })))).json();
  assert.deepEqual(view.routing.channels, { email: [], discord: ["replies"], slack: [] });
  assert.equal(view.routing.email.available, true);
  assert.equal(view.routing.email.to, "a***@gmail.com");
  assert.equal(view.routing.slack.connected, false);

  const bad = await call(accountPost, asOperator({ action: "channel", channel: "slack", webhook_url: "https://evil.example/x" }));
  assert.equal(bad.status, 422);
  let saved = await (await call(accountPost, asOperator({ action: "channel", channel: "slack", webhook_url: SLACK }))).json();
  assert.equal(saved.routing.slack.connected, true);
  assert.ok(!JSON.stringify(saved).includes("hooks.slack.com"), "the webhook is never sent back");
  saved = await (await call(accountPost, asOperator({ action: "routing", channels: { email: ["payments"], discord: ["replies"], slack: ["payments", "calls"] } }))).json();
  assert.deepEqual(saved.channels.slack, ["payments", "calls"]);
});

test("routing: a payment goes to Slack and email as switched on, not to Discord", async () => {
  sent.length = 0;
  const results = await routeOutside(env, { scope: "operator", kind: "payment", title: "$2,000 received from Kai", body: "Via Stripe" });
  assert.deepEqual(results.map((row) => row.channel).sort(), ["email", "slack"]);
  const slack = sent.find((item) => item.url === SLACK);
  assert.equal(slack.body.text, "*$2,000 received from Kai*\nVia Stripe");
  const email = sent.find((item) => item.url.includes("resend"));
  assert.deepEqual(email.body.to, ["abod.louai@gmail.com"]);
  assert.ok(!sent.some((item) => item.url.includes("discord")), "Discord only carries replies");
});

test("notify(): the bell row is written and routed; the operator copy of a client event stays in the bell", async () => {
  sent.length = 0;
  await notify(env, { scope: "operator", kind: "booking", title: "Call booked with Kai", body: "Thursday 3pm" });
  assert.ok(sent.some((item) => item.url === SLACK), "calls go to Slack");
  sent.length = 0;
  await notify(env, { scope: "operator", kind: "payment", title: "Quiet one", outside: false });
  assert.equal(sent.length, 0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM notifications WHERE title='Quiet one'").get().n, 1);
});

test("client: their own routing; the previewing operator can change workspace settings, logged, but not the password", async () => {
  let view = await (await call(accountGet, new Request("https://x/api/account", { headers: { cookie: `${CLIENT_SESSION_COOKIE}=sess-client` } }))).json();
  assert.deepEqual(view.routing.channels, { email: [], discord: [], slack: [] });
  const saved = await (await call(accountPost, asClient({ action: "channel", channel: "discord", webhook_url: DISCORD }))).json();
  assert.equal(saved.routing.discord.connected, true);

  const preview = await (await call(accountPost, asClient({ action: "workspace", name: "Acme Trading" }, "sess-preview"))).json();
  assert.equal(preview.ok, true);
  assert.equal(sql.prepare("SELECT client_name FROM client_config WHERE client='acme'").get().client_name, "Acme Trading");
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM operator_events WHERE actor='operator-preview' AND action='settings:workspace' AND client='acme'").get().n, 1);
  const password = await call(accountPost, asClient({ action: "password", next: "a-long-new-password" }, "sess-preview"));
  assert.equal(password.status, 403);
  const leaving = await call(accountPost, asClient({ action: "delete-request" }, "sess-preview"));
  assert.equal(leaving.status, 403);
});
