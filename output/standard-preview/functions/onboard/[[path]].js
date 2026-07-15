import { resolveClientAccess } from "../_shared/client-auth.js";

export async function onRequest(context) {
  const path = readPath(context.params);
  if (path && path !== "index.html") return context.next();

  const access = await resolveClientAccess(context.request, context.env, {
    allowHeaderToken: false,
    allowQueryToken: true,
  });
  if (access.error) {
    return new Response("This onboarding link is invalid or no longer active.", {
      status: 401,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
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
