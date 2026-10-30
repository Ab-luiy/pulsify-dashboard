import test from "node:test";
import assert from "node:assert/strict";
import { buildJaneBrainContext } from "../functions/_shared/client-brain-context.js";
import { buildConversationContext, buildCopySystem, formatFromText, plainReplyChunks, needsCopyReview, applyGroundingReview, findCopyClaimGaps, groundingReviewPrompt, wantsTitles, titleCount, titleMethod, slotUnsupportedNumbers } from "../functions/_shared/copy-brain.js";
import { execFileSync } from "node:child_process";

const row = (section, field, value) => ({ section, field, value_json: JSON.stringify(value), updated_at: "2026-10-25" });
test("every onboarding section, including new sections, reaches Jane without a second hidden 16k cut", () => {
  const rows = ["identity", "offer", "icp", "voice", "proof", "donot", "story", "funnel", "intent", "money", "positioning", "content", "program", "commitment", "future_section"].map((name) => row(name, "detail", `${name.toUpperCase()}_REAL_FACT`));
  rows.push(row("story", "long_journey", "Real background. ".repeat(1200)));
  const brain = buildJaneBrainContext({ rows });
  const system = buildCopySystem({ client: { contextText: brain.prompt_text } });
  for (const { section } of rows) assert.match(system, new RegExp(`${section.toUpperCase()}_REAL_FACT`));
  assert.equal(brain.fields_available, rows.length);
  assert.equal(brain.fields_omitted, 0);
  const large = buildCopySystem({ client: { contextText: "c".repeat(18000) + "END_REAL_CLIENT_FACT" } });
  assert.match(large, /END_REAL_CLIENT_FACT/);
});

test("permission denied proof is excluded in BOTH stores, granted and unknown are labelled", () => {
  const brain = buildJaneBrainContext({ rows: [row("proof", "items", [{ claim: "MIRROR DENIED", permission: "denied" }, { claim: "MIRROR GRANTED", permission: "granted" }])], proof_items: [
    { claim: "ROW DENIED", permission: "denied" }, { claim: "ROW GRANTED", permission: "granted" }, { claim: "ROW UNKNOWN", permission: "unknown" },
  ] });
  assert.doesNotMatch(brain.prompt_text, /DENIED/);
  assert.match(brain.prompt_text, /MIRROR GRANTED/);
  assert.match(brain.prompt_text, /Permission granted: ROW GRANTED/);
  assert.match(brain.prompt_text, /Permission unknown: confirm before publication: ROW UNKNOWN/);
});

test("private planning facts are available in conversation but excluded from public draft inputs", () => {
  const data = { rows: [row("money", "income", "PRIVATE_INCOME_98765"), row("commitment", "time", "CREATOR_CAPACITY_FOUR_HOURS"), row("offer", "delivery", "Thursday group review")] };
  assert.match(buildJaneBrainContext(data).prompt_text, /PRIVATE_INCOME_98765/);
  const draft = buildJaneBrainContext(data, { publicDraft: true });
  assert.doesNotMatch(draft.prompt_text, /PRIVATE_INCOME|CREATOR_CAPACITY/);
  assert.match(draft.prompt_text, /Thursday group review/);
  assert.equal(draft.private_fields_excluded, 2);
});

test("oversized brains are explicitly excerpted with relevance and no silent section allowlist", () => {
  const rows = Array.from({ length: 80 }, (_, i) => row(i % 2 ? "content" : "program", `field_${i}`, "Saved notes. ".repeat(900) + (i === 79 ? "DELIVERY THURSDAY" : "")));
  const brain = buildJaneBrainContext({ rows }, { query: "delivery Thursday" });
  assert.equal(brain.fields_used, 80);
  assert.ok(brain.truncated);
  assert.match(brain.prompt_text, /DELIVERY THURSDAY/);
  assert.match(brain.prompt_text, /selection, not the complete record/);
  assert.ok(brain.prompt_text.length <= 32000, brain.prompt_text.length);
});

