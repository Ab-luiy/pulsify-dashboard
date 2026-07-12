import { resolveClientAccess } from "../_shared/client-auth.js";

export async function onRequest(context) {
  const path = readPath(context.params);
  if (path === "login") return serveLogin(context);
  if (!path) return serveDashboard(context);
  return context.next();
}

async function serveDashboard({ request, env }) {
  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: false,
    allowQueryToken: true,
  });
  if (access.error) {
    const loginUrl = new URL("/portal/login", request.url);
    const client = new URL(request.url).searchParams.get("client");
    if (client) loginUrl.searchParams.set("client", client);
    return Response.redirect(loginUrl, 302);
  }
  return serveAsset(env, request, "/portal/index.html");
}

async function serveLogin({ request, env }) {
  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: false,
    allowQueryToken: false,
  });
  if (!access.error) {
    const destination = new URL("/portal", request.url);
    destination.searchParams.set("client", access.client);
    return Response.redirect(destination, 302);
  }
  return serveAsset(env, request, "/portal/login/index.html");
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
    return response;
  }
  return new Response("Not found", { status: 404 });
}

function readPath(params) {
  const value = params?.path;
  if (Array.isArray(value)) return value.join("/").replace(/^\/+|\/+$/g, "");
  return String(value || "").replace(/^\/+|\/+$/g, "");
}
