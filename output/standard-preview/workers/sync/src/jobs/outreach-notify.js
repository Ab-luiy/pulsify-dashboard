// Outreach notifications. Two triggers the founder asked for:
//   1. A prospect replies -> Discord "[Name, @handle] replied: ..."
//   2. A prospect saw the message and did not reply within 5 minutes -> "[Name, @handle] seen, no reply"
// Reply detection comes from the inbox sync. Seen only exists when Meta's
// messaging_seen webhook reaches us through the Composio hook; ingestSeen
// parses it tolerantly and the sweep fires the notification after the grace.
import { sendDiscordAlert } from "../../../../functions/_shared/integrations.js";
import { logEvent, upsertOutreach, SEEN_GRACE_MS } from "../../../../functions/_shared/outreach.js";

const label = (name, handle) => `[${name || handle || "Instagram lead"}${handle ? `, @${handle}` : ""}]`;

export async function notifyReply(env, { conversationId, handle, name, text }) {
  const row = await env.DB.prepare("SELECT reply_notified_at FROM ig_outreach WHERE conversation_id=?").bind(conversationId).first().catch(() => null);
  // One reply notification per reply: skip when we already told the founder about this exact moment.
  const sent = await sendDiscordAlert(env, { title: `${label(name, handle)} replied`, lines: [String(text || "(attachment)").slice(0, 300), handle ? `https://instagram.com/${handle}` : ""].filter(Boolean) }, { skipFailureLog: true });
  await upsertOutreach(env, conversationId, { reply_notified_at: new Date().toISOString() });
  await logEvent(env, { conversationId, kind: "reply", handle, name, text, delivered: sent.ok });
  return sent.ok;
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
      const m = await env.DB.prepare("SELECT conversation_id FROM ig_messages WHERE id=?").bind(s.mid).first().catch(() => null);
      conversationId = m?.conversation_id || null;
    }
    if (!conversationId && s.senderId) {
      const c = await env.DB.prepare("SELECT id FROM ig_conversations WHERE participant_id=? ORDER BY last_message_at DESC LIMIT 1").bind(s.senderId).first().catch(() => null);
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
    const ok = (await sendDiscordAlert(env, { title: `${label(r.name, r.handle)} seen your message, no reply after 5 minutes`, lines: [r.handle ? `https://instagram.com/${r.handle}` : ""].filter(Boolean) }, { skipFailureLog: true })).ok;
    await upsertOutreach(env, r.conversation_id, { seen_notified_at: new Date(now).toISOString() });
    await logEvent(env, { conversationId: r.conversation_id, kind: "seen", handle: r.handle, name: r.name, text: "", delivered: ok });
    sent += 1;
  }
  return sent;
}
