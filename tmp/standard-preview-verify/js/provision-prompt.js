/**
 * Shared prompt builder for the "New prospect page" provisioning flow.
 *
 * Loaded directly by settings.html (browser global `PulsifyProvisionPrompt`) for the
 * client-side "Copy landing-page prompt" button. The server-side twin lives at
 * functions/_shared/provision-prompt.js (functions/api/generate.js imports it) -
 * the two files must be kept in sync by hand since Pages Functions and the settings page
 * do not share a bundler. If you edit the token spec, copy rules, or prompt shape here,
 * make the same edit there.
 */

(function (root) {
  const TOKEN_SPEC = [
    { key: "PAGE_TITLE", where: "browser tab title", length: "under 60 characters", variant: "both" },
    { key: "META_DESCRIPTION", where: "search/share preview description", length: "one sentence, under 155 characters", variant: "both" },
    { key: "BRAND_MARK", where: "small brand name at the very top of the page, the entire header", length: "1-3 words", variant: "both" },
    { key: "BRAND_NOTE", where: "small tag shown next to the brand mark", length: "a few words", variant: "variant-02 only" },
    { key: "AUDIENCE_PILL", where: "the qualifier pill above the headline, names who the page is for", length: "one short line", variant: "both" },
    { key: "HEADLINE_LINE_ONE", where: "hero headline, first line", length: "short, punchy", variant: "both" },
    { key: "HEADLINE_EMPHASIS", where: "hero headline, second line shown in the accent color", length: "short, punchy", variant: "both" },
    { key: "HERO_SUBHEAD", where: "one line under the headline, names the result and points at the video", length: "one sentence", variant: "both" },
    { key: "HERO_CTA", where: "the primary button text under the video", length: "2-4 words, usually uppercase", variant: "both" },
    { key: "MICRO_NOTE", where: "small line directly under the hero CTA button", length: "a few words", variant: "variant-02 only" },
    { key: "VIDEO_NOTE_PRIMARY", where: "left caption under the video frame", length: "a few words", variant: "both" },
    { key: "VIDEO_NOTE_SECONDARY", where: "right caption under the video frame", length: "a few words", variant: "both" },
    { key: "VIDEO_LABEL", where: "short overlay label inside the hero video frame", length: "2-6 words", variant: "canonical only" },
    { key: "APPLY_STEP_LABEL", where: "small step label above the application heading, e.g. \"Step 2\"", length: "2-3 words", variant: "both" },
    { key: "APPLY_HEADING", where: "heading directly above the embedded application form", length: "one short line", variant: "both" },
    { key: "APPLY_INTRO", where: "one line under the application heading", length: "one sentence", variant: "both" },
    { key: "FORM_FRAME_LABEL", where: "small label on the frame around the embedded form", length: "a few words", variant: "variant-02 only" },
    { key: "FORM_FRAME_NOTE", where: "small note on the frame around the embedded form", length: "a few words", variant: "variant-02 only" },
    { key: "PROOF_KICKER", where: "small kicker above the proof heading", length: "1-3 words", variant: "both" },
    { key: "PROOF_HEADING", where: "the main proof-section heading", length: "one short line", variant: "canonical only" },
    { key: "PROOF_INTRO", where: "one line under the proof heading", length: "one sentence", variant: "both" },
    { key: "CASE_STUDY_LABEL", where: "small label above each video case-study card", length: "2-4 words", variant: "canonical only" },
    { key: "CASE_STUDY_CARD_ONE", where: "first video case-study card headline", length: "one sentence fragment", variant: "canonical only" },
    { key: "CASE_STUDY_CARD_TWO", where: "second video case-study card headline", length: "one sentence fragment", variant: "canonical only" },
    { key: "CASE_STUDY_CARD_THREE", where: "third video case-study card headline", length: "one sentence fragment", variant: "canonical only" },
    { key: "CLOSING_CTA", where: "the final button text at the bottom of the page, repeats the hero CTA's destination", length: "2-4 words, usually uppercase", variant: "both" },
    { key: "CLOSING_NOTE", where: "the small note under the final CTA in the canonical template", length: "one sentence", variant: "canonical only" },
    { key: "FOOTER_LABEL", where: "brand name in the footer", length: "1-3 words", variant: "both" },
    { key: "FOOTER_DISCLAIMER", where: "small results-vary disclaimer in the footer", length: "one sentence", variant: "both" },
  ];

  const VARIANT_02_ONLY = TOKEN_SPEC.filter((t) => t.variant === "variant-02 only").map((t) => t.key);

  const STRUCTURE_EXPLANATION =
    "The landing page is a single scrolling page in this order: a hero headline over an embedded VSL " +
    "(video sales letter, no page above it competes for attention), then an application step (an embedded " +
    "Typeform directly under the video), then a student-proof block (video case-study cards first, then a " +
    "centered screenshot wall with no mini captions), then a closing call-to-action that repeats the same " +
    "button and destination as the hero, then a footer with a brand line and a results-vary disclaimer.";

  const COPY_RULES = [
    "Headline rule: the headline (HEADLINE_LINE_ONE + HEADLINE_EMPHASIS) must lead with a unique mechanism, a specific case study, or a specific result. Never a generic outcome statement everyone in the niche already claims. If the brief has a real, verified case study or number, lead with that. If not, lead with the mechanism (the specific behavior being replaced and what replaces it), never a vague promise.",
    "Anti-invention rule, non-negotiable: never invent facts, numbers, revenue figures, student counts, tenure, or biography that are not present in the brief. If the brief has no real proof or specific numbers, write honest, generic copy that leans on the mechanism instead of fabricating a stat to fill the space.",
    "No emojis. No exclamation marks. Sentence case for headings (not Title Case).",
    "Banned AI tells, apply on every field: no \"It's not X, it's Y\" negative parallelism; no em-dash overuse (at most one or two, prefer commas and periods); no \"here's the thing\" / \"here's the kicker\" / false-suspense transitions; no rule-of-three padding stacked more than once; no curly quotes or arrow glyphs (use straight quotes and \"->\"); no corporate filler (\"it's worth noting\", \"importantly\", \"leverage\", \"seamless\", \"robust\").",
    "Write in the creator's own voice. Use the brief's verbatim quotes as the voice reference for word choice and tone, but do not lift a quote verbatim into the page copy unless it is being used as an explicit, attributed quote.",
    "Direct, no hedging. If the brief doesn't support a claim, don't make it - write the mechanism or offer instead.",
  ];

  function buildTokenSpecText() {
    return TOKEN_SPEC.map((t) => {
      const suffix = t.variant.endsWith("only") ? ` [${t.variant}]` : "";
      return `- ${t.key}: ${t.where}. Length guidance: ${t.length}.${suffix}`;
    }).join("\n");
  }

  function buildPrompt(brief) {
    const trimmedBrief = String(brief || "").trim();
    return [
      "You are writing landing-page copy for Pulsify, a growth company that builds outreach landing pages for online coaches and creators in biz-op niches (trading, ecom, dropshipping, Amazon FBA, Airbnb hosting, TikTok Shop, etc).",
      "",
      "PAGE STRUCTURE",
      STRUCTURE_EXPLANATION,
      "",
      "TOKEN SPEC - fill every token below. Some are variant-specific; still fill them so the operator can switch templates later without rewriting from scratch.",
      buildTokenSpecText(),
      "",
      "COPY RULES",
      COPY_RULES.map((rule, i) => `${i + 1}. ${rule}`).join("\n"),
      "",
      "CREATOR BRIEF (the only source of facts you may use - do not add anything not in here)",
      "---",
      trimmedBrief || "(no brief provided)",
      "---",
      "",
      "OUTPUT INSTRUCTIONS",
      "Return STRICT JSON only. No markdown code fences, no commentary before or after, just the JSON object. Shape exactly:",
      "{",
      '  "client_slug": "<lowercase a-z0-9 and hyphens only, derived from the creator\'s name, e.g. \\"jane-doe\\">",',
      '  "client_name": "<display name>",',
      '  "template_variant": "canonical",',
      '  "page_content": { "<TOKEN_NAME>": "<value>", ... only the tokens listed above, all of them ... }',
      "}",
    ].join("\n");
  }

  const api = {
    TOKEN_SPEC,
    VARIANT_02_ONLY,
    STRUCTURE_EXPLANATION,
    COPY_RULES,
    buildPrompt,
    knownTokenKeys: () => TOKEN_SPEC.map((t) => t.key),
  };

  root.PulsifyProvisionPrompt = api;
})(window);
