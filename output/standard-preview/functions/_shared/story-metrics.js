// Story sequence metrics (founder 2026-10-30, pulsify-saas Instagram > Metrics).
//
// Instagram serves a story's insights only while it is up, so the sync worker reads every live
// frame every 15 minutes, every 5 in its last two hours (workers/sync/src/jobs/story-capture.js).
// Frames posted within two hours of each other are one sequence, counted on the day it was posted.
// Link taps come from Pulsify tracked links placed on stories, replies and conversations from the
// story-reply DMs (_shared/client-dms.js), booked calls from the lead pipeline (lead-people.js).
//
// A conversation is a story reply that became a back-and-forth: the person wrote again after the
// client or their setter answered. A one-off reply stays a reply until someone follows it up and
// they answer. Each conversation is labelled once by the AI (interested, not ready yet, friend,
// operator, selling to you); the setter can change it, and a conversation that ends in a booked
// call counts as interested. Only the label is kept, never the words.

import { cleanId, nowIso, parseJson, str } from "./common.js";
import { loadPipeline } from "./lead-people.js";

const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const SEQUENCE_GAP_MS = 2 * HOUR;
export const STORY_LIFE_MS = DAY;
export const READ_EVERY_MS = 15 * MINUTE;
export const READ_EVERY_LATE_MS = 5 * MINUTE;
export const LATE_WINDOW_MS = 2 * HOUR;
export const BOOKING_WINDOW_MS = 30 * DAY;
export const LABELS = ["interested", "not_ready", "friend", "operator", "selling"];
const LOOKBACK_MS = 120 * DAY;
const MAX_SEQUENCES = 80;

const num = (value) => (value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? null : Math.round(Number(value)));
const time = (value) => {
  const at = Date.parse(value || "");
  return Number.isFinite(at) ? at : null;
};
const sum = (list, pick) => {
  let total = null;
  for (const item of list) {
    const value = pick(item);
    if (value != null) total = (total ?? 0) + value;
  }
  return total;
};

// ---------- reading a frame ----------

/**
 * When to read a live frame next: every 15 minutes, every 5 in its last two hours, and once more
 * just before it goes. null when it is gone: the last reading stands as final.
 */
export function nextReadAt(expiresAt, now) {
  const end = time(expiresAt);
  if (end == null || now >= end - 30000) return null;
  const step = end - now <= LATE_WINDOW_MS ? READ_EVERY_LATE_MS : READ_EVERY_MS;
  return new Date(Math.max(now + 30000, Math.min(now + step, end - MINUTE))).toISOString();
}

/** Zernio's story insights in our columns. null when Instagram no longer serves them. Values under 5 people come back empty. */
export function readingFrom(data) {
  if (!data || data.source === "unavailable" || !data.metrics) return null;
  const m = data.metrics;
  const nav = m.navigationBreakdown || m.navigation_breakdown || {};
  return {
    views: num(m.views),
    reach: num(m.reach),
    replies: num(m.replies),
    shares: num(m.shares),
    reposts: num(m.reposts),
    follows: num(m.follows),
    profile_visits: num(m.profileVisits ?? m.profile_visits),
    interactions: num(m.totalInteractions ?? m.total_interactions),
    navigation: num(typeof m.navigation === "object" ? null : m.navigation),
    taps_forward: num(m.tapsForward ?? nav.tap_forward),
    taps_back: num(m.tapsBack ?? nav.tap_back),
    exits: num(m.exits ?? nav.tap_exit),
    swipes_forward: num(m.swipesForward ?? nav.swipe_forward),
  };
}

/** A live story from Zernio's list, as the row we keep. */
export function frameFrom(row, { clientId, accountId, now }) {
  const id = str(row?.id);
  const postedAt = time(row?.timestamp) ?? now;
  if (!id) return null;
  return {
    story_id: id,
    client_id: clientId,
    account_id: accountId,
    posted_at: new Date(postedAt).toISOString(),
    expires_at: new Date(postedAt + STORY_LIFE_MS).toISOString(),
    media_type: str(row.mediaType) || null,
    media_url: str(row.mediaType) === "VIDEO" ? str(row.thumbnailUrl) || null : str(row.mediaUrl || row.thumbnailUrl) || null,
    permalink: str(row.permalink) || null,
  };
}

// ---------- sequences ----------

/** Frames in posting order, split where more than two hours pass between two of them. */
export function groupFrames(frames, gap = SEQUENCE_GAP_MS) {
  const sorted = [...frames].sort((a, b) => String(a.posted_at).localeCompare(String(b.posted_at)));
  const groups = [];
  for (const frame of sorted) {
    const current = groups[groups.length - 1];
    const last = current?.[current.length - 1];
    if (last && time(frame.posted_at) - time(last.posted_at) <= gap) current.push(frame);
    else groups.push([frame]);
  }
  return groups;
}

