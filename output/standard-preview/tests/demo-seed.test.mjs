// The Example workspace for sales calls and outreach videos (a demo trader; money, leads and payments are estimates): the seed builds every screen the
// video shows, reruns cleanly, never touches another client or the demo login, and no sync can overwrite it.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { videoCashReport, dueVideoClients } from "../functions/_shared/video-cash.js";
import { loadPerson } from "../functions/_shared/lead-people.js";
import { loadCalls } from "../functions/_shared/lead-calls.js";
import { loadCallDetail } from "../functions/_shared/call-detail.js";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(new URL("./fixtures/d1-schema.sql", import.meta.url), "utf8"));

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
    async batch(list) { return Promise.all(list.map((s) => s.run())); },
  },
};

const client = "demo-example";
// A real client whose rows the seed must never touch, and the demo's own login and page settings.
sql.prepare("INSERT INTO client_config(client, client_name, status) VALUES ('acme','Acme','client')").run();
sql.prepare("INSERT INTO page_events(client, visitor_id, event, at) VALUES ('acme','a1','page_view','2026-09-30T00:00:00.000Z')").run();
sql.prepare("INSERT INTO payments(client, amount_cents, currency, rail, reference, occurred_at, recorded_by, created_at) VALUES ('acme',50000,'USD','manual','acme-1','2026-09-30T00:00:00.000Z','op','2026-09-30T00:00:00.000Z')").run();
sql.prepare("INSERT INTO client_config(client, client_name, status, page_content_json) VALUES (?, 'Example Trading Co', 'demo', '{\"kept\":true}')").run(client);
sql.prepare("INSERT INTO client_sessions(token_hash, client_id, expires_at, created_at) VALUES ('h1', ?, '2099-01-01', '2026-10-01')").run(client);

