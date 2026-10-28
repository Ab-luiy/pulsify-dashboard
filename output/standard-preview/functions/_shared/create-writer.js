// Every Create writer (stories, carousels, reels, YouTube ideas, titles and outlines, thumbnail ideas) writes on
// Jane's writer (founder 2026-10-28: "move stories, carousels, reels, YouTube and thumbnails onto Jane's writer,
// add the number check everywhere"). Before this they ran on Workers AI with the humanizer only and invented
// results ("$100k in 4 weeks"); see wiki/synthesis/create-copy-check-2026-10-28.md.
//   - Writer: the Jane Gemini project (free models, the next one on a limit) through jane-models.ts. A client's
//     own connected AI still comes first, and without the Jane Gemini settings (preview deployments) the shared
//     switch in ai-provider.js answers as before.
//   - Allowance: Create keeps its own daily counter (AI_DAILY_CAP), apart from Jane's 30 chat messages.
//   - Facts: one rule on every Create prompt, then a number check on every piece. A result figure the client
//     never gave (money, a k/m figure, a growth percentage, "40 students", "in 14 days") becomes a visible
//     "[your real number]" slot, so nothing invented reaches a client's audience.
import { resolveJaneAi } from "./jane-provider.js";
import { figuresIn } from "./ai-guard.js";

export const NUMBER_SLOT = "[your real number]";

export const CREATE_FACTS = `FACTS (Pulsify rule for every piece of content):
- Use only what the creator brain, their verified proof and their answers say. Never invent a result, a number, a timeframe, a student, a name, a testimonial or a story.
- Never invent offer details: features, bonuses, calls, deadlines, cohorts, limited spots or prices that are not saved.
- Where a piece needs a fact you were not given, leave a short bracket such as ${NUMBER_SLOT} or [their real result] instead of making one up.
- Write every number as digits (20, not twenty; 1%, not one percent).
- No "it's not X, it's Y" lines, in one line or split across two lines or slides.`;

/** Jane's writer for one client's Create request. */
export async function resolveCreateAi(env, client) {
  const ai = await resolveJaneAi(env, client);
  // Counted on the Create allowance, not Jane's chat allowance (ai-guard.js allowanceFor).
  if (ai.janeGemini) Object.defineProperty(ai, "createWriter", { value: true, enumerable: false });
  return ai;
}

/** The writer's prompt with the facts rule added. The manual prompt a client runs in their own AI gets it too. */
export function withCreateFacts(prompt) {
  return { ...prompt, system: [prompt?.system, CREATE_FACTS].filter(Boolean).join("\n\n") };
}

// Keys whose values are labels the app reads (layouts, beats, cues), never copy.
const LABEL_KEYS = /^(?:n|id|type|role|structure|beat|cue|style|format|funnel|bucket|formula|layout|from_answer|mapped_from_intent|alignment|interactive)$/i;
const FIGURE = /(\$|€|£)?\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s?(k|m|b|%|x)?(?![a-z0-9])/gi;
const SUFFIX = { k: 1e3, m: 1e6, b: 1e9 };
// A bare number is a result claim when a result word follows it ("40 students", "in 14 days").
// "200 ema", "15 minute chart" and "30 seconds" are craft or format words and stay.
const RESULT_AFTER = /^\s*(?:\+\s*)?(?:(?:more|new|paying|funded|active|happy|real|trading|green|profitable|winning|straight|consecutive)\s+)?(?:students?|clients?|members?|followers?|subs|subscribers?|views?|sales|customers?|orders?|buyers?|accounts?|payouts?|wins?|calls?|leads?|applications?|bookings?|days?|weeks?|months?|years?)\b/i;
// A percentage is a claim when it sits next to a result ("40% more reach"), not when it is a level ("50% retracement").
const PERCENT_CLAIM = /win ?rate|return|roi|profit|drawdown|grow|increase|\bmore\b|higher|boost|conver|close rate|show rate|reach|revenue|sales|students|clients|members|followers|views|engagement/i;

// Numbers written as words ("twenty trading days", "one percent") become digits first, so the check sees them.
const WORD_VALUES = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const WORD = Object.keys(WORD_VALUES).join("|");
const SPELLED = new RegExp(`\\b(${WORD})(?:[- ](one|two|three|four|five|six|seven|eight|nine))?(?:\\s+(hundred|thousand|million))?(?:\\s+(percent|per cent))?\\b`, "gi");
const SCALE = { hundred: 100, thousand: 1e3, million: 1e6 };

