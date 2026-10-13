// The Pulsify humanizer (founder 2026-10-13: "we have a whole-ass humanizer in our shit. Please use it").
// Source: the founder's Humanizer SOP (AI writing tropes) and raw-sources/prompts/_voice-guard.md.
// Three parts:
//   HUMANIZER   the rules, appended to every generator's system prompt (ai-provider.js does this)
//   humanize()  a mechanical pass on every piece of text that leaves a generator
//   findTells() the structural tells a mechanical pass cannot fix, so a caller can ask for a rewrite

export const HUMANIZER = `Write like a person, not a language model. Before answering, fix every one of these:
- No negative parallelism: "it's not X, it's Y", "X, not Y", "not because X but because Y", "The question isn't X. It's Y."
- No countdowns: "Not X. Not Y. Just Z."
- No self-asked questions answered at once: "The result? Devastating."
- No "here's the thing / the kicker / what most people miss", "let's break this down / dive in / unpack", "think of it as", "imagine a world where".
- No filler: "it's worth noting", "importantly", "notably", "interestingly". No magic adverbs: quietly, deeply, fundamentally, remarkably, arguably.
- Plain words: never delve, leverage, utilize, robust, seamless, streamline, harness, tapestry, landscape, paradigm, synergy, ecosystem, game-changer, unlock, elevate.
- "is", never "serves as", "stands as", "represents", "marks".
- No "-ing" tails that add fake meaning ("highlighting its importance"). No false ranges ("from X to Y" with nothing between).
- No invented labels ("the consistency trap"). No grand stakes. No vague sources ("experts say").
- Do not stack threes, do not start sentences the same way again and again, no one-line fragments for drama.
- Straight quotes. No arrow symbols. At most one dash per piece. No emojis. No exclamation marks.
- Never invent a number, a result, a student or a story. If it is not in the inputs, leave it out.`;

const WORDS = [
  [/\butiliz(e|es|ed|ing)\b/gi, (m, end) => ({ e: "use", es: "uses", ed: "used", ing: "using" })[end.toLowerCase()]],
  [/\bleverag(e|es|ed|ing)\b(?=\s+(?:your|the|their|our|this|that|it|a|an)\b)/gi, (m, end) => ({ e: "use", es: "uses", ed: "used", ing: "using" })[end.toLowerCase()]],
  [/\bdelv(e|es|ed|ing) into\b/gi, (m, end) => ({ e: "get into", es: "gets into", ed: "got into", ing: "getting into" })[end.toLowerCase()]],
  [/\bseamless(ly)?\b/gi, (m, ly) => (ly ? "smoothly" : "smooth")],
  [/\bstreamlin(e|es|ed|ing)\b/gi, (m, end) => ({ e: "simplify", es: "simplifies", ed: "simplified", ing: "simplifying" })[end.toLowerCase()]],
  [/\brobust\b/gi, "solid"],
  [/\bserves as\b/gi, "is"],
  [/\bstands as\b/gi, "is"],
  [/(^|[.!?]\s+)(?:It's|It is) worth noting that\s+(\w)/g, (m, lead, first) => lead + first.toUpperCase()],
  [/\b(?:it's|it is) worth noting that\s+/gi, ""],
  [/(^|[.!?]\s+)(?:Importantly|Notably|Interestingly),\s+(\w)/g, (m, lead, first) => lead + first.toUpperCase()],
  [/(^|[.!?]\s+)Here's the (?:thing|kicker|deal)[:.]\s*(\w)/g, (m, lead, first) => lead + first.toUpperCase()],
];

/** Mechanical clean-up: quotes, arrows, dashes, emojis, exclamation marks, the worst words. Keeps line breaks. */
export function humanize(input) {
  let text = String(input ?? "");
  if (!text) return text;
  text = text
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/\s*[→⟶➜➔⇒]\s*/g, " -> ")
    .replace(/…/g, "...")
    .replace(/[ \t]*[—–][ \t]*(?=\d)/g, "-")
    .replace(/(\w)[ \t]*[—–][ \t]*(\w)/g, "$1, $2")
    .replace(/[ \t]*[—–][ \t]*/g, " ")
    .replace(/\p{Extended_Pictographic}️?/gu, "")
    .replace(/!+/g, ".")
    .replace(/\.{2}(?!\.)/g, ".");
  for (const [pattern, replacement] of WORDS) text = text.replace(pattern, replacement);
  return text.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+([,.;:])/g, "$1").replace(/[ \t]+$/gm, "").trim();
}

/** humanize() on every string inside an object or array (generated JSON: titles, slides, panels). */
export function humanizeDeep(value) {
  if (typeof value === "string") return humanize(value);
  if (Array.isArray(value)) return value.map(humanizeDeep);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, humanizeDeep(item)]));
  return value;
}

const TELLS = [
  ["negative parallelism", /\b(?:it|this|that)(?:'s not| is not| isn't| was not| wasn't) (?:about |just )?[^.?!\n]{1,60}[.;,]\s*(?:it|this|that)(?:'s| is| was) /i],
  ["negative parallelism", /\bnot because [^.?!\n]{1,60},? but because\b/i],
  ["countdown", /\bNot [^.?!\n]{1,30}\. Not [^.?!\n]{1,30}\./],
  ["self-answered question", /(?:^|[.!?]\s+)The (?:result|catch|problem|worst part|best part|truth|answer|secret|kicker)\?\s/i],
  ["false suspense", /\bhere's (?:the thing|the kicker|what most people miss|where it gets interesting)\b/i],
  ["teacher voice", /\blet's (?:break (?:this|it) down|dive in|unpack|explore)\b/i],
  ["analogy crutch", /\bthink of (?:it|this) (?:as|like)\b/i],
  ["magic adverb", /\b(?:quietly|fundamentally|remarkably|arguably)\b/i],
  ["grand word", /\b(?:tapestry|landscape|paradigm|synergy|ecosystem|game-changer|game changer)\b/i],
  ["vague source", /\b(?:experts|studies|research|industry reports) (?:say|show|suggest)\b/i],
];

/** The structural tells left in a text, by name (empty when clean). */
export function findTells(input) {
  const text = String(input ?? "");
  return [...new Set(TELLS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name))];
}
