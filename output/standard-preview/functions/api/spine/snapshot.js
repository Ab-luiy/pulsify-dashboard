import { withOperator } from "../../_shared/access.js";
import { json, parseJson } from "../../_shared/common.js";
import { resolveSpineRead } from "../../_shared/spine-auth.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "client" ? "client" : "operator";
  const access = await resolveSpineRead(request, env, scope, url.searchParams.get("client") || "");
  if (access.error) return access.error;

  const clauses = ["scope=?", "client_id=?"];
  const values = [access.scope, access.scope === "client" ? access.client : ""];
  for (const field of ["source", "kind"]) {
    const value = url.searchParams.get(field);
    if (!value) continue;
    clauses.push(`${field}=?`);
    values.push(value);
  }
  const result = await env.DB.prepare(
    `SELECT scope,client_id,source,kind,captured_at,payload_json
       FROM snapshots WHERE ${clauses.join(" AND ")}
      ORDER BY source,kind LIMIT 250`,
  ).bind(...values).all();
  const snapshots = (result.results || []).map((row) => ({
    ...row,
    payload: parseJson(row.payload_json, {}),
    payload_json: undefined,
  }));
  return json({ ok: true, scope: access.scope, client: access.client || "", snapshots });
}

export const onRequestGet = withOperator(handleGet);
