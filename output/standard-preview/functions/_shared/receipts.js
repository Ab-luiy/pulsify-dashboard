// Pulsify income by crypto (pulsify-saas #24). One step records the payment and issues the receipt.
import { cleanId, nowIso } from "./common.js";
import { processNormalizedPayment } from "./payments.js";

// Assets and the networks each is accepted on. The founder can only be paid in crypto from Turkey.
export const ASSETS = {
  USDT: ["TRON (TRC20)", "Ethereum (ERC20)", "BNB Chain (BEP20)", "Solana", "Polygon"],
  USDC: ["Ethereum (ERC20)", "Solana", "Base", "Polygon", "BNB Chain (BEP20)"],
  BTC: ["Bitcoin", "Lightning"],
  ETH: ["Ethereum (ERC20)", "Base"],
  SOL: ["Solana"],
};

const TXID = /^[A-Za-z0-9:_-]{6,128}$/;
const ADDRESS = /^[A-Za-z0-9:._-]{20,128}$/;

function randomToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const receiptColumns = `r.id, r.receipt_no, r.token, r.payment_id, r.client, r.amount_cents, r.currency, r.asset, r.network, r.txid, r.note, r.issued_at, r.issued_by,
  COALESCE(c.client_name, r.client) AS client_name`;
const receiptFrom = "FROM receipts r LEFT JOIN client_config c ON c.client=r.client";

export async function issueReceipt(env, input, origin) {
  const asset = String(input.asset || "").toUpperCase();
  const network = String(input.network || "");
  const txid = String(input.txid || "").trim();
  const client = cleanId(input.client);
  if (!client) return { ok: false, error: "choose the client who paid" };
  if (!ASSETS[asset]) return { ok: false, error: "choose the asset they paid in" };
  if (!ASSETS[asset].includes(network)) return { ok: false, error: `${asset} is not accepted on that network` };
  if (!TXID.test(txid)) return { ok: false, error: "paste the transaction id (6 to 128 letters and numbers)" };
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return { ok: false, error: "enter the amount in US dollars" };

  const note = String(input.note || "").trim().slice(0, 200);
  const result = await processNormalizedPayment(env, {
    client,
    amount,
    currency: "USD",
    rail: "crypto",
    reference: txid,
    note: [`${asset} on ${network}`, note].filter(Boolean).join(". "),
    recordedBy: input.issuedBy || "operator",
    origin,
  });
  if (!result.ok) return result;

  const paymentId = result.payment?.id;
  const existing = await env.DB.prepare(`SELECT ${receiptColumns} ${receiptFrom} WHERE r.payment_id=?`).bind(paymentId).first();
  if (existing) return { ok: true, duplicate: true, receipt: existing, url: `${origin}/r/${existing.token}`, payment: result.payment };

  const issuedAt = nowIso();
  const year = issuedAt.slice(0, 4);
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM receipts WHERE receipt_no LIKE ?").bind(`PUL-${year}-%`).first();
  const receiptNo = `PUL-${year}-${String(Number(count?.n || 0) + 1).padStart(4, "0")}`;
  const token = randomToken();
  await env.DB.prepare(
    `INSERT INTO receipts (receipt_no, token, payment_id, client, amount_cents, currency, asset, network, txid, note, issued_at, issued_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(receiptNo, token, paymentId, client, result.payment.amount_cents, "USD", asset, network, txid, note || null, issuedAt, input.issuedBy || "operator").run();
  const receipt = await env.DB.prepare(`SELECT ${receiptColumns} ${receiptFrom} WHERE r.token=?`).bind(token).first();
  return { ok: true, duplicate: false, receipt, url: `${origin}/r/${token}`, payment: result.payment };
}

export async function listReceipts(env, origin) {
  const rows = await env.DB.prepare(`SELECT ${receiptColumns} ${receiptFrom} ORDER BY r.issued_at DESC, r.id DESC LIMIT 200`).all();
  const receipts = (rows.results || []).map((row) => ({ ...row, url: `${origin}/r/${row.token}` }));
  const total = receipts.reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  return { receipts, total_cents: total, assets: ASSETS };
}

export async function receiptByToken(env, token) {
  if (!/^[a-f0-9]{36}$/.test(String(token || ""))) return null;
  return env.DB.prepare(`SELECT ${receiptColumns} ${receiptFrom} WHERE r.token=?`).bind(token).first();
}

export async function listWallets(env) {
  const rows = await env.DB.prepare("SELECT id, asset, network, address, label, active FROM pulsify_wallets WHERE active=1 ORDER BY asset, network").all();
  return rows.results || [];
}

export async function saveWallet(env, input) {
  const asset = String(input.asset || "").toUpperCase();
  const network = String(input.network || "");
  const address = String(input.address || "").trim();
  if (!ASSETS[asset] || !ASSETS[asset].includes(network)) return { ok: false, error: "choose an asset and a network it runs on" };
  if (!ADDRESS.test(address)) return { ok: false, error: "that does not look like a wallet address" };
  await env.DB.prepare(
    `INSERT INTO pulsify_wallets (asset, network, address, label, active, created_at) VALUES (?,?,?,?,1,?)
     ON CONFLICT(asset, network, address) DO UPDATE SET active=1, label=excluded.label`,
  ).bind(asset, network, address, String(input.label || "").trim().slice(0, 60) || null, nowIso()).run();
  return { ok: true, wallets: await listWallets(env) };
}

export async function retireWallet(env, id) {
  await env.DB.prepare("UPDATE pulsify_wallets SET active=0 WHERE id=?").bind(Number(id) || 0).run();
  return { ok: true, wallets: await listWallets(env) };
}
