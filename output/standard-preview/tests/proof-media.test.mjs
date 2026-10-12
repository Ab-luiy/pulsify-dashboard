import { strict as assert } from "node:assert";
import * as mediaUploadApi from "../functions/api/media-upload.js";
import * as mediaRoute from "../functions/m/[[key]].js";
import { deleteClientProofMedia } from "../functions/api/settings.js";

class MockDB {
  constructor(configs = []) {
    this.configs = configs;
    this.proof = [];
    this.nextProofId = 1;
  }

  prepare(sql) {
    return new MockStatement(this, sql);
  }
}

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    if (this.sql.includes("FROM client_config") && this.sql.includes("portal_token_hash")) {
      const row = this.db.configs.find((entry) => entry.portal_token_hash === this.values[0]);
      return row ? { client: row.client, client_name: row.client_name || row.client } : null;
    }
    throw new Error(`Unexpected first query: ${this.sql}`);
  }

  async run() {
    if (this.sql.startsWith("INSERT INTO proof_items")) {
      const [clientId, url, claim, createdAt] = this.values;
      const id = this.db.nextProofId++;
      this.db.proof.push({
        id,
        client_id: clientId,
        kind: "image-link",
        url,
        claim,
        permission: "unknown",
        created_at: createdAt,
      });
      return { meta: { changes: 1, last_row_id: id } };
    }
    throw new Error(`Unexpected run query: ${this.sql}`);
  }
}

class MockMedia {
  constructor() {
    this.objects = new Map();
    this.calls = { put: 0, get: 0, delete: 0, list: 0 };
  }

  async put(key, value, options = {}) {
    this.calls.put += 1;
    const body = value instanceof ReadableStream
      ? await new Response(value).arrayBuffer()
      : await new Response(value).arrayBuffer();
    this.objects.set(key, {
      body,
      httpMetadata: options.httpMetadata || {},
      customMetadata: options.customMetadata || {},
    });
  }

  async get(key) {
    this.calls.get += 1;
    const stored = this.objects.get(key);
    if (!stored) return null;
    return {
      body: stored.body.slice(0),
      httpMetadata: stored.httpMetadata,
      httpEtag: `"mock-${key}"`,
    };
  }

  async delete(keys) {
    this.calls.delete += 1;
    for (const key of Array.isArray(keys) ? keys : [keys]) this.objects.delete(key);
  }

  async list({ prefix = "" } = {}) {
    this.calls.list += 1;
    return {
      objects: [...this.objects.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })),
      truncated: false,
    };
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function uploadRequest(token, file, claim = "") {
  const form = new FormData();
  form.set("file", file, file.name);
  form.set("claim", claim);
  return new Request("https://funnels.test/api/media-upload", {
    method: "POST",
    headers: { "x-portal-token": token },
    body: form,
  });
}