export const sequenceIdFor = (firstStoryId) => `sq_${cleanId(firstStoryId, "x")}`;
export const postedOn = (iso) => String(iso || "").slice(0, 10);

// ---------- replies ----------

/** The story a DM replies to, wherever Zernio puts it. */
export function storyIdOfReply(message = {}) {
  const candidates = [message.storyReply?.storyId, message.storyReply?.id, message.replyTo?.story?.id, message.reply_to?.story?.id, message.story?.id];
  return candidates.map((value) => str(value)).find(Boolean) || null;
}

/** A reaction rather than words: only emoji, or nothing at all (a quick reaction). */
export function isEmojiOnly(text) {
  const value = str(text);
  if (!value) return true;
  return !/[\p{L}\p{N}]/u.test(value) && /\p{Extended_Pictographic}/u.test(value);
}

/** Replied with the sequence's word ("reply PLAN"), anywhere in the message, any case. */
export function hasWord(text, word) {
  const target = str(word).toLowerCase();
  if (!target) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "iu").test(str(text));
}

/** Keep one DM that replied to a story. Safe to repeat. The words are read here once and never stored. */
export async function recordStoryReply(env, client, contactId, conversation = {}, message = {}, at) {
  const storyId = storyIdOfReply(message);
  const messageId = str(message.platformMessageId) || str(message.id);
  if (!storyId || !messageId || !contactId || !at) return null;
  const text = message.text ?? message.message ?? "";
  const sequence = await env.DB.prepare(
    "SELECT s.cta_word AS word FROM story_frames f JOIN story_sequences s ON s.id = f.sequence_id WHERE f.story_id=?",
  ).bind(storyId).first().catch(() => null);
  await env.DB.prepare(
    `INSERT OR IGNORE INTO story_replies (message_id, client_id, contact_id, story_id, at, emoji_only, has_word, zernio_conversation_id, account_id)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).bind(
    messageId, cleanId(client), contactId, storyId, at, isEmojiOnly(text) ? 1 : 0, hasWord(text, sequence?.word) ? 1 : 0,
    str(conversation.id) || null, str(conversation.accountId) || null,
  ).run();
  return { storyId };
}

/**
 * Each person who replied to a sequence, with when they first replied and where the thread went:
 * answered (the client or setter wrote back) and conversation (they wrote again after that).
 */
export function threadsFor(replies, events) {
  const byContact = new Map();
  for (const reply of replies) {
    const thread = byContact.get(reply.contact_id) || { contact_id: reply.contact_id, first_at: reply.at, written: false, word: false };
    if (String(reply.at) < String(thread.first_at)) thread.first_at = reply.at;
    if (!reply.emoji_only) thread.written = true;
    if (reply.has_word) thread.word = true;
    byContact.set(reply.contact_id, thread);
  }
  const eventsOf = new Map();
  for (const event of events) {
    const list = eventsOf.get(event.contact_id) || [];
    list.push(event);
    eventsOf.set(event.contact_id, list);
  }
  for (const thread of byContact.values()) {
    const list = (eventsOf.get(thread.contact_id) || []).filter((e) => String(e.at) > String(thread.first_at)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const answer = list.find((e) => e.direction === "outbound");
    thread.answered = Boolean(answer);
    thread.conversation = Boolean(answer && list.some((e) => e.direction === "inbound" && String(e.at) > String(answer.at)));
  }
  return [...byContact.values()];
}

// ---------- labelling ----------

const LABEL_GUIDE = [
  "interested: asks how it works, the price, how to join, or says they want it.",
  "not_ready: curious or impressed, but unsure, not now, or cannot afford it yet.",
  "friend: someone the creator knows personally, just chatting.",
  "operator: another creator, coach or agency owner in the same space, talking shop.",
  "selling: trying to sell the creator a service or product.",
].join("\n");

/** The AI's instructions for one conversation. `lines` are {from: 'them'|'you', text} in order. */
export function labelPrompt(lines) {
  return {
    system: `You sort Instagram conversations that started from a creator's story. Answer with one word only: interested, not_ready, friend, operator or selling.\n${LABEL_GUIDE}`,
    user: lines.map((line) => `${line.from === "you" ? "Creator" : "Them"}: ${str(line.text).slice(0, 400)}`).join("\n").slice(0, 4000),
  };
}

