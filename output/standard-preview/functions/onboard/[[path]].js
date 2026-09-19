import { resolveClientAccess } from "../_shared/client-auth.js";

export async function onRequest(context) {
  const path = readPath(context.params);
  if (path && path !== "index.html") return context.next();

  const access = await resolveClientAccess(context.request, context.env, {
    allowHeaderToken: false,
    allowQueryToken: true,
    allowImpersonated: ["GET", "HEAD"].includes(context.request.method),
  });
  if (access.error) {
    if (access.error.status === 401 && ["GET", "HEAD"].includes(context.request.method)) {
      const destination = new URL(context.request.url);
      destination.searchParams.delete("t");
      const login = new URL("/portal/login", destination);
      login.searchParams.set("next", destination.pathname + destination.search);
      return new Response(null, { status: 302, headers: { location: login.href, "cache-control": "no-store" } });
    }
    return access.error;
  }

  return serveAsset(context.env, context.request, "/onboard/index.html");
}

async function serveAsset(env, request, assetPath) {
  if (!env.ASSETS) return new Response("Not found", { status: 404 });
  let url = new URL(assetPath, request.url);
  for (let hop = 0; hop < 3; hop += 1) {
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
