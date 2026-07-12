/**
 * THE PICKER + CONTENT RENDER — Cloudflare Pages Function, route "/".
 *
 * "/" and "/?client=..." keep the original query-param behavior. Clean
 * client paths such as "/frank-wieler" use functions/[slug].js but share the
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
    const client = normalizeClientId(url.searchParams.get("client") || "pulsify");
    const page = await loadClientPage(context.env, client);

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