/** The label in the AI's answer, or null when it gave none. */
export function parseLabel(text) {
  const value = str(text).toLowerCase().replace(/not[\s-]+ready/g, "not_ready");
  const found = value.match(/\b(interested|not_ready|friend|operator|selling)\b/);
  return found ? found[1] : null;
}

// ---------- the screen's numbers ----------

/** Which sequence a moment falls in: from its first frame until its last frame expires (the latest one wins). */
export function sequenceAt(windows, at) {
  const moment = time(at);
  if (moment == null) return null;
  let found = null;
  for (const w of windows) if (moment >= w.start && moment <= w.end && (!found || w.start > found.start)) found = w;
  return found?.id || null;
}

/**
 * Booked calls a sequence brought in, and the people who booked (their conversations count as
 * interested). A person counts once, for the first sequence that reached them: a story they replied
 * to, or a story link that brought them to the client's page, within 30 days before the booking.
 */
export function bookingsBySequence(people, { replies, sequenceOfStory, windows, storyTokens }) {
  const repliesOf = new Map();
  for (const reply of replies) {
    const list = repliesOf.get(reply.contact_id) || [];
    list.push(reply);
    repliesOf.set(reply.contact_id, list);
  }
  const booked = new Map();
  const bookedContacts = new Set();
  for (const person of people) {
    const bookedAt = time(person.stages?.booked);
    if (bookedAt == null) continue;
    const touches = [];
    for (const contact of person.contacts || []) {
      for (const reply of repliesOf.get(contact.id) || []) {
        const at = time(reply.at);
        const sequence = sequenceOfStory.get(reply.story_id);
        if (sequence && at != null && at <= bookedAt && bookedAt - at <= BOOKING_WINDOW_MS) touches.push({ at, sequence });
      }
    }
    const tag = str(person.source?.utm?.utm_content);
    const firstAt = time(person.first_at);
    if (tag.startsWith("l-") && storyTokens.has(tag.slice(2)) && firstAt != null && firstAt <= bookedAt && bookedAt - firstAt <= BOOKING_WINDOW_MS) {
      const sequence = sequenceAt(windows, person.first_at);
      if (sequence) touches.push({ at: firstAt, sequence });
    }
    if (!touches.length) continue;
    touches.sort((a, b) => a.at - b.at);
    booked.set(touches[0].sequence, (booked.get(touches[0].sequence) || 0) + 1);
    for (const contact of person.contacts || []) bookedContacts.add(contact.id);
  }
  return { booked, bookedContacts };
}

/**
 * The response of GET /api/story-metrics (pulsify-saas src/lib/api/story-metrics.ts), newest first.
 * Likes: until the founder's check says total_interactions minus shares minus replies equals the
 * hearts (STORY_LIKES=interactions), emoji reactions sent as replies stand in.
 */
