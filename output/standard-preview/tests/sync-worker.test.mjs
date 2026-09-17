import assert from "node:assert/strict";
import test from "node:test";
import worker, { scheduledJob } from "../workers/sync/src/index.js";

test("cron schedules map to exactly one sync job", () => {
  assert.equal(scheduledJob("* * * * *"), "instagram-inbox");
  assert.equal(scheduledJob("15 */6 * * *"), "youtube");
  assert.equal(scheduledJob("0 5 * * *"), "instagram");
  assert.equal(scheduledJob("0 6 * * 1"), "leads");
  assert.equal(scheduledJob("0 0 * * *"), null);
});

test("manual runs require operator identity and health is public", async () => {
  let response = await worker.fetch(
    new Request("https://sync.example/run/instagram-inbox", { method: "POST" }),
    { ACCESS_AUD: "audience" },
    { waitUntil() {} },
  );
  assert.equal(response.status, 401);
  response = await worker.fetch(
    new Request("https://sync.example/health"),
    {},
    { waitUntil() {} },
  );
  assert.deepEqual(await response.json(), { ok: true, worker: "pulsify-sync" });
});
