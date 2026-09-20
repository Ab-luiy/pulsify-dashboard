// Cold DM drafts. Pure functions, no I/O. Follows the five beats in
// wiki/content-engine/cold-dm-formula.md: casual opener, one specific
// reference plus a plain reaction, the gap framed as an opening, the gift,
// ownership plus a soft close. Lowercase, commas and periods only, no
// emojis, no em dashes, no exclamation marks.
//
// Length: the canonical beat strings alone run 55 words before the detail,
// so a draft with a real detail is built on a trim ladder. Each rung uses a
// tighter form of the fixed beats (the tuned variants from the formula doc)
// and the first rung that lands at or under 45 words wins. If even the
// tightest rung is over 45 because the detail is long, the draft ships as
// is and gradeDraft flags it for a hand trim.

export const MAX_WORDS = 45;
export const MIN_WORDS = 30;
export const GRADE_MIN_WORDS = 25;
export const NEEDS_DETAIL_PLACEHOLDER = "[one specific thing they teach]";

// Founder-approved rotation (2026-07-06). The first two are the approved
// pair, the third is the less-glazing fallback. Retired lines stay out.
export const OPENERS = [
  "ngl your channel kinda took over my week.",
  "not gonna lie your vids kinda hijacked my week.",
  "went down a bit of a rabbit hole on your channel this week.",
];

export const REACTIONS = ["really like that", "stuck with me", "reframed it for me"];

export const DEFAULT_GAP = "also noticed you don't really have a page that captures people and educates them on what you can help with";
export const GIFT = "so i just went ahead and put one together for you real quick.";
export const CLOSE = "it's 100% yours, take a look and lmk what you think";

// Trim ladder for the fixed beats. Rung 0 is canonical. Rungs 1 and 2 use
// the tightened phrasings from the formula doc's tuned email example.
export const TRIM_LADDER = [
  { gap: DEFAULT_GAP, gift: GIFT, close: CLOSE },
  {
    gap: "also noticed there's no real page capturing people and walking them through what you do",
    gift: "so i went ahead and built you one.",
    close: CLOSE,
  },
  {
    gap: "also noticed there's no real page walking people through what you do",
    gift: "so i built you one.",
    close: "it's 100% yours, lmk what you think",
  },
];

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/u;
const DASHES = /[\u2013\u2014]/g;
const CURLY = /[\u2018\u2019\u201c\u201d]/;

export function countWords(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

// Small stable hash so a string seed (usually the handle) picks the same
// opener every time while a batch of different handles varies.
function hashSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return Math.abs(Math.trunc(seed));
  const text = String(seed ?? "");
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return hash;
}

// Scrub a human-supplied fragment into the formula's voice: lowercase,
// straight quotes, dashes to commas, no exclamation, no emoji, no trailing
// punctuation. The caller decides how it ends.
export function scrubFragment(value) {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s*[\u2013\u2014]\s*/g, ", ")
    .replace(/\s*->\s*/g, " to ")
    .replace(/!+/g, ".")
    .replace(EMOJI, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[.,;:\s]+$/, "")
    .replace(/^[.,;:\s]+/, "");
}

function normalizeLink(value) {
  const text = String(value ?? "").trim().replace(/[\u2018\u2019\u201c\u201d"']/g, "");
  return text ? text.replace(/[.,]+$/, "") : "";
}

function assemble({ opener, reference, gap, gift, close, link }) {
  const parts = [opener, reference, `${gap}, ${gift}`, link ? `${close} ${link}` : close];
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// Full picture of a draft: text plus which rotation and rung produced it.
export function composeDraft({ name = "", handle = "", detail = "", gap = "", link = "", seed } = {}) {
  const key = seed ?? handle ?? name;
  const hash = hashSeed(key);
  const openerIndex = hash % OPENERS.length;
  const reactionIndex = Math.floor(hash / OPENERS.length) % REACTIONS.length;
  const opener = OPENERS[openerIndex];
  const reaction = REACTIONS[reactionIndex];
  const cleanDetail = scrubFragment(detail);
  const needsDetail = !cleanDetail;
  const reference = `${needsDetail ? NEEDS_DETAIL_PLACEHOLDER : cleanDetail}, ${reaction}.`;
  const customGap = scrubFragment(gap);
  const cleanLink = normalizeLink(link);

  // Without a detail there is nothing to trim around: ship the canonical
  // beats with the placeholder so the operator sees exactly what to fill.
  const rungs = needsDetail ? [TRIM_LADDER[0]] : TRIM_LADDER;
  let chosen = null;
  let text = "";
  for (let level = 0; level < rungs.length; level += 1) {
    const rung = rungs[level];
    const candidate = assemble({ opener, reference, gap: customGap || rung.gap, gift: rung.gift, close: rung.close, link: cleanLink });
    chosen = level;
    text = candidate;
    if (countWords(candidate) <= MAX_WORDS) break;
  }
  return {
    text,
    needs_detail: needsDetail,
    opener_index: openerIndex,
    reaction_index: reactionIndex,
    level: chosen,
    words: countWords(text),
  };
}

export function buildDraft(input) {
  return composeDraft(input).text;
}

export function needsDetail(text) {
  return String(text || "").includes(NEEDS_DETAIL_PLACEHOLDER);
}

// Flags anything that breaks the formula's non-negotiables. Human-readable
// strings so the frontend can show them as they are.
export function gradeDraft(text) {
  const draft = String(text ?? "");
  const words = countWords(draft);
  const issues = [];
  if (!draft.trim()) return { words: 0, issues: ["empty"] };
  if (words > MAX_WORDS) issues.push(`over ${MAX_WORDS} words (${words})`);
  if (words < GRADE_MIN_WORDS) issues.push(`under ${GRADE_MIN_WORDS} words (${words})`);
  if (/^[A-Z]/.test(draft.trim())) issues.push("starts with a capital letter");
  const bangs = (draft.match(/!/g) || []).length;
  if (bangs === 1) issues.push("exclamation mark");
  if (bangs > 1) issues.push(`${bangs} exclamation marks`);
  const dashes = (draft.match(DASHES) || []).length;
  if (dashes) issues.push(dashes === 1 ? "em dash" : `${dashes} em dashes`);
  if (EMOJI.test(draft)) issues.push("emoji");
  if (CURLY.test(draft)) issues.push("curly quotes");
  if (/->|\u2192/.test(draft)) issues.push("arrow glyph");
  if (needsDetail(draft)) issues.push("missing the specific detail");
  // Capitals past the first word, ignoring anything that looks like a link.
  const capitals = draft.trim().split(/\s+/).slice(1).filter((token) => !/[/.]/.test(token) && /[A-Z]/.test(token));
  if (capitals.length) issues.push("capitalised words");
  return { words, issues };
}
