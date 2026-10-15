// The operator's ticks on "What this client needs figured out" (pulsify-saas #70). The list itself
// is worked out in the app from the client's answers; only the ticks are stored here.
import { hasOperator, withOperator } from "../_shared/access.js";
import { checkAdmin, cleanId, json, nowIso, str } from "../_shared/common.js";

const KEY = /^[a-z0-9-]{1,40}$/;
const STATES = new Set(["done", "call", "open"]);
export const validNeed = (key, state) => KEY.test(key) && STATES.has(state);

function operatorOnly(request, env) {
  if (!(hasOperator(request, env) || request.headers.get("x-admin-key") != null)) return json({ ok: false, error: "operators only" }, 403);
  return checkAdmin(request, env);
}

async function handleGet({ request, env }) {
  const denied = operatorOnly(request, env);
  if (denied) return denied;
  const client = cleanId(new URL(request.url).searchParams.get("client"));
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);
  const rows = await env.DB.prepare("SELECT need_key, state FROM onboarding_needs WHERE client_id=?").bind(client).all();
  return json({ ok: true, states: Object.fromEntries((rows.results || []).map((row) => [row.need_key, row.state])) });
}

async function handlePost({ request, env }) {
  const denied = operatorOnly(request, env);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client);
  const key = str(body.key);
  const state = str(body.state);
  if (!client || !validNeed(key, state)) return json({ ok: false, error: "client, key and state required" }, 422);
  if (state === "open") {
    await env.DB.prepare("DELETE FROM onboarding_needs WHERE client_id=? AND need_key=?").bind(client, key).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO onboarding_needs (client_id, need_key, state, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(client_id, need_key) DO UPDATE SET state=excluded.state, updated_at=excluded.updated_at`,
    ).bind(client, key, state, nowIso()).run();
  }
  return json({ ok: true });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
