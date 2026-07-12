import { cleanId, escapeHtml, parseJson, titleCase } from "./common.js";

export const VALID_VARIANTS = new Set(["canonical", "variant-02"]);
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
  VIDEO_LABEL: "Private breakdown",
  APPLY_STEP_LABEL: "Step 2",
  APPLY_HEADING: "Apply below",
  APPLY_INTRO: "Tell us where you're at and what you're working on.",
  FORM_FRAME_LABEL: "Application",
  FORM_FRAME_NOTE: "",
  PROOF_KICKER: "Proof",
  PROOF_HEADING: "Don't just take my word for it",
  PROOF_INTRO: "",
  CASE_STUDY_LABEL: "Video case study",
  CASE_STUDY_CARD_ONE: "Student breaks down the shift and the result.",
  CASE_STUDY_CARD_TWO: "Another student explains what changed after applying it.",
  CASE_STUDY_CARD_THREE: "Short-form proof that feels native, not staged.",
  CLOSING_CTA: "CLICK HERE TO APPLY NOW",
  CLOSING_NOTE: "On the live page this button loops back to the embedded Typeform.",
  FOOTER_LABEL: "",
  FOOTER_DISCLAIMER: "Results vary. Nothing on this page guarantees income.",
};

export async function loadClientPage(env, client, { requireRow = false } = {}) {
  let variant = "canonical";
  let content = {};
  let row = null;

  if (env.DB) {
    row = await env.DB.prepare(
      "SELECT template_variant, page_content_json FROM client_config WHERE client=?",
    ).bind(client).first();
    if (row) {
      if (row.template_variant && VALID_VARIANTS.has(row.template_variant)) {
        variant = row.template_variant;
      }
      content = parseJson(row.page_content_json, {});
    }
  }

  if (requireRow && !row) return null;
  return { variant, content };
}

export async function renderClientPage(context, client, page, options = {}) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const previewVariant = options.previewVariant;
  let variant = page.variant;

  if (previewVariant && VALID_VARIANTS.has(previewVariant)) variant = previewVariant;
  const tokenPreviewMode = Boolean(options.tokenPreviewMode && previewVariant);

  const templateUrl = new URL(`/templates/${variant}/index.html`, url.origin);
  const templateResponse = await env.ASSETS.fetch(new Request(templateUrl));
  if (!templateResponse.ok) return next();
  let html = await templateResponse.text();

  const brandFallback = titleCase(client);
  const merged = {
    ...DEFAULT_CONTENT,
    PAGE_TITLE: `${brandFallback} — Private Application`,
    BRAND_MARK: DEFAULT_CONTENT.BRAND_MARK || brandFallback,
    FOOTER_LABEL: DEFAULT_CONTENT.FOOTER_LABEL || brandFallback,
    ...stripEmpty(page.content),
    CLIENT_SLUG: client,
    OG_URL: `${url.origin}/${client}`,
    OG_IMAGE_URL: `${url.origin}/assets/og-card.png`,
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
}

export function normalizeClientId(value, fallback = "pulsify") {
  return cleanId(value, fallback);
}

function stripEmpty(object) {
  const result = {};
  for (const [key, value] of Object.entries(object || {})) {
    if (value !== null && value !== undefined && String(value).trim() !== "") result[key] = value;
  }
  return result;
}
