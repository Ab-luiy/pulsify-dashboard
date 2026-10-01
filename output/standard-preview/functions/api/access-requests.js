// Operator: who asked for access, and the approve or decline button.
//   GET  /api/access-requests                       -> {pending, recent}
//   POST /api/access-requests {id, action}          action: "approve" | "decline"
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { decideRequest, listRequests } from "../_shared/access-requests.js";

async function handleGet({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  return json({ ok: true, ...(await listRequests(env)) }, 200, { "cache-control": "no-store" });
}

async function handlePost({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const action = str(body.action);
  if (!["approve", "decline"].includes(action)) return json({ ok: false, error: "action must be approve or decline" }, 422);
  const out = await decideRequest(env, { id: body.id, action, actor: denied.operatorEmail, origin: new URL(request.url).origin });
  return json(out.body, out.status, { "cache-control": "no-store" });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
