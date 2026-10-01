// The one sign-in page (portal/login/index.html) with its security headers. Used by /login/*,
// /portal/login and /portal/register so every address answers the same way.
export const LOGIN_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'";

// ASSETS.fetch on an explicit index.html answers 308 to the directory URL; follow it internally so
// the caller only ever sees the final document.
export async function serveLoginPage(env, request) {
  if (!env.ASSETS) return new Response("Not found", { status: 404 });
  let url = new URL("/portal/login/index.html", request.url);
  for (let hop = 0; hop < 3; hop++) {
    const response = await env.ASSETS.fetch(new Request(url, { headers: request.headers }));
    const location = response.headers.get("location");
    if (response.status >= 301 && response.status <= 308 && location) {
      url = new URL(location, url);
      continue;
    }
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    // The setup link carries a one-time token in its address, so nothing is told where the visitor came from.
    headers.set("referrer-policy", "no-referrer");
    headers.set("x-robots-tag", "noindex, nofollow");
    headers.set("content-security-policy", LOGIN_CSP);
    headers.set("x-content-type-options", "nosniff");
    headers.set("x-frame-options", "DENY");
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
  }
  return new Response("Not found", { status: 404 });
}
