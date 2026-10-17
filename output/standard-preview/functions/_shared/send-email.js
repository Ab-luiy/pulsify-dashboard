// One plain email through Resend, the same sender the welcome email uses (EMAIL_FROM, RESEND_API_KEY).
// Used by workflow recipes. One attempt: a recipe run can be tried again from the run history.
import { escapeHtml, str } from "./common.js";

export function renderEmailHtml(text) {
  const paragraphs = String(text).split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, "<br>").replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')}</p>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#111">${paragraphs}</div>`;
}

export async function sendEmail(env, { to, subject, text, idempotencyKey, fetcher = fetch }) {
  const from = str(env?.EMAIL_FROM);
  if (!env?.RESEND_API_KEY || !from) throw new Error("Email sending is not set up yet.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}) },
      body: JSON.stringify({ from, to: [to], subject, text, html: renderEmailHtml(text), headers: idempotencyKey ? { "X-Entity-Ref-ID": idempotencyKey } : undefined }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`The email service answered ${response.status}.`);
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("The email service did not answer in time.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
