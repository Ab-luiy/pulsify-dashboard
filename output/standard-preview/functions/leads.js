/**
 * THE READER — Cloudflare Pages Function.
 * Route when deployed: GET /leads?client=frank
 *
 * The client portal calls this to get everything for one client in a single response:
 * each application, plus how far that person watched the VSL. This is what the
 * dashboard renders.
 */

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const client = url.searchParams.get("client") || "unknown";

  if (!env.DB) return json({ ok: false, error: "no database bound yet" }, 200);

  const leads = (await env.DB.prepare(
    "SELECT email,name,revenue,situation,applied_at,status FROM leads WHERE client=? ORDER BY applied_at DESC"
  ).bind(client).all()).results || [];

  // best (max) watch percent per email
  const watch = (await env.DB.prepare(
    "SELECT email, MAX(percent) AS watched FROM watch_events WHERE client=? GROUP BY email"
  ).bind(client).all()).results || [];

  const watchedBy = {};
  watch.forEach((w) => { watchedBy[w.email] = w.watched; });

  const rows = leads.map((l) => ({ ...l, watched: watchedBy[l.email] ?? null }));

  // simple funnel numbers
  const plays = (await env.DB.prepare(
    "SELECT COUNT(DISTINCT email) AS n FROM watch_events WHERE client=?"
  ).bind(client).first()) || { n: 0 };

  return json({
    ok: true,
    client,
    summary: { applications: rows.length, watchers: plays.n },
    leads: rows,
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}