export function assembleSequences(input) {
  const { sequences, frames, replies, events, labels, clicks, booked, bookedContacts, mediaUrl, likesFromInteractions = false } = input;
  const framesOf = new Map();
  for (const frame of frames) {
    const list = framesOf.get(frame.sequence_id) || [];
    list.push(frame);
    framesOf.set(frame.sequence_id, list);
  }
  const repliesOf = new Map();
  for (const reply of replies) {
    const list = repliesOf.get(reply.story_id) || [];
    list.push(reply);
    repliesOf.set(reply.story_id, list);
  }
  const labelOf = new Map(labels.map((l) => [`${l.contact_id}|${l.sequence_id}`, l.label]));
  const clicksOf = new Map();
  for (const click of clicks) {
    const list = clicksOf.get(click.sequence_id) || [];
    list.push(click);
    clicksOf.set(click.sequence_id, list);
  }

  const out = [];
  for (const sequence of sequences) {
    const own = (framesOf.get(sequence.id) || []).sort((a, b) => (a.n ?? 0) - (b.n ?? 0) || String(a.posted_at).localeCompare(String(b.posted_at)));
    if (!own.length) continue;
    const ownReplies = own.flatMap((frame) => repliesOf.get(frame.story_id) || []);
    const ownClicks = clicksOf.get(sequence.id) || [];
    const linkTaps = ownClicks.length;
    const linkPeople = new Set(ownClicks.map((c, i) => c.ip || `click-${i}`)).size;
    const hasLinkFrame = own.some((frame) => frame.has_link);
    const slides = own.map((frame, i) => {
      const mine = repliesOf.get(frame.story_id) || [];
      const emoji = mine.filter((r) => r.emoji_only).length;
      const written = mine.length - emoji;
      const likes = likesFromInteractions && frame.interactions != null
        ? Math.max(0, frame.interactions - (frame.shares ?? 0) - (frame.replies ?? 0))
        : emoji;
      return {
        n: i + 1,
        story_id: frame.story_id,
        role: frame.role || null,
        elements: parseJson(frame.elements_json, []),
        tags: parseJson(frame.tags_json, []),
        thumbnail_url: frame.media_key ? mediaUrl(frame.media_key) : null,
        reach: frame.reach ?? frame.views ?? null,
        taps_forward: frame.taps_forward,
        taps_back: frame.taps_back,
        exits: frame.exits,
        swipes_forward: frame.swipes_forward,
        // Taps belong to the slide with the link; without a board registration that slide is not known.
        link_taps: frame.has_link ? linkTaps : null,
        replies_written: written,
        replies_emoji: emoji,
        likes,
        shares: frame.shares,
      };
    });
    const threads = threadsFor(ownReplies, events);
    const conversations = { interested: 0, not_ready: 0, friend: 0, operator: 0, selling: 0, unsorted: 0 };
    for (const thread of threads) {
      if (!thread.conversation) continue;
      const label = bookedContacts.has(thread.contact_id) ? "interested" : labelOf.get(`${thread.contact_id}|${sequence.id}`);
      conversations[LABELS.includes(label) ? label : "unsorted"] += 1;
    }
    const wordPeople = threads.filter((t) => t.word).length;
    const ctaKind = sequence.cta_kind || (linkTaps || hasLinkFrame ? "link" : null);
    out.push({
      id: sequence.id,
      posted_on: sequence.posted_on,
      posted_at: sequence.posted_at,
      look: sequence.look || null,
      title: sequence.title || null,
      source: sequence.source === "board" ? "board" : "instagram",
      status: own.some((frame) => !frame.final) ? "live" : "final",
      last_read_at: own.reduce((latest, frame) => (String(frame.last_read_at || "") > String(latest || "") ? frame.last_read_at : latest), null),
      totals: {
        started: slides[0].reach,
        finished: slides[slides.length - 1].reach,
        link_taps: linkTaps,
        link_people: linkTaps ? linkPeople : null,
        link_label: sequence.cta_kind === "link" ? sequence.cta_label || null : null,
        replies_written: sum(slides, (s) => s.replies_written),
        replies_emoji: sum(slides, (s) => s.replies_emoji),
        likes: sum(slides, (s) => s.likes),
        shares: sum(own, (f) => f.shares),
        profile_visits: sum(own, (f) => f.profile_visits),
        follows: sum(own, (f) => f.follows),
        conversations,
        replies_unanswered: threads.filter((t) => t.written && !t.answered).length,
        booked_calls: booked.get(sequence.id) || 0,
        cta_label: sequence.cta_label || null,
        cta_people: ctaKind === "word" ? wordPeople : ctaKind === "link" ? (linkTaps ? linkPeople : 0) : null,
      },
      slides,
    });
  }
  return out.sort((a, b) => String(b.posted_at).localeCompare(String(a.posted_at)));
}

// ---------- reading it all for one client ----------

const rowsOf = async (statement) => (await statement.all()).results || [];

