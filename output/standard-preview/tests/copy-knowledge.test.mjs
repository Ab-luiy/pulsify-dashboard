import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { COPY_KNOWLEDGE } from "../functions/_shared/copy-knowledge-data.js";
import { retrieveCopyKnowledge, selectJaneCards, excerpt } from "../functions/_shared/copy-knowledge.js";
import { SOURCE_NAMES } from "../functions/_shared/source-scrub.js";
import { janeNamespace } from "../functions/_shared/jane-search.ts";

test("collection rebuild is deterministic and current against the actual vault", () => {
  // A new wiki page only prints a "not yet classified" warning, so the nightly refresh is never blocked by it.
  execFileSync(process.execPath, ["tools/build-copy-knowledge.mjs", "--check"], { cwd: new URL("..", import.meta.url), stdio: "pipe" });
  assert.ok(COPY_KNOWLEDGE.sources.length >= 60, "the full method vault, not the old 23 sections");
  assert.ok(COPY_KNOWLEDGE.passages.length > 200);
  assert.ok(COPY_KNOWLEDGE.sources.every((source) => source.client_visible && source.hash.length === 64));
});

test("client methods contain no source names, paths, secrets or private client records", () => {
  const text = JSON.stringify({ passages: COPY_KNOWLEDGE.passages, cards: COPY_KNOWLEDGE.cards });
  for (const name of SOURCE_NAMES) assert.ok(!text.toLowerCase().includes(name.toLowerCase()), name);
  assert.doesNotMatch(text, /wiki\/|raw-sources\/|clients\/|output\/|functions\/|https?:\/\/|[a-z]:\\\\|api.key|oauth_token|\.json\b/i);
  // Pulsify's own sales mechanism, contracts and accounts never reach a client.
  assert.doesNotMatch(text, /Pulse System|contract template|account registry/i);
});

test("lesson extractions keep the rules, not the speaker's quotes, numbers or names", () => {
  const lessons = COPY_KNOWLEDGE.passages.filter((part) => part.source_id.startsWith("lesson-"));
  assert.ok(lessons.length > 50);
  for (const part of lessons) {
    assert.doesNotMatch(part.text, /^\s*(?:Quote|Recurrence)\b/m, part.id);
    assert.doesNotMatch(part.text, /\$\s?\d/, part.id);
    assert.doesNotMatch(part.title, /Niksetting|SooWei|Goh|\$/i, part.id);
  }
});

test("every vector ID fits the index limit", () => {
  for (const part of COPY_KNOWLEDGE.passages) assert.ok(`${janeNamespace}:${part.id}`.length <= 64, part.id);
});

test("task cards are current, sourced and picked for the right work", () => {
  const ids = COPY_KNOWLEDGE.cards.map((card) => card.id);
  for (const id of ["story", "reel", "youtube", "carousel", "email", "dm", "rewrite", "offer", "funnel", "content-plan", "proof", "profile"]) assert.ok(ids.includes(id), id);
  const known = new Set([...COPY_KNOWLEDGE.sources.map((source) => source.id), "doctrine"]);
  for (const card of COPY_KNOWLEDGE.cards) {
    assert.ok(card.sources.length && card.sources.every((id) => known.has(id)), card.id);
    assert.ok(card.text.length > 600 && card.text.length < 4000, `${card.id} stays short and dense`);
  }
  assert.deepEqual(selectJaneCards({ query: "make it punchier", format: "story" }).map((card) => card.id), ["story"]);
  assert.ok(selectJaneCards({ query: "People book calls but don't show up" }).map((card) => card.id).includes("funnel"));
  assert.deepEqual(selectJaneCards({ query: "How should I price my offer?" }).map((card) => card.id), ["offer"]);
  assert.deepEqual(selectJaneCards({ query: "hi" }), []);
});

test("retrieval over the full vault stays fast enough for the Workers CPU budget", () => {
  retrieveCopyKnowledge({ query: "warm up" });
  const started = performance.now();
  for (let i = 0; i < 20; i++) retrieveCopyKnowledge({ query: "People book calls but don't show up. What pre-call emails should I make?" });
  assert.ok((performance.now() - started) / 20 < 5, "about a millisecond per retrieval");
});

for (const [query, source, expected] of [
  ["How should I price and deliver my mentorship offer?", "offer", /delivery model|financial/i],
  ["People book calls but don't show up. What pre-call emails and confirmation content should I make?", "pre-call", /quadrant|confirmation|objection/i],
  ["Write a story sequence, curiosity obstacle belief shift result close", "stories", /six-step|curiosity/i],
  ["My thumbnail is a screen recording. Should I add a yellow bar?", "thumbnails", /Pattern C|go quiet|yellow bar/i],
  ["Explain TOF MOF BOF and a horizontal funnel inside one video", "stages", /middle|opening|TOF/i],
  ["How do I name a unique mechanism for my offer?", "mechanism", /mechanism/i],
  ["Which raw demonstration reel format should I record?", "reels", /demonstration|raw|reel/i],
  ["Build a carousel with a cover and one slide per type", "carousels", /cover|taxonomy/i],
  ["They keep booking and never turning up. Help.", "pre-call", /confirmation|quadrant|pre-call/i],
]) test(`retrieves the actual method for: ${query}`, () => {
  const result = retrieveCopyKnowledge({ query });
  assert.ok(result.source_ids.includes(source), JSON.stringify(result.source_ids));
  assert.match(result.prompt_text, expected);
  assert.ok(result.prompt_text.length <= 12000);
});

test("query changes selected passages and an unsupported question does not fabricate a source", () => {
  const a = retrieveCopyKnowledge({ query: "unique mechanism pricing offer" });
  const b = retrieveCopyKnowledge({ query: "thumbnail screen yellow bar" });
  assert.notDeepEqual(a.passage_ids, b.passage_ids);
  assert.equal(retrieveCopyKnowledge({ query: "xylophone astrophysics" }).passage_ids.length, 0);
});

test("a relevant fact at the END of a long field is recovered within the budget", () => {
  const text = "Ordinary background. ".repeat(800) + "Special constraint: delivery only on Thursday, no weekend calls.";
  const value = excerpt(text, "delivery Thursday weekend", 1400);
  assert.match(value, /only on Thursday/);
  assert.match(value, /omitted|excerpted/);
  assert.ok(value.length <= 1400);
});

test("lack of bookings does not automatically load methods for already booked leads", () => {
  for (const query of ["People watch but nobody books a call. Why?", "What should I film to lead traders to a call?", "Give me two calmer opening lines"]) {
    assert.ok(!retrieveCopyKnowledge({ query }).source_ids.includes("pre-call"));
  }
  assert.ok(retrieveCopyKnowledge({ query: "Improve our confirmation page and email reminders after booking" }).source_ids.includes("pre-call"));
});

test("the frameworks added 2026-10-26 are in the collection and carry no creator names", () => {
  for (const id of ["vsl", "sales-calls", "bio", "ig-assets", "webinar", "rhythm"]) {
    assert.ok(COPY_KNOWLEDGE.passages.some((part) => part.source_id === id), `${id} has passages`);
  }
  assert.doesNotMatch(JSON.stringify(COPY_KNOWLEDGE.passages), /Jeremy|Hormozi|Kobey|Cardinal|Grant Garcia|Rorwick|Lapotko/);
});
