import { strict as assert } from "node:assert";
import * as clientBrainApi from "../functions/api/client-brain.js";
import * as onboardRoute from "../functions/onboard/[[path]].js";

class MockDB {
  constructor(seed = {}) {
    this.configs = seed.configs || [];
    this.brain = seed.brain || [];
    this.proof = seed.proof || [];
    this.nextBrainId = 1;
    this.nextProofId = 1;
  }

  prepare(sql) {
    return new MockStatement(this, sql);
  }

  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
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
    if (this.sql.includes("FROM client_config") && this.sql.includes("client_name")) {
      const row = this.db.configs.find((entry) => entry.client === this.values[0]);
      return row ? { client_name: row.client_name || row.client } : null;
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
    throw new Error(`Unexpected all query: ${this.sql}`);
  }

  async run() {
    if (this.sql.startsWith("INSERT INTO client_brain")) {
      const [clientId, section, field, valueJson, source, updatedAt] = this.values;
      const existing = this.db.brain.find((row) => row.client_id === clientId && row.section === section && row.field === field);
      if (existing) Object.assign(existing, { value_json: valueJson, source, updated_at: updatedAt });
      else this.db.brain.push({ id: this.db.nextBrainId++, client_id: clientId, section, field, value_json: valueJson, source, updated_at: updatedAt });
      return { meta: { changes: 1, last_row_id: existing?.id || this.db.nextBrainId - 1 } };
    }
    if (this.sql.startsWith("DELETE FROM proof_items")) {
      const before = this.db.proof.length;
      this.db.proof = this.db.proof.filter((row) => row.client_id !== this.values[0]);
      return { meta: { changes: before - this.db.proof.length } };
    }
    if (this.sql.startsWith("INSERT INTO proof_items")) {
      const [clientId, kind, url, claim, permission, createdAt] = this.values;
      const id = this.db.nextProofId++;
      this.db.proof.push({ id, client_id: clientId, kind, url, claim, permission, created_at: createdAt });
      return { meta: { changes: 1, last_row_id: id } };
    }
    if (this.sql.startsWith("DELETE FROM client_brain")) {
      const [clientId, section, field] = this.values;
      const before = this.db.brain.length;
      this.db.brain = this.db.brain.filter((row) => !(row.client_id === clientId && row.section === section && row.field === field));
      return { meta: { changes: before - this.db.brain.length } };
    }
    throw new Error(`Unexpected run query: ${this.sql}`);
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clientRequest(token, body) {
  return new Request("https://funnels.test/api/client-brain", {
    method: "POST",
    headers: { "content-type": "application/json", "x-portal-token": token },
    body: JSON.stringify(body),
  });
}

function adminRequest(client) {
  return new Request(`https://funnels.test/api/client-brain?client=${client}`, {
    headers: { "x-admin-key": "operator-secret" },
  });
}

async function testClientSubmitAndOperatorRead() {
  const token = "client-token-alpha";
  const env = {
    ADMIN_KEY: "operator-secret",
    DB: new MockDB({
      configs: [{ client: "alpha", client_name: "Alpha Coach", portal_token_hash: await sha256Hex(token) }],
    }),
  };

  const submission = {
    client: "alpha",
    answers: {
      identity: {
        name: "Alpha Coach",
        handles: ["@alpha", "https://youtube.test/alpha"],
        business_explainer: "I teach operators to turn a repeatable service into recurring revenue.",
      },
      offer: {
        voice_note_url: "https://drive.test/offer-note",
        direction: "Build a high-ticket mentoring offer around the operating system.",
      },
      icp: { client_guess: "Service operators who have delivery skill but inconsistent demand." },
      story: {
        input_type: "transcript",
        voice_note_url: "",
        transcript: "I started as a freelancer, built the system, then taught it to other operators.",
        narrative: "",
      },
      voice: {
        tone: ["serious", "informal"],
        curse_slang: "sometimes",
        positioning_attitude: "I kept building when other people treated the work like a hobby.",
        sample_links: ["https://video.test/sample"],
      },
      proof: {
        has_proof: true,
        items: [{ kind: "screenshot-link", url: "https://proof.test/student-win.png", claim: "Student reached recurring revenue." }],
      },
    },
    proof_items: [{
      kind: "screenshot-link",
      url: "https://proof.test/student-win.png",
      claim: "Student reached recurring revenue.",
      permission: "granted",
    }],
  };

  const submitResponse = await clientBrainApi.onRequestPost({ request: clientRequest(token, submission), env });
  assert.equal(submitResponse.status, 200);
  const submitBody = await submitResponse.json();
  assert.equal(submitBody.ok, true);
  assert.equal(submitBody.client, "alpha");
  assert.equal(submitBody.proof_items_saved, 1);

  const byKey = new Map(env.DB.brain.map((row) => [`${row.section}.${row.field}`, row]));
  assert.equal(byKey.get("identity.name").source, "client-form");
  assert.equal(JSON.parse(byKey.get("identity.name").value_json), "Alpha Coach");
  assert.equal(byKey.get("offer.voice_note_url").source, "voice-note");
  assert.equal(byKey.get("story.transcript").source, "transcript");
  assert.equal(byKey.get("icp.client_guess").source, "client-form");
  assert.equal(byKey.get("voice.sample_links").source, "client-form");
  assert.equal(byKey.get("proof.has_proof").source, "client-form");
  assert.equal(env.DB.proof[0].kind, "screenshot-link");
  assert.equal(env.DB.proof[0].permission, "unknown");

  const readResponse = await clientBrainApi.onRequestGet({ request: adminRequest("alpha"), env });
  assert.equal(readResponse.status, 200);
  const readBody = await readResponse.json();
  assert.equal(readBody.ok, true);
  assert.equal(readBody.sections.length, 8);
  assert.deepEqual(readBody.sections.map((section) => section.key), ["identity", "offer", "icp", "story", "voice", "proof", "funnel", "donot"]);
  const identity = readBody.sections.find((section) => section.key === "identity");
  const funnel = readBody.sections.find((section) => section.key === "funnel");
  const icp = readBody.sections.find((section) => section.key === "icp");
  assert.equal(identity.fields.find((field) => field.key === "name").value, "Alpha Coach");
  assert.equal(identity.fields.find((field) => field.key === "name").source, "client-form");
  assert.equal(icp.fields.find((field) => field.key === "avatar").operator_only, true);
  assert.equal(icp.fields.find((field) => field.key === "avatar").gap, true);
  assert.ok(funnel.fields.every((field) => field.operator_only && field.gap));
  assert.equal(readBody.proof_items.length, 1);
  assert.ok(readBody.summary.gaps > 0);

  const operatorResponse = await clientBrainApi.onRequestPost({
    request: new Request("https://funnels.test/api/client-brain", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "operator-secret" },
      body: JSON.stringify({ client: "alpha", section: "icp", field: "avatar", value: "Operators with proven delivery and inconsistent acquisition.", source: "research" }),
    }),
    env,
  });
  assert.equal(operatorResponse.status, 200);
  assert.equal(env.DB.brain.find((row) => row.section === "icp" && row.field === "avatar").source, "research");
}

