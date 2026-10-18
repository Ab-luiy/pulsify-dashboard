/**
 * THE PICKER + CONTENT RENDER — Cloudflare Pages Function, route "/".
 *
 * "/" and "/?client=..." keep the original query-param behavior. Clean
 * client paths such as "/kyle-kirshner" use functions/[slug].js but share the
 * same template + token render pipeline.
 */

import {
  loadClientPage,
  normalizeClientId,
  renderClientPage,
  VALID_VARIANTS,
} from "./_shared/page-render.js";

export async function onRequestGet(context) {
  const { request, next } = context;
  try {
    const url = new URL(request.url);
    const requestedClient = url.searchParams.get("client");
    // The apex is the public homepage (pulsify-saas #38, live 2026-10-18).
    // Prospect funnels live at their named slugs; ?client= stays for
    // backwards-compatible preview links.
    if (!requestedClient) return homepage(context, url);
    const client = normalizeClientId(requestedClient);
    const page = await loadClientPage(context.env, client);
    const operatorPreview = url.searchParams.get("operator_preview") === "1";
    if (!page.active && !operatorPreview) return inactivePageResponse();

    // ?preview=variant-02 lets an operator compare a design before switching the
    // client's saved template_variant — does not touch the database.
    const previewParam = url.searchParams.get("preview");
    const previewVariant = previewParam && VALID_VARIANTS.has(previewParam) ? previewParam : null;

    return renderClientPage(context, client, page, {
      previewVariant,
      tokenPreviewMode: url.searchParams.get("tokens") === "1" && Boolean(previewVariant),
    });
  } catch (error) {
    console.warn("Pulsify page render:", error.message);
    return next();
  }
}

// The homepage is the Next.js export at /app/homepage. It needs inline scripts
// and styles (Next hydration) and frames the Cal.com booking page; nothing else
// is loaded from another origin. If the export is missing, the old gateway page
// (index.html) is served instead so the apex never breaks.
export const HOMEPAGE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://cal.com",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

async function homepage(context, url) {
  const { env, next } = context;
  try {
    let res = await env.ASSETS.fetch(new URL("/app/homepage", url));
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      res = await env.ASSETS.fetch(new URL(res.headers.get("location"), url));
    }
    if (!res.ok) return next();
    const headers = new Headers(res.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("content-security-policy", HOMEPAGE_CSP);
    headers.set("cache-control", "no-cache");
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
    return new Response(res.body, { status: 200, headers });
  } catch {
    return next();
  }
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
