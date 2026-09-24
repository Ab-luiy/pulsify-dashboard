import { loadClientPage, normalizeClientId, renderClientPage } from "./_shared/page-render.js";

const RESERVED_SLUGS = new Set([
  "settings",
  "settings.html",
  "admin",
  "admin.html",
  "app",
  "login",
  "site",
  "privacy",
  "privacy.html",
  "terms",
  "terms.html",
  "campaigns",
  "campaigns.html",
  "integrations",
  "integrations.html",
  "portal",
  "portal.html",
  "client",
  "client.html",
  "optin",
  "optin.html",
  "api",
  "a",
  "templates",
  "assets",
  "css",
  "js",
  "event",
  "leads",
  "favicon.ico",
  "robots.txt",
  "index.html",
]);

export async function onRequestGet(context) {
  const { request, env, next, params } = context;
  try {
    const slug = getSlug(params);
    if (!slug || RESERVED_SLUGS.has(slug.toLowerCase())) return next();
    if (await hasStaticAsset(context)) return next();

    const client = normalizeClientId(slug, "");
    if (!client) return notFound(context);
    if (!env.DB) return new Response("Service temporarily unavailable", { status: 503 });

    const page = await loadClientPage(env, client, { requireRow: true });
    if (!page) return notFound(context);
    const operatorPreview = new URL(request.url).searchParams.get("operator_preview") === "1";
    if (!page.active && !operatorPreview) return inactivePageResponse();

    return renderClientPage(context, client, page);
  } catch (error) {
    console.warn("Pulsify slug render:", error.message);
    return new Response("Service temporarily unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  }
}

async function notFound({ env, request }) {
  const asset = env.ASSETS && await env.ASSETS.fetch(new Request(new URL("/404.html", request.url)));
  return new Response(asset ? asset.body : "Page not found", {
    status: 404,
    headers: { "content-type": asset?.headers.get("content-type") || "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

function inactivePageResponse() {
  return new Response("Page not available", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function getSlug(params) {
  const value = params?.slug;
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
}

async function hasStaticAsset({ request, env }) {
  if (!env.ASSETS) return false;
  const response = await env.ASSETS.fetch(request);
  if (response.status === 404) return false;

  const url = new URL(request.url);
  const hasExtension = /\.[a-z0-9]+$/i.test(url.pathname);
  const contentType = response.headers.get("content-type") || "";
  return hasExtension || !contentType.includes("text/html");
}
