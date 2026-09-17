import { withOperator } from "../../_shared/access.js";
import { json, parseJson } from "../../_shared/common.js";
import { resolveOperator } from "../../_shared/spine-auth.js";

const PAGE_SIZE = 100;

async function handleGet({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const clauses = [];
  const values = [];
  for (const field of ["tier", "niche"]) {
    const value = url.searchParams.get(field);
    if (!value) continue;
    clauses.push(`${field}=?`);
    values.push(value);
  }
  const query = String(url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 200);
  if (query) {
    clauses.push("LOWER(payload_json) LIKE ?");
    values.push(`%${query.replace(/[\\%_]/g, "\\$&")}%`);
  }
  const cursor = Math.max(0, Number.parseInt(url.searchParams.get("cursor") || "0", 10) || 0);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await env.DB.prepare(
    `SELECT id,payload_json,score,tier,niche,updated_at
       FROM yt_leads ${where}
      ORDER BY score DESC,id ASC LIMIT ? OFFSET ?`,
  ).bind(...values, PAGE_SIZE + 1, cursor).all();
  const rows = result.results || [];
  const hasMore = rows.length > PAGE_SIZE;
  const leads = rows.slice(0, PAGE_SIZE).map((row) => ({
    ...parseJson(row.payload_json, {}),
    _id: row.id,
    score: row.score,
    tier: row.tier,
    niche: row.niche,
    updated_at: row.updated_at,
  }));
  return json({ ok: true, leads, cursor, nextCursor: hasMore ? cursor + PAGE_SIZE : null });
}

export const onRequestGet = withOperator(handleGet);