export async function loadStoryMetrics(env, clientId, { now = Date.now(), pipeline = null } = {}) {
  const client = cleanId(clientId);
  const since = new Date(now - LOOKBACK_MS).toISOString();
  const sequences = await rowsOf(env.DB.prepare(
    "SELECT * FROM story_sequences WHERE client_id=? AND posted_at>=? ORDER BY posted_at DESC LIMIT ?",
  ).bind(client, since, MAX_SEQUENCES));
  if (!sequences.length) return [];
  const oldest = sequences[sequences.length - 1].posted_at;
  const [frames, replies, labels, links] = await Promise.all([
    rowsOf(env.DB.prepare("SELECT * FROM story_frames WHERE client_id=? AND posted_at>=? AND sequence_id IS NOT NULL").bind(client, oldest)),
    rowsOf(env.DB.prepare("SELECT message_id, contact_id, story_id, at, emoji_only, has_word FROM story_replies WHERE client_id=? AND at>=?").bind(client, oldest)),
    rowsOf(env.DB.prepare("SELECT contact_id, sequence_id, label FROM story_conversation_labels WHERE client_id=?").bind(client)),
    // D1 binds at most 100 values a query: the newest 90 story links are plenty.
    rowsOf(env.DB.prepare("SELECT token FROM asset_links WHERE client=? AND kind='link' AND placement='story' ORDER BY created_at DESC LIMIT 90").bind(client)).catch(() => []),
  ]);
  const events = replies.length
    ? await rowsOf(env.DB.prepare(
      `SELECT contact_id, direction, at FROM ig_dm_events
        WHERE client_id=? AND at>=? AND contact_id IN (SELECT DISTINCT contact_id FROM story_replies WHERE client_id=? AND at>=?)`,
    ).bind(client, oldest, client, oldest))
    : [];
  const storyTokens = new Set(links.map((l) => str(l.token)).filter(Boolean));
  const tokens = [...storyTokens];
  const rawClicks = tokens.length
    ? await rowsOf(env.DB.prepare(
      `SELECT token, ip, at FROM asset_events WHERE client=? AND at>=? AND token IN (${tokens.map(() => "?").join(",")})`,
    ).bind(client, oldest, ...tokens))
    : [];

  const windows = sequences.map((sequence) => {
    const own = frames.filter((f) => f.sequence_id === sequence.id);
    const start = time(sequence.posted_at);
    const end = Math.max(start + STORY_LIFE_MS, ...own.map((f) => time(f.expires_at) ?? 0));
    return { id: sequence.id, start, end };
  });
  const clicks = rawClicks.map((click) => ({ ...click, sequence_id: sequenceAt(windows, click.at) })).filter((click) => click.sequence_id);
  const sequenceOfStory = new Map(frames.map((f) => [f.story_id, f.sequence_id]));

  const people = replies.length || tokens.length ? (pipeline || await loadPipeline(env, client, { now }).catch(() => null))?.raw || [] : [];
  const { booked, bookedContacts } = bookingsBySequence(people, { replies, sequenceOfStory, windows, storyTokens });

  return assembleSequences({
    sequences,
    frames,
    replies,
    events,
    labels,
    clicks,
    booked,
    bookedContacts,
    mediaUrl: (key) => `/m/${key}`,
    likesFromInteractions: env.STORY_LIKES === "interactions",
  });
}

// ---------- writes from the screen and the story board ----------

/** The client's own name for a sequence. An empty title puts back the look's name. */
export async function renameSequence(env, clientId, id, title) {
  const name = str(title).slice(0, 60);
  const result = await env.DB.prepare("UPDATE story_sequences SET title=?, updated_at=? WHERE client_id=? AND id=?")
    .bind(name || null, nowIso(), cleanId(clientId), str(id)).run();
  return Boolean(result.meta?.changes);
}

/** The setter's label for a conversation. It replaces the AI's. */
export async function setLabel(env, clientId, { contactId, sequenceId, label }) {
  if (!LABELS.includes(label) || !str(contactId) || !str(sequenceId)) return false;
  await env.DB.prepare(
    `INSERT INTO story_conversation_labels (client_id, contact_id, sequence_id, label, labelled_by, labelled_at) VALUES (?,?,?,?,'setter',?)
     ON CONFLICT(client_id, contact_id, sequence_id) DO UPDATE SET label=excluded.label, labelled_by='setter', labelled_at=excluded.labelled_at`,
  ).bind(cleanId(clientId), str(contactId), str(sequenceId), label, nowIso()).run();
  return true;
}

/** What the story board is about to post (pulsify-saas docs/story-board-registration.md). */
export function cleanRegistration(body = {}) {
  const frames = Array.isArray(body.frames) ? body.frames.slice(0, 30).map((frame) => ({
    role: str(frame?.role).slice(0, 80) || null,
    elements: Array.isArray(frame?.elements) ? frame.elements.map((e) => str(e).slice(0, 60)).filter(Boolean).slice(0, 8) : [],
    tags: Array.isArray(frame?.tags) ? frame.tags.map((t) => str(t).slice(0, 40)).filter(Boolean).slice(0, 6) : [],
    has_link: Boolean(frame?.has_link),
  })) : [];
  const cta = body.cta && typeof body.cta === "object" ? body.cta : {};
  const kind = cta.kind === "word" || cta.kind === "link" ? cta.kind : null;
  return {
    look: str(body.look).slice(0, 60) || null,
    title: str(body.title).slice(0, 60) || null,
    frames,
    cta_kind: kind,
    cta_label: str(cta.label).slice(0, 80) || null,
    cta_word: kind === "word" ? str(cta.word).slice(0, 40) || null : null,
  };
}

export async function registerSequence(env, clientId, body) {
  const reg = cleanRegistration(body);
  if (!reg.frames.length) return null;
  const id = `reg_${crypto.randomUUID()}`;
  await env.DB.prepare(
    "INSERT INTO story_registrations (id, client_id, look, title, frames_json, cta_kind, cta_label, cta_word, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
  ).bind(id, cleanId(clientId), reg.look, reg.title, JSON.stringify(reg.frames), reg.cta_kind, reg.cta_label, reg.cta_word, nowIso()).run();
  return id;
}
