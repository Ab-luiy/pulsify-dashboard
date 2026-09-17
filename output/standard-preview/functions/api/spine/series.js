import { withOperator } from "../../_shared/access.js";
import { json } from "../../_shared/common.js";
import { resolveSpineRead } from "../../_shared/spine-auth.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") === "client" ? "client" : "operator";
  const requestedClient = url.searchParams.get("client") || "";
  const access = await resolveSpineRead(request, env, scope, requestedClient);
  if (access.error) return access.error;

  const clauses = ["scope=?", "client_id=?"];
  const values = [access.scope, access.scope === "client" ? access.client : ""];
  for (const [param, column] of [["source", "source"], ["metric", "metric"], ["from", "ts >="], ["to", "ts <="], ["dims", "dims_json"]]) {
    const value = url.searchParams.get(param);
    if (!value) continue;
    if (column.endsWith(" >=") || column.endsWith(" <=")) clauses.push(`${column} ?`);
    else clauses.push(`${column}=?`);
    values.push(value);
  }

  const result = await env.DB.prepare(
    `SELECT id,scope,client_id,source,metric,ts,value,value_text,dims_json
       FROM metric_points
      WHERE ${clauses.join(" AND ")}
      ORDER BY ts ASC, id ASC
      LIMIT 5000`,
  ).bind(...values).all();
  return json({ ok: true, scope: access.scope, client: access.client || "", points: result.results || [] });
}

export const onRequestGet = withOperator(handleGet);
