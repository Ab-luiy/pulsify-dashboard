// Two guards for AI writing (ticket #78, docs/backend-wiring.md "AI writing / Missing"):
//
// 1. A daily allowance per client. Pulsify AI runs on the free Workers AI plan: about 20 stories a day for the
//    whole account. Without a limit one client can use the whole day. Every generation made on Pulsify's own
//    account (ai.source "platform") counts one against the client's allowance for the UTC day. A client who
//    connected their own AI pays their provider and is never limited. resolveAi attaches the guard, and
//    generateText enforces it, so every generator is covered in one place.
// 2. A number check on output. The free model sometimes invents a figure ("40% more reach"). Any number in the
//    writing that is not in the client's proof, brief or the request itself is returned as flagged, so a person
//    sees it before it reaches the client.
import { takeAllowance } from "./usage.js";

export const AI_DAILY_CAP = 8;
// Jane on Pulsify's free Gemini key has her own counter (founder 2026-10-27: 30 messages a day per client).
// It counts one per message; the lookup, claim check and memory helpers inside a reply are not counted.
export const JANE_DAILY_CAP = 30;
export const ALLOWANCE_MESSAGE =
  "You have used today's writing allowance. It resets tomorrow. Connect your own AI in Integrations and the limit goes away.";

export class AiAllowanceError extends Error {
  constructor(message = ALLOWANCE_MESSAGE) {
    super(message);
    this.name = "AiAllowanceError";
    this.code = "AI_ALLOWANCE";
    this.status = 429;
  }
}

export function aiDailyCap(env) {
  const set = Number(env?.AI_DAILY_CAP);
  return Number.isFinite(set) && set > 0 ? Math.floor(set) : AI_DAILY_CAP;
}

export function janeDailyCap(env) {
  const set = Number(env?.JANE_DAILY_CAP);
  return Number.isFinite(set) && set > 0 ? Math.floor(set) : JANE_DAILY_CAP;
}

/** Which daily counter a generation draws from: Jane's Gemini chat or the shared Workers AI writers. */
export function allowanceFor(env, ai) {
  return ai?.janeGemini ? { kind: "jane", cap: janeDailyCap(env) } : { kind: "ai", cap: aiDailyCap(env) };
}

/** Marks a resolved switch with who it belongs to. Not enumerable, so it never shows in logs, JSON or equality checks. */
export function attachGuard(ai, env, client) {
  Object.defineProperty(ai, "guard", { value: { env, client }, enumerable: false });
  return ai;
}

/** Count one generation. Throws AiAllowanceError when the client has used today's allowance. Fails open if the counter is unavailable. */
export async function enforceAllowance(ai, options = {}) {
  const guard = ai?.guard;
  if (!guard || options.uncounted || !guard.client || ai.source !== "platform" || ai.mode === "manual" || !guard.env?.DB) return;
  let allowed = true;
  try {
    const { kind, cap } = allowanceFor(guard.env, ai);
    allowed = await takeAllowance(guard.env, guard.client, kind, cap);
  } catch {
    allowed = true;
  }
  if (!allowed) throw new AiAllowanceError();
}

/** How many generations the client has left today, or null when they are not limited. */
export async function allowanceLeft(env, ai, client) {
  if (!env?.DB || !client || ai?.source !== "platform" || ai?.mode === "manual") return null;
  try {
    const { kind, cap } = allowanceFor(env, ai);
    const row = await env.DB.prepare("SELECT count FROM usage_counters WHERE client=? AND kind=? AND day=?").bind(client, kind, new Date().toISOString().slice(0, 10)).first();
    return Math.max(0, cap - Number(row?.count || 0));
  } catch {
    return null;
  }
}

// ---- number check ----

const SUFFIX = { k: 1e3, m: 1e6, b: 1e9 };

/** Every figure in a text as comparable values: "$12,000", "12k", "40%", "2.5x" -> 12000, 12000, 40, 2.5. */
export function figuresIn(text) {
  const found = [];
  const pattern = /(\$|€|£)?\s?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s?(k|m|b|%|x)?(?![a-z0-9])/gi;
  for (const match of String(text || "").matchAll(pattern)) {
    const base = Number(`${match[2].replace(/,/g, "")}${match[3] || ""}`);
    if (!Number.isFinite(base)) continue;
    const unit = (match[4] || "").toLowerCase();
    const raw = `${match[1] || ""}${match[2]}${match[3] || ""}${match[4] || ""}`;
    found.push({ raw: raw.trim(), value: SUFFIX[unit] ? base * SUFFIX[unit] : base, unit, bare: !match[1] && !unit && !match[3] });
  }
  return found;
}

const isYear = (n) => Number.isInteger(n) && n >= 1900 && n <= 2100;

/**
 * Figures in `output` that appear in none of the `sources` (the client's proof and brief, the request).
 * Small whole numbers (1 to 10, like "3 steps") and years are structure, not claims, and pass.
 */
export function findUnsupportedNumbers(output, sources = []) {
  const allowed = new Set();
  for (const source of sources) for (const f of figuresIn(source)) allowed.add(f.value);
  const flagged = [];
  for (const f of figuresIn(output)) {
    if (allowed.has(f.value)) continue;
    if (f.bare && f.value >= 0 && f.value <= 10) continue;
    if (f.bare && isYear(f.value)) continue;
    if (!flagged.includes(f.raw)) flagged.push(f.raw);
  }
  return flagged;
}
