// Funnel health / what to fix, in order (pulsify-saas #37). Real SQLite, real migrations.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { onRequestGet as funnelHealthGet } from "../functions/api/funnel-health.js";
import { funnelHealthReport, grade, ownBestTarget } from "../functions/_shared/funnel-health.js";
import { sha256Hex } from "../functions/_shared/common.js";

const sql = new DatabaseSync(":memory:");
const mig = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");

// Base tables as they exist live (0001_bootstrap is not in the repo).
sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, status TEXT, portal_token_hash TEXT,
  wistia_media_id TEXT, typeform_url TEXT, typeform_webhook_secret TEXT, kit_api_key TEXT, kit_tag_id TEXT,
  allowed_origin TEXT, prospect_email TEXT, acquisition_token TEXT, updated_at TEXT)`);
sql.exec("CREATE TABLE client_sessions(token_hash TEXT, client_id TEXT, expires_at TEXT, created_at TEXT)");
sql.exec(`CREATE TABLE leads(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, email TEXT, name TEXT, revenue TEXT,
  situation TEXT, applied_at TEXT, status TEXT DEFAULT 'new', visitor_id TEXT, session_id TEXT, page_id TEXT,
  source TEXT DEFAULT 'typeform', response_id TEXT, phone TEXT, answers_json TEXT, kit_status TEXT, utm_json TEXT, updated_at TEXT)`);
sql.exec(`CREATE TABLE watch_events(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, email TEXT, media_id TEXT,
  event TEXT, percent INTEGER, at TEXT, visitor_id TEXT, session_id TEXT, page_id TEXT, wistia_visitor_key TEXT)`);
sql.exec(`CREATE TABLE page_events(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, visitor_id TEXT, session_id TEXT,
  page_id TEXT, event TEXT NOT NULL, email TEXT, path TEXT, referrer TEXT, utm_json TEXT, metadata_json TEXT, at TEXT NOT NULL)`);
sql.exec(mig("0008_integrations_hub.sql").replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/, ""));
sql.exec(mig("0010_view_tracking.sql"));
sql.exec(mig("0021_workspace_records.sql"));
sql.exec(mig("0025_data_spine.sql"));
sql.exec(mig("0027_revenue_automation.sql"));
sql.exec(mig("0028_onboarding.sql"));
sql.exec(mig("0043_cash_by_video.sql"));

const env = {
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

const NOW = Date.parse("2026-09-29T12:00:00.000Z");
const DAY = 86400000;
const ago = (days, hours = 0) => new Date(NOW - days * DAY - hours * 3600000).toISOString();

const addClient = async (id, token) => sql.prepare("INSERT INTO client_config(client,client_name,status,portal_token_hash) VALUES(?,?,?,?)")
  .run(id, id, "client", token ? await sha256Hex(token) : null);
const visit = (client, visitor, at) => sql.prepare("INSERT INTO page_events(client,visitor_id,event,at) VALUES(?,?,?,?)").run(client, visitor, "page_view", at);
const play = (client, visitor, at) => sql.prepare("INSERT INTO watch_events(client,visitor_id,event,percent,at) VALUES(?,?,?,?,?)").run(client, visitor, "play", 0, at);
const touch = (client, email, kind, at) => sql.prepare(
  "INSERT INTO pipeline_touches(client_id,contact_email,kind,ts,source,external_id) VALUES(?,?,?,?,?,?)",
).run(client, email, kind, at, "test", `${kind}:${email}`);
let paymentRef = 0;
const pay = (client, email, cents, at, { refunded = 0, matched = true } = {}) => {
  paymentRef += 1;
  const r = sql.prepare(
    `INSERT INTO payments(client,amount_cents,currency,rail,reference,occurred_at,recorded_by,created_at,customer_email,kind,refunded_cents)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(client, cents, "usd", "stripe", `ref-${paymentRef}`, at, "test", at, email, "charge", refunded);
  if (matched) {
    sql.prepare(
      `INSERT INTO payment_matches(payment_id,client_id,target_kind,target_id,confidence,status,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?)`,
    ).run(Number(r.lastInsertRowid), client, "contact_email", email, 1, "confirmed", at, at);
  }
};

// ---------- helpers ----------
assert.equal(grade(0.8, 0.8), "A");
assert.equal(grade(0.4, 0.5), "B");
assert.equal(grade(0.6, 0.8), "C");
assert.equal(grade(0.1, 0.5), "D");
assert.equal(grade(0.9, 0.5), "A", "beating the target caps at A");
assert.equal(grade(null, 0.5), null);
assert.equal(ownBestTarget([], [], NOW), null, "no history, no target");

