import { checkAdmin, cleanId, json, normalizeEmail } from "../_shared/common.js";
import { createSetupLink } from "../_shared/client-auth.js";

export async function onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client || "");
  const email = normalizeEmail(body.email || "");
  const sendEmail = Boolean(body.send_email);
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);
  if (!email) return json({ ok: false, error: "valid email required" }, 422);

  const exists = await env.DB.prepare(
    "SELECT client FROM client_config WHERE client=?",
  ).bind(client).first();
  if (!exists) {
    return json({ ok: false, error: "save this client in Settings before creating a dashboard login" }, 404);
  }

  const result = await createSetupLink(env, new URL(request.url).origin, client, email);
  if (!result.ok) return json(result, 422);

  if (sendEmail) {
    if (!env.RESEND_API_KEY) {
      return json({ ok: false, error: "RESEND_API_KEY is not configured" }, 422);
    }
    if (!env.EMAIL_FROM) {
      return json({ ok: false, error: "EMAIL_FROM is not configured" }, 422);
    }
    try {
      await sendSetupLinkEmail(env, {
        email,
        client,
        link: result.link,
        expiresAt: result.expires_at,
      });
    } catch (error) {
      return json({ ok: false, error: `could not send setup email: ${safeMessage(error)}` }, 502);
    }
  }

  return json({
    ...result,
    emailed: sendEmail,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

async function sendSetupLinkEmail(env, payload) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [payload.email],
      subject: `Set your Pulsify dashboard password for ${payload.client}`,
      text: [
        "Use this one-time link to set your password and open the client dashboard:",
        payload.link,
        "",
        `This link expires at ${payload.expiresAt}. Generating a new link turns this one off.`,
      ].join("\n"),
    }),
  });
  if (!response.ok) {
    throw new Error(`${response.status}: ${(await response.text()).slice(0, 400)}`);
  }
}

function safeMessage(error) {
  return String(error?.message || error || "unknown error").slice(0, 400);
}
