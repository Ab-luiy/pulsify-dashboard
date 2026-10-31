// Story sequence metrics (pulsify-saas Instagram > Metrics): live stories are read while they are
// up, grouped into sequences, and story-reply DMs become replies and conversations. Zernio is mocked:
// no client Instagram is connected and nothing here makes a live call.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeLeadDb } from "./lead-test-db.mjs";
import { captureStories, labelConversations } from "../workers/sync/src/jobs/story-capture.js";
import { handleZernioEvent } from "../workers/sync/src/jobs/zernio-inbox.js";
import {
  bookingsBySequence, groupFrames, hasWord, isEmojiOnly, labelPrompt, loadStoryMetrics, nextReadAt, parseLabel, readingFrom,
  registerSequence, renameSequence, setLabel, threadsFor,
} from "../functions/_shared/story-metrics.js";

const MIN = 60000;
const HOUR = 60 * MIN;
const { sql, env, NOW, ago, addClient } = makeLeadDb();
sql.exec(readFileSync(new URL("../migrations/0030_zernio.sql", import.meta.url), "utf8"));
sql.exec(readFileSync(new URL("../migrations/0086_story_metrics.sql", import.meta.url), "utf8"));
await addClient("rio", "token-rio");
sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,created_at,updated_at) VALUES('client','rio','instagram',?,?,?)")
  .run(JSON.stringify({ account_id: "acc-rio", username: "rio.coach" }), ago(5), ago(5));
env.ZERNIO_API_KEY = "test-key";
const puts = [];
env.MEDIA = { async put(key, body, options) { puts.push({ key, type: options?.httpMetadata?.contentType }); } };

const at = (offset) => new Date(NOW + offset).toISOString();
const story = (id, offset) => ({ id, timestamp: at(offset), mediaType: "IMAGE", mediaUrl: `https://cdn.test/${id}.jpg`, permalink: `https://instagram.com/stories/rio/${id}` });
let live = [story("s1", -3 * HOUR), story("s2", -3 * HOUR + 10 * MIN), story("s3", -3 * HOUR + 20 * MIN), story("s4", -20 * MIN)];
const REACH = { s1: 1000, s2: 880, s3: 700, s4: 400, s5: 600 };
const calls = [];
const fetcher = async (url) => {
  calls.push(url);
  if (url.startsWith("https://cdn.test/")) return new Response("jpeg-bytes", { headers: { "content-type": "image/jpeg" } });
  const path = url.replace("https://zernio.com/api", "");
  if (path === "/v1/accounts/acc-rio/instagram/stories") return Response.json({ data: live });
  const insight = /\/instagram\/stories\/(\w+)\/insights$/.exec(path);
  if (insight) {
    const reach = REACH[insight[1]];
    return Response.json({ data: { source: "live", metrics: { views: reach + 40, reach, replies: 3, shares: 2, tapsForward: reach - 100, tapsBack: 9, exits: 60, swipesForward: 30, profileVisits: 7, follows: 1, totalInteractions: 20 } } });
  }
  if (/\/v1\/inbox\/conversations\/conv-anna\/messages/.test(path)) {
    return Response.json({ messages: [
      { direction: "incoming", text: "and the price?", sentAt: at(-60 * MIN) },
      { direction: "outgoing", text: "happy to walk you through it", sentAt: at(-90 * MIN) },
      { direction: "incoming", text: "this is fire, how does it work?", sentAt: at(-2 * HOUR) },
    ] });
  }
  return Response.json({ error: "not mocked" }, { status: 404 });
};
const frames = () => sql.prepare("SELECT * FROM story_frames ORDER BY posted_at").all();

test("when a live frame is read next: every 15 minutes, every 5 in its last two hours, then never", () => {
  const expires = at(10 * HOUR);
  assert.equal(nextReadAt(expires, NOW), at(15 * MIN));
  assert.equal(nextReadAt(expires, NOW + 9 * HOUR), at(9 * HOUR + 5 * MIN));
  assert.equal(nextReadAt(expires, NOW + 10 * HOUR - 3 * MIN), at(10 * HOUR - MIN), "the last read lands a minute before it goes");
  assert.equal(nextReadAt(expires, NOW + 10 * HOUR), null);
});

