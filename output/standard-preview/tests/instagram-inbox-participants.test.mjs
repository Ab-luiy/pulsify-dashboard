import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { syncInstagramInbox, learnOwnId, findParticipant } from "../workers/sync/src/jobs/instagram-inbox.js";

// D1-shaped env over in-memory SQLite, migrations applied from files.
function makeEnv() {
  const sql = new DatabaseSync(":memory:");
  for (const file of readdirSync("migrations").sort()) {
    for (const stmt of readFileSync(`migrations/${file}`, "utf8").split(/;\s*\n/)) {
      const s = stmt.trim(); if (!s) continue;
      try { sql.exec(s); } catch { /* migration re-create noise */ }
    }
  }
  for (const table of ["crm_overrides", "crm_added", "crm_removed"]) sql.exec(`CREATE TABLE IF NOT EXISTS ${table}(name TEXT PRIMARY KEY,data TEXT NOT NULL,ts INTEGER NOT NULL,sts INTEGER NOT NULL,updated_at TEXT NOT NULL)`);
  const wrap = (statement, params) => ({
    async first() { return statement.get(...params) ?? null; },
    async all() { return { results: statement.all(...params) }; },
    async run() { const r = statement.run(...params); return { meta: { changes: r.changes, last_row_id: r.lastInsertRowid } }; },
  });
  const DB = {
    prepare(text) {
      const statement = sql.prepare(text);
      return { bind: (...params) => wrap(statement, params), ...wrap(statement, []) };
    },
    async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; },
  };
  return { env: { DB, COMPOSIO_API_KEY: "test", OPERATOR_EMAIL: "op@pulsify.test" }, sql };
}

// Composio shapes as seen live: the list call returns stubs with no sender;
// the messages call returns from/to with usernames. Our account is "ab.luiy"
// with Graph id 3608 and messaging id 1784 (different, as in production).
const LIST = { data: { conversations: [{ id: "t1", updated_time: "2026-09-19T12:46:47+0000", participants: null, messages: { data: [{ id: "m1", created_time: "2026-09-19T12:40:00+0000" }, { id: "m2", created_time: "2026-09-19T12:46:47+0000" }] } }] } };
const MESSAGES = { data: { data: [
  { id: "m2", created_time: "2026-09-19T12:46:47+0000", from: { id: "9999", username: "other.acc" }, to: { data: [{ id: "1784", username: "ab.luiy" }] }, message: "test" },
  { id: "m1", created_time: "2026-09-19T12:40:00+0000", from_: { id: "1784", username: "ab.luiy" }, to: { data: [{ id: "9999", username: "other.acc" }] }, message: "hey" },
] } };
const PROFILE = { data: { id: "3608", username: "ab.luiy" } };

function mockFetch(log) {
  return async (url, init) => {
    const body = JSON.parse(init?.body || "{}");
    const slug = String(url).split("/").filter(Boolean).find((p) => p.startsWith("INSTAGRAM_")) || body.slug || body.action || "";
    log.push(slug || String(url));
    const text = JSON.stringify(body) + String(url);
    if (text.includes("GET_USER_INFO")) return Response.json(PROFILE);
    if (text.includes("LIST_ALL_CONVERSATIONS")) return Response.json(LIST);
    if (text.includes("LIST_ALL_MESSAGES")) return Response.json(MESSAGES);
    return Response.json({ data: {} });
  };
}

test("learnOwnId picks the messaging id from our username, not the Graph id", () => {
  assert.equal(learnOwnId(MESSAGES.data.data, "ab.luiy"), "1784");
  assert.equal(learnOwnId(MESSAGES.data.data, ""), "");
});

test("findParticipant resolves the other party from message from/to when participants is null", () => {
  const messages = MESSAGES.data.data.map((raw) => { const f = raw.from || raw.from_; return { senderId: f.id, senderName: f.username, direction: f.id === "1784" ? "outbound" : "inbound", raw }; });
  const p = findParticipant({ participants: null }, "1784", messages);
  assert.deepEqual({ ...p }, { id: "9999", username: "other.acc", name: "other.acc" });
  // Outbound-only thread: recipient becomes the participant.
  const onlyOurs = [messages[1]];
  assert.equal(findParticipant({ participants: null }, "1784", onlyOurs).username, "other.acc");
});

test("sync stores the handle and classifies our own message as outbound", async () => {
  const { env, sql } = makeEnv();
  const log = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch(log);
  try {
    await syncInstagramInbox(env);
  } finally { globalThis.fetch = originalFetch; }
  const conv = sql.prepare("SELECT participant_id, participant_username, last_direction FROM ig_conversations WHERE id='t1'").get();
  assert.equal(conv.participant_username, "other.acc");
  assert.equal(conv.participant_id, "9999");
  assert.equal(conv.last_direction, "inbound");
  const msgs = sql.prepare("SELECT id, direction FROM ig_messages ORDER BY sent_at").all();
  assert.deepEqual(msgs.map((m) => ({ ...m })), [{ id: "m1", direction: "outbound" }, { id: "m2", direction: "inbound" }]);
  // Stubs lacked from/to, so the full messages call happened.
  assert.ok(log.some((s) => s.includes("LIST_ALL_MESSAGES")));
  const state = JSON.parse(sql.prepare("SELECT payload_json FROM snapshots WHERE kind='inbox-sync-state' LIMIT 1").get()?.payload_json || "{}");
  assert.equal(state.messagingId, "1784");
  assert.equal(state.ownUsername, "ab.luiy");
});

test("resync repairs rows written before the fix without re-emitting or double counting", async () => {
  const { env, sql } = makeEnv();
  const now = "2026-09-19T12:46:47.000Z";
  sql.prepare("INSERT INTO ig_conversations(id,operator_email,connected_account_id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at) VALUES('t1','op@pulsify.test','3608','','','Instagram lead',?,?,'inbound','{}',?,?)").run(now, now, now, now);
  sql.prepare("INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at) VALUES('m1','t1','op@pulsify.test','inbound','2026-09-19T12:40:00.000Z','hey','{}',?),('m2','t1','op@pulsify.test','inbound',?,'test','{}',?)").run(now, now, now);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch([]);
  let written;
  try { written = await syncInstagramInbox(env, { resync: true }); } finally { globalThis.fetch = originalFetch; }
  assert.equal(written, 0, "repaired rows are not new messages");
  const conv = sql.prepare("SELECT participant_username, last_direction FROM ig_conversations WHERE id='t1'").get();
  assert.equal(conv.participant_username, "other.acc");
  assert.equal(sql.prepare("SELECT direction FROM ig_messages WHERE id='m1'").get().direction, "outbound");
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM webhook_outbox").get()?.n ?? 0, 0, "no events during resync");
});
