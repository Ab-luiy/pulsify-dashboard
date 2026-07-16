import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import * as carouselApi from "../functions/api/studio-carousels.js";
import { sanitizeCarouselOutput } from "../functions/_shared/carousel-prompt.js";
import { CLIENT_SESSION_COOKIE } from "../functions/_shared/client-auth.js";

class MockDB {
  constructor() {
    this.configs = [];
    this.clientSessions = [];
    this.impersonationSessions = [];
    this.brain = [];
    this.proof = [];
    this.carousels = [];
    this.nextId = 1;
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
    if (this.sql.includes("FROM impersonation_sessions s")) {
      const [tokenHash, cutoff] = this.values;
      const row = this.db.impersonationSessions.find((entry) =>
        entry.token_hash === tokenHash && entry.consumed_at && entry.expires_at > cutoff);
      if (!row) return null;
      const config = this.db.configs.find((entry) => entry.client === row.client_id);
      return { ...row, client_name: config?.client_name || row.client_id };
    }
    if (this.sql.includes("FROM client_sessions s")) {
      const [tokenHash, cutoff] = this.values;
      const row = this.db.clientSessions.find((entry) => entry.token_hash === tokenHash && entry.expires_at > cutoff);
      if (!row) return null;
      const config = this.db.configs.find((entry) => entry.client === row.client_id);
      return { ...row, client_name: config?.client_name || row.client_id };
    }
    if (this.sql.includes("FROM client_config") && this.sql.includes("portal_token_hash=?")) {
      const row = this.db.configs.find((entry) => entry.portal_token_hash === this.values[0]);
      return row ? { client: row.client, client_name: row.client_name || row.client } : null;
    }
    if (this.sql.includes("FROM client_config") && this.sql.includes("page_content_json")) {
      return this.db.configs.find((entry) => entry.client === this.values[0]) || null;
    }
    if (this.sql.includes("FROM studio_carousels") && this.sql.includes("WHERE id=?")) {
      const row = this.db.carousels.find((entry) => entry.id === Number(this.values[0]));
      return row ? { ...row } : null;
    }
    throw new Error(`Unexpected first query: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes("FROM client_brain")) {
      return { results: this.db.brain.filter((row) => row.client_id === this.values[0]) };
    }
    if (this.sql.includes("FROM proof_items")) {
      return { results: this.db.proof.filter((row) => row.client_id === this.values[0]) };
    }
    if (this.sql.includes("FROM studio_carousels")) {
      let rows = [...this.db.carousels];
      if (this.sql.includes("WHERE client_id=?")) rows = rows.filter((row) => row.client_id === this.values[0]);
      if (this.sql.includes("WHERE status=?")) rows = rows.filter((row) => row.status === this.values[0]);
      return { results: rows.sort((a, b) => b.id - a.id).map((row) => ({ ...row })) };
    }
    throw new Error(`Unexpected all query: ${this.sql}`);
  }

  async run() {
    if (this.sql === "DELETE FROM client_sessions WHERE expires_at<?") {
      this.db.clientSessions = this.db.clientSessions.filter((row) => row.expires_at >= this.values[0]);
      return changed(0);
    }
    if (this.sql === "DELETE FROM impersonation_sessions WHERE expires_at<?") {
      this.db.impersonationSessions = this.db.impersonationSessions.filter((row) => row.expires_at >= this.values[0]);
      return changed(0);
    }
    if (this.sql.startsWith("INSERT INTO studio_carousels")) {
      const [clientId, structure, topic, goal, paramsJson, outputJson, manualPrompt, reviewNote, createdAt, updatedAt] = this.values;
      const id = this.db.nextId++;
      this.db.carousels.push({
        id,
        client_id: clientId,
        structure,
        topic,
        goal,
        params_json: paramsJson,
        output_json: outputJson,
        manual_prompt: manualPrompt,
        status: "draft",
        review_note: reviewNote,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return { meta: { changes: 1, last_row_id: id } };
    }
    if (this.sql.startsWith("UPDATE studio_carousels") && this.sql.includes("SET status='review'")) {
      const [updatedAt, id] = this.values;
      const row = this.db.carousels.find((entry) => entry.id === Number(id));
      if (!row) return changed(0);
      Object.assign(row, { status: "review", review_note: null, updated_at: updatedAt });
      return changed(1);
    }
    if (this.sql.startsWith("UPDATE studio_carousels") && this.sql.includes("status='draft'")) {
      const [outputJson, updatedAt, id] = this.values;
      const row = this.db.carousels.find((entry) => entry.id === Number(id));
      if (!row) return changed(0);
      Object.assign(row, { output_json: outputJson, status: "draft", review_note: null, updated_at: updatedAt });
      return changed(1);
    }
    if (this.sql.startsWith("UPDATE studio_carousels") && this.sql.includes("WHERE id=? AND status='review'")) {
      const [status, note, updatedAt, id] = this.values;
      const row = this.db.carousels.find((entry) => entry.id === Number(id) && entry.status === "review");
      if (!row) return changed(0);
      Object.assign(row, { status, review_note: note, updated_at: updatedAt });
      return changed(1);
    }
    throw new Error(`Unexpected run query: ${this.sql}`);
  }
}

function changed(changes) {
  return { meta: { changes } };
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function request(method, body, headers = {}, query = "") {
  return new Request(`https://funnels.test/api/studio-carousels${query}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

async function createEnv() {
  const db = new MockDB();
  const alphaToken = "alpha-portal-token";
  const betaToken = "beta-portal-token";
  db.configs.push(
    { client: "alpha", client_name: "Alpha Coach", page_content_json: "{}", portal_token_hash: await sha256Hex(alphaToken) },
    { client: "beta", client_name: "Beta Coach", page_content_json: "{}", portal_token_hash: await sha256Hex(betaToken) },
  );
  db.brain.push({
    id: 1,
    client_id: "alpha",
    section: "funnel",
    field: "trigger_words",
    value_json: JSON.stringify(["SYSTEM"]),
    source: "operator",
    updated_at: new Date().toISOString(),
  });
  db.proof.push({
    id: 1,
    client_id: "alpha",
    kind: "image",
    url: "https://proof.test/result",
    claim: "Student doubled booked calls after rebuilding the profile funnel.",
    permission: "granted",
    created_at: new Date().toISOString(),
  });
  return { env: { DB: db, ADMIN_KEY: "operator-secret" }, db, alphaToken, betaToken };
}

async function testManualGenerateAndSanitizer() {
  const { env, db, alphaToken } = await createEnv();
  const response = await carouselApi.onRequestPost({
    request: request("POST", {
      action: "generate",
      manual_mode: true,
      structure: "taxonomy",
      topic: "The five profile funnel leaks",
      goal: "reach",
    }, { "x-portal-token": alphaToken }),
    env,
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.mode, "manual");
  assert.equal(db.carousels.length, 1);
  assert.equal(db.carousels[0].status, "draft");
  assert.match(db.carousels[0].manual_prompt, /Selected structure spec \(taxonomy\)/);
  assert.match(db.carousels[0].manual_prompt, /cadence is purple, function is gray, audience is green/i);
  assert.match(db.carousels[0].manual_prompt, /Never use lifestyle flex, cars, watches, hotels, cash/i);
  assert.match(db.carousels[0].manual_prompt, /Student doubled booked calls/);
  assert.equal(body.output.slides.length, 7);
  assert.equal(body.output.slides[1].design.chips.length, 3);
  assert.equal(body.output.slides[1].design.ghost_number, "02");

  const sanitized = sanitizeCarouselOutput({
    structure: "methodology",
    slides: [{
      n: 1,
      role: "cover",
      headline: "Proof",
      body: "",
      design: {
        annotation: [{ type: "red-box", target: "receipt" }],
        image_class: { type: "lifestyle-frame", artifact: "supercar outside a luxury hotel" },
        treatment: { text: "drop-shadow", alignment: "left" },
        chips: [],
        ghost_number: "1",
      },
    }],
  }, { structure: "methodology", slideCount: 5 });
  assert.ok([
    "proof-screenshot",
    "device-mockup",
    "proof-wall",
    "real-workspace",
  ].includes(sanitized.slides[0].design.image_class.type));
  assert.doesNotMatch(sanitized.slides[0].design.image_class.artifact, /supercar|luxury|hotel/i);

  const taxonomy = sanitizeCarouselOutput({
    structure: "taxonomy",
    slides: [
      { n: 1, role: "cover", headline: "Five types", design: { image_class: "proof-wall" } },
      { n: 2, role: "type 1", headline: "Proof type", design: {
        image_class: "device-mockup",
        chips: [
          { axis: "cadence", label: "daily", color: "red" },
          { axis: "function", label: "teach", color: "blue" },
          { axis: "audience", label: "warm", color: "orange" },
        ],
      } },
      { n: 3, role: "type 2", headline: "Process type", design: { image_class: "device-mockup" } },
      { n: 4, role: "type 3", headline: "Belief type", design: { image_class: "device-mockup" } },
      { n: 5, role: "proof and CTA", headline: "Close", cta: "DM SYSTEM", design: { image_class: "proof-wall" } },
    ],
  }, { structure: "taxonomy", goal: "reach", triggerWord: "SYSTEM", slideCount: 5 });
  assert.deepEqual(taxonomy.slides[1].design.chips.map((chip) => chip.color), ["purple", "gray", "green"]);
  assert.match(taxonomy.slides[4].cta, /^Comment SYSTEM/);
}

async function testLlmPathWhenKeyExists() {
  const { env, alphaToken } = await createEnv();
  env.GEMINI_API_KEY = "test-key";
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        structure: "philosophy",
        title: "Beliefs",
        slides: Array.from({ length: 7 }, (_, index) => ({
          n: index + 1,
          role: index === 0 ? "cover" : index === 6 ? "thesis and close" : `concept ${index}`,
          headline: `Slide ${index + 1}`,
          body: "A grounded belief shift.",
          cta: index === 6 ? "DM SYSTEM" : "",
          design: { image_class: index === 1 ? "lifestyle-frame" : "real-workspace" },
        })),
      }) }] } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await carouselApi.onRequestPost({
      request: request("POST", {
        action: "generate",
        manual_mode: false,
        structure: "philosophy",
        topic: "Beliefs that change the work",
        goal: "dms",
      }, { "x-portal-token": alphaToken }),
      env,
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(called, true);
    assert.equal(body.mode, "generated");
    assert.equal(body.provider, "gemini");
    assert.notEqual(body.output.slides[1].design.image_class.type, "lifestyle-frame");
    assert.match(body.output.slides[6].cta, /^DM SYSTEM/);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testLifecycleIsolationAndAdminAuth() {
  const { env, db, alphaToken } = await createEnv();
  const created = await carouselApi.onRequestPost({
    request: request("POST", { structure: "methodology", topic: "The acquisition system", goal: "dms" }, { "x-portal-token": alphaToken }),
    env,
  });
  const id = (await created.json()).id;

  const saved = await carouselApi.onRequestPost({
    request: request("POST", {
      action: "save",
      id,
      output: {
        structure: "methodology",
        slides: [{ n: 1, role: "cover", headline: "The system", body: "", design: { image_class: "proof-wall" } }],
      },
    }, { "x-portal-token": alphaToken }),
    env,
  });
  assert.equal(saved.status, 200);

  const betaId = db.nextId++;
  db.carousels.push({
    id: betaId,
    client_id: "beta",
    structure: "philosophy",
    topic: "Beta beliefs",
    goal: "reach",
    params_json: "{}",
    output_json: "{}",
    manual_prompt: "",
    status: "draft",
    review_note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const crossClient = await carouselApi.onRequestPost({
    request: request("POST", { action: "submit-for-review", id: betaId }, { "x-portal-token": alphaToken }),
    env,
  });
  assert.equal(crossClient.status, 404);

  const ownList = await carouselApi.onRequestGet({
    request: request("GET", null, { "x-portal-token": alphaToken }),
    env,
  });
  const ownBody = await ownList.json();
  assert.deepEqual(ownBody.rows.map((row) => row.client_id), ["alpha"]);

  const submitted = await carouselApi.onRequestPost({
    request: request("POST", { action: "submit-for-review", id }, { "x-portal-token": alphaToken }),
    env,
  });
  assert.equal(submitted.status, 200);
  assert.equal(db.carousels.find((row) => row.id === id).status, "review");

  const unauthenticatedAdminList = await carouselApi.onRequestGet({
    request: request("GET", null, {}, "?status=review"),
    env,
  });
  assert.equal(unauthenticatedAdminList.status, 401);

  for (const action of ["approve", "reject"]) {
    const denied = await carouselApi.onRequestPost({ request: request("POST", { action, id, note: "No" }), env });
    assert.equal(denied.status, 401, `${action} must require ADMIN_KEY`);
  }

  const adminList = await carouselApi.onRequestGet({
    request: request("GET", null, { "x-admin-key": "operator-secret" }, "?status=review"),
    env,
  });
  assert.equal(adminList.status, 200);
  assert.deepEqual((await adminList.json()).rows.map((row) => row.id), [id]);

  const approved = await carouselApi.onRequestPost({
    request: request("POST", { action: "approve", id }, { "x-admin-key": "operator-secret" }),
    env,
  });
  assert.equal(approved.status, 200);
  assert.equal(db.carousels.find((row) => row.id === id).status, "approved");
}

async function testImpersonationReadOnly() {
  const { env, db } = await createEnv();
  db.carousels.push({
    id: db.nextId++,
    client_id: "alpha",
    structure: "philosophy",
    topic: "Beliefs",
    goal: "reach",
    params_json: "{}",
    output_json: JSON.stringify({ slides: [] }),
    manual_prompt: "prompt",
    status: "draft",
    review_note: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const rawToken = "impersonated-carousel-session";
  db.impersonationSessions.push({
    token_hash: await sha256Hex(rawToken),
    client_id: "alpha",
    consumed_at: new Date().toISOString(),
    created_by: "admin",
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
  const headers = { cookie: `${CLIENT_SESSION_COOKIE}=${rawToken}` };
  const read = await carouselApi.onRequestGet({ request: request("GET", null, headers), env });
  assert.equal(read.status, 200);
  assert.equal((await read.json()).rows.length, 1);

  const write = await carouselApi.onRequestPost({
    request: request("POST", { action: "generate", structure: "philosophy", topic: "Blocked", goal: "reach" }, headers),
    env,
  });
  assert.equal(write.status, 403);
  assert.deepEqual(await write.json(), { error: "read only" });
}

async function testMigrationIsAdditiveAndConstrained() {
  const sql = await readFile(new URL("../migrations/0018_studio_carousels.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS studio_carousels/);
  assert.match(sql, /CHECK \(status IN \('draft', 'review', 'approved', 'rejected'\)\)/);
  assert.doesNotMatch(sql, /\b(?:DROP|ALTER|DELETE|UPDATE)\b/i);
}

try {
  await testManualGenerateAndSanitizer();
  await testLlmPathWhenKeyExists();
  await testLifecycleIsolationAndAdminAuth();
  await testImpersonationReadOnly();
  await testMigrationIsAdditiveAndConstrained();
  console.log("PASS carousel studio: manual prompt, sanitizer, save, lifecycle, isolation, impersonation, admin auth, and additive migration");
} catch (error) {
  console.error(`FAIL carousel studio: ${error?.stack || error}`);
  process.exitCode = 1;
}
