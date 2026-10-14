// Thumbnail suggestions (founder 2026-10-14: "actual suggestions that you would give me, as if we're talking here,
// not the ones that are just like on the website"). The client answers questions about the video and uploads
// their own photos; this module turns that into two suggestions, each a style, the words, and a plain reason.
//
// The writer (the client's own AI, else Pulsify AI) only chooses and explains. Everything that must never go
// wrong is decided here in code: which styles the photos can build, how many words, the case of the words,
// no exclamation marks or emoji, and no number that the client did not give us. Mirrors the style rules in
// pulsify-saas src/features/portal-youtube/thumbnail/styles.ts.
import { YOUTUBE_PACKAGING_REFERENCE } from "./youtube-packaging-reference.js";
import { neutralize } from "./source-scrub.js";

export const STYLE_IDS = ["raw", "board", "screen", "pair"];

export const STYLE_RULES = {
  raw: { label: "Raw photo", maxWords: 4, uses: "one photo of the client, in their real room, looking at the camera" },
  board: { label: "Board breakdown", maxWords: 5, uses: "a real board or system filling the frame, the client in a corner, a short headline on a yellow bar" },
  screen: { label: "Screen proof", maxWords: 4, uses: "one real number from a real screen, big, with the client's face large beside it" },
  pair: { label: "Two people", maxWords: 8, uses: "two people in a real place, with the question the video answers in a speech bubble" },
};

/** Which styles the client's photos can build, best first. */
export function availableStyles(have = {}) {
  const out = [];
  if (have.proof) out.push("screen");
  if (have.board) out.push("board");
  if (have.you) out.push(have.twoPeople ? "pair" : "raw");
  return out;
}

const EMOJI = /\p{Extended_Pictographic}️?/gu;

/** Words as the style wants them: no marks or emoji, the right case, no more than the style takes. */
export function cleanWords(style, words) {
  let text = String(words ?? "").replace(EMOJI, "").replace(/[*!]+/g, "").replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, "");
  if (!text || !STYLE_RULES[style]) return "";
  text = text.split(" ").slice(0, STYLE_RULES[style].maxWords).join(" ");
  if (style === "board") return text.toUpperCase();
  if (text === text.toUpperCase() && /[A-Z]/.test(text)) text = text.charAt(0) + text.slice(1).toLowerCase();
  return text;
}

const numbersIn = (text) => (String(text).match(/\$?\d[\d,.]*\s?[kKmM%]?/g) || []).map((n) => n.replace(/[\s,]/g, "").toLowerCase());

/** True when every figure in the words was given by the client (a thumbnail never invents a number). */
export function figuresAreTheirs(words, ...given) {
  const allowed = new Set(given.flatMap(numbersIn));
  return numbersIn(words).every((n) => allowed.has(n));
}

const STOP = new Set(["a", "an", "the", "how", "why", "what", "my", "i", "to", "of", "and", "in", "on", "for", "with", "this", "that", "is", "are", "you", "your"]);