async function run() {
  const token = "client-token-alpha";
  const media = new MockMedia();
  const env = {
    DB: new MockDB([{ client: "alpha", client_name: "Alpha Coach", portal_token_hash: await sha256Hex(token) }]),
    MEDIA: media,
  };

  const rejectedType = await mediaUploadApi.onRequestPost({
    request: uploadRequest(token, new File(["not an image"], "spoofed.png", { type: "image/png" })),
    env,
  });
  assert.equal(rejectedType.status, 415);
  assert.equal(media.calls.put, 0);
  assert.equal(env.DB.proof.length, 0);

  const rejectedSize = await mediaUploadApi.onRequestPost({
    request: uploadRequest(
      token,
      new File([new Uint8Array(mediaUploadApi.MAX_UPLOAD_BYTES + 1)], "large.png", { type: "image/png" }),
    ),
    env,
  });
  assert.equal(rejectedSize.status, 413);
  assert.equal(media.calls.put, 0);
  assert.equal(env.DB.proof.length, 0);

  const uploaded = await mediaUploadApi.onRequestPost({
    request: uploadRequest(
      token,
      new File([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], "student-result.png", { type: "image/png" }),
      "Student reached the stated result.",
    ),
    env,
  });
  const uploadBody = await uploaded.json();
  assert.equal(uploaded.status, 201);
  assert.equal(uploadBody.ok, true);
  assert.equal(uploadBody.id, 1);
  assert.equal(uploadBody.kind, "image-link");
  assert.match(uploadBody.url, /^\/m\/alpha\/[0-9a-f-]{36}\.png$/i);
  assert.equal(env.DB.proof.length, 1);
  assert.deepEqual(
    { kind: env.DB.proof[0].kind, url: env.DB.proof[0].url, claim: env.DB.proof[0].claim, permission: env.DB.proof[0].permission },
    { kind: "image-link", url: uploadBody.url, claim: "Student reached the stated result.", permission: "unknown" },
  );

  const key = uploadBody.url.replace(/^\/m\//, "");
  const served = await mediaRoute.onRequestGet({ params: { key: key.split("/") }, env });
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/png");
  assert.equal(served.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.deepEqual([...new Uint8Array(await served.arrayBuffer())], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(served.headers.get("x-content-type-options"), "nosniff");
  const imageHead = await mediaRoute.onRequestHead({ params: { key }, env });
  assert.equal(imageHead.status, 200);
  assert.equal(await imageHead.text(), "");

  // The public image route must never become a download route for other R2 namespaces.
  // Synthetic fixtures only: no production private objects are accessed by this regression.
  const getsBeforePrivate = media.calls.get;
  for (const privateKey of [
    "archive/workspaces/alpha/export.json",
    "archive/00000000-0000-4000-8000-000000000000.png",
    "clients/alpha/voice-notes/00000000-0000-4000-8000-000000000000",
    "operator-photos/00000000-0000-4000-8000-000000000000.png",
    "avatars/operator/example.png",
    "alpha/private.json",
  ]) {
    await media.put(privateKey, 'PRIVATE FIXTURE', { httpMetadata: { contentType: "application/json" } });
    for (const method of ["onRequestGet", "onRequestHead"]) {
      const response = await mediaRoute[method]({ params: { key: privateKey.split("/") }, env });
      assert.equal(response.status, 404, `${method} must deny private objects`);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  }
  assert.equal(media.calls.get, getsBeforePrivate, "private paths must be rejected before bucket lookup");
  // Clean only these mock objects so the existing client-prefix cleanup assertions stay isolated.
  await media.delete("alpha/private.json");

  const disguised = "alpha/11111111-1111-4111-8111-111111111111.png";
  await media.put(disguised, 'PRIVATE FIXTURE', { httpMetadata: { contentType: "application/json" } });
  const rejectedMetadata = await mediaRoute.onRequestGet({ params: { key: disguised }, env });
  assert.equal(rejectedMetadata.status, 404);
  await media.delete(disguised);

  const missing = await mediaRoute.onRequestGet({ params: { key: ["alpha", "00000000-0000-4000-8000-000000000000.png"] }, env });
  assert.equal(missing.status, 404);

  await media.put("alpha/second.webp", new Uint8Array([1]), { httpMetadata: { contentType: "image/webp" } });
  await media.put("beta/keep.png", new Uint8Array([2]), { httpMetadata: { contentType: "image/png" } });
  const deleted = await deleteClientProofMedia(env, "alpha");
  assert.equal(deleted, 2);
  assert.equal(media.objects.has(key), false);
  assert.equal(media.objects.has("alpha/second.webp"), false);
  assert.equal(media.objects.has("beta/keep.png"), true);
  assert.ok(media.calls.put >= 3);
  assert.ok(media.calls.get >= 2);
  assert.ok(media.calls.list >= 1);
  assert.ok(media.calls.delete >= 1);

  console.log("PASS proof media: validation, token-scoped R2 upload, proof row, serving, missing 404, and prefix cleanup");
}

run().catch((error) => {
  console.error(`FAIL proof media: ${error?.stack || error}`);
  process.exitCode = 1;
});
