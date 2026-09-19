import test from "node:test";
import assert from "node:assert/strict";
import { syncInstagramInbox } from "../workers/sync/src/jobs/instagram-inbox.js";

test("unchanged Instagram inbox exits after one Composio list call", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ data: { conversations: [{ id: "c1", updated_time: "2026-09-17T10:00:00Z" }] } });
  };
  const env = {
    COMPOSIO_API_KEY: "test",
    DB: {
      prepare() {
        return {
          async first() {
            return { payload_json: JSON.stringify({ ownId: "owner", connectedAccountId: "owner", watermark: "2026-09-17T11:00:00Z" }) };
          },
          async all() {
            return { results: [{ id: "c1", last_message_at: "2026-09-17T10:00:00Z" }] };
          },
        };
      },
    },
  };
  try {
    assert.equal(await syncInstagramInbox(env), 0);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("bootstrap uses durable conversation timestamps instead of replaying all history", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let stateWrites = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({ data: { conversations: [{ id: "c1", updated_time: "2026-09-17T10:00:00Z" }] } });
  };
  const env = {
    COMPOSIO_API_KEY: "test",
    DB: {
      prepare(sql) {
        if (sql.includes("SELECT payload_json")) return { async first() { return { payload_json: JSON.stringify({ ownId: "owner", connectedAccountId: "owner" }) }; } };
        if (sql.includes("SELECT id,last_message_at")) return { async all() { return { results: [{ id: "c1", last_message_at: "2026-09-17T10:00:00Z" }] }; } };
        if (sql.includes("INSERT INTO snapshots")) return { bind() { return { async run() { stateWrites += 1; } }; } };
        throw new Error(`Unexpected SQL: ${sql}`);
      },
    },
  };
  try {
    assert.equal(await syncInstagramInbox(env), 0);
    assert.equal(calls, 1);
    assert.equal(stateWrites, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
