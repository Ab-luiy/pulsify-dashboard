import { sideEffectFailure } from "../../../../functions/_shared/side-effect-failure.js";
// Zernio inbox: webhook handler (real time) plus a sweep (every minute, catches
// anything a webhook missed and pulls read receipts). Writes into the same
// ig_conversations / ig_messages / ig_outreach rows the tracker reads.
import { markSeen, refreshIdentity, resolveConversationId, storeMessage, zernioConfigured, zernioConnection, zernioFetch } from "../../../../functions/_shared/zernio.js";
import { nowIso, str } from "../../../../functions/_shared/common.js";
import { emitEvent } from "../../../../functions/_shared/outbound-webhooks.js";
import { notifyReply } from "./outreach-notify.js";
import { pushOperator } from "../../../../functions/_shared/realtime.js";

// Free plan allows 60 requests a minute; one list call plus one messages call
// per changed conversation keeps a sweep well inside that.
const MAX_CONVERSATIONS_PER_SWEEP = 15;
const LOCK_MINUTES = 4;

export async function zernioActive(env) {
  if (!zernioConfigured(env)) return false;
  const c = await zernioConnection(env).catch(() => ({ connected: false }));
  return Boolean(c.connected);
}

// ---- webhook ----
export async function handleZernioEvent(env, payload, eventId) {
  const id = str(eventId || payload?.id);
  if (id) {
    const seen = await env.DB.prepare("SELECT id FROM zernio_events WHERE id=?").bind(id).first();
    if (seen) return { ok: true, duplicate: true };

  }
  const result = await processZernioEvent(env, payload);
  if (id) await env.DB.prepare("INSERT OR IGNORE INTO zernio_events(id,event,received_at) VALUES(?,?,?)").bind(id, str(payload?.event), nowIso()).run();
  return result;
}

async function processZernioEvent(env, payload) {
  const operatorEmail = env.OPERATOR_EMAIL || "operator";
  const event = str(payload?.event);
  const zc = payload?.conversation || {};
  const zm = payload?.message || {};
  if (!zc.id && !zm.conversationId) return { ok: true, ignored: event };
  const conversationId = await resolveConversationId(env, { ...zc, id: zc.id || zm.conversationId, accountId: payload?.account?.accountId || payload?.account?.id }, operatorEmail);
  await refreshIdentity(env, conversationId, zc);

  if (event === "message.received" || event === "message.sent") {
    const isNew = await storeMessage(env, conversationId, zm, operatorEmail);
    if (isNew && event === "message.received") {
      const row = await env.DB.prepare("SELECT participant_username AS handle, participant_name AS name FROM ig_conversations WHERE id=?").bind(conversationId).first();
      await notifyReply(env, { conversationId, handle: row?.handle || zc.participantUsername, name: row?.name || zc.participantName, text: zm.text, messageId: zm.platformMessageId || zm.id }).catch(() => sideEffectFailure(env, "zernio_inbox_operation_2"));
      await emitEvent(env, { scope: "operator", event: "conversation.new_message", data: { message_id: zm.platformMessageId || zm.id, conversation_id: conversationId, handle: row?.handle || "", name: row?.name || "", direction: "inbound", text: zm.text, ts: zm.sentAt, source: "instagram" } }).catch(() => sideEffectFailure(env, "zernio_inbox_operation_3"));
    }
    if (isNew) await pushOperator(env, "tracker.changed", { conversation_id: conversationId, reason: event === "message.received" ? "reply" : "sent" });
    return { ok: true, conversationId, stored: isNew };
  }
  if (event === "message.read") {
    const at = str(payload?.statusAt || payload?.timestamp) || nowIso();
    const changed = await markSeen(env, conversationId, new Date(at).toISOString());
    if (changed) await pushOperator(env, "tracker.changed", { conversation_id: conversationId, reason: "seen" });
    return { ok: true, conversationId, seen: changed };
  }
  if (event === "message.deleted") {
    const mid = str(zm.platformMessageId) || str(zm.id);
    await env.DB.prepare("UPDATE ig_messages SET text=COALESCE(text,'') || ' (unsent)' WHERE id=? AND text NOT LIKE '%(unsent)'").bind(mid).run();
    return { ok: true, conversationId, deleted: mid };
  }
  return { ok: true, conversationId, ignored: event };
}

// ---- sweep ----
// Lists conversations newest first, pulls messages for any whose updatedTime
// moved since we last saw it. Read receipts ride on outgoing messages (readAt).
export async function syncZernioInbox(env, { fetcher = fetch } = {}) {
  if (!(await zernioActive(env))) return 0;
  // One sweep at a time: a long replay must not overlap the next cron minute.
  const running = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM sync_runs WHERE job='zernio-inbox' AND status='running' AND started_at>? AND started_at<?",
  ).bind(new Date(Date.now() - LOCK_MINUTES * 60000).toISOString(), new Date(Date.now() - 5000).toISOString()).first().catch(() => ({ n: 0 }));
  if (Number(running?.n || 0) > 0) return 0;
  const operatorEmail = env.OPERATOR_EMAIL || "operator";
  const known = new Map(((await env.DB.prepare("SELECT zernio_id, updated_time FROM zernio_conversation_map").all()).results || []).map((r) => [r.zernio_id, r.updated_time || ""]));
  let written = 0, processed = 0, cursor = "";
  for (let page = 0; page < 5 && processed < MAX_CONVERSATIONS_PER_SWEEP; page += 1) {
    const qs = new URLSearchParams({ platform: "instagram", limit: "100", sortOrder: "desc" });
    if (cursor) qs.set("cursor", cursor);
    const list = await zernioFetch(env, `/v1/inbox/conversations?${qs}`, {}, fetcher);
    const rows = list.data || [];
    // Unchanged conversations are skipped before any per-thread request is made.
    for (const zc of rows) {
      if (processed >= MAX_CONVERSATIONS_PER_SWEEP) break;
      const prior = known.get(String(zc.id));
      if (prior !== undefined && prior && String(zc.updatedTime || "") <= prior) continue;
      processed += 1;
      const conversationId = await resolveConversationId(env, zc, operatorEmail);
      await refreshIdentity(env, conversationId, zc);
      const msgs = await zernioFetch(env, `/v1/inbox/conversations/${encodeURIComponent(zc.id)}/messages?accountId=${encodeURIComponent(zc.accountId)}&limit=100&sortOrder=desc`, {}, fetcher);
      if (!Array.isArray(msgs.messages)) throw new Error("Zernio messages response is incomplete");
      let added = 0;
      for (const zm of (msgs.messages || []).slice().reverse()) {
        if (await storeMessage(env, conversationId, zm, operatorEmail)) added += 1;
      }
      written += added;
      if (added) await pushOperator(env, "tracker.changed", { conversation_id: conversationId, reason: "sync" });
      await env.DB.prepare("UPDATE zernio_conversation_map SET updated_time=?, synced_at=? WHERE zernio_id=?").bind(str(zc.updatedTime) || null, nowIso(), String(zc.id)).run();
    }
    if (!list.pagination?.hasMore || !list.pagination?.nextCursor) break;
    cursor = list.pagination.nextCursor;
  }
  return written;
}