export function digitsForWords(text) {
  return String(text ?? "").replace(/(\d)\s*(?:percent|per cent)\b/gi, "$1%").replace(SPELLED, (whole, tens, unit, scale, percent) => {
    const base = WORD_VALUES[tens.toLowerCase()] + (unit && WORD_VALUES[tens.toLowerCase()] >= 20 ? WORD_VALUES[unit.toLowerCase()] : 0);
    if (unit && WORD_VALUES[tens.toLowerCase()] < 20) return whole;
    const value = base * (scale ? SCALE[scale.toLowerCase()] : 1);
    // "one of", "two steps", "five rules" stay words: only figures past ten, a scale or a percentage are claims.
    if (value <= 10 && !scale && !percent) return whole;
    return `${value.toLocaleString("en-US")}${percent ? "%" : ""}`;
  });
}

function claimed(text, match, index) {
  const [whole, currency, digits, decimals, rawUnit] = match;
  const unit = String(rawUnit || "").toLowerCase();
  const value = Number(`${digits.replace(/,/g, "")}${decimals || ""}`) * (SUFFIX[unit] || 1);
  const before = text.slice(0, index), after = text.slice(index + whole.length);
  // Times and ratios (9:30, 0:45, 1:2, 16:9) are not results.
  if (/\d:\s?$/.test(before) || /^:\d/.test(after)) return null;
  if (currency || SUFFIX[unit]) return value;
  if (unit === "x") return value;
  if (unit === "%") {
    // Only the words in the same clause count ("40% more reach, risk 0.5% per trade": the second is a rule).
    const marks = [".", ",", ";", "!", "?", "\n", "/"];
    const start = Math.max(0, ...marks.map((mark) => before.lastIndexOf(mark) + 1));
    const ends = marks.map((mark) => after.indexOf(mark)).filter((at) => at >= 0);
    const clause = text.slice(start, index + whole.length + (ends.length ? Math.min(...ends) : after.length));
    return PERCENT_CLAIM.test(clause) ? value : null;
  }
  if (!decimals && value <= 10) return null;
  if (!decimals && value >= 1900 && value <= 2100) return null;
  return RESULT_AFTER.test(after) ? value : null;
}

/** One string with every unsupported result figure turned into a slot. */
export function slotInventedFigures(text, allowed, flagged = new Set()) {
  const source = digitsForWords(text);
  let out = "", last = 0;
  for (const match of source.matchAll(FIGURE)) {
    const value = claimed(source, match, match.index);
    if (value === null || allowed.has(value)) continue;
    // Keep the space the pattern may have taken before the number.
    const start = match.index + (match[0].length - match[0].trimStart().length);
    flagged.add(source.slice(start, match.index + match[0].length).trim());
    out += source.slice(last, start) + NUMBER_SLOT;
    last = match.index + match[0].length;
  }
  return out + source.slice(last);
}

/** Every figure the writer was given as fact: the user half of a Create prompt holds the brain, proof and answers. */
export function allowedFigures(sources = []) {
  const allowed = new Set();
  for (const source of sources) for (const figure of figuresIn(digitsForWords(source))) allowed.add(figure.value);
  return allowed;
}

/**
 * The number check on a finished piece (a string, or the parsed JSON of a story, carousel, idea list, title
 * pairs, outline or thumbnail ideas). Returns the checked piece and the figures that were slotted.
 */
export function checkCreateNumbers(piece, sources = []) {
  const allowed = allowedFigures(sources);
  const flagged = new Set();
  const visit = (node, key = "") => {
    if (typeof node === "string") return LABEL_KEYS.test(key) ? node : slotInventedFigures(node, allowed, flagged);
    if (Array.isArray(node)) return node.map((item) => visit(item, key));
    if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([name, value]) => [name, visit(value, name)]));
    return node;
  };
  const output = visit(piece);
  return { output, numbers: [...flagged] };
}

/** What a client sees when the writer cannot answer: a limit is a 429 in plain words, anything else a 502. */
export function writerFailure(error) {
  if (error?.code === "AI_ALLOWANCE") return { status: 429, body: { ok: false, error: error.message, allowance: true } };
  if (error?.code === "GEMINI_LIMIT") return { status: 429, body: { ok: false, error: error.message, limit: true } };
  return null;
}