test("long chats recover relevant early user decisions without promoting assistant guesses", () => {
  const rows = [{ role: "user", content: "The offer is called Quiet Edge and costs $1700. No weekend calls." }, { role: "assistant", content: "INVENTED_SECRET_RESULT_555" }, ...Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `later message ${i}: ` + "x".repeat(3000) })), { role: "user", content: "What did we agree about the offer price and weekend calls?" }];
  const selected = buildConversationContext(rows, rows.at(-1).content);
  assert.equal(selected.messages.at(-1).content, rows.at(-1).content);
  assert.match(selected.earlierText, /Quiet Edge|1700/);
  assert.doesNotMatch(selected.earlierText, /INVENTED_SECRET/);
  assert.ok(selected.omitted_turns > 0);
});

test("short and conversational are not mistakenly treated as reel or DM requests", () => {
  assert.equal(formatFromText("Keep it short and have a normal conversation"), "general");
  assert.equal(formatFromText("Write an email"), "email");
});

test("reply formatting works across chunk boundaries and preserves plain bullets and paragraph gaps", async () => {
  async function* chunks() { yield "# Heading\n\n*"; yield "*Offer*"; yield "*\n* A “real” line!\n\n2 * 3 = 6"; }
  let result = "";
  for await (const chunk of plainReplyChunks(chunks())) result += chunk;
  assert.equal(result, 'Heading\n\nOffer\n- A "real" line.\n\n2 * 3 = 6');
});

test("drafts get a grounding check; discussion is allowed to stream normally", () => {
  assert.equal(needsCopyReview("Don't write a script yet. Talk this through", "story"), false);
  assert.equal(needsCopyReview("Write a long email", "email"), true);
  assert.equal(needsCopyReview("Write landing-page copy", "general"), true);
  assert.equal(needsCopyReview("Write an email to discuss my offer", "email"), true);
  assert.equal(needsCopyReview("Create an email", "email"), true);
  assert.equal(needsCopyReview("An email about my launch", "email"), true);
  assert.equal(needsCopyReview("A six-slide story about my journal", "story"), true);
  assert.equal(needsCopyReview("How should I use email?", "email"), false);
  assert.equal(needsCopyReview("Change just the hook", "reel"), true);
  assert.equal(needsCopyReview("What did we agree about price?", "story"), false);
  // Founder 2026-10-27: questions and remarks about their content are conversation and keep Jane's voice.
  assert.equal(needsCopyReview("Which of my YouTube videos actually made me money, and what should I make more of?", "youtube"), false);
  assert.equal(needsCopyReview("ugh my last video flopped, like 300 views. kinda demotivated tbh", "youtube"), false);
  assert.equal(needsCopyReview("why did my script flop?", "youtube"), false);
  assert.equal(needsCopyReview("give me a hook for my next video about prop firm rules", "youtube"), true);
  assert.equal(needsCopyReview("Write me a 6-slide story sequence that pushes my best video", "story"), true);
  assert.equal(needsCopyReview("Can you make me a reel about sizing?", "reel"), true);
  assert.equal(needsCopyReview("3 hooks for my next video", "youtube"), true);
});

test("Jane talks like a person: digits, no title openers, voice kept through the draft check", () => {
  const system = buildCopySystem({ client: { contextText: "Offer / name: The Process", memory: ["Address the client as Pulsify's CEO."] } });
  assert.match(system, /Write numbers as digits/);
  assert.match(system, /no greeting and no opening with their name, title or a nickname/);
  assert.match(system, /never to open a reply/);
  assert.match(groundingReviewPrompt({ clientContext: "", messages: [{ role: "user", content: "a story" }], draft: "Slide 1\nline" }).system, /every line break and the layout/);
});

test("grounding review requires a usable reply and fails closed on malformed data", () => {
  const draft = "Thursday review. Everyone gets a video.";
  assert.equal(applyGroundingReview(draft, '{"reply":"Thursday review."}'), "Thursday review.");
  assert.throws(() => applyGroundingReview(draft, "not JSON"));
  assert.throws(() => applyGroundingReview(draft, '{}'));
  assert.throws(() => applyGroundingReview(draft, '{"reply":""}'));
  // A supported draft keeps the writer's exact words instead of a retyped copy.
  assert.equal(applyGroundingReview("I'd film it today.\nSlide 2", '{"supported":true,"reply":""}'), "I'd film it today.\nSlide 2");
  assert.equal(applyGroundingReview(draft, '{"supported":true,"reply":"I would retype it."}'), draft);
  assert.throws(() => applyGroundingReview(draft, '{"supported":false,"reply":""}'));
  assert.match(groundingReviewPrompt({ clientContext: "", messages: [{ role: "user", content: "Write 230-270 words" }], draft: "x" }).system, /"supported": false, "reply": "the complete checked draft"/);
});

