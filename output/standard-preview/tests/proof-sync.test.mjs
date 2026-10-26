// Saving the proof list keeps library ids and uploads (pulsify-saas #61, backend audit 2026-10-12).
// It used to delete every proof_items row for the client and insert the list again: new ids every
// save, and uploads that were not on the list disappeared from the library. Real SQLite.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { onRequestPost as brainPost } from "../functions/api/client-brain.js";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(new URL("../migrations/0014_client_brain.sql", import.meta.url), "utf8"));
sql.exec(readFileSync(new URL("../migrations/0063_client_brain_sections.sql", import.meta.url), "utf8"));
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,portal_token_hash TEXT)");
sql.prepare("INSERT INTO client_config VALUES(?,?,?,?)").run("acme", "Acme", "client", null);

const env = {
  ADMIN_KEY: "operator-secret",
  DB: {
    prepare(query) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        async first() { return sql.prepare(query).get(...args) || null; },
        async all() { return { results: sql.prepare(query).all(...args) }; },
        async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: result.changes } }; },
      };
      return statement;
    },
    async batch(statements) { const out = []; for (const statement of statements) out.push(await statement.run()); return out; },
  },
};

const operatorSave = (value, extra = {}) => brainPost({
  request: new Request("https://x/api/client-brain", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": "operator-secret" },
    body: JSON.stringify({ client: "acme", section: "proof", field: "items", value, ...extra }),
  }),
  env,
  data: {},
});
const rows = () => sql.prepare("SELECT id, url, claim, permission FROM proof_items WHERE client_id='acme' ORDER BY id").all().map((row) => ({ ...row }));

test("a proof list save keeps ids, keeps uploads that are not on the list, and only drops removed links", async () => {
  // An upload in the library (media-upload.js puts these in proof_items) and one link already listed.
  sql.prepare("INSERT INTO proof_items (client_id, kind, url, claim, permission, created_at) VALUES (?,?,?,?,?,?)")
    .run("acme", "image-link", "/m/acme/upload.png", null, "unknown", "2026-10-01T00:00:00.000Z");
  let response = await operatorSave([{ kind: "video-link", url: "https://youtu.be/a", claim: "Student A", permission: "granted" }]);
  assert.equal(response.status, 200);
  const first = rows();
  assert.equal(first.length, 2, "the upload stays and the link is added");
  const uploadId = first.find((row) => row.url === "/m/acme/upload.png").id;
  const linkId = first.find((row) => row.url === "https://youtu.be/a").id;

  // Edit the claim and add a second link: same ids for the rows that were there.
  response = await operatorSave([
    { kind: "video-link", url: "https://youtu.be/a", claim: "Student A, funded", permission: "granted" },
    { kind: "video-link", url: "https://youtu.be/b", claim: "Student B", permission: "unknown" },
  ]);
  assert.equal(response.status, 200);
  const second = rows();
  assert.equal(second.find((row) => row.url === "https://youtu.be/a").id, linkId, "editing a claim keeps the id");
  assert.equal(second.find((row) => row.url === "https://youtu.be/a").claim, "Student A, funded");
  assert.equal(second.find((row) => row.url === "/m/acme/upload.png").id, uploadId, "the upload keeps its id");
  assert.equal(second.length, 3);

  // Remove link A from the list: only A goes.
  response = await operatorSave([{ kind: "video-link", url: "https://youtu.be/b", claim: "Student B", permission: "unknown" }]);
  assert.equal(response.status, 200);
  assert.deepEqual(rows().map((row) => row.url).sort(), ["/m/acme/upload.png", "https://youtu.be/b"]);

  // An upload that was on the list and is taken off stays in the library.
  await operatorSave([
    { kind: "video-link", url: "https://youtu.be/b", claim: "Student B", permission: "unknown" },
    { kind: "image-link", url: "/m/acme/upload.png", claim: "Payout", permission: "granted" },
  ]);
  await operatorSave([{ kind: "video-link", url: "https://youtu.be/b", claim: "Student B", permission: "unknown" }]);
  assert.ok(rows().some((row) => row.url === "/m/acme/upload.png" && row.id === uploadId), "taking an upload off the list never deletes it");

  // Clearing the list removes the listed links; the upload stays.
  response = await operatorSave(null, { clear: true });
  assert.equal(response.status, 200);
  assert.deepEqual(rows().map((row) => row.url), ["/m/acme/upload.png"]);
});
