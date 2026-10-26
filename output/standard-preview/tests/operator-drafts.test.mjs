import { strict as assert } from "node:assert";
import * as drafts from "../functions/api/operator-drafts.js";

/* Operator drafts (#67): what an operator types in the console comes back, keyed to that operator,
   never to a client; nobody without an operator sign-in can read or write them. */

class MockDB {
  constructor() { this.rows = []; }
  prepare(sql) {
    const db = this;
    const text = sql.replace(/\s+/g, " ").trim();
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      async first() {
        const [owner, form] = this.values;
        return db.rows.find((row) => row.client_id === owner && row.form_key === form) || null;
      },
      async run() {
        if (text.startsWith("INSERT INTO form_drafts")) {
          const [owner, form, draftJson, position, updatedAt] = this.values;
          db.rows = db.rows.filter((row) => !(row.client_id === owner && row.form_key === form));
          db.rows.push({ client_id: owner, form_key: form, draft_json: draftJson, position, updated_at: updatedAt });
        } else if (text.startsWith("DELETE FROM form_drafts")) {
          const [owner, form] = this.values;
          db.rows = db.rows.filter((row) => !(row.client_id === owner && row.form_key === form));
        } else throw new Error(`Unexpected run: ${text}`);
        return { meta: { changes: 1 } };
      },
    };
  }
}

const db = new MockDB();
const env = { DB: db, ADMIN_KEY: "" };
const url = (form) => `https://pulsify-ai.com/api/operator-drafts?form=${form}`;
const call = (handler, request, operator) => handler({ request, env, data: operator ? { operator } : {} });
const founder = { email: "Founder@Example.test" };

// No operator: refused, nothing stored.
let response = await call(drafts.onRequestGet, new Request(url("email-compose")));
assert.equal(response.status, 401);
response = await call(drafts.onRequestPut, new Request(url(""), { method: "PUT", body: JSON.stringify({ form: "email-compose", draft: { body: "x" } }) }));
assert.equal(response.status, 401);
assert.equal(db.rows.length, 0);

// Save, read back, keyed to the operator (lower-cased), never a client id.
response = await call(drafts.onRequestPut, new Request(url(""), { method: "PUT", body: JSON.stringify({ form: "email-compose", draft: { subject: "Hi", body: "Half a sent" }, position: null }) }), founder);
assert.equal(response.status, 200);
assert.equal(db.rows[0].client_id, "operator:founder@example.test");
response = await call(drafts.onRequestGet, new Request(url("email-compose")), founder);
const body = await response.json();
assert.deepEqual(body.draft, { subject: "Hi", body: "Half a sent" });

// Another operator does not see it.
response = await call(drafts.onRequestGet, new Request(url("email-compose")), { email: "other@example.test" });
assert.equal((await response.json()).draft, null);

// Bad keys and oversized drafts are refused.
response = await call(drafts.onRequestPut, new Request(url(""), { method: "PUT", body: JSON.stringify({ form: "Bad Key!", draft: {} }) }), founder);
assert.equal(response.status, 422);
response = await call(drafts.onRequestPut, new Request(url(""), { method: "PUT", body: JSON.stringify({ form: "big", draft: "x".repeat(200_001) }) }), founder);
assert.equal(response.status, 422);

// Delete removes it.
response = await call(drafts.onRequestDelete, new Request(url("email-compose"), { method: "DELETE" }), founder);
assert.equal(response.status, 200);
assert.equal(db.rows.length, 0);

console.log("PASS operator drafts: operator-only, keyed per operator, bad keys and big drafts refused, delete clears");