const seedSql = () => execFileSync("node", [new URL("../tools/seed-demo-workspace.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
sql.exec(seedSql());

const config = sql.prepare("SELECT client_name, status, page_content_json FROM client_config WHERE client=?").get(client);
assert.equal(config.status, "demo");
assert.equal(config.client_name, "Demo trader");
assert.equal(config.page_content_json, '{"kept":true}', "the seed updates the workspace row, it never recreates it");
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM client_sessions WHERE client_id=?").get(client).n, 1, "the demo login survives");

// Views vs money: two mid-view videos carry the cash; the most viewed video, several times the normal, has none.
const cash = await videoCashReport(env, client, { range: "all" });
assert.equal(cash.handle, "@demotrader");
assert.equal(cash.videos.length, 30);
const [first, second] = cash.videos;
assert.match(first.title, /7 Funded Accounts/);
assert.match(second.title, /\$124,550/);
const breakout = [...cash.videos].sort((a, b) => b.views - a.views)[0];
assert.ok(breakout.outlier?.multiplier >= 5, "the most viewed video stands out against the channel's normal");
assert.equal(breakout.cash_cents, 0);
assert.ok(breakout.views > 5 * first.views && first.cash_cents >= 900000, "views and money point different ways");
assert.ok(cash.videos.every((v) => v.thumbnail_url?.startsWith("data:image/jpeg;base64,")), "every video has its real thumbnail inline");

// Funnel stages: roughly 60/25/15, MOF and BOF carry the cash, the newest ones wait for the creator's OK.
const share = (stage) => cash.videos.filter((v) => v.stage.value === stage).length / cash.videos.length;
assert.ok(share("TOF") >= 0.5 && share("TOF") <= 0.65 && share("MOF") >= 0.2 && share("MOF") <= 0.3 && share("BOF") >= 0.1 && share("BOF") <= 0.2, "a believable spread");
const cashBy = (stage) => cash.videos.filter((v) => v.stage.value === stage).reduce((n, v) => n + v.cash_cents, 0);
assert.ok(cashBy("MOF") + cashBy("BOF") > 4 * cashBy("TOF"), "MOF and BOF bring the cash, TOF the views");
assert.equal(cash.videos.filter((v) => !v.stage.confirmed).length, 3);

// Neither sync picks the example workspace up (they would replace the made-up numbers).
assert.deepEqual(await dueVideoClients(env, { force: true }), []);
const instagram = JSON.parse(sql.prepare("SELECT config_json FROM integrations WHERE client_id=? AND provider='instagram'").get(client).config_json);
assert.equal(instagram.account_id, undefined, "no Zernio account, so the client Instagram sync never runs");

// Maya's path: Tuesday bio click, Friday YouTube, Sunday applied, Monday booked, Wednesday paid; credit on the first touch.
const maya = await loadPerson(env, client, "maya.okafor@example.com");
const journey = [...maya.journey].reverse();
const firstTouch = journey.find((e) => e.first_touch);
assert.equal(firstTouch.kind, "page_view");
assert.equal(firstTouch.link?.placement, "bio");
const day = (kind) => new Date(journey.find((e) => e.kind === kind).at).getUTCDay();
assert.equal(new Date(firstTouch.at).getUTCDay(), 2);
assert.equal(new Date(journey.find((e) => e.kind === "page_view" && e.video).at).getUTCDay(), 5);
assert.equal(day("application"), 0);
assert.equal(day("booking"), 1);
assert.equal(day("payment"), 3);

// Calls: upcoming ones with a pre-call brief, one waiting on a form, past ones with outcomes.
const calls = await loadCalls(env, client);
const json = JSON.stringify(calls);
assert.ok(json.includes("hannah.cole@example.com"), "Hannah's call is on the Calls tab");
const hannahRef = sql.prepare("SELECT external_id FROM pipeline_touches WHERE client_id=? AND kind='booking' AND contact_email='hannah.cole@example.com'").get(client).external_id;
const detail = await loadCallDetail(env, client, hannahRef);
assert.equal(detail.briefs.length, 1);
assert.match(detail.briefs[0].summary, /^WANT:/);
assert.ok(Date.parse(detail.call_at) > Date.now(), "the briefed call is still ahead");
assert.ok(sql.prepare("SELECT COUNT(*) AS n FROM lead_outcomes WHERE client_id=?").get(client).n >= 10);

// Stories, Instagram, the week plan: present and dated no later than now.
assert.ok(sql.prepare("SELECT COUNT(*) AS n FROM sequence_log WHERE client_id=?").get(client).n >= 12);
assert.equal(JSON.parse(sql.prepare("SELECT payload_json FROM snapshots WHERE scope='client' AND client_id=? AND kind='profile'").get(client).payload_json).followers, 11840);
assert.ok(JSON.parse(sql.prepare("SELECT value_json FROM workspace_preferences WHERE client_id=? AND key='content-plan'").get(client).value_json).slots.length >= 8);
const nowIso = new Date(Date.now() + 60000).toISOString();
for (const [table, column] of [["page_events", "at"], ["payments", "occurred_at"], ["sequence_log", "created_at"], ["ig_dm_events", "at"]]) {
  assert.equal(sql.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${table === "ig_dm_events" || table === "sequence_log" ? "client_id" : "client"}=? AND ${column} > ?`).get(client, nowIso).n, 0, `${table} has nothing in the future`);
}

// Rerun: same shape, no duplicates, the real client untouched.
const before = sql.prepare("SELECT (SELECT COUNT(*) FROM payments WHERE client=?) AS p, (SELECT COUNT(*) FROM page_events WHERE client=?) AS e, (SELECT COUNT(*) FROM studio_sequences WHERE client_id=?) AS s").get(client, client, client);
sql.exec(seedSql());
assert.deepEqual(sql.prepare("SELECT (SELECT COUNT(*) FROM payments WHERE client=?) AS p, (SELECT COUNT(*) FROM page_events WHERE client=?) AS e, (SELECT COUNT(*) FROM studio_sequences WHERE client_id=?) AS s").get(client, client, client), before);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM client_config WHERE client=?").get(client).n, 1);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM page_events WHERE client='acme'").get().n, 1);
assert.equal(sql.prepare("SELECT amount_cents FROM payments WHERE client='acme'").get().amount_cents, 50000);

// Invented people throughout: only example.com addresses, and no real name or handle anywhere (the reference channel stays unnamed).
const emails = sql.prepare("SELECT DISTINCT contact_email FROM pipeline_touches WHERE client_id=?").all(client).map((r) => r.contact_email);
assert.ok(emails.length > 20 && emails.every((e) => e.endsWith("@example.com")));
const everything = seedSql().replace(/data:image\/jpeg;base64,[A-Za-z0-9+/=]+/g, "").toLowerCase(); // image bytes are not text
for (const real of ["ab.luiy", "abdul", "dovy", "tb.tradez", "theo marsh"]) assert.ok(!everything.includes(real), `the seed never mentions ${real}`);

console.log("demo-seed.test.mjs ok");
