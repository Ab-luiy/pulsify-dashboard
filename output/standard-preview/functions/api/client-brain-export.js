import { buildMarkdownContextPackage, loadClientBrainData } from "../_shared/client-brain-context.js";
import { checkAdmin, cleanId, json, nowIso } from "../_shared/common.js";
import { groupBrainRows } from "./client-brain.js";

export async function onRequestGet({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const client = cleanId(new URL(request.url).searchParams.get("client"));
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);

  const [brain, config] = await Promise.all([
    loadClientBrainData(env, client),
    env.DB.prepare(
      "SELECT COALESCE(client_name, client) AS client_name FROM client_config WHERE client=?",
    ).bind(client).first(),
  ]);
  if (!config) return json({ ok: false, error: "client not found" }, 404);

  const grouped = groupBrainRows(brain.rows);
  const markdown = buildMarkdownContextPackage({
    client,
    clientName: config.client_name || client,
    sections: grouped.sections,
    proofItems: brain.proof_items,
    exportedAt: nowIso(),
  });

  return new Response(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${client}-pulsify-context.md"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}