test("readings, reactions, words and labels", () => {
  assert.equal(readingFrom({ source: "unavailable", metrics: { views: 9 } }), null);
  assert.deepEqual(readingFrom({ source: "cached", metrics: { reach: 12.4, tapsForward: 5, exits: null } }).reach, 12);
  assert.equal(readingFrom({ source: "live", metrics: { exits: null } }).exits, null, "Instagram hides values under 5");
  assert.equal(isEmojiOnly("🔥🔥"), true);
  assert.equal(isEmojiOnly(""), true, "a quick reaction has no words");
  assert.equal(isEmojiOnly("this is fire 🔥"), false);
  assert.equal(isEmojiOnly("10"), false);
  assert.equal(hasWord("send me the PLAN please", "plan"), true);
  assert.equal(hasWord("explanation", "plan"), false);
  assert.equal(parseLabel("Not ready."), "not_ready");
  assert.equal(parseLabel("<think>hm</think> interested"), "interested");
  assert.equal(parseLabel("no idea"), null);
  const prompt = labelPrompt([{ from: "them", text: "how much?" }, { from: "you", text: "depends" }]);
  assert.match(prompt.user, /^Them: how much\?\nCreator: depends$/);
  assert.deepEqual(groupFrames([{ posted_at: at(0) }, { posted_at: at(HOUR) }, { posted_at: at(4 * HOUR) }]).map((g) => g.length), [2, 1]);
});

test("live stories are kept, pictured and read; frames close together are one sequence", async () => {
  const written = await captureStories(env, { now: NOW, fetcher });
  assert.ok(written >= 4);
  const rows = frames();
  assert.deepEqual(rows.map((f) => [f.story_id, f.n, f.sequence_id]), [["s1", 1, "sq_s1"], ["s2", 2, "sq_s1"], ["s3", 3, "sq_s1"], ["s4", 1, "sq_s4"]]);
  assert.deepEqual(rows.map((f) => f.reach), [1000, 880, 700, 400]);
  assert.ok(rows.every((f) => /^rio\/[0-9a-f-]{36}\.jpg$/.test(f.media_key)), "each frame is copied under the public client/UUID key");
  assert.equal(puts.length, 4);
  assert.ok(rows.every((f) => f.next_read_at === at(15 * MIN) && f.readings === 1 && f.final === 0));
  const sequences = sql.prepare("SELECT id, posted_on, source FROM story_sequences ORDER BY posted_at").all();
  assert.deepEqual(sequences.map((s) => [s.id, s.source]), [["sq_s1", "instagram"], ["sq_s4", "instagram"]]);

  // Ten minutes on nothing is due and the account is not listed again.
  calls.length = 0;
  await captureStories(env, { now: NOW + 10 * MIN, fetcher });
  assert.equal(calls.length, 0);
});

test("the last two hours are read every 5 minutes, and a gone frame keeps its last reading", async () => {
  // s1-s3 expire about 21 hours from now; s4 about 23h40.
  await captureStories(env, { now: NOW + 20 * HOUR, fetcher });
  const s1 = frames().find((f) => f.story_id === "s1");
  assert.equal(s1.next_read_at, at(20 * HOUR + 5 * MIN));
  live = [story("s4", -20 * MIN)];
  await captureStories(env, { now: NOW + 21 * HOUR + 25 * MIN, fetcher });
  const after = frames();
  assert.deepEqual(after.filter((f) => f.final).map((f) => f.story_id), ["s1", "s2", "s3"]);
  assert.equal(after.find((f) => f.story_id === "s1").reach, 1000, "the final number is the last reading");
});

