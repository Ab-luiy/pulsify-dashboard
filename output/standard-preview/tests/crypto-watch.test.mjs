// Wallet watcher (pulsify-saas #24): arriving stablecoin transfers become receipts, emailed at once.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { rememberOperator } from "../functions/_shared/access.js";
import { watchWallets, listTransfers } from "../functions/_shared/crypto-watch.js";
import { onRequestGet as transfersGet, onRequestPost as transfersPost } from "../functions/api/incoming-transfers.js";

const sql = new DatabaseSync(":memory:");
const mig = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, status TEXT, updated_at TEXT, portal_token_hash TEXT)");
sql.exec("CREATE TABLE client_auth(client_id TEXT PRIMARY KEY,email TEXT UNIQUE,pass_hash TEXT,pass_salt TEXT,iterations INTEGER,created_at TEXT,updated_at TEXT)");
sql.exec("CREATE TABLE client_setup_tokens(token_hash TEXT,client_id TEXT,email TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE client_sessions(token_hash TEXT,client_id TEXT,expires_at TEXT,created_at TEXT)");
sql.exec("CREATE TABLE impersonation_sessions(token_hash TEXT,exchange_hash TEXT,client_id TEXT,created_at TEXT,expires_at TEXT,created_by TEXT,consumed_at TEXT)");
sql.exec("CREATE TABLE proof_items(id INTEGER PRIMARY KEY,client_id TEXT,created_at TEXT)");
sql.exec("CREATE TABLE studio_sequences(id INTEGER PRIMARY KEY,client_id TEXT,status TEXT)");
for (const name of ["0007_delivery_failures.sql", "0008_integrations_hub.sql", "0014_client_brain.sql", "0015_operator_events.sql", "0021_workspace_records.sql", "0025_data_spine.sql", "0027_revenue_automation.sql", "0028_onboarding.sql", "0052_receipts.sql", "0062_receipt_email.sql", "0063_crypto_watch.sql"]) {
  sql.exec(mig(name).replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/, ""));
}
sql.prepare("INSERT INTO client_config VALUES(?,?,?,?,?)").run("acme", "Acme Trading", "prospect", "2026-10-01", null);
sql.prepare("INSERT INTO client_config VALUES(?,?,?,?,?)").run("globex", "Globex", "prospect", "2026-10-01", null);
sql.prepare("INSERT INTO client_auth(client_id,email) VALUES(?,?)").run("acme", "owner@acme.test");
sql.prepare("INSERT INTO client_auth(client_id,email) VALUES(?,?)").run("globex", "owner@globex.test");
const WALLET = "0x02ec36e0be4138443dd91d1b0b059e403d154a70";
sql.prepare("INSERT INTO pulsify_wallets (asset, network, address, label, active, created_at) VALUES (?,?,?,?,1,?)").run("USDT", "Ethereum (ERC20)", WALLET, "Main", "2026-10-15");
// A wallet on a chain the watcher does not read must be skipped, not break the run.
sql.prepare("INSERT INTO pulsify_wallets (asset, network, address, label, active, created_at) VALUES (?,?,?,?,1,?)").run("BTC", "Bitcoin", "bc1qexampleaddress0000000000000000000", "BTC", "2026-10-15");

