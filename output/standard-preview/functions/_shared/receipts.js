// Pulsify income by crypto (pulsify-saas #24). One step records the payment and issues the receipt.
import { cleanId, escapeHtml, nowIso } from "./common.js";
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

const receiptColumns = `r.id, r.receipt_no, r.token, r.payment_id, r.client, r.amount_cents, r.currency, r.asset, r.network, r.txid, r.note, r.issued_at, r.issued_by, r.emailed_at,
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
  if (existing) {
    // A receipt that was never emailed (no address yet, provider down) is sent on the next record of the same payment.
    const email = existing.emailed_at ? "sent" : await emailReceipt(env, existing, origin);
    return { ok: true, duplicate: true, receipt: existing, url: `${origin}/r/${existing.token}`, payment: result.payment, email };
  }

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
  const email = await emailReceipt(env, receipt, origin);
  return { ok: true, duplicate: false, receipt, url: `${origin}/r/${token}`, payment: result.payment, email };
}

const money = (cents, currency) => new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(Number(cents || 0) / 100);
const day = (iso) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

// The client's address: the one provisioning used, else the one they sign in with.
async function receiptRecipient(env, client) {
  const row = await env.DB.prepare(
    "SELECT COALESCE((SELECT email FROM client_provisioning WHERE client_id=?1), (SELECT email FROM client_auth WHERE client_id=?1)) AS email",
  ).bind(client).first().catch(() => null);
  const email = String(row?.email || "").trim();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : "";
}

export function receiptEmail(receipt, link) {
  const amount = money(receipt.amount_cents, receipt.currency);
  const lines = [
    ["Receipt number", receipt.receipt_no],
    ["Received from", receipt.client_name],
    ["Paid to", "Pulsify"],
    ["Date received", day(receipt.issued_at)],
    ["Amount", amount],
    ["Paid in", `${receipt.asset} on ${receipt.network}`],
    ["Transaction id", receipt.txid],
    ...(receipt.note ? [["For", receipt.note]] : []),
  ];
  const intro = `Your payment of ${amount} has arrived and we have recorded it. Thank you for trusting us with your growth. We are glad to be working with you.`;
  const notes = [
    "Keep this receipt for your records. It shows the date, the amount in US dollars and the transaction id, which is what your bookkeeping and tax filing usually need.",
    "You can look up the transfer on the blockchain any time using the transaction id. It will show the same amount and date.",
    "A printable copy lives at the link below. Open it, print, and choose Save as PDF.",
    "If anything here looks wrong, just reply to this email and we will put it right.",
  ];
  const workspace = `${new URL(link).origin}/login/client`;
  const nextStep = "Next step: sign in to your Pulsify workspace to see what comes next.";
  const first = String(receipt.client_name || "").trim() || "there";
  const text = [
    `Hi ${first},`, "", intro, "", ...lines.map(([k, v]) => `${k}: ${v}`), "", "Good to know", ...notes.map((n) => `- ${n}`), `- ${nextStep} ${workspace}`, "", `Your receipt: ${link}`, "", "Thank you again.", "Abdul", "Pulsify",
  ].join("\n");
  const rows = lines.map(([k, v]) => `<tr><td style="padding:9px 18px 9px 0;color:#6b6760;vertical-align:top;border-top:1px solid #e8e4dc">${escapeHtml(k)}</td><td style="padding:9px 0;border-top:1px solid #e8e4dc;word-break:break-all">${escapeHtml(v)}</td></tr>`).join("");
  const html = `<div style="font:15px/1.6 Inter,system-ui,sans-serif;color:#1d1c1a;max-width:560px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6b6760">Receipt ${escapeHtml(receipt.receipt_no)}</p>
<h1 style="margin:0 0 12px;font-size:24px;font-weight:600;letter-spacing:-.02em">Thank you. Payment received.</h1>
<p style="margin:0 0 20px">Hi ${escapeHtml(first)},<br><br>${escapeHtml(intro)}</p>
<div style="margin:0 0 20px;padding:16px 18px;border-radius:12px;background:#f1eee8"><span style="color:#6b6760;font-size:13px">Total received</span><br><strong style="font-size:28px;letter-spacing:-.02em">${escapeHtml(amount)}</strong></div>
<table style="border-collapse:collapse;width:100%">${rows}</table>
<h2 style="margin:26px 0 8px;font-size:15px">Good to know</h2>
<ul style="margin:0 0 22px;padding-left:18px;color:#55524c;font-size:14px">${notes.map((n) => `<li style="margin:0 0 6px">${escapeHtml(n)}</li>`).join("")}<li style="margin:0 0 6px">${escapeHtml(nextStep)} <a href="${escapeHtml(workspace)}">Go to your workspace</a>.</li></ul>
<p style="margin:0 0 22px"><a href="${escapeHtml(link)}" style="display:inline-block;padding:11px 20px;border-radius:10px;background:#1d1c1a;color:#fff;text-decoration:none;font-weight:500">Open your receipt</a></p>
<p style="margin:0">Thank you again.<br>Abdul<br>Pulsify</p></div>`;
  return { subject: `Your Pulsify receipt ${receipt.receipt_no}: thank you`, text, html };
}

// Sends the receipt from the Pulsify address the moment it is issued. Never throws: a failed send is recorded on
// the receipt and retried the next time the same payment is recorded. Returns sent | skipped | failed.
export async function emailReceipt(env, receipt, origin) {
  const from = String(env.RECEIPT_FROM || env.EMAIL_FROM || "").trim();
  const to = await receiptRecipient(env, receipt.client);
  const fail = async (state, reason) => {
    await env.DB.prepare("UPDATE receipts SET email_error=? WHERE id=?").bind(reason, receipt.id).run().catch(() => null);
    return state;
  };
  if (!env.RESEND_API_KEY || !from) return fail("skipped", "email not configured");
  if (!to) return fail("skipped", "no email address on file for this client");
  try {
    const { subject, text, html } = receiptEmail(receipt, `${origin}/r/${receipt.token}`);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": `receipt-${receipt.receipt_no}` },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
    if (!response.ok) return fail("failed", `HTTP ${response.status}`);
    await env.DB.prepare("UPDATE receipts SET emailed_at=?, email_error=NULL WHERE id=?").bind(nowIso(), receipt.id).run();
    return "sent";
  } catch (error) {
    return fail("failed", String(error?.message || error).slice(0, 200));
  }
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
