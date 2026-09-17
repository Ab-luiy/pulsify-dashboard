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
