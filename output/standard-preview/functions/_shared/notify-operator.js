// Operator notifications. Email through Resend to every operator address is
// the channel that actually exists. Discord is used only when a webhook was
// configured in Integrations. Returns which channels delivered.
import { sendDiscordAlert } from "./integrations.js";
import { normalizeEmail } from "./common.js";

export function operatorAddresses(env) {
  return String(env?.OPERATOR_EMAILS || env?.OPERATOR_EMAIL || "").split(",").map((e) => normalizeEmail(e)).filter(Boolean);
}

export async function notifyOperator(env, { title, lines = [], link = "" }, fetcher = fetch) {
  const delivered = [];
  const to = operatorAddresses(env);
  // No Resend key here (the Worker): relay to Pages, which holds it.
  if (!env.RESEND_API_KEY && env.INTERNAL_NOTIFY_SECRET && env.PAGES_ORIGIN) {
    try {
      const r = await fetcher(`${String(env.PAGES_ORIGIN).replace(/\/$/, "")}/api/notify`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-secret": env.INTERNAL_NOTIFY_SECRET },
        body: JSON.stringify({ title, lines, link }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) return { ok: true, delivered: d.delivered || ["relay"] };
    } catch { /* fall through to direct channels */ }
  }
  if (env.RESEND_API_KEY && env.EMAIL_FROM && to.length) {
    const text = [...lines.filter(Boolean), link, "", "Pulsify outreach tracker"].filter((l) => l !== undefined).join("\n");
    try {
      const r = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_FROM, to, subject: title, text }),
      });
      if (r.ok) delivered.push("email");
    } catch { /* fall through */ }
  }
  try {
    const d = await sendDiscordAlert(env, { title, lines: [...lines, link].filter(Boolean) }, { skipFailureLog: true });
    if (d.ok) delivered.push("discord");
  } catch { /* optional channel */ }
  return { ok: delivered.length > 0, delivered };
}
