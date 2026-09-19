// Semantic search.
//   GET /api/search?q=...&kinds=dm,brain&client=   operator: everything; client session: its own brain
//   GET /api/search?status=1                       index coverage (operator)
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { resolveSpineRead } from "../_shared/spine-auth.js";
import { search } from "../_shared/search.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const client = str(url.searchParams.get("client"));
  const wantsOperator = request.headers.get("x-pulsify-operator") === "1" && !client;
  const access = await resolveSpineRead(request, env, wantsOperator ? "operator" : "client", client);
  if (access.error) return access.error;
  const scope = access.role === "operator" && !access.client ? "operator" : access.client;

  if (url.searchParams.get("status") === "1") {
    if (scope !== "operator") return json({ ok: false, error: "operator only" }, 403);
    const counts = (await env.DB.prepare("SELECT kind, COUNT(*) AS n, MAX(indexed_at) AS last FROM search_index_state GROUP BY kind").all()).results || [];
    const totals = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM ig_messages WHERE text IS NOT NULL AND length(text)>=12) AS dms, (SELECT COUNT(*) FROM client_brain WHERE length(value_json)>4) AS brain").first();
    return json({ ok: true, indexed: Object.fromEntries(counts.map((c) => [c.kind, { count: c.n, last: c.last }])), totals, ready: Boolean(env.AI && env.VECTORIZE) });
  }

  const q = str(url.searchParams.get("q"));
  if (q.length < 2) return json({ ok: false, error: "type at least two characters" }, 422);
  const kinds = str(url.searchParams.get("kinds")).split(",").map((k) => k.trim()).filter((k) => ["dm", "brain"].includes(k));
  const t0 = Date.now();
  const hits = await search(env, { q, scope, kinds: kinds.length ? kinds : ["dm", "brain"], topK: Number(url.searchParams.get("limit")) || 12 });
  return json({ ok: true, q, scope, hits, took_ms: Date.now() - t0 });
}

export const onRequestGet = withOperator(handleGet);