test("a sequence the story board registered takes its look, roles and ask", async () => {
  const id = await registerSequence(env, "rio", {
    look: "Case study", title: null,
    frames: [{ role: "Hook", elements: ["Your face"], tags: ["Your face"] }, { role: "The ask", tags: ["Link sticker"], has_link: true }],
    cta: { kind: "word", label: "Reply PLAN", word: "plan" },
  });
  assert.ok(id);
  live = [story("s4", -20 * MIN), story("s5", 22 * HOUR)];
  await captureStories(env, { now: NOW + 22 * HOUR + 5 * MIN, fetcher });
  const seq = sql.prepare("SELECT * FROM story_sequences WHERE id='sq_s5'").get();
  assert.equal(seq.source, "board");
  assert.equal(seq.look, "Case study");
  assert.equal(seq.cta_word, "plan");
  const s5 = frames().find((f) => f.story_id === "s5");
  assert.equal(s5.role, "Hook");
  assert.deepEqual(JSON.parse(s5.tags_json), ["Your face"]);
  assert.equal(sql.prepare("SELECT used_by FROM story_registrations WHERE id=?").get(id).used_by, "sq_s5");
});

test("story replies become replies, conversations, unanswered ones and booked calls", async () => {
  let n = 0;
  const dm = (who, text, { direction = "incoming", storyId = null, offset }) => {
    n += 1;
    return {
      id: `evt-${n}`,
      event: direction === "incoming" ? "message.received" : "message.sent",
      account: { accountId: "acc-rio" },
      conversation: { id: `conv-${who}`, participantId: `ig-${who}`, participantUsername: who, accountId: "acc-rio" },
      message: { id: `m-${n}`, platformMessageId: `mid.${n}`, direction, text, sentAt: at(offset), ...(storyId ? { storyReply: { storyId } } : {}) },
    };
  };
  const send = (payload) => handleZernioEvent(env, payload, payload.id);
  // Anna replies to slide 1, the setter answers, she writes again: a conversation.
  await send(dm("anna", "this is fire, how does it work?", { storyId: "s1", offset: -2 * HOUR }));
  await send(dm("anna", "happy to walk you through it", { direction: "outgoing", offset: -90 * MIN }));
  await send(dm("anna", "and the price?", { offset: -60 * MIN }));
  // Ben reacts with an emoji: a reaction, never a conversation.
  await send(dm("ben", "🔥", { storyId: "s2", offset: -2 * HOUR }));
  // Cara asks and nobody has answered yet.
  await send(dm("cara", "how much is it?", { storyId: "s3", offset: -100 * MIN }));
  // Dan replies with the word to the registered sequence.
  await send(dm("dan", "PLAN", { storyId: "s5", offset: 22 * HOUR + 10 * MIN }));

  const replies = sql.prepare("SELECT contact_id, story_id, emoji_only, has_word FROM story_replies ORDER BY at").all();
  assert.deepEqual(replies.map((r) => [r.story_id, r.emoji_only, r.has_word]), [["s1", 0, 0], ["s2", 1, 0], ["s3", 0, 0], ["s5", 0, 1]]);

  const anna = replies.find((r) => r.story_id === "s1").contact_id;
  const people = [{ contacts: [{ id: anna }], stages: { booked: at(-30 * MIN) }, source: {} }];
  const result = await loadStoryMetrics(env, "rio", { now: NOW + 23 * HOUR, pipeline: { raw: people } });
  const first = result.find((s) => s.id === "sq_s1");
  assert.equal(first.status, "final");
  assert.deepEqual(first.slides.map((s) => s.reach), [1000, 880, 700]);
  assert.equal(first.totals.started, 1000);
  assert.equal(first.totals.finished, 700);
  assert.equal(first.totals.replies_written, 2);
  assert.equal(first.totals.replies_emoji, 1);
  assert.equal(first.totals.likes, 1, "emoji reactions stand in for likes until the check is done");
  assert.deepEqual(first.totals.conversations, { interested: 1, not_ready: 0, friend: 0, operator: 0, selling: 0, unsorted: 0 }, "a booked call makes it interested");
  assert.equal(first.totals.replies_unanswered, 1);
  assert.equal(first.totals.booked_calls, 1);
  assert.ok(first.slides[0].thumbnail_url.startsWith("/m/rio/"));
  const board = result.find((s) => s.id === "sq_s5");
  assert.equal(board.totals.cta_people, 1, "one person replied with the word");
  assert.equal(result[0].id, "sq_s5", "newest first");

  // Without the booking the conversation waits for its label.
  const unbooked = await loadStoryMetrics(env, "rio", { now: NOW + 23 * HOUR, pipeline: { raw: [] } });
  assert.equal(unbooked.find((s) => s.id === "sq_s1").totals.conversations.unsorted, 1);
});

