// Request-time retrieval, without an embedding call or another paid service (#86).
// Only the reviewed service collection is imported. No filesystem or operator search access.
import { COPY_KNOWLEDGE } from "./copy-knowledge-data.js";
export const COPY_KNOWLEDGE_VERSION = COPY_KNOWLEDGE.version;

const STOP = new Set("a an and are as at be been but by can could do for from have how i in is it its me my of on or our please so that the their them there these they this to us was we what when which who why will with would you your".split(" "));
export function terms(text) {
  return [...new Set((String(text || "").toLowerCase().match(/[a-z0-9]{2,}/g) || [])
    .filter((word) => !STOP.has(word)).map((word) => word.replace(/(?:ing|ies|s)$/, (end) => end === "ies" ? "y" : "")))];
}

export function relevance(text, query) {
  const value = String(text || "").toLowerCase();
  return terms(query).slice(0, 64).reduce((score, word) => score + (value.includes(word) ? 1 : 0), 0);
}

// Preserve the beginning AND retrieve later passages from a long field, rather than silently
// keeping only its first 6k. All excerpts are verbatim; omissions are explicit.
export function excerpt(text, query, maxChars) {
  const value = String(text || "");
  if (value.length <= maxChars) return value;
  const size = Math.max(100, Math.floor((maxChars - 100) / 3));
  const pieces = [];
  for (let at = 0; at < value.length; at += size) pieces.push({ at, text: value.slice(at, at + size) });
  const selected = new Set([0]);
  for (const part of [...pieces].sort((a, b) => relevance(b.text, query) - relevance(a.text, query) || a.at - b.at)) {
    if (selected.size >= 3) break;
    selected.add(part.at);
  }
  return pieces.filter((part) => selected.has(part.at)).map((part) => `[Excerpt at character ${part.at}] ${part.text}`).join("\n[...omitted...]\n").slice(0, maxChars - 25) + "\n[Field excerpted]";
}

// Compile reusable term statistics once per isolate. Never cache client facts or replies.
// The full-vault collection is large, so every passage's word sets are built here, once: a request
// then only looks words up, which keeps retrieval inside the Workers CPU budget.
const indexed = new Map(COPY_KNOWLEDGE.passages.map(part => [part.id, {
  words: new Set(terms(`${part.title} ${part.tags.join(' ')} ${part.text}`)),
  title: new Set(terms(`${part.title} ${part.tags.join(' ')}`)),
}]));
const frequency = new Map();
for (const { words } of indexed.values()) for (const word of words) frequency.set(word, (frequency.get(word) || 0) + 1);
function lexicalScore(part, queryTerms) {
  const { words, title } = indexed.get(part.id);
  return queryTerms.reduce((score, word) => score + (words.has(word)
    ? Math.log(1 + (indexed.size + 1) / ((frequency.get(word) || 0) + 1)) * (title.has(word) ? 3 : 1) : 0), 0);
}

// Task cards: Pulsify's current playbook for one kind of work, written from the vault (wiki/jane-cards).
// The format the client picked counts most; trigger words in the request decide the rest.
export function selectJaneCards({ query = "", format = "general", max = 2 } = {}) {
  const text = ` ${String(query).toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ")} `;
  return (COPY_KNOWLEDGE.cards || []).map((card) => ({ card, score: (format !== "general" && card.formats.includes(format) ? 5 : 0)
    + card.triggers.filter((trigger) => text.includes(` ${trigger.toLowerCase()} `) || text.includes(` ${trigger.toLowerCase()}s `)).length * 2 }))
    .filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))
    .slice(0, max).map(({ card }) => card);
}

export function retrieveCopyKnowledge({ query = "", format = "general", maxChars = 12000, semanticIds = [] } = {}) {
  // Getting a viewer to book and getting a BOOKED lead to attend are different tasks.
  // A generic mention of a call must not flood discussion with pre-call email tactics.
  const preCall = /pre[- ]?call|no[- ]?shows?|show (?:up|rate)|turn(?:ing)? up|attend|confirmation|reminder|nurtur|booked|sales call|scheduled call|after.*book/i.test(query);
  const aliases = [
    [/no[- ]?shows?|(?:don't|not|never) (?:show|attend)|turn(?:ing)? up/i, "pre-call show rate booking confirmation email"],
    [/generic|sound like everyone|stand out|differentiat/i, "positioning unique mechanism messaging reframe"],
    [/watch.*(?:not|don't|never).*(?:buy|book)|views.*(?:no|without).*(?:sales|calls)/i, "funnel MOF BOF proof offer booking"],
    [/what.*(?:charge|sell)|how much.*(?:charge|price)/i, "offer pricing delivery program"],
  ];
  query = `${query} ${aliases.filter(([pattern]) => pattern.test(query)).map(([, words]) => words).join(" ")}`;
  const queryTerms = terms(query).slice(0, 64);
  const ranked = COPY_KNOWLEDGE.passages.filter((part) => part.source_id !== "pre-call" || preCall).map((part) => ({ ...part,
    score: lexicalScore(part, queryTerms)
      + (part.tags.includes(format) && format !== "general" ? 2 : 0),
  })).filter((part) => part.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  // Reciprocal rank fusion keeps rare exact terms and semantically related passages.
  const scores = new Map(ranked.map((part, index) => [part.id, 1 / (60 + index + 1)]));
  for (const [index, id] of [...new Set(semanticIds)].entries()) scores.set(id, (scores.get(id) || 0) + 1 / (60 + index + 1));
  const merged = COPY_KNOWLEDGE.passages.filter(part => scores.has(part.id) && (part.source_id !== 'pre-call' || preCall))
    .map(part => ({ ...part, score: scores.get(part.id) })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const selected = [];
  let used = 0;
  const perSource = new Map();
  for (const part of merged) {
    // Keep room for different methods, rather than ten passages from one long document.
    if ((perSource.get(part.source_id) || 0) >= 3) continue;
    const block = `[${part.id}] ${part.title}\n${part.text}`;
    if (used + block.length + 2 > maxChars) continue;
    selected.push({ ...part, block });
    perSource.set(part.source_id, (perSource.get(part.source_id) || 0) + 1);
    used += block.length + 2;
    if (selected.length >= 10) break;
  }
  return {
    version: COPY_KNOWLEDGE.version,
    source_ids: [...new Set(selected.map((part) => part.source_id))],
    passage_ids: selected.map((part) => part.id),
    prompt_text: selected.map((part) => part.block).join("\n\n") || "No matching service passage. Do not pretend a saved method covers this question.",
  };
}
