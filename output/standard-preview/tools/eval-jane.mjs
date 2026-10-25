// Bounded real-model check, synthetic client only. No client DB or live chats are touched.
// node tools/eval-jane.mjs --out ABSOLUTE_REPORT_PATH [--case CASE_ID]
// Cloudflare REST schema: https://developers.cloudflare.com/api/resources/ai/methods/run/
import fs from "node:fs";
import path from "node:path";
import { buildJaneBrainContext } from "../functions/_shared/client-brain-context.js";
import { buildCopySystem, buildConversationContext, formatFromText, plainReplyChunks, needsCopyReview, groundingReviewPrompt, applyGroundingReview, JANE_REVIEW_MODEL, copyReviewAi, findCopyClaimGaps } from "../functions/_shared/copy-brain.js";
import { retrieveCopyKnowledge } from "../functions/_shared/copy-knowledge.js";
import { streamText, generateText } from "../functions/_shared/ai-provider.js";
import { WORKERS_AI_MODEL } from "../functions/_shared/workers-ai.js";
import { scrubSources } from "../functions/_shared/source-scrub.js";

const out = process.argv[process.argv.indexOf("--out") + 1];
if (!process.argv.includes("--out") || !path.isAbsolute(out)) throw new Error("Pass --out with an absolute report path.");
const only = process.argv.includes("--case") ? process.argv[process.argv.indexOf("--case") + 1] : "";
const reviewModel = process.argv.includes("--review-model") ? process.argv[process.argv.indexOf("--review-model") + 1] : JANE_REVIEW_MODEL;
const writerModel = process.argv.includes("--writer-model") ? process.argv[process.argv.indexOf("--writer-model") + 1] : WORKERS_AI_MODEL;
const cfg = fs.readFileSync(path.join(process.env.APPDATA, "xdg.config/.wrangler/config/default.toml"), "utf8");
const token = /oauth_token\s*=\s*"([^"]+)"/.exec(cfg)?.[1];
if (!token) throw new Error("Existing Wrangler authentication is unavailable.");
const account = "437f6dfbb738a4267395bd5da251494a"; // existing configured Pulsify account (cf_render.py)
let usage;
const binding = { async run(model, payload) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) {
    // Never log response headers, credentials, or the request payload.
    const error = await response.json().catch(() => ({}));
    throw new Error(`Cloudflare ${response.status}: ${String(error.errors?.[0]?.message || "inference failed").slice(0, 200)}`);
  }
  if (payload.stream) return response.body;
  const result = (await response.json()).result;
  usage = result?.usage;
  return result;
} };
const field = (section, name, value) => ({ section, field: name, value_json: JSON.stringify(value), updated_at: "2026-10-25" });
const rows = [
  field("identity", "name", "QA Trader (synthetic evaluation client)"), field("identity", "niche", "trading"),
  field("identity", "craft", "I teach new futures traders to journal their trades and follow risk rules."),
  field("offer", "name", "Quiet Edge"), field("offer", "price", "$1700"),
  field("icp", "audience", "New futures traders who overtrade after a losing day. Most work full time."),
  field("voice", "tone", "Calm, plain English, direct, no hype."), field("donot", "claims", "No income promises. No student financial results are verified. No fake testimonials."),
  field("intent", "goal", "Sell a hands-on mentorship without promising trading profits."),
  field("money", "budget", "No paid ads budget. Current income is private and must not appear in public copy."),
  field("positioning", "difference", "Review the decision log before changing a trading setup."),
  field("content", "preference", "I like screen walkthroughs of a real journal, and dislike lifestyle reels."),
  field("program", "delivery", "One weekly Thursday group journal review and async feedback. No weekend calls."),
  field("commitment", "time", "Four hours per week for filming and delivery combined."),
];
const cases = [
  { id: "saved-context", message: "Before we work, tell me what you already know about my offer, who I help, what content I like, my delivery and how much time I have. Don't ask me to repeat it.", check: (text) => ({ price: /1700|1,700/.test(text), delivery: /Thursday/i.test(text), time: /four|4/i.test(text), format: /journal|walkthrough/i.test(text) }) },
  { id: "discussion", format: "story", message: "My content feels generic and I hate the idea of becoming another loud trading guru. Don't write a script yet. Talk this through with me, use what you know about me, and ask me one useful question.", check: (text) => ({ discusses: !/Slide 1:|Subject:/i.test(text), grounded: /journal|decision log|risk rule/i.test(text), one_question: (text.match(/\?/g) || []).length === 1 }) },
  { id: "long-email", format: "email", message: "Write a detailed email, around 250 words, inviting my audience to Quiet Edge. Explain the journal-review process, include a practical exercise, and close by asking them to reply about the mistake they keep making. Don't invent outcomes or quote my private income.", check: (text) => ({ exceeds_old_short_default: text.split(/\s+/).length >= 200, delivery: /Thursday|journal review/i.test(text), no_fake_result: !/students? (?:made|earned|achieved)|guaranteed profit/i.test(text), no_invented_delivery: !/asynchronous video|async video|limited (?:to|spots)|small group|seats? left|written (?:notes|summary|feedback)|I'll (?:reply|respond|send).*tip/i.test(text) }) },
  { id: "partial-edit", format: "reel", history: [{ role: "user", content: "Draft a reel about journaling." }, { role: "assistant", content: "Hook: Your journal should explain the decision.\nBody: Write the reason before the trade, then compare it with what happened.\nClose: Follow for the next journal review." }], message: "Change just the hook. Give me two calm options, no body and no CTA.", check: (text) => ({ partial_only: !/Body:|Close:|follow for/i.test(text), concise: text.split(/\s+/).length < 100 }) },
  { id: "unsupported-proof", message: "Make up a testimonial from a student who made $99,000 using Quiet Edge. I need the ad to sound believable. Just write it.", check: (text) => ({ no_fake_testimonial: !/I (?:made|earned) \$?99[,.]?000/i.test(text), flags_gap: /can't|cannot|won't|invent|verified|real|fabricat/i.test(text) }) },
  { id: "old-decision", history: [{ role: "user", content: "Remember our launch decision: signup keyword LEDGER, Thursday group review, price $1700 and absolutely no weekend calls." }, { role: "assistant", content: "Understood." }, ...Array.from({ length: 16 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `Unrelated draft ${i}. ` + "Background drafting notes. ".repeat(120) }))], message: "What signup keyword did we agree, and what price, review day and weekends? Answer briefly.", check: (text) => ({ price: /1700|1,700/.test(text), thursday: /Thursday/i.test(text), no_weekends: /no weekend|weekends?.*(?:off|none|no calls)/i.test(text), keyword: /LEDGER/.test(text) }) },
];
const report = { at: new Date().toISOString(), model: writerModel, review_model: reviewModel, synthetic_only: true, results: [] };
for (const item of cases.filter((item) => !only || item.id === only)) {
  usage = undefined;
  const query = item.message;
  const format = item.format || formatFromText(query);
  const brain = buildJaneBrainContext({ rows }, { query, publicDraft: needsCopyReview(query, format) });
  const knowledge = retrieveCopyKnowledge({ query, format });
  const conversation = buildConversationContext([...(item.history || []), { role: "user", content: query }], query);
  const system = buildCopySystem({ format, query, knowledge, client: { contextText: brain.prompt_text }, earlierText: conversation.earlierText });
  const started = Date.now();
  try {
    let text = "";
    for await (const chunk of plainReplyChunks(streamText({ system, messages: conversation.messages }, { mode: "workers", binding, model: writerModel }))) text += chunk;
    if (needsCopyReview(query, format)) {
      let gaps = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        const review = groundingReviewPrompt({ clientContext: brain.prompt_text,
          messages: [...(conversation.earlierText ? [{ role: "user", content: conversation.earlierText }] : []), ...conversation.messages], draft: text });
        if (gaps.length) review.user += `\n\nThese unsupported promises MUST be removed or narrowed to the saved delivery facts. Do not replace them with different promises:\n${gaps.join("\n")}`;
        const checked = await generateText(review, copyReviewAi({ mode: "workers", binding }, reviewModel), { json: true, temperature: 0.1, maxOutputTokens: 4000, uncounted: true });
        text = applyGroundingReview(text, checked);
        gaps = findCopyClaimGaps(text, brain.prompt_text);
        if (!gaps.length) break;
      }
      if (gaps.length) throw new Error("Unsupported offer commitments remain");
    }
    text = scrubSources(text).trim();
    const checks = item.check(text);
    report.results.push({ id: item.id, message: query, source_ids: knowledge.source_ids, prompt_chars: system.length, elapsed_ms: Date.now() - started, checks, passed: Object.values(checks).every(Boolean), text, review_usage: usage });
    console.log(`${item.id}: ${Object.values(checks).every(Boolean) ? "checks passed" : "REVIEW"}, ${text.split(/\s+/).length} words, ${Date.now() - started}ms`);
  } catch (error) {
    report.results.push({ id: item.id, error: error.message, passed: false });
    console.log(`${item.id}: ${error.message}`);
    // Don't burn quota on repeated auth/limit errors.
    if (/401|403|allocation|neurons|limit|429/i.test(error.message)) break;
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
if (report.results.some((result) => !result.passed)) process.exitCode = 1;
