import { serveLoginPage } from "../_shared/login-page.js";
import {
  consumeImpersonationExchange,
  issueClientSession,
  resolveClientAccess,
} from "../_shared/client-auth.js";

export async function onRequest(context) {
  const path = readPath(context.params);
  if (/^references\/(story-\d+\.png|thumbnail-\d+\.jpg|library-\d+\.(png|jpg))$/.test(path)) {
    const access = await resolveClientAccess(context.request, context.env, { allowHeaderToken: false, allowImpersonated: true });
    if (access.error) return access.error;
    return serveAsset(context.env, context.request, '/portal/' + path);
  }
  if (path === "register") return serveLoginPage(context.env, context.request);
  if (path === "login") return serveLogin(context);
  if (!path || path === 'index.html') return serveDashboard(context);
  return context.next();
}

async function serveDashboard({ request, env }) {
  const url = new URL(request.url);
  const exchangeToken = url.searchParams.get("imp");
  if (exchangeToken) {
    const session = await consumeImpersonationExchange(env, exchangeToken);
    if (!session) {
      const loginUrl = new URL("/portal/login", request.url);
      return new Response(null, {
        status: 302,
        headers: {
          location: loginUrl.toString(),
          "cache-control": "no-store",
          "referrer-policy": "no-referrer",
        },
      });
    }
    // Cutover: previews open the Next.js portal directly.
    const destination = new URL("/app/portal", request.url);
    destination.searchParams.set("client", session.client);
    return new Response(null, {
      status: 302,
      headers: {
        location: destination.toString(),
        "set-cookie": session.cookie,
        "cache-control": "no-store",
        "referrer-policy": "no-referrer",
      },
    });
  }

  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: false,
    allowQueryToken: true,
    allowImpersonated: true,
  });
  if (access.error) {
    const loginUrl = new URL("/portal/login", request.url);
    const client = new URL(request.url).searchParams.get("client");
    if (client) loginUrl.searchParams.set("client", client);
    return Response.redirect(loginUrl, 302);
  }
  // Cutover 2026-09-24: the client portal is the Next.js app at /app/portal,
  // which re-checks the session itself (functions/app/portal/[[path]].js).
  // Old hash links (#instagram/types) are carried over for the new page to map.
  const destination = new URL("/app/portal", request.url);
  destination.searchParams.set("client", access.client);
  const headers = new Headers({ location: destination.toString(), "cache-control": "no-store", "referrer-policy": "no-referrer" });
  if (access.auth_mode === "token") {
    const session = await issueClientSession(env, access.client);
    headers.append("set-cookie", session.cookie);
  }
  return new Response(null, { status: 302, headers });
}

async function serveLogin({ request, env }) {
  if (new URL(request.url).searchParams.has("setup")) {
    return serveLoginPage(env, request);
  }
  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: false,
    allowQueryToken: false,
    allowImpersonated: true,
  });
  if (!access.error) {
    const destination = new URL("/app/portal", request.url);
    destination.searchParams.set("client", access.client);
    return Response.redirect(destination, 302);
  }
  return serveLoginPage(env, request);
}

// ASSETS.fetch on an explicit index.html returns a 308 to the directory URL,
// which loops back into this function. Follow asset-layer redirects internally
// and only ever return the final document to the client.
async function serveAsset(env, request, assetPath) {
  if (!env.ASSETS) return new Response("Not found", { status: 404 });
  let url = new URL(assetPath, request.url);
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

function readPath(params) {
  const value = params?.path;
  if (Array.isArray(value)) return value.join("/").replace(/^\/+|\/+$/g, "");
  return String(value || "").replace(/^\/+|\/+$/g, "");
}
