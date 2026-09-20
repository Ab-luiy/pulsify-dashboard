// Outreach tracker logic. Pure functions over a thread's messages plus the
// human-set row from ig_outreach. Used by the API and the Worker.
import { nowIso, str } from "./common.js";

export const TOUCH_WINDOW_MS = 60 * 60 * 1000;      // bubbles within an hour are one touch
export const FOLLOW_UP_HOURS = 24;                  // next touch is due after this
export const MAX_TOUCHES = 4;                       // opener + 3 follow-ups, then move on
export const SEEN_GRACE_MS = 5 * 60 * 1000;         // seen with no reply for 5 minutes

export const TOUCH_LABELS = ["No message yet", "Opener sent", "2nd message sent", "3rd message sent", "4th message sent"];

// Cluster our messages into touches: a touch is a run of outbound messages
// with no inbound in between and gaps under TOUCH_WINDOW_MS.
export function countTouches(messages, since = null) {
  let touches = 0;
  let lastOut = null;
  for (const m of messages) {
    if (since && m.sent_at <= since) continue;
    if (m.direction !== "outbound") { lastOut = null; continue; }
    const t = Date.parse(m.sent_at);
    if (!lastOut || t - lastOut > TOUCH_WINDOW_MS) touches += 1;
    lastOut = t;
  }
  return touches;
}

// Everything the tracker shows for one thread.
export function deriveThread(conversation, messages, row = {}, now = Date.now()) {
  const sorted = [...messages].sort((a, b) => a.sent_at.localeCompare(b.sent_at));
  const first = sorted[0] || null;
  const ours = sorted.filter((m) => m.direction === "outbound");
  const theirs = sorted.filter((m) => m.direction === "inbound");
  const lastOurs = ours.at(-1)?.sent_at || null;
  const lastTheirs = theirs.at(-1)?.sent_at || null;
  const origin = first ? (first.direction === "outbound" ? "outbound" : "inbound") : "outbound";
  // Closed, lost and hibernating threads never nag, even when they spoke last.
  const parked = row.outcome === "closed" || row.outcome === "lost" || Boolean(row.hibernated_at);
  const awaitingUs = !parked && Boolean(lastTheirs && (!lastOurs || lastTheirs > lastOurs));
  const touches = countTouches(sorted, lastTheirs);
  const hoursSinceOurs = lastOurs ? (now - Date.parse(lastOurs)) / 3600000 : null;
  const replied = theirs.length > 0;
  const seen = row.seen_at || null;

  let stage;
  if (row.outcome === "closed") stage = "closed";
  else if (row.outcome === "booked") stage = "booked";
  else if (row.outcome === "lost") stage = "lost";
  else if (row.hibernated_at) stage = "hibernating";
  else if (awaitingUs) stage = "replied";
  else if (origin === "outbound" && touches >= MAX_TOUCHES && hoursSinceOurs !== null && hoursSinceOurs >= FOLLOW_UP_HOURS) stage = "hibernating";
  else stage = `touch-${Math.min(touches, MAX_TOUCHES)}`;

  const followUpDue = !row.outcome && !row.hibernated_at && !awaitingUs && origin === "outbound"
    && touches > 0 && touches < MAX_TOUCHES && hoursSinceOurs !== null && hoursSinceOurs >= FOLLOW_UP_HOURS;
  const ghosted = origin === "outbound" && !replied && stage === "hibernating";
  // Left on read: seen, then silence for the grace period, no reply after the seen moment.
  const leftOnRead = Boolean(seen && !theirs.some((m) => m.sent_at > seen) && now - Date.parse(seen) >= SEEN_GRACE_MS);

  return {
    id: conversation.id,
    handle: conversation.participant_username || "",
    name: conversation.participant_name || conversation.participant_username || "Instagram lead",
    participant_id: conversation.participant_id || "",
    pfp_url: row.pfp_url || null,
    origin,
    stage,
    stage_label: stage.startsWith("touch-") ? TOUCH_LABELS[Number(stage.slice(6))] : ({ replied: "They replied", booked: "Appointment booked", closed: "Closed", lost: "Lost", hibernating: "Hibernating" })[stage],
    touches,
    our_messages: ours.length,
    their_messages: theirs.length,
    first_message_at: first?.sent_at || conversation.first_message_at || null,
    last_message_at: sorted.at(-1)?.sent_at || conversation.last_message_at || null,
    last_our_message_at: lastOurs,
    last_their_message_at: lastTheirs,
    last_text: sorted.at(-1)?.text || "",
    hours_since_our_message: hoursSinceOurs === null ? null : Math.floor(hoursSinceOurs),
    awaiting_us: awaitingUs,
    follow_up_due: followUpDue,
    replied,
    ghosted,
    seen_at: seen,
    left_on_read: leftOnRead,
    sentiment: row.sentiment || null,
    outcome: row.outcome || null,
    hibernated_at: row.hibernated_at || null,
    notes: row.notes || "",
  };
}