test("the AI labels a back-and-forth once; the setter can change it", async () => {
  env.AI = { async run() { return { response: "not_ready" }; } };
  const labelled = await labelConversations(env, { now: NOW, fetcher });
  assert.equal(labelled, 1);
  assert.equal(await labelConversations(env, { now: NOW, fetcher }), 0, "never twice");
  const row = sql.prepare("SELECT * FROM story_conversation_labels").get();
  assert.deepEqual([row.label, row.labelled_by, row.sequence_id], ["not_ready", "ai", "sq_s1"]);
  let result = await loadStoryMetrics(env, "rio", { now: NOW + 23 * HOUR, pipeline: { raw: [] } });
  assert.equal(result.find((s) => s.id === "sq_s1").totals.conversations.not_ready, 1);
  await setLabel(env, "rio", { contactId: row.contact_id, sequenceId: "sq_s1", label: "friend" });
  result = await loadStoryMetrics(env, "rio", { now: NOW + 23 * HOUR, pipeline: { raw: [] } });
  assert.equal(result.find((s) => s.id === "sq_s1").totals.conversations.friend, 1);
  assert.equal(sql.prepare("SELECT labelled_by FROM story_conversation_labels").get().labelled_by, "setter");
  delete env.AI;
});

test("a sequence can be renamed, and only by its own client", async () => {
  assert.equal(await renameSequence(env, "rio", "sq_s1", "  Nick's case study  "), true);
  assert.equal(sql.prepare("SELECT title FROM story_sequences WHERE id='sq_s1'").get().title, "Nick's case study");
  assert.equal(await renameSequence(env, "other", "sq_s1", "Not mine"), false);
  await renameSequence(env, "rio", "sq_s1", "");
  assert.equal(sql.prepare("SELECT title FROM story_sequences WHERE id='sq_s1'").get().title, null);
});

test("a story link that brought someone to the page credits the sequence it was clicked in", () => {
  const windows = [{ id: "old", start: NOW - 48 * HOUR, end: NOW - 24 * HOUR }, { id: "new", start: NOW - 2 * HOUR, end: NOW + 22 * HOUR }];
  const people = [
    { contacts: [], first_at: at(-HOUR), stages: { booked: at(0) }, source: { utm: { utm_content: "l-story1" } } },
    { contacts: [], first_at: at(-HOUR), stages: { booked: at(0) }, source: { utm: { utm_content: "l-bio" } } },
    { contacts: [], first_at: at(-HOUR), stages: {}, source: { utm: { utm_content: "l-story1" } } },
  ];
  const { booked } = bookingsBySequence(people, { replies: [], sequenceOfStory: new Map(), windows, storyTokens: new Set(["story1"]) });
  assert.deepEqual([...booked], [["new", 1]]);
});

test("threads: answered and back-and-forth are told apart", () => {
  const replies = [{ contact_id: "a", at: at(0), emoji_only: 0 }, { contact_id: "b", at: at(0), emoji_only: 0 }];
  const events = [{ contact_id: "a", direction: "outbound", at: at(MIN) }, { contact_id: "b", direction: "outbound", at: at(MIN) }, { contact_id: "b", direction: "inbound", at: at(2 * MIN) }];
  const threads = threadsFor(replies, events);
  assert.deepEqual(threads.map((t) => [t.contact_id, t.answered, t.conversation]), [["a", true, false], ["b", true, true]]);
});
