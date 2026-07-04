/**
 * THE PICKER + CONTENT RENDER — Cloudflare Pages Function, route "/".
 *
 * Every landing page request goes through here first (Functions take priority
 * over the static index.html left in this folder as a dead-simple fallback).
 * It picks which of the two templates under /templates/ to render for this
 * client (client_config.template_variant, default "canonical"), then fills
 * in that template's {{TOKENS}} from client_config.page_content_json,
 * falling back to generic defaults for anything the client hasn't set yet.
 *
 * This is what makes both "pick a design" and "edit the copy yourself" work
 * off the same two source-of-truth template files under /templates/ — no
 * new HTML files to hand-copy per prospect, and no code deploy to change a
 * headline. Settings (/settings) is where both get edited.
 *
 * Fails safe: any error here (bad client id, DB hiccup, missing template)
 * falls through to the static index.html instead of taking the site down.
 */

const VALID_VARIANTS = new Set(["canonical", "variant-02"]);
const NON_WRAPPABLE_PREVIEW_TOKENS = new Set(["META_DESCRIPTION", "PAGE_TITLE"]);

const DEFAULT_CONTENT = {
  META_DESCRIPTION: "A private breakdown, then apply to work together.",
  PAGE_TITLE: "Private Application",
  BRAND_MARK: "",
  BRAND_NOTE: "",
  AUDIENCE_PILL: "Applications are open",
  HEADLINE_LINE_ONE: "A private breakdown,",
  HEADLINE_EMPHASIS: "then apply to work together.",
  HERO_SUBHEAD: "Watch the training, then apply below.",
  HERO_CTA: "APPLY NOW",
  MICRO_NOTE: "",
  VIDEO_NOTE_PRIMARY: "Private training",
  VIDEO_NOTE_SECONDARY: "No opt-in required to watch",
  APPLY_STEP_LABEL: "Step 2",
  APPLY_HEADING: "Apply below",
  APPLY_INTRO: "Tell us where you're at and what you're working on.",
  FORM_FRAME_LABEL: "Application",
  FORM_FRAME_NOTE: "",
  PROOF_KICKER: "Proof",
  PROOF_INTRO: "",
  CLOSING_CTA: "CLICK HERE TO APPLY NOW",
  FOOTER_LABEL: "",
  FOOTER_DISCLAIMER: "Results vary. Nothing on this page guarantees income.",
};

export async function onRequestGet(context) {
  const { request, env, next } = context;
  try {
    const url = new URL(request.url);
    const client = cleanId(url.searchParams.get("client") || "pulsify");

    let variant = "canonical";
    let content = {};
    if (env.DB) {
      const row = await env.DB.prepare(
        "SELECT template_variant, page_content_json FROM client_config WHERE client=?",
      ).bind(client).first();
      if (row) {
        if (row.template_variant && VALID_VARIANTS.has(row.template_variant)) {
          variant = row.template_variant;
        }
        if (row.page_content_json) {
          try { content = JSON.parse(row.page_content_json); } catch { content = {}; }
        }
      }
    }

    // ?preview=variant-02 lets an operator compare a design before switching the
    // client's saved template_variant — does not touch the database.
    const previewParam = url.searchParams.get("preview");
    if (previewParam && VALID_VARIANTS.has(previewParam)) variant = previewParam;
    const tokenPreviewMode =
      url.searchParams.get("tokens") === "1" &&
      Boolean(previewParam) &&
      VALID_VARIANTS.has(previewParam);

    const templateUrl = new URL(`/templates/${variant}/index.html`, url.origin);
    const templateResponse = await env.ASSETS.fetch(new Request(templateUrl));
    if (!templateResponse.ok) return next();
    let html = await templateResponse.text();

    const brandFallback = titleCase(client);
    const merged = {
      ...DEFAULT_CONTENT,
      BRAND_MARK: DEFAULT_CONTENT.BRAND_MARK || brandFallback,
      FOOTER_LABEL: DEFAULT_CONTENT.FOOTER_LABEL || brandFallback,
      ...stripEmpty(content),
      CLIENT_SLUG: client,
    };
    if (!merged.BRAND_MARK) merged.BRAND_MARK = brandFallback;
    if (!merged.FOOTER_LABEL) merged.FOOTER_LABEL = brandFallback;

    html = html.replace(/\{\{(\w+)\}\}/g, (match, token) => {
      if (!(token in merged)) return "";
      const escaped = escapeHtml(String(merged[token]));
      if (
        tokenPreviewMode &&
        token !== "CLIENT_SLUG" &&
        !NON_WRAPPABLE_PREVIEW_TOKENS.has(token)
      ) {
        return `<span data-token="${token}">${escaped}</span>`;
      }
      return escaped;
    });
    html = html.replace('href="css/style.css"', `href="/templates/${variant}/css/style.css"`);

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.warn("Pulsify page render:", error.message);
    return next();
  }
}

function stripEmpty(object) {
  const result = {};
  for (const [key, value] of Object.entries(object || {})) {
    if (value !== null && value !== undefined && String(value).trim() !== "") result[key] = value;
  }
  return result;
}

function titleCase(slug) {
  return String(slug || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ") || "Pulsify";
}

function cleanId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || "pulsify";
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
