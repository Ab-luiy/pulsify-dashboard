// Posted story bursts log themselves into Sequence history and mark the matching app sequence as posted.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { bursts, logStorySequences } from "../workers/sync/src/jobs/story-sequences.js";

function env() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../migrations/0013_client_dashboard_metrics.sql", import.meta.url), "utf8"));
  sql.exec("CREATE TABLE studio_sequences (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL, type TEXT, intent TEXT, topic TEXT NOT NULL, goal TEXT, trigger_word TEXT, params_json TEXT NOT NULL, output_json TEXT, manual_prompt TEXT, status TEXT NOT NULL DEFAULT 'draft', review_note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
  const stmt = (q, a = []) => ({ bind(...v) { return stmt(q, v); }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } });
  const DB = { prepare: (q) => stmt(q), async batch(list) { for (const s of list) await s.run(); } };
  return { env: { DB }, sql };
}

const NOW = Date.parse("2026-10-13T12:00:00Z");
const story = (id, iso, views, extra = {}) => ({ id, timestamp: iso, insights: { views, replies: extra.replies ?? 0, profileVisits: extra.visits ?? 0 } });
const posted = [
  story("s1", "2026-10-11T18:00:00Z", 500, { replies: 1 }),
  story("s2", "2026-10-11T18:05:00Z", 410),
  story("s3", "2026-10-11T18:09:00Z", 330, { replies: 2, visits: 7 }),
  story("lone", "2026-10-12T09:00:00Z", 200),
];

test("stories close together are one burst; a long gap starts a new one", () => {
  assert.deepEqual(bursts(posted).map((burst) => burst.map((s) => s.id)), [["s1", "s2", "s3"], ["lone"]]);
});

test("a finished burst becomes a Sequence history row, matched to the app sequence, once", async () => {
  const t = env();
  t.sql.prepare("INSERT INTO studio_sequences (client_id, type, topic, params_json, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)").run("rio", "breakdown", "My 3 entry checks", "{}", "approved", "2026-10-10T10:00:00Z", "2026-10-10T10:00:00Z");
  await logStorySequences(t.env, "rio", posted, NOW);
  const rows = t.sql.prepare("SELECT * FROM sequence_log").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].topic, "My 3 entry checks");
  assert.equal(rows[0].type, "breakdown");
  assert.equal(rows[0].posted_on, "2026-10-11");
  assert.deepEqual(JSON.parse(rows[0].slide_views_json), [500, 410, 330]);
  assert.equal(rows[0].dms, 3);
  assert.equal(rows[0].profile_visits, 7);
  const sequence = JSON.parse(t.sql.prepare("SELECT params_json FROM studio_sequences").get().params_json);
  assert.deepEqual(sequence.instagram.story_ids, ["s1", "s2", "s3"]);
  // The next sync sees the same stories and adds nothing.
  await logStorySequences(t.env, "rio", posted, NOW + 3600_000);
  assert.equal(t.sql.prepare("SELECT COUNT(*) AS n FROM sequence_log").get().n, 1);
});

test("stories still live, or too few, wait; with no app sequence the row is named by its day", async () => {
  const t = env();
  await logStorySequences(t.env, "rio", posted, Date.parse("2026-10-12T10:00:00Z"));
  assert.equal(t.sql.prepare("SELECT COUNT(*) AS n FROM sequence_log").get().n, 0);
  await logStorySequences(t.env, "rio", posted, NOW);
  assert.equal(t.sql.prepare("SELECT topic FROM sequence_log").get().topic, "Stories on 2026-10-11");
});
