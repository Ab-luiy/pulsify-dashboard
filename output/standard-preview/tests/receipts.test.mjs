// Pulsify income by crypto (pulsify-saas #24): one step records the payment and issues the receipt.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { rememberOperator } from "../functions/_shared/access.js";
import { onRequestGet as receiptsGet, onRequestPost as receiptsPost } from "../functions/api/receipts.js";
import { onRequestGet as walletsGet, onRequestPost as walletsPost, onRequestDelete as walletsDelete } from "../functions/api/wallets.js";
import { onRequestGet as publicReceipt } from "../functions/r/[token].js";

const sql = new DatabaseSync(":memory:");
const mig = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, status TEXT, updated_at TEXT, portal_token_hash TEXT)");
sql.exec("CREATE TABLE client_auth(client_id TEXT PRIMARY KEY,email TEXT UNIQUE,pass_hash TEXT,pass_salt TEXT,iterations INTEGER,created_at TEXT,updated_at TEXT)");
sql.exec("CREATE TABLE client_setup_tokens(token_hash TEXT,client_id TEXT,email TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE client_sessions(token_hash TEXT,client_id TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE impersonation_sessions(token_hash TEXT,exchange_hash TEXT,client_id TEXT,created_at TEXT,expires_at TEXT,created_by TEXT,consumed_at TEXT)");
sql.exec("CREATE TABLE proof_items(id INTEGER PRIMARY KEY,client_id TEXT,created_at TEXT)");
sql.exec("CREATE TABLE studio_sequences(id INTEGER PRIMARY KEY,client_id TEXT,status TEXT)");
for (const name of ["0007_delivery_failures.sql", "0008_integrations_hub.sql", "0014_client_brain.sql", "0015_operator_events.sql", "0021_workspace_records.sql", "0025_data_spine.sql", "0027_revenue_automation.sql", "0028_onboarding.sql", "0052_receipts.sql"]) {
  sql.exec(mig(name).replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/, ""));
}
sql.prepare("INSERT INTO client_config VALUES(?,?,?,?,?)").run("acme", "Acme Trading", "prospect", "2026-10-01", null);

const env = {
  ADMIN_KEY: "k",
  DB: {
    prepare(query) {
      let args = [];
      const stmt = {
        bind(...values) { args = values; return stmt; },
        async first() { return sql.prepare(query).get(...args) || null; },
        async all() { return { results: sql.prepare(query).all(...args) }; },
        async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
      };
      return stmt;
    },
    async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; },
  },
};
const op = (url, init = {}) => { const r = new Request(url, init); rememberOperator(r, { email: "op@test", via: "access" }); return r; };
const post = (url, body) => op(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const call = (fn, request) => fn({ request, env, data: { operator: { email: "op@test" } }, params: {} });

// Operator only.
assert.equal((await receiptsGet({ request: new Request("https://t/api/receipts"), env, data: {} })).status, 401);
assert.equal((await walletsGet({ request: new Request("https://t/api/wallets"), env, data: {} })).status, 401);

// Validation says what to fix.
const bad = async (body, pattern) => {
  const res = await call(receiptsPost, post("https://t/api/receipts", body));
  assert.equal(res.status, 422);
  assert.match((await res.json()).error, pattern);
};
const good = { client: "acme", amount: 2500, asset: "USDT", network: "TRON (TRC20)", txid: "a1b2c3d4e5f60718293a4b5c6d7e8f90", note: "First month" };
await bad({ ...good, client: "" }, /client/);
await bad({ ...good, asset: "DOGE" }, /asset/);
await bad({ ...good, asset: "BTC", network: "Solana" }, /network/);
await bad({ ...good, txid: "x" }, /transaction id/);
await bad({ ...good, amount: 0 }, /amount/);
await bad({ ...good, amount: "lots" }, /amount/);

// One step: payment recorded, receipt issued.
let res = await call(receiptsPost, post("https://pulsify-ai.com/api/receipts", good));
assert.equal(res.status, 200);
let out = await res.json();
assert.equal(out.duplicate, false);
assert.match(out.receipt.receipt_no, /^PUL-\d{4}-0001$/);
assert.match(out.url, /^https:\/\/pulsify-ai\.com\/r\/[a-f0-9]{36}$/);
assert.equal(out.receipt.amount_cents, 250000);
assert.equal(out.receipt.client_name, "Acme Trading");
const payment = sql.prepare("SELECT * FROM payments WHERE reference=?").get(good.txid);
assert.equal(payment.rail, "crypto");
assert.equal(payment.client, "acme");
assert.equal(payment.amount_cents, 250000);
assert.match(payment.note, /USDT on TRON \(TRC20\)\. First month/);

// The same transaction never issues a second receipt.
res = await call(receiptsPost, post("https://pulsify-ai.com/api/receipts", good));
out = await res.json();
assert.equal(out.duplicate, true);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM receipts").get().n, 1);

// A second payment numbers on.
res = await call(receiptsPost, post("https://pulsify-ai.com/api/receipts", { ...good, txid: "ffeeddccbbaa99887766554433221100", amount: 1000 }));
assert.match((await res.json()).receipt.receipt_no, /0002$/);

// The list and the total.
res = await call(receiptsGet, op("https://pulsify-ai.com/api/receipts"));
const list = await res.json();
assert.equal(list.receipts.length, 2);
assert.equal(list.total_cents, 350000);
assert.ok(list.assets.USDT.includes("TRON (TRC20)"));

// The public receipt: valid token shows the facts, wrong token is a 404, nothing leaks.
const token = list.receipts.at(-1).token;
res = await publicReceipt({ env, params: { token } });
assert.equal(res.status, 200);
const html = await res.text();
assert.match(html, /Payment received/);
assert.match(html, /Acme Trading/);
assert.match(html, /\$2,500\.00/);
assert.match(html, /a1b2c3d4e5f60718293a4b5c6d7e8f90/);
assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
assert.doesNotMatch(html, /<script|style=/);
assert.equal((await publicReceipt({ env, params: { token: "f".repeat(36) } })).status, 404);
assert.equal((await publicReceipt({ env, params: { token: "<script>" } })).status, 404);

// A hostile client name cannot inject markup into the receipt.
sql.prepare("UPDATE client_config SET client_name=? WHERE client='acme'").run('<img src=x onerror=alert(1)>');
const hostile = await (await publicReceipt({ env, params: { token } })).text();
assert.doesNotMatch(hostile, /<img src=x/);

// Wallets: public addresses only, validated, retire instead of delete.
res = await call(walletsPost, post("https://t/api/wallets", { asset: "USDT", network: "TRON (TRC20)", address: "TXyz1234567890abcdefghijklmnopqrst", label: "Main" }));
assert.equal(res.status, 200);
const wallets = (await res.json()).wallets;
assert.equal(wallets.length, 1);
assert.equal((await call(walletsPost, post("https://t/api/wallets", { asset: "USDT", network: "TRON (TRC20)", address: "short" }))).status, 422);
assert.equal((await call(walletsPost, post("https://t/api/wallets", { asset: "BTC", network: "Solana", address: "TXyz1234567890abcdefghijklmnopqrst" }))).status, 422);
res = await call(walletsDelete, op(`https://t/api/wallets?id=${wallets[0].id}`, { method: "DELETE" }));
assert.equal((await res.json()).wallets.length, 0);

console.log("receipts.test.mjs ok");
