// GET /api/incoming-transfers -> payments seen arriving in Pulsify's wallets (waiting ones first).
// POST {id, client, remember?} -> attach a waiting transfer to the client who paid: receipt issued and emailed.
// POST {id, dismiss: true} -> not a client payment. Operator only.
import { withOperator } from "../_shared/access.js";
import { checkAdmin, json } from "../_shared/common.js";
import { assignTransfer, dismissTransfer, listTransfers } from "../_shared/crypto-watch.js";

function guard(request, env) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  return null;
}

async function handleGet({ request, env }) {
  const denied = guard(request, env);
  if (denied) return denied;
  return json({ ok: true, transfers: await listTransfers(env) });
}

async function handlePost({ request, env, data }) {
  const denied = guard(request, env);
  if (denied) return denied;
  const body = await request.json().catch(() => ({}));
  if (body.dismiss) return json(await dismissTransfer(env, body.id));
  const result = await assignTransfer(env, { id: body.id, client: body.client, remember: body.remember !== false, issuedBy: data?.operator?.email || "operator" });
  return json(result, result.ok ? 200 : result.status || 422);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
