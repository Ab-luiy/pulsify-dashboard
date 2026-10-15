import { strict as assert } from "node:assert";
import * as saleStory from "../functions/api/sale-story.js";

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function mockDb(configs) {
  const db = { configs, rows: [] };
  db.prepare = (sql) => {
    const text = sql.replace(/\s+/g, " ").trim();
    return {
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      async first() {
        if (text.includes("portal_token_hash")) {
          const row = db.configs.find((entry) => entry.portal_token_hash === this.values[0]);
          return row ? { client: row.client, client_name: row.client } : null;
        }
        if (text.startsWith("SELECT answers_json")) return db.rows.find((row) => row.client_id === this.values[0]) || null;
        throw new Error(`Unexpected first: ${text}`);
      },
      async all() {
        if (text.startsWith("SELECT client_id, answers_json")) return { results: [...db.rows] };
        throw new Error(`Unexpected all: ${text}`);
      },
      async run() {
        if (text.startsWith("INSERT INTO sale_stories")) {
          const [client, answersJson, completedAt, updatedAt] = this.values;
          const existing = db.rows.find((row) => row.client_id === client);
          if (existing) Object.assign(existing, { answers_json: answersJson, updated_at: updatedAt });
          else db.rows.push({ client_id: client, answers_json: answersJson, completed_at: completedAt, updated_at: updatedAt });
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unexpected run: ${text}`);
      },
    };
  };
  return db;
}

const TOKEN = "story-token";
const full = {
  believed: "Your breakdown of my funnel.",
  decision_time: "few-days",
  almost_stopped: { pick: "price", more: "It was a stretch." },
  video: { link: "https://youtu.be/abc" },
  confidence: { score: 7, more: "I liked the call." },
  touchpoints: [{ pick: "dm", rating: 4, note: "" }],
  secret: "dropped",
};

async function setup() {
  return { DB: mockDb([{ client: "alpha", portal_token_hash: await sha256Hex(TOKEN) }]) };
}

const clientPost = (answers) =>
  new Request("https://funnels.test/api/sale-story", {
    method: "POST",
    headers: { "content-type": "application/json", "x-portal-token": TOKEN },
    body: JSON.stringify({ answers }),
  });

async function testClientSavesOnce() {
  const env = await setup();
  const response = await saleStory.onRequestPost({ request: clientPost(full), env });
  assert.equal(response.status, 200);
  const stored = JSON.parse(env.DB.rows[0].answers_json);
  assert.equal(stored.secret, undefined);
  assert.equal(stored.confidence.score, 7);
  const first = env.DB.rows[0].completed_at;
  await saleStory.onRequestPost({ request: clientPost({ ...full, believed: "Changed." }), env });
  assert.equal(env.DB.rows.length, 1);
  assert.equal(env.DB.rows[0].completed_at, first);
  assert.equal(JSON.parse(env.DB.rows[0].answers_json).believed, "Changed.");
}

async function testIncompleteIsRefused() {
  const env = await setup();
  const response = await saleStory.onRequestPost({ request: clientPost({ believed: "Only this." }), env });
  assert.equal(response.status, 422);
  assert.equal(env.DB.rows.length, 0);
}

async function testClientCannotRead() {
  const env = await setup();
  const response = await saleStory.onRequestGet({
    request: new Request("https://funnels.test/api/sale-story?client=alpha", { headers: { "x-portal-token": TOKEN } }),
    env,
  });
  assert.equal(response.status, 403);
}

try {
  await testClientSavesOnce();
  await testIncompleteIsRefused();
  await testClientCannotRead();
  console.log("PASS sale story: client saves part A, incomplete refused, clients cannot read");
} catch (error) {
  console.error(`FAIL sale story: ${error?.stack || error}`);
  process.exitCode = 1;
}
