import { checkAdmin, cleanId, json } from "../_shared/common.js";
import {
  IMPERSONATION_TTL_MINUTES,
  issueImpersonationExchange,
} from "../_shared/client-auth.js";

const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MINUTES = 5;

export async function onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client);
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);

  const config = await env.DB.prepare(
    "SELECT client, COALESCE(client_name, client) AS client_name FROM client_config WHERE client=?",
  ).bind(client).first();
  if (!config) return json({ ok: false, error: "client not found" }, 404);

  const createdBy = "admin";
  const threshold = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();
  const recent = await env.DB.prepare(
    `SELECT COUNT(*) AS total
       FROM impersonation_sessions
      WHERE created_by=? AND created_at>=?`,
  ).bind(createdBy, threshold).first();
  if (Number(recent?.total || 0) >= RATE_LIMIT_COUNT) {
    return json({ ok: false, error: "too many impersonation sessions" }, 429);
  }

  try {
    const issued = await issueImpersonationExchange(env, client, createdBy);
    const event = {
      id: issued.eventId,
      actor: createdBy,
      action: "impersonate-start",
      client,
      detail: { surface: "command-center" },
      created_at: issued.createdAt,
    };
    return json({
      ok: true,
      client,
      client_name: config.client_name || client,
      url: `/portal/?imp=${encodeURIComponent(issued.exchangeToken)}`,
      expires_at: issued.expiresAt,
      expires_in_minutes: IMPERSONATION_TTL_MINUTES,
      event,
    }, 201);
  } catch {
    return json({ ok: false, error: "could not start impersonation" }, 500);
  }
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
