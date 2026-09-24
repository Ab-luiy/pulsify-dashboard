// Pain-point tags for the operator inbox (pulsify-saas ticket #14).
// One-click labels for what a prospect is struggling with. Each tag maps to
// the asset Pulsify builds for it (wiki/playbooks/prospect-asset-library.md,
// "The menu") and, where one exists, the ready-made resource sent to people who
// have not replied (outreach/resources/document-excerpts/SEND-NOTE.md).
// `built: false` marks an asset the library lists as proposed, not yet built.
// Pillar order is content, offer, funnel: diagnose upstream first.

export const PILLARS = ["content", "offer", "funnel"];

// Ready-made resources, by the pillar pair they belong to (document excerpts).
export const READY_ASSETS = {
  content: [
    { id: "content-01", label: "Video angles from questions", file: "content-01-ideas.png" },
    { id: "content-02", label: "Recording with examples", file: "content-02-recording.png" },
  ],
  profile: [
    { id: "profile-01", label: "Start-here highlights", file: "profile-01-highlights.png" },
    { id: "profile-02", label: "Bio, YouTube and DM continuity", file: "profile-02-bio.png" },
  ],
  funnel: [
    { id: "funnel-01", label: "VSL opening", file: "funnel-01-vsl-opening.png" },
    { id: "funnel-02", label: "Page congruence and proof", file: "funnel-02-page-and-proof.png" },
  ],
};

export const PAIN_TAGS = [
  { id: "no-youtube", label: "No YouTube channel", pillar: "content", asset: "Content ladder and YouTube launch", built: true, ready: "content" },
  { id: "dormant-channel", label: "Channel went quiet", pillar: "content", asset: "Dormant channel repackage", built: false, ready: "content" },
  { id: "weak-packaging", label: "Titles and thumbnails waste the videos", pillar: "content", asset: "Content packaging teardown", built: true, ready: "content" },
  { id: "lifestyle-not-skill", label: "Sells the lifestyle, not the skill", pillar: "content", asset: "Content ladder and YouTube launch", built: true, ready: "content" },
  { id: "reach-no-buyers", label: "Views but no buyers", pillar: "content", asset: "Conversion-job audit", built: true, ready: "profile" },
  { id: "profile-no-trust", label: "Profile does not build trust", pillar: "content", asset: "Authority bridge audit", built: true, ready: "profile" },
  { id: "no-mechanism", label: "No named method", pillar: "offer", asset: "Offer architecture and unique mechanism", built: false, ready: null },
  { id: "no-filter", label: "Anyone can buy, no qualification", pillar: "offer", asset: "Application or qualification form", built: false, ready: null },
  { id: "bad-funnel", label: "Bad funnel, link and CTA disagree", pillar: "funnel", asset: "Funnel and door teardown", built: true, ready: "funnel" },
  { id: "stories-ask-first", label: "Stories ask before they prove", pillar: "funnel", asset: "Story sequence", built: true, ready: "profile" },
  { id: "leads-leak", label: "Leads are not caught", pillar: "funnel", asset: "Landing page plus pre-call emails", built: false, ready: "funnel" },
  { id: "calls-stall", label: "Calls stall on objections", pillar: "funnel", asset: "Pre-call objection page", built: false, ready: "funnel" },
];

const TAG_IDS = new Set(PAIN_TAGS.map((tag) => tag.id));
const ASSET_IDS = new Set(Object.values(READY_ASSETS).flat().map((asset) => asset.id));
export const MAX_TAGS = 6;

const parse = (value) => {
  try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};

// [{id, strength 1..3}] with known ids only, deduped, at most MAX_TAGS.
export function cleanTags(input) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(input) ? input : []) {
    const id = String(item?.id || "");
    if (!TAG_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    const strength = Math.min(3, Math.max(1, Math.trunc(Number(item?.strength) || 2)));
    out.push({ id, strength });
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export const readTags = (json) => cleanTags(parse(json));

// One logged asset send: {kind personal|ready, tag, asset?, at}.
export function cleanAssetEntry(input, at) {
  const kind = input?.kind === "personal" ? "personal" : input?.kind === "ready" ? "ready" : null;
  const tag = String(input?.tag || "");
  if (!kind || !TAG_IDS.has(tag)) return null;
  const asset = kind === "ready" ? String(input?.asset || "") : "";
  if (kind === "ready" && !ASSET_IDS.has(asset)) return null;
  return { kind, tag, ...(asset ? { asset } : {}), at };
}

export const readAssetLog = (json) => parse(json).filter((entry) => entry && typeof entry === "object" && entry.kind && entry.tag).slice(-50);
