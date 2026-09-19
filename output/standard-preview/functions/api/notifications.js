// The bell.
//   GET  /api/notifications?client=&unread=1&limit=   feed + unread count for the caller's scope
//   POST /api/notifications {client, ids:[]} | {client, all:true}   mark read
// Operator (x-pulsify-operator or admin key) reads the operator feed; a client
// session or portal token reads its own workspace feed.
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { resolveSpineRead } from "../_shared/spine-auth.js";
import { listNotifications, markRead } from "../_shared/notifications.js";

async function scopeOf(request, env, client) {
  const wantsOperator = request.headers.get("x-pulsify-operator") === "1" && !client;
  const access = await resolveSpineRead(request, env, wantsOperator ? "operator" : "client", client);
  if (access.error) return access;
  if (access.role === "operator" && !access.client) return { scope: "operator", clientId: "" };
  return { scope: "client", clientId: access.client, impersonated: Boolean(access.impersonated) };
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const who = await scopeOf(request, env, str(url.searchParams.get("client")));
  if (who.error) return who.error;
  const feed = await listNotifications(env, { scope: who.scope, clientId: who.clientId, limit: Number(url.searchParams.get("limit")) || 50, unreadOnly: url.searchParams.get("unread") === "1" });
  return json({ ok: true, scope: who.scope, ...feed, now: new Date().toISOString() });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const who = await scopeOf(request, env, str(body.client));
  if (who.error) return who.error;
  if (who.impersonated) return json({ ok: false, error: "read only while impersonating" }, 403);
  const n = await markRead(env, { scope: who.scope, clientId: who.clientId, ids: Array.isArray(body.ids) ? body.ids : [], all: body.all === true });
  return json({ ok: true, marked: n });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
