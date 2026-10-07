// Growth #18: the rules the review gate has taught the story sequence generator.
// Operator only. GET lists active rules (every client's first, then per client).
// POST {action: "apply-to-all" | "client-only" | "retire", id} changes one rule.
// Rules are written by studio-sequences.js on reject and read by studio-generate.js.
import { withOperator } from "../_shared/access.js";
import { checkAdmin, json } from "../_shared/common.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  const rows = await env.DB.prepare(
    `SELECT *
       FROM studio_feedback
      WHERE active=1
      ORDER BY CASE WHEN scope='all' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 200`,
  ).all();
  return json({ ok: true, rows: rows.results || [] });
}

const ACTIONS = {
  "apply-to-all": "UPDATE studio_feedback SET scope='all', updated_at=? WHERE id=? AND active=1",
  "client-only": "UPDATE studio_feedback SET scope='client', updated_at=? WHERE id=? AND active=1",
  retire: "UPDATE studio_feedback SET active=0, updated_at=? WHERE id=? AND active=1",
};

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim().toLowerCase();
  const id = Number(body.id || 0);
  if (!ACTIONS[action]) return json({ ok: false, error: "unknown action" }, 422);
  if (!id) return json({ ok: false, error: "rule id is required" }, 422);
  const result = await env.DB.prepare(ACTIONS[action]).bind(new Date().toISOString(), id).run();
  if (!Number(result.meta?.changes || 0)) return json({ ok: false, error: "rule not found" }, 404);
  return json({ ok: true });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
