// Launch checklist, server-side per client.
//   GET  /api/checklist?client=            steps with state; runs auto-complete first
//   POST /api/checklist {client, step, state}   done | skipped | open
// Clients act on their own workspace. Operators act on any client, including
// while impersonating, and the actor is recorded on the step.
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { autoComplete, loadChecklist, setStep } from "../_shared/checklist.js";
import { resolveSpineRead } from "../_shared/spine-auth.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const access = await resolveSpineRead(request, env, "client", str(url.searchParams.get("client")));
  if (access.error) return access.error;
  if (!access.client) return json({ ok: false, error: "client required" }, 422);
  const auto = await autoComplete(env, access.client);
  const checklist = await loadChecklist(env, access.client);
  if (checklist.done === checklist.total) {
    await env.DB.prepare("UPDATE client_config SET status='client', updated_at=? WHERE client=? AND status='onboarding'").bind(new Date().toISOString(), access.client).run().catch(() => null);
  }
  return json({ ok: true, client: access.client, auto_completed: auto, ...checklist });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveSpineRead(request, env, "client", str(body.client));
  if (access.error) return access.error;
  if (!access.client) return json({ ok: false, error: "client required" }, 422);
  const actor = access.role === "operator" ? access.operatorEmail : `client:${access.client}`;
  const result = await setStep(env, access.client, str(body.step), str(body.state || "done"), actor);
  if (!result.ok) return json(result, 422);
  return json({ ok: true, ...(await loadChecklist(env, access.client)) });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