async function testTokenCannotCrossClients() {
  const token = "client-token-alpha";
  const env = {
    ADMIN_KEY: "operator-secret",
    DB: new MockDB({ configs: [{ client: "alpha", portal_token_hash: await sha256Hex(token) }] }),
  };
  const response = await clientBrainApi.onRequestPost({
    request: clientRequest(token, { client: "beta", answers: { identity: { name: "Wrong client" } } }),
    env,
  });
  assert.equal(response.status, 403);
  assert.equal(env.DB.brain.length, 0);
}

async function testOnboardingPageTokenGate() {
  const token = "client-token-alpha";
  const env = {
    DB: new MockDB({ configs: [{ client: "alpha", client_name: "Alpha Coach", portal_token_hash: await sha256Hex(token) }] }),
    ASSETS: { fetch: async () => new Response("<!doctype html><title>Onboarding</title>", { status: 200 }) },
  };
  const rejected = await onboardRoute.onRequest({
    request: new Request("https://funnels.test/onboard/"),
    env,
    params: { path: [] },
    next: () => new Response("next"),
  });
  assert.equal(rejected.status, 401);

  const accepted = await onboardRoute.onRequest({
    request: new Request(`https://funnels.test/onboard/?t=${token}`),
    env,
    params: { path: [] },
    next: () => new Response("next"),
  });
  assert.equal(accepted.status, 200);
  assert.match(await accepted.text(), /Onboarding/);
}

try {
  await testClientSubmitAndOperatorRead();
  await testTokenCannotCrossClients();
  await testOnboardingPageTokenGate();
  console.log("PASS client brain: token page and submit write sourced rows, admin read groups all eight sections");
} catch (error) {
  console.error(`FAIL client brain: ${error?.stack || error}`);
  process.exitCode = 1;
}
