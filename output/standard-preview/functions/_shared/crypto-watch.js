// Pulsify wallet watcher (pulsify-saas #24). Reads USDT and USDC transfers that arrive at Pulsify's own
// Ethereum wallets, straight from a public RPC (no key, nothing private). A transfer from an address already
// tied to a client becomes a receipt and is emailed at once. Any other transfer waits for the founder to pick
// the client, then does the same. Only public chain data is read; nothing here can move money.
import { cleanId, nowIso } from "./common.js";
import { operatorEmails } from "./operator-session.js";
import { issueReceipt, listWallets } from "./receipts.js";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const CONTRACTS = {
  USDT: { "Ethereum (ERC20)": "0xdac17f958d2ee523a2206206994597c13d831ec7" },
  USDC: { "Ethereum (ERC20)": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
};
const CONFIRMATIONS = 12; // blocks a transfer must be buried before it counts
const MAX_RANGE = 2000; // blocks read per run (about 6.5 hours), so a long gap catches up over a few runs
const MIN_CENTS = 2000; // transfers under $20 are address-poisoning dust, never receipts
const DEFAULT_ORIGIN = "https://pulsify-ai.com";
const RPCS = ["https://ethereum-rpc.publicnode.com"];

const hexToInt = (hex) => Number(BigInt(hex));
const topicAddress = (topic) => `0x${String(topic).slice(-40)}`.toLowerCase();
const padAddress = (address) => `0x${"0".repeat(24)}${String(address).slice(2).toLowerCase()}`;
const origin = (env) => String(env.PAGES_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");

async function rpc(env, fetcher, method, params) {
  const urls = [env.ETH_RPC_URL, ...RPCS].filter(Boolean);
  let last = "no RPC reachable";
  for (const url of urls) {
    try {
      const response = await fetcher(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.result !== undefined) return body.result;
      last = body?.error?.message || `HTTP ${response.status}`;
    } catch (error) {
      last = String(error?.message || error);
    }
  }
  throw new Error(`Ethereum RPC failed: ${last}`);
}

// One pass over every watched wallet. Returns how many new transfers were seen.
export async function watchWallets(env, { fetcher = fetch } = {}) {
  if (!env.DB) return 0;
  const wallets = (await listWallets(env)).filter((w) => CONTRACTS[w.asset]?.[w.network] && /^0x[0-9a-fA-F]{40}$/.test(w.address));
  if (!wallets.length) return 0;
  const latest = hexToInt(await rpc(env, fetcher, "eth_blockNumber", []));
  const safe = latest - CONFIRMATIONS;
  let seen = 0;
  for (const wallet of wallets) {
    const state = await env.DB.prepare("SELECT last_block FROM crypto_watch_state WHERE wallet_id=?").bind(wallet.id).first();
    // First look at a wallet starts from now: old payments are never turned into receipts.
    if (!state) {
      await env.DB.prepare("INSERT INTO crypto_watch_state (wallet_id, last_block, updated_at) VALUES (?,?,?)").bind(wallet.id, safe, nowIso()).run();
      continue;
    }
    const from = Number(state.last_block) + 1;
    const to = Math.min(safe, from + MAX_RANGE - 1);
    if (from > to) continue;
    const logs = await rpc(env, fetcher, "eth_getLogs", [{
      address: CONTRACTS[wallet.asset][wallet.network],
      topics: [TRANSFER_TOPIC, null, padAddress(wallet.address)],
      fromBlock: `0x${from.toString(16)}`,
      toBlock: `0x${to.toString(16)}`,
    }]);
    for (const log of logs) seen += await recordTransfer(env, wallet, log, fetcher);
    await env.DB.prepare("UPDATE crypto_watch_state SET last_block=?, updated_at=? WHERE wallet_id=?").bind(to, nowIso(), wallet.id).run();
  }
  return seen;
}

async function recordTransfer(env, wallet, log, fetcher) {
  const cents = Number(BigInt(log.data) / 10000n); // 6 decimals -> cents
  const status = cents >= MIN_CENTS ? "needs_client" : "ignored";
  const insert = await env.DB.prepare(
    `INSERT OR IGNORE INTO incoming_transfers (wallet_id, asset, network, txid, log_index, from_address, amount_cents, block_number, status, seen_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).bind(wallet.id, wallet.asset, wallet.network, log.transactionHash, hexToInt(log.logIndex), topicAddress(log.topics[1]), cents, hexToInt(log.blockNumber), status, nowIso()).run();
  if (!insert.meta?.changes) return 0;
  if (status === "ignored") return 1;
  const row = await env.DB.prepare("SELECT * FROM incoming_transfers WHERE txid=? AND log_index=?").bind(log.transactionHash, hexToInt(log.logIndex)).first();
  const known = await env.DB.prepare("SELECT client FROM client_payer_addresses WHERE address=?").bind(row.from_address).first();
  if (known?.client) {
    const settled = await settleTransfer(env, row, known.client, { issuedBy: "wallet-watch", fetcher });
    if (settled.ok) return 1;
  }
  await notifyFounder(env, row, fetcher);
  return 1;
}

async function settleTransfer(env, row, client, { issuedBy, fetcher }) {
  const result = await issueReceipt(env, {
    client, amount: row.amount_cents / 100, asset: row.asset, network: row.network, txid: row.txid,
    note: "Detected on the blockchain", issuedBy,
  }, origin(env));
  if (!result.ok) return result;
  await env.DB.prepare("UPDATE incoming_transfers SET status='receipted', client=?, receipt_no=? WHERE id=?").bind(client, result.receipt.receipt_no, row.id).run();
  return result;
}

const dollars = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

// One email to the founder when money arrives that cannot be matched to a client yet.
async function notifyFounder(env, row, fetcher) {
  const to = [...operatorEmails(env)][0];
  const from = String(env.EMAIL_FROM || "").trim();
  if (!env.RESEND_API_KEY || !from || !to) return;
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": `transfer-${row.id}` },
      body: JSON.stringify({
        from, to: [to], subject: `${dollars(row.amount_cents)} just arrived. Choose who paid.`,
        text: [`${dollars(row.amount_cents)} ${row.asset} arrived in your wallet from ${row.from_address}.`, "", "Open Income and pick the client. The receipt is emailed to them as soon as you do:", `${origin(env)}/app/income`, "", "Pulsify"].join("\n"),
      }),
    });
    if (response.ok) await env.DB.prepare("UPDATE incoming_transfers SET notified_at=? WHERE id=?").bind(nowIso(), row.id).run();
  } catch {
    // The transfer stays on the Income screen either way.
  }
}

export async function listTransfers(env) {
  const rows = await env.DB.prepare(
    `SELECT t.id, t.asset, t.network, t.txid, t.from_address, t.amount_cents, t.status, t.client, t.receipt_no, t.seen_at,
            COALESCE(c.client_name, t.client) AS client_name
       FROM incoming_transfers t LEFT JOIN client_config c ON c.client=t.client
      WHERE t.status != 'ignored'
      ORDER BY CASE t.status WHEN 'needs_client' THEN 0 ELSE 1 END, t.seen_at DESC LIMIT 50`,
  ).all();
  return rows.results || [];
}

// The founder picks the client for a waiting transfer: receipt issued and emailed, sender remembered.
export async function assignTransfer(env, { id, client, remember = true, issuedBy = "operator", fetcher = fetch }) {
  const row = await env.DB.prepare("SELECT * FROM incoming_transfers WHERE id=?").bind(Number(id) || 0).first();
  if (!row) return { ok: false, status: 404, error: "that transfer was not found" };
  if (row.status !== "needs_client") return { ok: false, status: 409, error: "that transfer is already handled" };
  const clientId = cleanId(client);
  if (!clientId) return { ok: false, status: 422, error: "choose the client who paid" };
  const result = await settleTransfer(env, row, clientId, { issuedBy, fetcher });
  if (!result.ok) return { ...result, status: 422 };
  if (remember) await rememberPayer(env, row.from_address, clientId);
  return { ok: true, receipt: result.receipt, email: result.email, transfers: await listTransfers(env) };
}

async function rememberPayer(env, address, client) {
  const existing = await env.DB.prepare("SELECT client FROM client_payer_addresses WHERE address=?").bind(address).first();
  if (!existing) {
    await env.DB.prepare("INSERT INTO client_payer_addresses (address, client, created_at) VALUES (?,?,?)").bind(address, client, nowIso()).run();
  } else if (existing.client !== client) {
    // The same sender paid for two clients (an exchange, a shared wallet): never auto-match it again.
    await env.DB.prepare("DELETE FROM client_payer_addresses WHERE address=?").bind(address).run();
  }
}

export async function dismissTransfer(env, id) {
  await env.DB.prepare("UPDATE incoming_transfers SET status='dismissed' WHERE id=? AND status='needs_client'").bind(Number(id) || 0).run();
  return { ok: true, transfers: await listTransfers(env) };
}
