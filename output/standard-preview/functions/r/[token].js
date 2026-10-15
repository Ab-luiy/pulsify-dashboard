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
  const amount = money(receipt.amount_cents, receipt.currency);
  const rows = [
    ["Receipt number", escapeHtml(receipt.receipt_no)],
    ["Received from", escapeHtml(receipt.client_name)],
    ["Paid to", "Pulsify"],
    ["Date received", escapeHtml(day(receipt.issued_at))],
    ["Amount", escapeHtml(amount)],
    ["Paid in", escapeHtml(`${receipt.asset} on ${receipt.network}`)],
    ["Transaction id", `<code>${escapeHtml(receipt.txid)}</code>`],
    ...(receipt.note ? [["For", escapeHtml(receipt.note)]] : []),
  ];
  const body = `
    <p class="eyebrow">Receipt ${escapeHtml(receipt.receipt_no)}</p>
    <h1>Thank you. Payment received.</h1>
    <p class="lead">Hi ${escapeHtml(receipt.client_name)}, your payment of ${escapeHtml(amount)} has arrived and we have recorded it. Thank you for trusting us with your growth. We are glad to be working with you.</p>
    <div class="total"><span>Total received</span><strong>${escapeHtml(amount)}</strong></div>
    <dl>${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`).join("")}</dl>
    <h2>Good to know</h2>
    <ul class="notes">
      <li>Keep this receipt for your records. It shows the date, the amount in US dollars and the transaction id, which is what your bookkeeping and tax filing usually need.</li>
      <li>You can look up the transfer on the blockchain at any time using the transaction id above. It will show the same amount and date.</li>
      <li>To keep a copy, print this page and choose Save as PDF.</li>
      <li>If anything on this receipt looks wrong, reply to the email it came in and we will put it right.</li>
      <li>Next step: sign in to your Pulsify workspace to see what comes next. <a href="/login/client">Go to your workspace</a>.</li>
    </ul>
    <p class="foot">Pulsify &middot; pulsify-ai.com</p>`;
  return new Response(page(`Receipt ${receipt.receipt_no}`, body), { headers: HEADERS });
}

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)} · Pulsify</title><link rel="stylesheet" href="/site/receipt.css"></head><body><main class="card">${body}</main></body></html>`;
}
