import { loadClientPage, normalizeClientId, renderClientPage } from "./_shared/page-render.js";

const RESERVED_SLUGS = new Set([
  "settings",
  "settings.html",
  "admin",
  "admin.html",
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
    if (!client || !env.DB) return next();

    const page = await loadClientPage(env, client, { requireRow: true });
    if (!page) return next();

    return renderClientPage(context, client, page);
  } catch (error) {
    console.warn("Pulsify slug render:", error.message);
    return next();
  }
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
