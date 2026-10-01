// /r/{token}: the public receipt a client is sent. Unguessable token, no inline code, no third-party requests.
import { escapeHtml } from "../_shared/common.js";
import { receiptByToken } from "../_shared/receipts.js";

const HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

const money = (cents, currency) => new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(Number(cents || 0) / 100);
const day = (iso) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export async function onRequestGet({ env, params }) {
  const receipt = env.DB ? await receiptByToken(env, params?.token).catch(() => null) : null;
  if (!receipt) {
    return new Response(page("Receipt not found", `<p class="lead">This receipt link is not valid. Ask Pulsify to send it again.</p>`), { status: 404, headers: HEADERS });
  }
  const rows = [
    ["Received from", escapeHtml(receipt.client_name)],
    ["Amount", escapeHtml(money(receipt.amount_cents, receipt.currency))],
    ["Paid in", escapeHtml(`${receipt.asset} on ${receipt.network}`)],
    ["Transaction id", `<code>${escapeHtml(receipt.txid)}</code>`],
    ["Date", escapeHtml(day(receipt.issued_at))],
    ...(receipt.note ? [["Note", escapeHtml(receipt.note)]] : []),
  ];
  const body = `
    <p class="eyebrow">Receipt ${escapeHtml(receipt.receipt_no)}</p>
    <h1>Payment received</h1>
    <p class="lead">Thank you. This receipt confirms Pulsify received the payment below.</p>
    <dl>${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`).join("")}</dl>
    <p class="foot">Pulsify. Keep this page for your records. Questions: reply to the email this link came in.</p>`;
  return new Response(page(`Receipt ${receipt.receipt_no}`, body), { headers: HEADERS });
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)} · Pulsify</title><link rel="stylesheet" href="/site/receipt.css"></head><body><main class="card">${body}</main></body></html>`;
}
