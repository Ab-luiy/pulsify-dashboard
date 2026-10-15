import { strict as assert } from "node:assert";
import * as clientBrainApi from "../functions/api/client-brain.js";
import { buildGeneratorBrainContext } from "../functions/_shared/client-brain-context.js";

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

class MockDB {
  constructor(seed = {}) {
    this.configs = seed.configs || [];
    this.brain = seed.brain || [];
    this.history = [];
    this.nextId = 1;
  }
  prepare(sql) {
    return new MockStatement(this, sql);
  }
  async batch(statements) {
    const out = [];
    for (const statement of statements) out.push(await statement.run());
    return out;
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
      return row ? { client: row.client, client_name: row.client } : null;
    }
    if (this.sql.includes("FROM client_config")) return { client_name: this.values[0] };
    throw new Error(`Unexpected first: ${this.sql}`);
  }
  async all() {
    if (this.sql.includes("FROM client_brain_history")) {
      return { results: this.db.history.filter((row) => row.client_id === this.values[0]).reverse() };
    }
    if (this.sql.includes("FROM client_brain")) return { results: this.db.brain.filter((row) => row.client_id === this.values[0]) };
    if (this.sql.includes("FROM proof_items")) return { results: [] };
    throw new Error(`Unexpected all: ${this.sql}`);
  }
  async run() {
    if (this.sql.startsWith("INSERT INTO client_brain_history")) {
      // INSERT ... SELECT: copy the current row when its value differs from the new one.
      const [replacedAt, clientId, section, field, newValue] = this.values;
      const current = this.db.brain.find((row) => row.client_id === clientId && row.section === section && row.field === field);
      if (!current || current.value_json === newValue) return { meta: { changes: 0 } };
      this.db.history.push({ id: this.db.nextId++, client_id: clientId, section, field, value_json: current.value_json, source: current.source, replaced_at: replacedAt });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith("INSERT INTO client_brain")) {
      const [clientId, section, field, valueJson, source, updatedAt] = this.values;
      const existing = this.db.brain.find((row) => row.client_id === clientId && row.section === section && row.field === field);
      if (existing) Object.assign(existing, { value_json: valueJson, source, updated_at: updatedAt });
      else this.db.brain.push({ client_id: clientId, section, field, value_json: valueJson, source, updated_at: updatedAt });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith("DELETE FROM client_brain")) return { meta: { changes: 0 } };
    throw new Error(`Unexpected run: ${this.sql}`);
  }
}

const TOKEN = "client-token-v2";
const post = (body) =>
  new Request("https://funnels.test/api/client-brain", {
    method: "POST",
    headers: { "content-type": "application/json", "x-portal-token": TOKEN },
    body: JSON.stringify(body),
  });

async function env() {
  return { DB: new MockDB({ configs: [{ client: "alpha", portal_token_hash: await sha256Hex(TOKEN) }] }) };
}

async function testNewSectionsAcceptClientAnswers() {
  const e = await env();
  const response = await clientBrainApi.onRequestPost({
    request: post({
      client: "alpha",
      answers: {
        money: { last_3_months: [{ month: "2026-09", revenue: 12400, profit: 7600 }], monthly_income: "12400" },
        positioning: { mechanism_status: "unnamed", method_walkthrough: "Step one, step two." },
        content: { yt_format: "miro" },
        commitment: { understood: "yes", promised: "in" },
        funnel: { leak: { pick: "no-show", more: "They ghost after booking." } },
        identity: { age: "27" },
        nope: { anything: "dropped" },
      },
    }),
    env: e,
  });
  assert.equal(response.status, 200);
  const saved = e.DB.brain.map((row) => `${row.section}.${row.field}`).sort();
  assert.deepEqual(saved, [
    "commitment.promised",
    "commitment.understood",
    "content.yt_format",
    "funnel.leak",
    "identity.age",
    "money.last_3_months",
    "money.monthly_income",
    "positioning.mechanism_status",
    "positioning.method_walkthrough",
  ]);
  assert.ok(e.DB.brain.every((row) => row.source === "client-form"));
}

async function testHistoryKeepsTheReplacedAnswer() {
  const e = await env();
  await clientBrainApi.onRequestPost({ request: post({ client: "alpha", answers: { story: { start_type: "broke" } } }), env: e });
  await clientBrainApi.onRequestPost({ request: post({ client: "alpha", answers: { story: { start_type: "job" } } }), env: e });
  await clientBrainApi.onRequestPost({ request: post({ client: "alpha", answers: { story: { start_type: "job" } } }), env: e });
  assert.equal(e.DB.history.length, 1, "an unchanged answer writes no history");
  assert.equal(JSON.parse(e.DB.history[0].value_json), "broke");
}

async function testGeneratorsNeverSeeMoneyOrCommitment() {
  const rows = [
    { section: "money", field: "monthly_income", value_json: JSON.stringify("12400") },
    { section: "commitment", field: "promised", value_json: JSON.stringify("in") },
    { section: "positioning", field: "love_topics", value_json: JSON.stringify("Prop firm psychology") },
    { section: "content", field: "yt_format", value_json: JSON.stringify("miro") },
  ];
  const context = buildGeneratorBrainContext({ rows, proof_items: [] });
  assert.match(context.prompt_text, /Prop firm psychology/);
  assert.match(context.prompt_text, /miro/);
  assert.doesNotMatch(context.prompt_text, /12400/);
  assert.doesNotMatch(context.prompt_text, /The deal|Promised/);
}

async function testGroupedBrainListsNewSections() {
  const grouped = clientBrainApi.groupBrainRows([]);
  const keys = grouped.sections.map((section) => section.key);
  for (const key of ["intent", "money", "positioning", "content", "program", "commitment"]) assert.ok(keys.includes(key), key);
  const money = grouped.sections.find((section) => section.key === "money");
  assert.equal(money.fields.find((field) => field.key === "last_3_months").type, "json");
}

try {
  await testNewSectionsAcceptClientAnswers();
  await testHistoryKeepsTheReplacedAnswer();
  await testGeneratorsNeverSeeMoneyOrCommitment();
  await testGroupedBrainListsNewSections();
  console.log("PASS onboarding v2 brain: new sections, history, generator privacy");
} catch (error) {
  console.error(`FAIL onboarding v2 brain: ${error?.stack || error}`);
  process.exitCode = 1;
}
