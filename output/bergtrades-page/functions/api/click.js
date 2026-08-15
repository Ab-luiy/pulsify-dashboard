// Logs a CTA click from a prospect asset page into D1 (table: asset_clicks).
// Fire-and-forget: the page never waits on this and navigation is never blocked.
export async function onRequestPost({ request, env }) {
  const ok = () => new Response(null, { status: 204 });
  try {
    if (!env.DB) return ok();                       // no binding yet, fail silently
    const body = await request.json().catch(() => ({}));
    const cf = request.cf || {};
    await env.DB.prepare(
      "INSERT INTO asset_clicks (asset, cta, path, country, ua) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      "bergtrades",
      String(body.cta || "unknown").slice(0, 64),
      String(body.path || "/").slice(0, 200),
      String(cf.country || "").slice(0, 8),
      (request.headers.get("user-agent") || "").slice(0, 200)
    ).run();
  } catch (_) { /* never surface an error to the page */ }
  return ok();
}
