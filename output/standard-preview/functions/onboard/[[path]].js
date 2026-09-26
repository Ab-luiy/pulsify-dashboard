// The onboarding form lives in the app now (pulsify-saas #16, founder
// 2026-09-25: one standard form). Links already sent keep working: the visit
// moves to /app/portal/onboarding with the same query, and that page's own gate
// (functions/app/portal/[[path]].js) checks the ?t= link or the session and
// signs the visitor in. The legacy page's scripts below stay servable.
export async function onRequest(context) {
  const path = readPath(context.params);
  if (path && path !== "index.html") return context.next();
  if (!["GET", "HEAD"].includes(context.request.method)) {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }
  const from = new URL(context.request.url);
  const to = new URL("/app/portal/onboarding", from);
  to.search = from.search;
  return new Response(null, { status: 302, headers: { location: to.href, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}

function readPath(params) {
  const value = params?.path;
  if (Array.isArray(value)) return value.join("/").replace(/^\/+|\/+$/g, "");
  return String(value || "").replace(/^\/+|\/+$/g, "");
}
