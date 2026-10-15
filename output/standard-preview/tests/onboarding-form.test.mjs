// The standard onboarding form (pulsify-saas #16): the client answers funnel
// facts, adds proof links without wiping the vault, and old /onboard links land
// on the new form. Real SQLite with the client brain migration.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { onRequestGet as brainGet, onRequestPost as brainPost } from "../functions/api/client-brain.js";
import { onRequest as onboard } from "../functions/onboard/[[path]].js";
import { CLIENT_SESSION_COOKIE } from "../functions/_shared/client-auth.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(new URL("../migrations/0014_client_brain.sql", import.meta.url), "utf8"));
sql.exec(readFileSync(new URL("../migrations/0062_onboarding_v2.sql", import.meta.url), "utf8"));
sql.exec(readFileSync(new URL("../migrations/0063_client_brain_sections.sql", import.meta.url), "utf8"));
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,portal_token_hash TEXT)");
sql.exec("CREATE TABLE client_sessions(token_hash TEXT PRIMARY KEY,client_id TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE impersonation_sessions(token_hash TEXT,exchange_hash TEXT,client_id TEXT,created_at TEXT,expires_at TEXT,created_by TEXT,consumed_at TEXT)");
sql.prepare("INSERT INTO client_config VALUES(?,?,?,?)").run("acme", "Acme", "client", null);
sql.prepare("INSERT INTO client_sessions VALUES(?,?,?,?)").run(await sha256Hex("sess-acme"), "acme", "2099-01-01T00:00:00.000Z", "x");

const env = {
  ADMIN_KEY: "operator-secret",
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
    async batch(statements) { const out = []; for (const statement of statements) out.push(await statement.run()); return out; },
  },
};

const asClient = (body) => new Request("https://x/api/client-brain", {
  method: "POST",
  headers: { "content-type": "application/json", cookie: `${CLIENT_SESSION_COOKIE}=sess-acme` },
  body: JSON.stringify(body),
});
const post = async (body) => brainPost({ request: asClient(body), env, data: {} });
const read = async () => (await brainGet({
  request: new Request("https://x/api/client-brain?client=acme", { headers: { "x-admin-key": "operator-secret" } }),
  env,
  data: {},
})).json();

test("the client answers the funnel facts they know; routing stays operator work", async () => {
  const response = await post({
    client: "acme",
    answers: {
      funnel: {
        link_in_bio: "https://acme.test/start",
        booking_link: "https://cal.test/acme",
        current_funnel_links: ["https://acme.test/vsl"],
        platforms_audience: "Instagram: 12,400\nYouTube: 3,100",
        posting_cadence: "A few times a week",
        email_platform_tags: "Kit",
        trigger_words: ["SYSTEM"],
      },
    },
  });
  assert.equal(response.status, 200);
  const saved = (await response.json()).saved_fields.map((entry) => `${entry.section}.${entry.field}`);
  assert.deepEqual(saved.sort(), ["funnel.booking_link", "funnel.current_funnel_links", "funnel.email_platform_tags", "funnel.link_in_bio", "funnel.platforms_audience", "funnel.posting_cadence"]);

  const brain = await read();
  const funnel = brain.sections.find((section) => section.key === "funnel");
  const donot = brain.sections.find((section) => section.key === "donot");
  assert.equal(funnel.operator_only, false, "the client fills part of the funnel section now");
  assert.equal(donot.operator_only, true);
  const byKey = Object.fromEntries(funnel.fields.map((entry) => [entry.key, entry]));
  assert.equal(byKey.link_in_bio.source, "client-form");
  assert.equal(byKey.link_in_bio.operator_only, false);
  assert.equal(byKey.trigger_words.operator_only, true);
  assert.equal(byKey.trigger_words.gap, true, "trigger words are not client-writable");
});

test("proof links are added, never rewritten, and a repeat adds nothing twice", async () => {
  sql.prepare("INSERT INTO proof_items (client_id, kind, url, claim, permission, created_at) VALUES (?,?,?,?,?,?)")
    .run("acme", "image-link", "/m/acme/one.png", "Student at $10k", "granted", "2026-09-01T00:00:00.000Z");

  const first = await post({
    client: "acme",
    action: "add-proof",
    items: [
      { kind: "video-link", url: "https://youtu.be/abc", claim: "Passed the funded challenge" },
      { kind: "image", url: "/m/acme/one.png", claim: "duplicate of the upload" },
      { kind: "video-link", url: "javascript:alert(1)", claim: "not a link" },
    ],
  });
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { ok: true, client: "acme", added: 1, skipped: 1 });

  const again = await post({ client: "acme", action: "add-proof", items: [{ kind: "video-link", url: "https://youtu.be/abc" }] });
  assert.equal((await again.json()).added, 0);

  const rows = sql.prepare("SELECT kind, url, permission FROM proof_items WHERE client_id=? ORDER BY id").all("acme");
  assert.deepEqual(rows.map((row) => ({ ...row })), [
    { kind: "image-link", url: "/m/acme/one.png", permission: "granted" },
    { kind: "video-link", url: "https://youtu.be/abc", permission: "unknown" },
  ]);

  assert.equal((await post({ client: "acme", action: "add-proof", items: [] })).status, 422);
  assert.equal((await post({ client: "other", action: "add-proof", items: [{ kind: "video-link", url: "https://youtu.be/x" }] })).status, 403);
});

test("old /onboard links land on the new form with the same query", async () => {
  const context = (url, method = "GET", path = []) => ({
    request: new Request(url, { method }),
    env: {},
    params: { path },
    next: () => new Response("asset"),
  });
  const moved = await onboard(context("https://pulsify-ai.com/onboard/?client=acme&t=tok123"));
  assert.equal(moved.status, 302);
  assert.equal(moved.headers.get("location"), "https://pulsify-ai.com/app/portal/onboarding?client=acme&t=tok123");
  assert.equal((await onboard(context("https://pulsify-ai.com/onboard/", "POST"))).status, 405);
  // The legacy page's own files still load for anyone mid-way through it.
  assert.equal(await (await onboard(context("https://pulsify-ai.com/onboard/phase4.js", "GET", ["phase4.js"]))).text(), "asset");
});

test("onboarding v2 answers in the new sections save to the real table and read back", async () => {
  const response = await post({
    client: "acme",
    answers: {
      intent: { why_joined: ["no-buyers", "system"] },
      money: { last_3_months: [{ month: "2026-09", revenue: 12400, profit: 7600 }], monthly_income: "12400" },
      commitment: { understood: "yes", promised: "in" },
    },
  });
  assert.equal(response.status, 200);
  const body = await read();
  const field = (section, key) => body.sections.find((s) => s.key === section).fields.find((f) => f.key === key);
  assert.deepEqual(field("intent", "why_joined").value, ["no-buyers", "system"]);
  assert.equal(field("money", "monthly_income").value, "12400");
  assert.equal(field("commitment", "promised").value, "in");
});
