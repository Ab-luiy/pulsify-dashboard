// Funnel stages on posted videos (founder 2026-10-23): the guess (what the video did first, then its title), the
// creator's choice winning, the stage on Videos by cash, and story sequences no longer cut to one day.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { guessStage, videoStage, cleanStage } from "../functions/_shared/video-stage.js";
import { videoCashReport } from "../functions/_shared/video-cash.js";
import { onRequestGet as metricsSequences } from "../functions/api/metrics-sequences.js";
import { CLIENT_SESSION_COOKIE } from "../functions/_shared/client-auth.js";
import { sha256Hex } from "../functions/_shared/common.js";

// The guess: behaviour first, then the title.
assert.deepEqual(guessStage({ title: "why trading is easy for me", buyers: 1 }), { stage: "BOF", why: "Its viewers paid" });
assert.equal(guessStage({ title: "why trading is easy for me", calls: 2 }).stage, "BOF");
assert.equal(guessStage({ title: "why trading is easy for me", calls: 1 }).stage, "TOF", "one stray call from a big video is not BOF");
assert.equal(guessStage({ title: "My student went from losing to funded" }).stage, "BOF");
assert.equal(guessStage({ title: "The Wick Theory Strategy (FULL TRADE BREAKDOWN)" }).stage, "MOF");
assert.equal(guessStage({ title: "Prop firm challenge? Here's why you're likely to fail" }).stage, "TOF");
assert.equal(cleanStage("bof"), "BOF");
assert.equal(cleanStage("ZOF"), null);
// The creator's choice wins and says it was theirs.
assert.deepEqual(videoStage({ video_id: "v1", title: "My student got funded" }, { v1: "MOF" }), { value: "MOF", guess: "BOF", why: "The title shows proof or the offer", confirmed: true });
assert.equal(videoStage({ video_id: "v1", title: "My student got funded" }, { v1: "nonsense" }).confirmed, false);

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
  },
};
const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
sql.prepare("INSERT INTO client_config(client, client_name, status) VALUES ('c1','C1','client'), ('c2','C2','client')").run();
for (const [client, id, title] of [["c1", "v1", "How my student got funded"], ["c1", "v2", "why trading is easy for me"], ["c2", "v9", "Other client"]]) {
  sql.prepare("INSERT INTO yt_videos(client_id, video_id, title, published_at, duration_seconds, views, synced_at) VALUES (?,?,?,?,600,1000,?)").run(client, id, title, day(20), day(0));
}
sql.prepare("INSERT INTO workspace_preferences(client_id, key, value_json, updated_at) VALUES ('c1','video-stages',?,?), ('c2','video-stages',?,?)").run(JSON.stringify({ stages: { v2: "MOF" } }), day(0), JSON.stringify({ stages: { v1: "TOF" } }), day(0));
const report = await videoCashReport(env, "c1", { range: "all" });
const byId = Object.fromEntries(report.videos.map((v) => [v.video_id, v.stage]));
assert.deepEqual(byId.v1, { value: "BOF", guess: "BOF", why: "The title shows proof or the offer", confirmed: false });
assert.equal(byId.v2.value, "MOF");
assert.equal(byId.v2.confirmed, true, "the creator's choice is read back");
assert.equal(report.videos.length, 2, "another client's videos and choices never mix in");

// Story sequences: no ?days= gives the default window, not just today.
const token = "session-token";
sql.prepare("INSERT INTO client_sessions(token_hash, client_id, expires_at, created_at) VALUES (?, 'c1', ?, ?)").run(await sha256Hex(token), new Date(Date.now() + 86400000).toISOString(), day(0));
for (const n of [0, 3, 10]) {
  sql.prepare("INSERT INTO sequence_log(client_id, posted_on, type, topic, slide_count, slide_views_json, dms, created_at, updated_at) VALUES ('c1',?,?,?,3,'[100,90,80]',2,?,?)").run(day(n).slice(0, 10), "value-driven", `Sequence ${n}`, day(n), day(n));
}
const get = async (query) => (await metricsSequences({ request: new Request(`https://funnels.test/api/metrics-sequences${query}`, { headers: { cookie: `${CLIENT_SESSION_COOKIE}=${token}` } }), env })).json();
const all = await get("");
assert.equal(all.days, 60);
assert.equal(all.rows.length, 3, "every sequence from the default window, not only today's");
assert.equal((await get("?days=7")).rows.length, 2, "an asked-for window still applies");

console.log("PASS video stages and the story sequence window");
