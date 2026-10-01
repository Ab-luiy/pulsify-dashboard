// Operator: who asked for access, who is on the team, and the buttons that decide.
//   GET  /api/access-requests                              -> {pending, recent, operators, can_manage_operators}
//   POST /api/access-requests {id, action: "approve", role: "client"|"operator"}
//   POST /api/access-requests {id, action: "decline"}
//   POST /api/access-requests {action: "add-operator", email, name?}      owner only
//   POST /api/access-requests {action: "remove-operator", email}          owner only
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { addOperator, decideRequest, isOwner, listOperators, listRequests, removeOperator } from "../_shared/access-requests.js";

const NO_STORE = { "cache-control": "no-store" };

async function handleGet({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  return json({ ok: true, ...(await listRequests(env)), operators: await listOperators(env), can_manage_operators: isOwner(env, denied.operatorEmail) }, 200, NO_STORE);
}

async function handlePost({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const action = str(body.action);
  const origin = new URL(request.url).origin;
  const actor = denied.operatorEmail;
  let out;
  if (action === "add-operator") out = await addOperator(env, { email: body.email, name: str(body.name), actor, origin });
  else if (action === "remove-operator") out = await removeOperator(env, { email: body.email, actor });
  else if (action === "approve" || action === "decline") {
    const role = str(body.role) === "operator" ? "operator" : "client";
    if (action === "approve" && role === "operator" && !isOwner(env, actor)) return json({ ok: false, error: "Only the owner can approve operators." }, 403, NO_STORE);
    out = await decideRequest(env, { id: body.id, action, role, actor, origin });
  } else return json({ ok: false, error: "unknown action" }, 422, NO_STORE);
  return json(out.body, out.status, NO_STORE);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
