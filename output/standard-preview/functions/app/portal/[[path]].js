// The new client portal (Next.js export under /app/portal). Same rules as the
// legacy portal in functions/portal/[[path]].js: only a signed-in client (or an
// operator preview session) gets the page, and the page learns who it is from
// window.PulsifySession injected here, never from the URL. Route payloads
// (.txt) are gated the same way so client data never leaves without a session.
import { issueClientSession, resolveClientAccess } from "../../_shared/client-auth.js";

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: false,
    allowQueryToken: true,
    allowImpersonated: true,
  });

  const isDocument = !/\.[a-z0-9]+$/i.test(url.pathname) || url.pathname.endsWith(".html");
  if (access.error) {
    if (!isDocument) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
    const login = new URL("/login/client", url);
    const client = url.searchParams.get("client");
    if (client) login.searchParams.set("client", client);
    if (url.pathname !== "/app/portal" && url.pathname !== "/app/portal/") login.searchParams.set("next", url.pathname);
    return Response.redirect(login.toString(), 302);
  }

  let response = await serveAsset(env, request, url.pathname);
  if (isDocument && response.ok && (response.headers.get("content-type") || "").includes("text/html")) {
    const session = JSON.stringify({
      client: access.client,
      client_name: access.client_name || null,
      impersonated: Boolean(access.impersonated),
    }).replace(/</g, "\\u003c");
    const html = await response.text();
    response = new Response(html.replace("<head>", `<head><script>window.PulsifySession=${session};</script>`), {
      status: response.status,
      headers: response.headers,
    });
  }
  if (access.auth_mode === "token" && response.ok) {
    const session = await issueClientSession(env, access.client);
    response.headers.append("set-cookie", session.cookie);
  }
  return response;
}

// Follow asset-layer redirects internally (pretty URLs) and return the final file.
async function serveAsset(env, request, pathname) {
  if (!env.ASSETS) return new Response("Not found", { status: 404 });
  let url = new URL(pathname, request.url);
  for (let hop = 0; hop < 3; hop++) {
    const response = await env.ASSETS.fetch(new Request(url, { headers: request.headers }));
    const location = response.headers.get("location");
    if (response.status >= 301 && response.status <= 308 && location) {
      url = new URL(location, url);
      continue;
    }
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    headers.set("referrer-policy", "no-referrer");
    headers.set("x-robots-tag", "noindex, nofollow");
    return new Response(response.body, { status: response.status, headers });
  }
  return new Response("Not found", { status: 404 });
}
