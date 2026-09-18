// Push API key management. Operator manages any scope; a client session
// manages only its own client-scoped keys. Secret is returned once on create.
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { createApiKey, listApiKeys, revokeApiKey } from "../_shared/push-ingest.js";
import { resolveSpineRead } from "../_shared/spine-auth.js";

async function scopeFor(request, env, url, body) {
  const requestedScope = str(url.searchParams.get("scope") || body?.scope || "operator");
  const requestedClient = str(url.searchParams.get("client") || body?.client || "");
  const access = await resolveSpineRead(request, env, requestedScope, requestedClient);
  if (access.error) return access;
  if (access.role === "client" && access.impersonated && request.method !== "GET") {
    return { error: json({ ok: false, error: "impersonated sessions cannot manage keys" }, 403) };
  }
  return { scope: access.scope, client: access.client || "", actor: access.operatorEmail || `client:${access.client}` };
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await scopeFor(request, env, new URL(request.url));
  if (access.error) return access.error;
  return json({ ok: true, keys: await listApiKeys(env, access.scope, access.client) });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const access = await scopeFor(request, env, new URL(request.url), body);
  if (access.error) return access.error;
  const created = await createApiKey(env, { scope: access.scope, clientId: access.client, label: body.label, createdBy: access.actor });
  return json({ ok: true, key: created.key, secret: created.secret, note: "Store this key now. It is not shown again." }, 201);
}

async function handleDelete({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const access = await scopeFor(request, env, url);
  if (access.error) return access.error;
  const id = str(url.searchParams.get("id"));
  if (!id) return json({ ok: false, error: "id required" }, 422);
  const revoked = await revokeApiKey(env, access.scope, access.client, id);
  return revoked ? json({ ok: true }) : json({ ok: false, error: "key not found" }, 404);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
export const onRequestDelete = withOperator(handleDelete);
