import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const migration = readFileSync(
  new URL("../migrations/0025_data_spine.sql", import.meta.url),
  "utf8",
);

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(migration);
  return db;
}

test("data spine migration is additive and idempotent", () => {
  const db = database();
  assert.doesNotThrow(() => db.exec(migration));
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  ).all().map((row) => row.name);
  for (const name of [
    "metric_points",
    "snapshots",
    "stories",
    "yt_leads",
    "yt_leads_meta",
    "operator_state",
    "sync_runs",
    "ig_conversations",
    "ig_messages",
  ]) assert.ok(tables.includes(name), `${name} should exist`);
});

test("metric points reject a duplicate observation", () => {
  const db = database();
  const insert = db.prepare(
    `INSERT INTO metric_points
      (scope, client_id, source, metric, ts, value, dims_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const point = ["operator", "", "instagram", "followers", "2026-09-17T12:00:00Z", 101, "{}"];
  insert.run(...point);
  assert.throws(() => insert.run(...point), /UNIQUE constraint failed/);
});

test("Instagram messages require a conversation and valid direction", () => {
  const db = database();
  db.prepare(
    `INSERT INTO ig_conversations
      (id, operator_email, participant_id, last_message_at, last_direction,
       payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, '{}', ?, ?)`,
  ).run(
    "conversation-1",
    "operator@example.com",
    "participant-1",
    "2026-09-17T12:00:00Z",
    "outbound",
    "2026-09-17T12:00:00Z",
    "2026-09-17T12:00:00Z",
  );
  const insert = db.prepare(
    `INSERT INTO ig_messages
      (id, conversation_id, operator_email, direction, sent_at, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, '{}', ?)`,
  );
  insert.run(
    "message-1",
    "conversation-1",
    "operator@example.com",
    "outbound",
    "2026-09-17T12:00:00Z",
    "2026-09-17T12:00:00Z",
  );
  assert.throws(
    () => insert.run(
      "message-2",
      "missing",
      "operator@example.com",
      "inbound",
      "2026-09-17T12:01:00Z",
      "2026-09-17T12:01:00Z",
    ),
    /FOREIGN KEY constraint failed/,
  );
  assert.throws(
    () => insert.run(
      "message-3",
      "conversation-1",
      "operator@example.com",
      "sideways",
      "2026-09-17T12:02:00Z",
      "2026-09-17T12:02:00Z",
    ),
    /CHECK constraint failed/,
  );
});
