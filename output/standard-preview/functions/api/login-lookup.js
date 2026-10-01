// One login for everyone. The page asks for an email first and this endpoint
// says what happens next.
//   POST /api/login-lookup {email}                -> {kind:"operator"|"password", hint}
//   POST /api/login-lookup {email, action:"link"} -> emails a one-time sign-in link when the
//                                                    email belongs to a client; the response
//                                                    is identical either way (no enumeration).
// Operator emails come from OPERATOR_EMAILS (comma separated) or OPERATOR_EMAIL.
import { json, normalizeEmail, str } from "../_shared/common.js";
import { createSetupLink } from "../_shared/client-auth.js";
import { isOperatorEmailDb } from "../_shared/operator-session.js";

const LINKS_PER_EMAIL_PER_HOUR = 3;

export function operatorEmails(env) {
  return String(env?.OPERATOR_EMAILS || env?.OPERATOR_EMAIL || "")
    .split(",").map((e) => normalizeEmail(e)).filter(Boolean);
}

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const email = normalizeEmail(body.email);
  if (!email) return json({ ok: false, error: "Enter a valid email address." }, 422);
  const operators = operatorEmails(env);
  const action = str(body.action);

  if (action === "link") {
    // Never say whether the email has a workspace. Do the work if it does.
    const generic = { ok: true, sent: true, message: "If that email has a Pulsify workspace, a one-time sign-in link is on its way. It works once and expires in 48 hours." };
    if (!env.DB || !env.RESEND_API_KEY || !env.EMAIL_FROM) return json(generic);
    try {
      if (!(await allowLink(env, email))) return json(generic);
      const row = await env.DB.prepare("SELECT client_id FROM client_auth WHERE email=?").bind(email).first();
      if (!row) return json(generic);
      const link = await createSetupLink(env, new URL(request.url).origin, row.client_id, email);
      if (!link.ok) return json(generic);
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [email],
          subject: "Your Pulsify sign-in link",
          text: [
            "Here is your one-time link to set a password and open your workspace:",
            link.link,
            "",
            "It works once and expires in 48 hours. If you did not ask for this, ignore it; nothing changes until the link is used.",
            "",
            "Abdul",
            "Pulsify",
          ].join("\n"),
        }),
      }).catch(() => null);
    } catch { /* same answer regardless */ }
    return json(generic);
  }

  if (operators.includes(email) || await isOperatorEmailDb(env, email)) {
    return json({ ok: true, kind: "operator", hint: email, next: "/admin" });
  }
  // Clients and unknown emails both get the password field. The failure
  // message after a wrong password explains how workspaces are created.
  return json({ ok: true, kind: "password" });
}

async function allowLink(env, email) {
  const bucket = new Date().toISOString().slice(0, 13);
  const key = `login-link:${email}`;
  try {
    await env.DB.prepare(
      "INSERT INTO api_key_usage (key_id, bucket, count) VALUES (?,?,1) ON CONFLICT(key_id, bucket) DO UPDATE SET count=count+1",
    ).bind(key, bucket).run();
    const row = await env.DB.prepare("SELECT count FROM api_key_usage WHERE key_id=? AND bucket=?").bind(key, bucket).first();
    return (row?.count || 0) <= LINKS_PER_EMAIL_PER_HOUR;
  } catch {
    return true;
  }
}
