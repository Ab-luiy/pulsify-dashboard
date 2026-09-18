// Outbound webhook endpoint management plus test sends and delivery history.
//   GET    /api/webhooks?scope=&client=            list endpoints
//   POST   /api/webhooks                            create {url, events, description}
//   PATCH  /api/webhooks?id=                        update {url?, events?, active?, description?}
//   DELETE /api/webhooks?id=
//   POST   /api/webhooks?id=&action=test            queue a signed test event
//   GET    /api/webhooks?id=&view=deliveries        delivery history
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { createEndpoint, deleteEndpoint, emitEvent, EVENTS, listDeliveries, listEndpoints, updateEndpoint } from "../_shared/outbound-webhooks.js";
import { resolveSpineRead } from "../_shared/spine-auth.js";

async function scopeFor(request, env, url, body) {
  const requestedScope = str(url.searchParams.get("scope") || body?.scope || "operator");
  const requestedClient = str(url.searchParams.get("client") || body?.client || "");
  const access = await resolveSpineRead(request, env, requestedScope, requestedClient);
  if (access.error) return access;
  if (access.role === "client" && access.impersonated && request.method !== "GET") {
    return { error: json({ ok: false, error: "impersonated sessions cannot manage webhooks" }, 403) };
  }
  return { scope: access.scope, client: access.client || "", actor: access.operatorEmail || `client:${access.client}` };
}

async function ownEndpoint(env, access, id) {
  if (!id) return null;
  return env.DB.prepare("SELECT id FROM webhook_endpoints WHERE id=? AND scope=? AND client_id=?").bind(id, access.scope, access.client).first();
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const access = await scopeFor(request, env, url);
  if (access.error) return access.error;
  const id = str(url.searchParams.get("id"));
  if (id && url.searchParams.get("view") === "deliveries") {
    if (!await ownEndpoint(env, access, id)) return json({ ok: false, error: "endpoint not found" }, 404);
    return json({ ok: true, deliveries: await listDeliveries(env, id, Number(url.searchParams.get("limit") || 50)) });
  }
  return json({ ok: true, events: EVENTS, endpoints: await listEndpoints(env, access.scope, access.client) });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const access = await scopeFor(request, env, url, body);
  if (access.error) return access.error;
  const id = str(url.searchParams.get("id"));
  if (id && url.searchParams.get("action") === "test") {
    if (!await ownEndpoint(env, access, id)) return json({ ok: false, error: "endpoint not found" }, 404);
    const eventName = str(body.event || "lead.created");
    const eventId = await emitEvent(env, { scope: access.scope, clientId: access.client, event: eventName, isTest: true, data: { message: "Pulsify test event", endpoint_id: id, sent_by: access.actor } });
    if (!eventId) return json({ ok: false, error: "unknown event" }, 422);
    return json({ ok: true, event_id: eventId, note: "Queued. The sync Worker delivers within a minute." }, 202);
  }
  const created = await createEndpoint(env, { scope: access.scope, clientId: access.client, url: body.url, events: body.events, description: body.description, createdBy: access.actor });
  if (created.error) return created.error;
  return json({ ok: true, endpoint: created.endpoint, secret: created.secret, note: "Store this signing secret now. It is not shown again." }, 201);
}

async function handlePatch({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const access = await scopeFor(request, env, url, body);
  if (access.error) return access.error;
  const id = str(url.searchParams.get("id"));
  if (!id) return json({ ok: false, error: "id required" }, 422);
  const result = await updateEndpoint(env, access.scope, access.client, id, body);
  return result.error || json({ ok: true });
}

async function handleDelete({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const access = await scopeFor(request, env, url);
  if (access.error) return access.error;
  const id = str(url.searchParams.get("id"));
  if (!id) return json({ ok: false, error: "id required" }, 422);
  const removed = await deleteEndpoint(env, access.scope, access.client, id);
  return removed ? json({ ok: true }) : json({ ok: false, error: "endpoint not found" }, 404);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
export const onRequestPatch = withOperator(handlePatch);
export const onRequestDelete = withOperator(handleDelete);