// ---------- acme: an old strong month and a current weaker one ----------
// Old cohort, all on day 70: 200 visits, 160 plays, 80 applications, 40 bookings, 2 buyers.
// Current cohort, all on day 10: 200 visits, 120 plays, 60 applications, 24 bookings, 4 buyers.
await addClient("acme", "token-acme");
await addClient("other", "token-other");
for (let i = 0; i < 200; i += 1) {
  visit("acme", `old-v${i}`, ago(70));
  if (i < 160) play("acme", `old-v${i}`, ago(70));
  if (i < 80) touch("acme", `old${i}@x.com`, "application", ago(70));
  if (i < 40) touch("acme", `old${i}@x.com`, "booking", ago(70));
  visit("acme", `v${i}`, ago(10));
  if (i < 120) play("acme", `v${i}`, ago(10));
  if (i < 60) touch("acme", `p${i}@x.com`, "application", ago(10));
  if (i < 24) touch("acme", `p${i}@x.com`, "booking", ago(10));
}
pay("acme", "old0@x.com", 100000, ago(70));
pay("acme", "old1@x.com", 100000, ago(70));
for (let i = 0; i < 4; i += 1) pay("acme", `p${i}@x.com`, 200000, ago(10), { refunded: i === 0 ? 50000 : 0 });
pay("acme", "stranger@x.com", 30000, ago(5), { matched: false });
// A second visit by a current visitor does not count them twice.
visit("acme", "v0", ago(3));
// Another client's rows never leak in.
for (let i = 0; i < 50; i += 1) visit("other", `o${i}`, ago(10));

const report = await funnelHealthReport(env, "acme", { range: "30d", now: NOW });
assert.equal(report.ok, true);
assert.deepEqual(report.steps.map((s) => s.key), ["visit", "play", "application", "booking", "buyer"], "steps without data (opt-in, started) are left out");
const step = (key) => report.steps.find((s) => s.key === key);
assert.deepEqual(report.steps.map((s) => s.count), [200, 120, 60, 24, 4]);

// Rates, own-best targets, benchmark, grades.
assert.equal(step("play").rate, 0.6);
assert.equal(step("play").target.kind, "own_best");
assert.equal(step("play").target.rate, 0.8, "best 30 days is the old month");
assert.equal(step("play").grade, "C");
assert.equal(step("application").rate, 0.5);
assert.equal(step("application").grade, "A", "matching your best is an A");
assert.equal(step("booking").rate, 0.4);
assert.equal(step("booking").target.rate, 0.5);
assert.equal(step("booking").grade, "B");
assert.equal(step("buyer").target.kind, "benchmark");
assert.equal(step("buyer").target.rate, 0.12);
assert.match(step("buyer").target.text, /Jeremy Haynes/);
assert.equal(step("buyer").grade, "A");

// Cash: confirmed matches in range, net of refunds; AOV over buyers in range.
assert.equal(report.cash.collected_cents, 750000);
assert.equal(report.cash.buyers, 4);
assert.equal(report.cash.aov_cents, 187500);
assert.deepEqual(report.cash.unmatched, { count: 1, cents: 30000 });
assert.equal(report.currency, "USD");

// What each stage is worth.
assert.equal(step("visit").worth_cents, 3750);
assert.equal(step("booking").worth_cents, 31250);
assert.equal(step("buyer").worth_cents, null);

// Fix cards: money order, and the math printed on each.
const opportunities = report.fixes.filter((f) => f.kind === "opportunity");
assert.deepEqual(opportunities.map((f) => f.step), ["play", "booking"]);
const [playFix, bookingFix] = opportunities;
assert.equal(playFix.entering, 200);
assert.equal(playFix.stopped, 80);
assert.equal(playFix.extra, 40, "200 x (80% - 60%)");
assert.equal(playFix.deals, 1.3, "40 x 4/120 buyers per play");
assert.equal(playFix.dollars_cents, 250000, "40 x 4/120 x $1,875");
assert.ok(playFix.fix.text && playFix.fix.source.startsWith("wiki/"));
assert.equal(bookingFix.extra, 6);
assert.equal(bookingFix.deals, 1);
assert.equal(bookingFix.dollars_cents, 187500);
const risk = report.fixes.find((f) => f.kind === "risk");
assert.equal(risk.id, "risk:unmatched-payments");
assert.equal(risk.dollars_cents, 30000);
assert.equal(risk.action.route, "revenue");
assert.deepEqual(report.fixes.map((f) => f.id), ["step:visit>play", "step:application>booking", "risk:unmatched-payments"]);