const env = {
  ADMIN_KEY: "k", RESEND_API_KEY: "re_test", EMAIL_FROM: "Pulsify <hello@pulsify-ai.com>", OPERATOR_EMAILS: "founder@test.dev",
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

// A fake chain: current block, and the transfers that land in it.
let head = 1000;
let logs = [];
const emails = [];
const pad = (address) => `0x${"0".repeat(24)}${address.slice(2)}`;
const transfer = (from, dollars, tx, block, index = 0) => ({
  transactionHash: tx, logIndex: `0x${index.toString(16)}`, blockNumber: `0x${block.toString(16)}`,
  topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", pad(from), pad(WALLET)],
  data: `0x${BigInt(Math.round(dollars * 1e6)).toString(16)}`,
});
const rpcCalls = [];
const fetcher = async (url, init) => {
  const body = JSON.parse(init.body);
  if (String(url).includes("resend")) { emails.push(body); return new Response("{}", { status: 200 }); }
  rpcCalls.push(body);
  if (body.method === "eth_blockNumber") return Response.json({ result: `0x${head.toString(16)}` });
  if (body.method === "eth_getLogs") {
    const filter = body.params[0];
    const lo = parseInt(filter.fromBlock, 16), hi = parseInt(filter.toBlock, 16);
    assert.equal(filter.topics[2], pad(WALLET));
    return Response.json({ result: logs.filter((l) => parseInt(l.blockNumber, 16) >= lo && parseInt(l.blockNumber, 16) <= hi) });
  }
  return Response.json({ error: { message: "unexpected" } });
};
globalThis.fetch = fetcher;

const ACME = "0x1111111111111111111111111111111111111111";
const GLOBEX = "0x2222222222222222222222222222222222222222";
const TX = (n) => `0x${String(n).padStart(64, "0")}`;

// First look: starts from now. Payments from before the watcher existed never become receipts.
logs = [transfer(ACME, 5000, TX(1), 900)];
assert.equal(await watchWallets(env, { fetcher }), 0);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM incoming_transfers").get().n, 0);

// A new payment from an unknown sender waits for the founder and pings him once.
head = 1100;
logs = [transfer(ACME, 5000, TX(2), 1050), transfer(ACME, 0.01, TX(3), 1051), transfer(GLOBEX, 19.99, TX(4), 1052), transfer(GLOBEX, 0.000001, TX(11), 1053)];
assert.equal(await watchWallets(env, { fetcher }), 4);
let waiting = await listTransfers(env);
assert.deepEqual(waiting.map((row) => row.amount_cents).sort((a, b) => a - b), [1, 1999, 500000], "every cent shows; only sub-cent amounts are skipped");
assert.ok(waiting.every((row) => row.status === "needs_client"));
assert.equal(emails.length, 3);
assert.ok(emails.every((mail) => mail.to[0] === "founder@test.dev"));
assert.ok(emails.some((mail) => /\$5,000\.00/.test(mail.subject)));
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM receipts").get().n, 0);

// Running again sees nothing new and never duplicates.
assert.equal(await watchWallets(env, { fetcher }), 0);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM incoming_transfers").get().n, 4);

// Transfers not yet buried 12 blocks are not read.
head = 1112;
logs.push(transfer(ACME, 700, TX(5), 1105));
assert.equal(await watchWallets(env, { fetcher }), 0);
head = 1130;
assert.equal(await watchWallets(env, { fetcher }), 1);
sql.prepare("UPDATE incoming_transfers SET status='dismissed' WHERE txid=?").run(TX(5));

// Operator only.
assert.equal((await transfersGet({ request: new Request("https://t/api/incoming-transfers"), env, data: {} })).status, 401);

// The founder attaches the waiting payment: receipt issued, emailed to the client, sender remembered.
const op = (url, init = {}) => { const r = new Request(url, init); rememberOperator(r, { email: "op@test", via: "access" }); return r; };
const post = (body) => op("https://pulsify-ai.com/api/incoming-transfers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const call = (fn, request) => fn({ request, env, data: { operator: { email: "op@test" } }, params: {} });
const id = waiting.find((row) => row.amount_cents === 500000).id;
assert.equal((await call(transfersPost, post({ id, client: "" }))).status, 422);
let res = await call(transfersPost, post({ id, client: "acme" }));
assert.equal(res.status, 200);
let out = await res.json();
assert.match(out.receipt.receipt_no, /^PUL-\d{4}-0001$/);
assert.equal(out.email, "sent");
const clientMail = emails.at(-1);
assert.deepEqual(clientMail.to, ["owner@acme.test"]);
assert.match(clientMail.text, /\$5,000\.00/);
assert.equal(sql.prepare("SELECT status FROM incoming_transfers WHERE id=?").get(id).status, "receipted");
assert.ok((await listTransfers(env)).find((row) => row.id === id).emailed_at, "the list says the receipt was emailed");
assert.equal(sql.prepare("SELECT amount_cents FROM payments WHERE reference=?").get(TX(2)).amount_cents, 500000);
assert.equal((await call(transfersPost, post({ id, client: "acme" }))).status, 409, "a handled transfer cannot be attached twice");

// The next payment from that sender is receipted and emailed with no one lifting a finger.
head = 1200;
logs = [transfer(ACME, 2500, TX(6), 1150)];
const before = emails.length;
assert.equal(await watchWallets(env, { fetcher }), 1);
assert.equal(sql.prepare("SELECT status, client FROM incoming_transfers WHERE txid=?").get(TX(6)).status, "receipted");
assert.equal(emails.length, before + 1);
assert.deepEqual(emails.at(-1).to, ["owner@acme.test"]);
assert.match(emails.at(-1).subject, /PUL-\d{4}-0002/);

// A sender shared by two clients (an exchange) is never auto-matched again.
head = 1300;
logs = [transfer(GLOBEX, 900, TX(7), 1250), transfer(GLOBEX, 800, TX(8), 1251)];
await watchWallets(env, { fetcher });
const [t7, t8] = [TX(7), TX(8)].map((tx) => sql.prepare("SELECT id FROM incoming_transfers WHERE txid=?").get(tx).id);
await call(transfersPost, post({ id: t7, client: "globex" }));
assert.equal(sql.prepare("SELECT client FROM client_payer_addresses WHERE address=?").get(GLOBEX).client, "globex");
// ... t8 was auto-matched? No: it was read in the same pass before the sender was known, so it waits.
await call(transfersPost, post({ id: t8, client: "acme" }));
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM client_payer_addresses WHERE address=?").get(GLOBEX).n, 0);

// Not a client payment: dismiss.
head = 1400;
logs = [transfer("0x3333333333333333333333333333333333333333", 100, TX(9), 1350)];
await watchWallets(env, { fetcher });
const t9 = sql.prepare("SELECT id FROM incoming_transfers WHERE txid=?").get(TX(9)).id;
res = await call(transfersPost, post({ id: t9, dismiss: true }));
assert.equal(sql.prepare("SELECT status FROM incoming_transfers WHERE id=?").get(t9).status, "dismissed");

// An RPC outage fails the run loudly and loses nothing: the cursor stays put.
const lastBlock = sql.prepare("SELECT last_block FROM crypto_watch_state").get().last_block;
head = 1500;
logs = [transfer(ACME, 1234, TX(10), 1450)];
await assert.rejects(() => watchWallets(env, { fetcher: async () => new Response("down", { status: 503 }) }), /RPC failed/);
assert.equal(sql.prepare("SELECT last_block FROM crypto_watch_state").get().last_block, lastBlock);
assert.equal(await watchWallets(env, { fetcher }), 1);

console.log("crypto-watch.test.mjs ok");
