// Operator "Provision now" and provisioning status.
//   GET  /api/provision?client=        status for one client (or all when omitted)
//   POST /api/provision {client, email, name}   manual trigger, idempotent
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { newContractRef, provisionClient } from "../_shared/provisioning.js";

async function handleGet({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const client = str(new URL(request.url).searchParams.get("client"));
  const rows = await env.DB.prepare(
    `SELECT client_id, email, source, contract_ref, provisioned_at, provisioned_by, welcome_state, welcome_attempts, welcome_sent_at, welcome_error
       FROM client_provisioning ${client ? "WHERE client_id=?" : ""} ORDER BY provisioned_at DESC LIMIT 200`,
  ).bind(...(client ? [client] : [])).all();
  return json({ ok: true, provisioning: rows.results || [] });
}

async function handlePost({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const result = await provisionClient(env, {
    source: "operator",
    client: str(body.client),
    email: str(body.email),
    name: str(body.name),
    contractRef: str(body.contract_ref) || newContractRef(),
    origin: new URL(request.url).origin,
    actor: denied.operatorEmail,
  });
  if (!result.ok) return json(result, 422);
  return json(result, result.duplicate ? 200 : 201);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