/** A few plain words from the idea, in the style's case. */
export function wordsFromIdea(style, idea) {
  const picked = String(idea ?? "")
    .replace(/[^\p{L}\p{N}$%'\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word && !STOP.has(word.toLowerCase()));
  return cleanWords(style, picked.slice(0, STYLE_RULES[style].maxWords).join(" "));
}

/** The words when the writer gave none or broke a rule: the quiet styles prefer none, the board needs a headline. */
export function defaultWords(style, input) {
  if (style === "board") return wordsFromIdea("board", input.idea);
  if (style === "screen") return input.proof ? cleanWords("screen", input.proof) : "";
  // A question that does not fit the bubble is left out rather than cut in half.
  if (style === "pair") return /\?\s*$/.test(input.idea) && input.idea.split(/\s+/).length <= STYLE_RULES.pair.maxWords ? cleanWords("pair", input.idea) : "";
  return "";
}

/** The reason when the writer is not available, or gave nothing usable. Written plainly, once. */
export const FALLBACK_REASON = {
  screen: "Your result is the most believable thing in this video, so it is the biggest thing on the thumbnail. Your face sits beside it, large enough to read at feed size.",
  board: "This video shows a system, and a real board makes it look like one. The headline is the only text, short enough to read at a glance.",
  raw: "You on camera with almost no text. The title makes the promise, and the photo only makes people curious.",
  pair: "The second person is part of the proof, so they stay in the frame, in the real place. The speech bubble carries the question the video answers.",
};

const section = (bundle, title) => {
  const part = String(bundle).split(/^=== /m).find((block) => block.toLowerCase().startsWith(title.toLowerCase()));
  return part ? `=== ${part}`.trim() : "";
};

const clip = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export function normalizeInput(body = {}) {
  const have = body.have && typeof body.have === "object" ? body.have : {};
  const show = ["screen", "board", "camera", "pair", "none"].includes(body.show) ? body.show : "none";
  return {
    idea: clip(body.idea, 300),
    audience: clip(body.audience, 300),
    show,
    proof: clip(body.proof, 80),
    have: { you: Boolean(have.you), proof: Boolean(have.proof), board: Boolean(have.board), twoPeople: Boolean(have.twoPeople) },
  };
}

const SHOW_LINE = {
  screen: "The video shows a result on a screen (payouts, a dashboard, a trade).",
  board: "The video walks through a system on a board or diagram.",
  camera: "The video is the client talking to the camera.",
  pair: "The video has two people in it (an interview, a student, a partner).",
  none: "Nothing specific is shown beyond the client talking.",
};

export function buildSuggestPrompt({ input, styles, brainText, references }) {
  const rules = [section(YOUTUBE_PACKAGING_REFERENCE, "Packaging rules"), section(YOUTUBE_PACKAGING_REFERENCE, "Thumbnail layout patterns")].filter(Boolean).map(neutralize).join("\n\n");
  const system = [
    "You are the thumbnail adviser inside a Pulsify client's workspace. You talk like a colleague who has looked at the video idea and the client's photos, and you say what you would actually do.",
    "You choose between the styles the client's photos can build, and you write the words and one short reason for each. You never design anything else: the picture is always the client's own photo, never generated.",
    `Rules you must follow:\n- Suggest exactly ${Math.min(2, styles.length)} different style${styles.length > 1 ? "s" : ""}, best first, only from the styles offered.\n- "words" is the text on the thumbnail. It may be empty (no words) when the photo carries it. Never use exclamation marks, emoji, hype words or shock language.\n- Never put a number in the words unless the client gave it to you in this request.\n- The title and the thumbnail complete each other: do not just repeat the title as words.\n- "reason" is two short plain sentences, as you would say it out loud to the client: what the style does for THIS video and why it fits. No jargon, no style names, no praise.`,
    `Pulsify's thumbnail rules (apply them, never quote them):\n${rules}`,
    brainText ? `What Pulsify knows about the client (the only facts you may use about them):\n${clip(brainText, 6000)}` : "",
    'Reply with JSON only: {"suggestions":[{"style":"screen","words":"","reason":""}]}',
  ].filter(Boolean).join("\n\n");
  const offered = styles.map((id) => `- ${id}: ${STYLE_RULES[id].label}, ${STYLE_RULES[id].uses}; at most ${STYLE_RULES[id].maxWords} words`).join("\n");
  const user = [
    `Video idea: ${input.idea}`,
    input.audience ? `Who it is for and what they get: ${input.audience}` : "",
    SHOW_LINE[input.show],
    input.proof ? `The number or result the client gave (the only figure you may use): ${input.proof}` : "The client gave no number. Use no numbers.",
    `Styles their photos can build:\n${offered}`,
    references?.length ? `Real videos in their niche that beat their channel's normal by a wide margin (for context only, never copy a title):\n${references.map((r) => `- "${clip(r.title, 120)}" (${r.multiplier}x)`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  return { system, user };
}

/** Writer output (any shape) to at most two checked suggestions; fills from the fallback so there are always as many as the photos allow. */
export function checkSuggestions(raw, { input, styles }) {
  const list = Array.isArray(raw?.suggestions) ? raw.suggestions : [];
  const out = [];
  for (const item of list) {
    const style = String(item?.style ?? "").toLowerCase();
    if (!styles.includes(style) || out.some((entry) => entry.style === style)) continue;
    let words = cleanWords(style, item?.words);
    if (words && !figuresAreTheirs(words, input.idea, input.audience, input.proof)) words = defaultWords(style, input);
    out.push({ style, words, reason: clip(item?.reason, 400) || FALLBACK_REASON[style] });
    if (out.length === 2) break;
  }
  for (const style of styles) {
    if (out.length >= Math.min(2, styles.length)) break;
    if (out.some((entry) => entry.style === style)) continue;
    out.push({ style, words: defaultWords(style, input), reason: FALLBACK_REASON[style] });
  }
  return out;
}
