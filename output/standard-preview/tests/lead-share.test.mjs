import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { sharedProfileHandles, scoutHandles, captureScoutShare } from "../functions/_shared/lead-share.js";

test("extracts profiles from shared message text and attachment metadata", () => {
  const handles = sharedProfileHandles({
    text: "https://www.instagram.com/coach.lee/?igsh=abc",
    attachments: [{ metadata: { url: "https://instagram.com/trader_amy/" } }],
  });
  assert.deepEqual(handles, ["coach.lee", "trader_amy"]);
  assert.deepEqual(sharedProfileHandles({ text: "https://instagram.com/reel/ABC123" }), []);
});

test("only configured scout accounts are allowed to submit prospects", async () => {
  const env = { OUTREACH_SCOUT_HANDLES: "@scout.one, scout_two" };
  assert.deepEqual([...scoutHandles(env)], ["scout.one", "scout_two"]);
  const result = await captureScoutShare(env, {
    senderHandle: "random_person",
    message: { text: "https://instagram.com/prospect" },
  });
  assert.equal(result.captured, 0);
  assert.equal(result.ignored, "sender not allowlisted");
});

test("captures once, skips existing conversations, and leaves unresearched copy blank", async () => {
  const sql = new DatabaseSync(":memory:");
  sql.exec(readFileSync(new URL("../migrations/0035_outreach_queue.sql", import.meta.url), "utf8"));
  sql.exec("CREATE TABLE ig_conversations(id TEXT PRIMARY KEY, participant_username TEXT)");
  sql.exec("INSERT INTO ig_conversations VALUES ('old', 'already.contact')");
  const DB = { prepare(query) {
    let args = [];
    const stmt = {
      bind(...values) { args = values; return stmt; },
      async first() { return sql.prepare(query).get(...args) || null; },
      async run() { return sql.prepare(query).run(...args); },
    };
    return stmt;
  } };
  const env = { DB, OUTREACH_SCOUT_HANDLES: "niche.scout" };
  const message = { text: "https://instagram.com/new.prospect and https://instagram.com/already.contact" };
  const first = await captureScoutShare(env, { senderHandle: "niche.scout", message });
  assert.equal(first.captured, 1);
  assert.deepEqual(first.duplicates, ["already.contact"]);
  assert.deepEqual(sql.prepare("SELECT handle,draft,detail FROM outreach_queue").all().map((row) => ({ ...row })), [{ handle: "new.prospect", draft: null, detail: null }]);
  const again = await captureScoutShare(env, { senderHandle: "niche.scout", message });
  assert.equal(again.captured, 0);
  assert.deepEqual(again.duplicates, ["new.prospect", "already.contact"]);
});