// Health score: weighted by money at stake, 4 steps measured.
assert.equal(report.score.steps_measured, 4);
assert.equal(report.score.weighting, "money");
assert.equal(report.score.value, 86);

// Last 24 hours vs the 29 days before.
const todayVisits = report.today.metrics.find((m) => m.key === "visit");
assert.equal(report.today.has_history, true);
assert.equal(todayVisits.value, 0);
assert.equal(todayVisits.status, "within", "one busy day in 29 keeps zero inside the normal band");

// All time counts everyone.
const allTime = await funnelHealthReport(env, "acme", { range: "all", now: NOW });
assert.deepEqual(allTime.steps.map((s) => s.count), [400, 280, 140, 64, 6]);

// ---------- a steady client: today above a normal day ----------
await addClient("steady", null);
for (let day = 1; day <= 29; day += 1) {
  for (let i = 0; i < 10; i += 1) visit("steady", `d${day}-${i}`, ago(day, 1));
}
for (let i = 0; i < 25; i += 1) visit("steady", `today-${i}`, ago(0, 2));
const steady = await funnelHealthReport(env, "steady", { range: "30d", now: NOW });
const steadyVisits = steady.today.metrics.find((m) => m.key === "visit");
assert.equal(steadyVisits.value, 25);
assert.equal(steadyVisits.average, 10);
assert.equal(steadyVisits.high, 10);
assert.equal(steadyVisits.status, "above");
assert.equal(steadyVisits.change, 1.5);
assert.equal(steady.score, null, "no steps measured, no score");

// ---------- a fresh funnel: applications, no calendar, no payments ----------
await addClient("fresh", null);
for (let i = 0; i < 30; i += 1) {
  visit("fresh", `f${i}`, ago(2));
  touch("fresh", `f${i}@x.com`, "application", ago(2));
}
const fresh = await funnelHealthReport(env, "fresh", { range: "30d", now: NOW });
assert.deepEqual(fresh.steps.map((s) => s.key), ["visit", "application", "buyer"]);
assert.equal(fresh.steps.find((s) => s.key === "buyer").unmeasured, "no_payments", "no payment ever: buying is not graded");
assert.equal(fresh.steps.find((s) => s.key === "buyer").grade, null);
assert.equal(fresh.fixes[0].id, "setup:calendar", "setup gaps come first");
assert.equal(fresh.fixes.some((f) => f.kind === "opportunity"), false, "no history, no target, no invented fix");
assert.equal(fresh.today.has_history, false);
assert.equal(fresh.today.metrics[0].status, "no_history");
assert.equal(fresh.cash.aov_cents, null);

// ---------- small numbers are not graded ----------
await addClient("tiny", null);
for (let i = 0; i < 8; i += 1) visit("tiny", `t${i}`, ago(3));
for (let i = 0; i < 2; i += 1) touch("tiny", `t${i}@x.com`, "application", ago(3));
const tiny = await funnelHealthReport(env, "tiny", { range: "30d", now: NOW });
assert.equal(tiny.steps.find((s) => s.key === "application").needs, 20);
assert.equal(tiny.steps.find((s) => s.key === "application").grade, null);

// ---------- the API ----------
let res = await funnelHealthGet({ request: new Request("https://pulsify-ai.com/api/funnel-health"), env });
assert.equal(res.status, 401);
res = await funnelHealthGet({ request: new Request("https://pulsify-ai.com/api/funnel-health?client=acme", { headers: { "x-portal-token": "token-other" } }), env });
assert.equal(res.status, 403, "a token for one client cannot read another");
res = await funnelHealthGet({ request: new Request("https://pulsify-ai.com/api/funnel-health?range=90d", { headers: { "x-portal-token": "token-acme" } }), env });
assert.equal(res.status, 200);
const body = await res.json();
assert.equal(body.client, "acme");
assert.equal(body.range, "90d");
res = await funnelHealthGet({ request: new Request("https://pulsify-ai.com/api/funnel-health?range=bogus", { headers: { "x-portal-token": "token-acme" } }), env });
assert.equal((await res.json()).range, "30d", "unknown range falls back to 30 days");

console.log("funnel-health: all checks passed");
