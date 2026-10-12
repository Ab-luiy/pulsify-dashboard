/*
 * Rewrite one part of a finished carousel (founder 2026-10-12: carousels come back finished; the
 * client changes the words, or highlights a part and asks for it again, nothing more). The client
 * names a slide and a field, optionally the exact words they highlighted, and says what to change.
 * The model returns only the replacement; the server swaps it in, so the rest of the slide, the
 * layout and the photos never move.
 */

const FIELDS = new Set(["headline", "body", "caption"]);
const LIMIT = { headline: 140, body: 420, caption: 2200 };

const clean = (value, max = 600) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** {field, slide, selection, instruction, current} from the request body, or {error}. */
export function readRewriteRequest(body, output) {
  const field = String(body?.field || "");
  if (!FIELDS.has(field)) return { error: "field must be headline, body or caption" };
  const instruction = clean(body?.instruction, 400);
  if (!instruction) return { error: "say what to change" };
  const slides = Array.isArray(output?.slides) ? output.slides : [];
  const slide = field === "caption" ? null : Number(body?.slide);
  if (field !== "caption" && !(Number.isInteger(slide) && slide >= 0 && slide < slides.length)) return { error: "slide not found" };
  const current = field === "caption" ? String(output?.caption || "") : String(slides[slide]?.[field] || "");
  const selection = String(body?.selection ?? "").trim().slice(0, LIMIT[field]);
  if (selection && !current.includes(selection)) return { error: "the highlighted words are no longer on the slide" };
  return { field, slide, selection, instruction, current };
}

/** The prompt: the whole carousel for context, the part to replace, the client's ask. */
export function buildRewritePrompt({ output, request, clientBrain }) {
  const slides = (output?.slides || []).map((slide, index) => `Slide ${index + 1}${index === request.slide ? " (this one)" : ""}: ${clean(slide.headline, 200)}${slide.body ? ` / ${clean(slide.body, 300)}` : ""}`);
  const target = request.selection || request.current;
  const system = [
    "You edit Instagram carousel copy for a creator.",
    "Rewrite only the part you are given, in the creator's voice, following their request.",
    "Keep it about the same length unless they ask otherwise. Plain words, no emojis, no hashtags unless asked.",
    "Never invent numbers, results or claims that are not already in the carousel.",
    'Return JSON only: {"text": "<the replacement>"}',
  ].join("\n");
  const user = [
    clientBrain ? `About the creator:\n${clean(clientBrain, 1500)}` : "",
    `The carousel:\n${slides.join("\n")}`,
    request.field === "caption" ? `Caption: ${clean(request.current, 1200)}` : "",
    `Part to rewrite (${request.field}${request.selection ? ", highlighted words only" : ""}): ${target}`,
    `Their request: ${request.instruction}`,
  ].filter(Boolean).join("\n\n");
  return { system, user };
}

/** Swap the replacement into the output. The cover's big line (layout.bold) follows the headline. */
export function applyRewrite(output, request, text) {
  const replacement = clean(text, LIMIT[request.field]);
  if (!replacement) throw new Error("The rewrite came back empty.");
  const swap = (value) => (request.selection ? String(value || "").replace(request.selection, replacement) : replacement);
  if (request.field === "caption") return { ...output, caption: swap(output.caption) };
  return {
    ...output,
    slides: output.slides.map((slide, index) => {
      if (index !== request.slide) return slide;
      const next = { ...slide, [request.field]: swap(slide[request.field]) };
      if (request.field === "headline" && slide.layout) next.layout = { ...slide.layout, bold: next.headline.slice(0, 80) };
      return next;
    }),
  };
}

/** The model's reply to plain text: JSON {text}, or the raw reply when it ignored the format. */
export function readRewriteReply(raw) {
  const value = String(raw || "").trim();
  const match = value.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (typeof parsed?.text === "string") return parsed.text;
    } catch {
      /* fall through to the raw reply */
    }
  }
  return value.replace(/^["']|["']$/g, "");
}
