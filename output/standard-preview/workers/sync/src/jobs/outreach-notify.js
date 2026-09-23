import { sideEffectFailure } from "../../../../functions/_shared/side-effect-failure.js";
// Outreach notifications. Two triggers the founder asked for:
//   1. A prospect replies -> "[Name, @handle] replied: ..."
//   2. A prospect saw the message and did not reply within 5 minutes -> "[Name, @handle] seen, no reply"
// Reply detection comes from the inbox sync. Seen only exists when Meta's
// messaging_seen webhook reaches us through the Composio hook; ingestSeen
// parses it tolerantly and the sweep fires the notification after the grace.
// Delivery: the in-house bell for everything; Discord only when a lead replied.
import { notify } from "../../../../functions/_shared/notifications.js";
import { loadThreads, logEvent, stats, upsertOutreach, SEEN_GRACE_MS } from "../../../../functions/_shared/outreach.js";
import { pushOperator } from "../../../../functions/_shared/realtime.js";
import { dmPolicy } from "../../../../functions/_shared/notify-policy.js";

const display = (name, handle) => name || (handle ? `@${handle}` : "Instagram lead");

// A DM only reaches the bell when dmPolicy says so (outreach replies and
// approved prospects). The tracker log keeps every reply regardless.
export async function notifyReply(env, { conversationId, handle, name, text, messageId = "" }) {
  const policy = await dmPolicy(env, { conversationId, handle }).catch(() => ({ notify: false, origin: "inbound", reason: "policy error" }));
  let id = null;
  if (policy.notify) {
    const outreach = policy.origin === "outbound";
    id = await notify(env, {
      scope: "operator",
      kind: "lead.replied",
      severity: "success",
      title: outreach ? `${display(name, handle)} replied to your outreach` : `${display(name, handle)} sent you a DM`,
      body: String(text || "(attachment)").slice(0, 300),
      link: "outreach",
      entity: { conversation_id: conversationId, handle, name: name || "", origin: policy.origin, avatar: true },
      discord: true,
      dedupeKey: messageId ? `operator::conversation.new_message:${messageId}` : null,
    });
    await upsertOutreach(env, conversationId, { reply_notified_at: new Date().toISOString() });
  }
  await logEvent(env, { conversationId, kind: "reply", handle, name, text, delivered: Boolean(id) });
  return Boolean(id);
}

// Pull seen signals out of whatever shape the webhook relays. Meta's own
// shape is entry[].messaging[].{sender:{id},read:{mid|watermark},timestamp}.
export function extractSeen(payload) {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    const read = node.read || node.messaging_seen || node.seen;
    if (read && typeof read === "object" && (read.mid || read.watermark || read.message_id)) {
      out.push({
        senderId: String(node.sender?.id || node.from?.id || node.sender_id || ""),
        mid: String(read.mid || read.message_id || ""),
        at: node.timestamp ? new Date(Number(node.timestamp) > 1e12 ? Number(node.timestamp) : Number(node.timestamp) * 1000).toISOString() : new Date().toISOString(),
      });
    }
    for (const value of Object.values(node)) walk(value);
  };
  walk(payload);
  return out;
}

export async function ingestSeen(env, payload) {
  const signals = extractSeen(payload);
  let applied = 0;
  for (const s of signals) {
    let conversationId = null;
    if (s.mid) {
      const m = await env.DB.prepare("SELECT conversation_id FROM ig_messages WHERE id=?").bind(s.mid).first().catch(() => sideEffectFailure(env, "outreach_notify_operation_1"));
      conversationId = m?.conversation_id || null;
    }
    if (!conversationId && s.senderId) {
      const c = await env.DB.prepare("SELECT id FROM ig_conversations WHERE participant_id=? ORDER BY last_message_at DESC LIMIT 1").bind(s.senderId).first().catch(() => sideEffectFailure(env, "outreach_notify_operation_2"));
      conversationId = c?.id || null;
    }
    if (!conversationId) continue;
    await upsertOutreach(env, conversationId, { seen_at: s.at, seen_notified_at: null });
    applied += 1;
  }
  return applied;
}

// Every minute: seen at least 5 minutes ago, nothing inbound since, not yet notified.
export async function sweepSeen(env, now = Date.now()) {
  const cutoff = new Date(now - SEEN_GRACE_MS).toISOString();
  const rows = (await env.DB.prepare(
    `SELECT o.conversation_id, o.seen_at, c.participant_username AS handle, c.participant_name AS name
       FROM ig_outreach o JOIN ig_conversations c ON c.id=o.conversation_id
      WHERE o.seen_at IS NOT NULL AND o.seen_notified_at IS NULL AND o.seen_at<=?
        AND NOT EXISTS (SELECT 1 FROM ig_messages m WHERE m.conversation_id=o.conversation_id AND m.direction='inbound' AND m.sent_at>o.seen_at)`,
  ).bind(cutoff).all()).results || [];
  let sent = 0;
  for (const r of rows) {
    // Left-on-read only matters for prospects we reached out to.
    const policy = await dmPolicy(env, { conversationId: r.conversation_id, handle: r.handle }).catch(() => ({ notify: false }));
    const ok = policy.notify && policy.origin === "outbound" && Boolean(await notify(env, { scope: "operator", kind: "lead.seen", severity: "warn", title: `${display(r.name, r.handle)} saw your message and hasn't replied`, body: "Seen more than 5 minutes ago, no reply yet.", link: "outreach", entity: { conversation_id: r.conversation_id, handle: r.handle, name: r.name || "", origin: "outbound", avatar: true }, dedupeKey: `seen:${r.conversation_id}:${r.seen_at}` }));
    await upsertOutreach(env, r.conversation_id, { seen_notified_at: new Date(now).toISOString() });
    await logEvent(env, { conversationId: r.conversation_id, kind: "seen", handle: r.handle, name: r.name, text: "", delivered: ok });
    await pushOperator(env, "tracker.changed", { conversation_id: r.conversation_id, reason: "left-on-read" });
    sent += 1;
  }
  return sent;
}

// Once a day (the 05:00 UTC cron, 08:00 Istanbul): one summary of the day's
// outreach work instead of a ping per thread. Same numbers as the tracker.
export async function followUpDigest(env, now = Date.now()) {
  const threads = await loadThreads(env, { period: "recent", now });
  const outbound = stats(threads).outbound || {};
  const due = Number(outbound.follow_ups_due || 0);
  const waiting = threads.filter((t) => t.awaiting_us && t.origin === "outbound");
  if (!due && !waiting.length) return 0;
  const parts = [];
  if (due) parts.push(`${due} follow-up${due === 1 ? "" : "s"} due`);
  if (waiting.length) parts.push(`${waiting.length} repl${waiting.length === 1 ? "y" : "ies"} waiting on you`);
  const names = waiting.slice(0, 3).map((t) => t.name || `@${t.handle}`).join(", ");
  const id = await notify(env, {
    scope: "operator",
    kind: "digest",
    severity: "info",
    title: `Today: ${parts.join(", ")}`,
    body: names ? `Waiting on you: ${names}${waiting.length > 3 ? ` and ${waiting.length - 3} more` : ""}` : "Open Today to work through them.",
    link: "queue",
    entity: { follow_ups_due: due, replies_waiting: waiting.length },
    dedupeKey: `digest:${new Date(now).toISOString().slice(0, 10)}`,
  });
  return id ? 1 : 0;
}
