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
  if (!env.ASSETS) return new Response("Not found", { status: 404 });
  return env.ASSETS.fetch(new Request(new URL("/portal/index.html", request.url), request));
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
  if (!env.ASSETS) return new Response("Not found", { status: 404 });
  return env.ASSETS.fetch(new Request(new URL("/portal/login/index.html", request.url), request));
}

function readPath(params) {
  const value = params?.path;
  if (Array.isArray(value)) return value.join("/").replace(/^\/+|\/+$/g, "");
  return String(value || "").replace(/^\/+|\/+$/g, "");
}