// Sort for the working list: due follow-ups first (most overdue first), then
// people waiting on us, then everything else by recency.
export function sortForWork(a, b) {
  const rank = (t) => (t.follow_up_due ? 0 : t.awaiting_us ? 1 : 2);
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  if (ra === 0) return (b.hours_since_our_message || 0) - (a.hours_since_our_message || 0);
  return String(b.last_message_at || "").localeCompare(String(a.last_message_at || ""));
}

const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);

export function stats(threads) {
  const out = threads.filter((t) => t.origin === "outbound");
  const inb = threads.filter((t) => t.origin === "inbound");
  const seenKnown = out.filter((t) => t.seen_at).length;
  const outReplied = out.filter((t) => t.replied).length;
  const booked = threads.filter((t) => t.outcome === "booked" || t.outcome === "closed").length;
  const closed = threads.filter((t) => t.outcome === "closed").length;
  return {
    outbound: {
      dms_sent: out.length,
      messages_sent: out.reduce((n, t) => n + t.our_messages, 0),
      replies: outReplied,
      reply_rate: pct(outReplied, out.length),
      positive: out.filter((t) => t.sentiment === "positive").length,
      negative: out.filter((t) => t.sentiment === "negative").length,
      ghosted: out.filter((t) => t.ghosted).length,
      ghost_rate: pct(out.filter((t) => t.ghosted).length, out.length),
      follow_ups_due: out.filter((t) => t.follow_up_due).length,
      hibernating: out.filter((t) => t.stage === "hibernating").length,
      // Seen data only exists once Meta's messaging_seen webhook reaches us.
      seen_available: seenKnown > 0,
      open_rate: seenKnown ? pct(seenKnown, out.length) : null,
      left_on_read: seenKnown ? out.filter((t) => t.left_on_read).length : null,
    },
    inbound: {
      conversations: inb.length,
      awaiting_us: inb.filter((t) => t.awaiting_us).length,
      answered: inb.filter((t) => t.our_messages > 0).length,
      positive: inb.filter((t) => t.sentiment === "positive").length,
      negative: inb.filter((t) => t.sentiment === "negative").length,
    },
    pipeline: {
      appointments_booked: booked,
      closed,
      close_rate: pct(closed, booked),
      close_rate_of_replies: pct(closed, outReplied + inb.filter((t) => t.our_messages > 0).length),
    },
  };
}

// Load every thread with its messages and tracker row, derive, sort.
export async function loadThreads(env, { q = "", now = Date.now() } = {}) {
  const like = q ? `%${str(q).toLowerCase()}%` : null;
  const conversations = (await env.DB.prepare(
    `SELECT c.id,c.participant_id,c.participant_username,c.participant_name,c.first_message_at,c.last_message_at,
            o.pfp_url,o.sentiment,o.outcome,o.hibernated_at,o.notes,o.seen_at
       FROM ig_conversations c LEFT JOIN ig_outreach o ON o.conversation_id=c.id
      WHERE (? IS NULL OR LOWER(COALESCE(c.participant_username,'')) LIKE ? OR LOWER(COALESCE(c.participant_name,'')) LIKE ?)
      ORDER BY c.last_message_at DESC LIMIT 500`,
  ).bind(like, like, like).all()).results || [];
  const messages = (await env.DB.prepare(
    "SELECT conversation_id, direction, sent_at, text FROM ig_messages ORDER BY sent_at ASC",
  ).all()).results || [];
  const byThread = new Map();
  for (const m of messages) { if (!byThread.has(m.conversation_id)) byThread.set(m.conversation_id, []); byThread.get(m.conversation_id).push(m); }
  return conversations
    .map((c) => deriveThread(c, byThread.get(c.id) || [], c, now))
    .filter((t) => t.our_messages + t.their_messages > 0)
    .sort((a,b) => String(b.last_message_at || "").localeCompare(String(a.last_message_at || "")));
}

export async function upsertOutreach(env, conversationId, patch, operatorEmail = "operator") {
  const fields = { pfp_url: undefined, sentiment: undefined, outcome: undefined, hibernated_at: undefined, notes: undefined, seen_at: undefined, seen_notified_at: undefined, reply_notified_at: undefined };
  const keys = Object.keys(fields).filter((k) => patch[k] !== undefined);
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO ig_outreach (conversation_id, operator_email, ${keys.join(", ")}${keys.length ? "," : ""} updated_at)
     VALUES (?,?,${keys.map(() => "?").join(",")}${keys.length ? "," : ""}?)
     ON CONFLICT(conversation_id) DO UPDATE SET ${keys.map((k) => `${k}=excluded.${k}`).concat("updated_at=excluded.updated_at").join(", ")}`,
  ).bind(conversationId, operatorEmail, ...keys.map((k) => patch[k]), now).run();
}

export async function logEvent(env, { conversationId, kind, handle, name, text, delivered }) {
  await env.DB.prepare(
    "INSERT INTO ig_outreach_events (conversation_id, kind, handle, name, text, created_at, delivered_at) VALUES (?,?,?,?,?,?,?)",
  ).bind(conversationId, kind, handle || null, name || null, str(text).slice(0, 300) || null, nowIso(), delivered ? nowIso() : null).run();
}