test("known invented delivery promises are detected against confirmed offer facts", () => {
  const context = "Program / Delivery: Thursday group review and async feedback.";
  assert.equal(findCopyClaimGaps("You receive async feedback.", context).length, 0);
  for (const text of ["After the call I add written notes to your journal.", "After the call you will receive a written summary of the feedback.", "Everyone gets a personal video.", "I'll reply with a quick tip.", "Join the next cohort."]) assert.ok(findCopyClaimGaps(text, context).length > 0, text);
  assert.equal(findCopyClaimGaps("Everyone gets video feedback.", "Program / Delivery: Video feedback.").length, 0);
  // an invented duration in words or digits is flagged unless the client gave it
  assert.ok(findCopyClaimGaps("I wrote the whole plan in ten minutes.", context).length > 0);
  assert.ok(findCopyClaimGaps("Done within 14 days.", context).length > 0);
  assert.equal(findCopyClaimGaps("Done in ten minutes.", "I record each video in 10 mins").length, 0);
  assert.equal(findCopyClaimGaps("Once a week we review it.", context).length, 0);
});

test("the draft check accepts the typed object from the AI SDK as well as its JSON text", () => {
  assert.equal(applyGroundingReview("Draft.", { supported: true, reply: "" }), "Draft.");
  assert.equal(applyGroundingReview("Draft.", { supported: false, reply: "Checked draft." }), "Checked draft.");
  assert.equal(applyGroundingReview("Draft.", '{"supported":false,"reply":"Checked draft."}'), "Checked draft.");
  assert.throws(() => applyGroundingReview("Draft.", { supported: false, reply: " " }), /Invalid grounding review/);
});

test("titles follow the Pulsify method with examples from the title voice bank (founder 2026-10-27)", () => {
  assert.equal(wantsTitles("give me 3 titles for my next video"), true);
  assert.equal(wantsTitles("what should I call this video"), true);
  assert.equal(wantsTitles("how did my week go"), false);
  assert.equal(titleCount("give me 3 titles for my next video"), 3);
  assert.equal(titleCount("5 more titles please"), 5);
  assert.equal(titleCount("I need a title"), 3);
  const trading = titleMethod({ niche: "trading", count: 3 });
  assert.match(trading, /Write exactly 3 titles/);
  assert.match(trading, /price action setup/);
  assert.doesNotMatch(trading, /tiktok shop commission/);
  const spread = titleMethod({ niche: null });
  assert.match(spread, /amazon/);
  assert.match(spread, /tiktok shop/);
  const system = buildCopySystem({ query: "give me 3 titles", format: "youtube", client: { contextText: "x", data: { rows: [{ section: "identity", field: "niche", value_json: JSON.stringify("amazon-fba") }] } } });
  assert.match(system, /TITLES \(the Pulsify method/);
  assert.match(system, /fba product/);
  assert.doesNotMatch(buildCopySystem({ query: "how was my week", client: {} }), /TITLES \(the Pulsify method/);
});

test("a title never carries an invented number; real ones and small counts stay", () => {
  const out = slotUnsupportedNumbers("1. how i made $27k in 14 days (proof)\nThumbnail: 7 funded\n2. the $22,410 setup that paid 3 times", ["my student got 7 funded accounts", "the nasdaq setup that made me $22,410"]);
  assert.equal(out, "1. how i made [your real number] in [your real number] days (proof)\nThumbnail: 7 funded\n2. the $22,410 setup that paid 3 times");
});

test("the founder's own rewrites lead, without thumbnail text he never gave (founder 2026-10-30)", () => {
  const method = titleMethod({ niche: "trading", count: 3 });
  assert.match(method, /THE FOUNDER'S OWN TITLES[^]*- how this trading coach is now making \$53,902 a month\n/);
  assert.doesNotMatch(method, /thumbnail: -/);
  assert.doesNotMatch(method, /won't promise you \$100k/);
  assert.match(method, /a video they can actually film/);
});

test("the app's title bank matches the vault page", () => {
  execFileSync(process.execPath, ["tools/build-title-bank.mjs", "--check"], { cwd: new URL("..", import.meta.url) });
});

