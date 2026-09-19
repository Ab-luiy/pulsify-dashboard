// Operator: archive, restore and list archived workspaces.
//   GET  /api/workspace-archive                 archived workspaces with their exports
//   GET  /api/workspace-archive?client=&export=1  the current full export as a download (any status)
//   POST /api/workspace-archive {client, action:"archive"|"restore"}
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { archiveWorkspace, exportWorkspace, listArchives, restoreWorkspace } from "../_shared/archive.js";

async function handleGet({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const client = str(url.searchParams.get("client"));
  if (client && url.searchParams.get("export") === "1") {
    const bundle = await exportWorkspace(env, client);
    return new Response(JSON.stringify(bundle, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="pulsify-workspace-${client}.json"`, "cache-control": "no-store" } });
  }
  return json({ ok: true, archived: await listArchives(env) });
}

async function handlePost({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const action = str(body.action);
  const client = str(body.client);
  if (!client) return json({ ok: false, error: "client required" }, 422);
  if (action === "archive") {
    const r = await archiveWorkspace(env, client, denied.operatorEmail);
    if (!r.ok) return json(r, 404);
    const { bundle, ...rest } = r;
    return json(rest);
  }
  if (action === "restore") {
    const r = await restoreWorkspace(env, client, denied.operatorEmail);
    return json(r, r.ok ? 200 : 404);
  }
  return json({ ok: false, error: "action must be archive or restore" }, 422);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
