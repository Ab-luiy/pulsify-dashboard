import { sideEffectFailure } from "../../../../functions/_shared/side-effect-failure.js";
import { composioExecute, findRows } from "../composio.js";
import { emitEvent } from "../../../../functions/_shared/outbound-webhooks.js";
import { notifyReply } from "./outreach-notify.js";
import { zernioActive } from "./zernio-inbox.js";

const TERMINAL = new Set(["call-booked", "won", "dead"]);
const MAX_CONVERSATIONS_PER_RUN = 12;

// options.resync=true reprocesses every conversation once, used to repair rows
// written before the participant/direction fix. Bounded by MAX_CONVERSATIONS_PER_RUN
// per invocation, so a full repair takes several runs; the resync flag is kept in
// sync state until the backlog is drained.
export async function syncInstagramInbox(env, options = {}) {
  // Once Zernio is connected it owns the inbox; two writers would race on the same threads.
  if (!options.resync && await zernioActive(env)) return 0;
  const operatorEmail = env.OPERATOR_EMAIL || "operator";
  const syncState = await loadSyncState(env);
  let connectedAccountId = String(syncState.connectedAccountId || "");
  let ownUsername = String(syncState.ownUsername || "");
  // Two different ids exist for the same account: the Graph user id from
  // INSTAGRAM_GET_USER_INFO and the messaging-scoped id that appears in a
  // message's from/to. Direction must be classified against the messaging id,
  // which we learn from the first message we see carrying our own username.
  let ownId = String(syncState.messagingId || "");
  if (!connectedAccountId || !ownUsername) {
    const profile = await composioExecute(env, "INSTAGRAM_GET_USER_INFO", { ig_user_id: "me" });
    connectedAccountId = String(profile?.id || profile?.data?.id || "");
    ownUsername = String(profile?.username || profile?.data?.username || env.INSTAGRAM_USERNAME || "").replace(/^@/, "");
  }
  const resync = Boolean(options.resync || syncState.resync);
  const conversationsPayload = await composioExecute(env, "INSTAGRAM_LIST_ALL_CONVERSATIONS", {
    platform: "instagram",
    fields: "id,updated_time,participants,messages",
    limit: 100,
  });
  const conversations = findRows(conversationsPayload);
  const known = await loadKnownConversations(env);
  const watermark = conversations.reduce((latest, row) => {
    const value = String(row.updated_time || "");
    return value > latest ? value : latest;
  }, syncState.watermark || "");
  // Compare each remote conversation with its durable row. The original
  // watermark-only bootstrap retried all history whenever a Worker invocation
  // ended before saveSyncState(), eventually exhausting the subrequest limit.
  const pending = conversations.filter((row) => {
    const id = String(row.id || row.conversation_id || "");
    if (!id) return false;
    if (resync) return !(syncState.resyncDone || []).includes(id);
    const previous = known.get(id);
    if (!previous) return true;
    const updated = comparableTime(row.updated_time);
    return Boolean(updated && updated > previous);
  });
  const changed = pending.slice(0, MAX_CONVERSATIONS_PER_RUN);
  if (!changed.length) {
    if (resync || !syncState.messagingId || !syncState.watermark || syncState.watermark !== watermark) {
      await saveSyncState(env, { messagingId: ownId, ownUsername, connectedAccountId, watermark, resync: false, resyncDone: [] });
    }
    return 0;
  }
  const resyncDone = resync ? [...(syncState.resyncDone || [])] : [];
  const historicalBootstrap = !syncState.watermark;
  let written = 0;

  for (const rawConversation of changed) {
    const conversationId = String(rawConversation.id || rawConversation.conversation_id || "");
    if (!conversationId) continue;
    let messages = findRows(rawConversation.messages);
    // The list call returns message stubs (id, created_time) with no sender.
    // Without from/to every message classifies as inbound and the thread has
    // no handle, so fetch the full messages whenever the stubs lack a sender.
    if (!messages.length || !messages.some((message) => message?.from || message?.from_ || message?.to || message?.to_)) {
      const payload = await executeMessages(env, conversationId);
      messages = findRows(payload);
    }
    if (!ownId) ownId = learnOwnId(messages, ownUsername);
    const normalized = messages.map((message) => normalizeMessage(message, ownId)).filter(Boolean)
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    if (!normalized.length) continue;
    if (resync) resyncDone.push(conversationId);

    const participant = findParticipant(rawConversation, ownId, normalized);
    const now = new Date().toISOString();
    const firstMessageAt = normalized[0].sentAt;
    const last = normalized.at(-1);
    await env.DB.prepare(
      `INSERT INTO ig_conversations(
         id,operator_email,connected_account_id,participant_id,participant_username,
         participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at
       ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         participant_id=excluded.participant_id,
         participant_username=excluded.participant_username,
         participant_name=excluded.participant_name,
         first_message_at=COALESCE(ig_conversations.first_message_at,excluded.first_message_at),
         last_message_at=excluded.last_message_at,
         last_direction=excluded.last_direction,
         payload_json=excluded.payload_json,
         updated_at=excluded.updated_at`,
    ).bind(
      conversationId,
      operatorEmail,
      connectedAccountId,
      participant.id,
      participant.username,
      participant.name,
      firstMessageAt,
      last.sentAt,
      last.direction,
      JSON.stringify(rawConversation),
      now,
      now,
    ).run();

    const inserts = normalized.map((message) => env.DB.prepare(
        `INSERT INTO ig_messages(
           id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at
         ) VALUES(?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET direction=excluded.direction, text=COALESCE(excluded.text, ig_messages.text), payload_json=excluded.payload_json`,
      ).bind(
        message.id,
        conversationId,
        operatorEmail,
        message.direction,
        message.sentAt,
        message.text,
        JSON.stringify(message.raw),
        now,
      ));
    const knownMessages = await loadKnownMessages(env, conversationId);
    const results = inserts.length ? await env.DB.batch(inserts) : [];
    for (let index = 0; index < normalized.length; index += 1) {
      const message = normalized[index];
      const result = results[index];
      // The upsert reports a change for repaired rows too. Only messages we had
      // not stored before count as written and fan out as events.
      const inserted = Number(result.meta?.changes || 0) && !knownMessages.has(message.id) ? 1 : 0;
      written += inserted;
      if (inserted && !historicalBootstrap && !resync && message.direction === "inbound" && message === normalized.at(-1)) {
        await notifyReply(env, { conversationId, handle: participant.username, name: participant.name, text: message.text, messageId: message.id }).catch(() => sideEffectFailure(env, "instagram_inbox_operation_1"));
      }
      if (inserted && !historicalBootstrap && !resync) await emitEvent(env, { scope: "operator", event: "conversation.new_message", data: { message_id: message.id, conversation_id: conversationId, handle: participant.username || participant.id, direction: message.direction, text: message.text, ts: message.sentAt, source: "instagram" } }).catch(() => sideEffectFailure(env, "instagram_inbox_operation_2"));
    }
    await projectConversationToCrm(env, participant, conversationId, normalized, !historicalBootstrap);
  }
  const drained = pending.length <= changed.length;
  await saveSyncState(env, {
    messagingId: ownId,
    ownUsername,
    connectedAccountId,
    watermark: drained ? watermark : syncState.watermark,
    resync: resync && !drained,
    resyncDone: resync && !drained ? resyncDone : [],
  });
  return written;
}

async function loadKnownMessages(env, conversationId) {
  try {
    const rows = await env.DB.prepare("SELECT id FROM ig_messages WHERE conversation_id=?").bind(conversationId).all();
    return new Set((rows.results || []).map((row) => row.id));
  } catch {
    return new Set();
  }
}

// The messaging-scoped id for our own account is whichever from/to entry
// carries our username. Learned once and kept in sync state.
export function learnOwnId(messages, ownUsername) {
  if (!ownUsername) return "";
  for (const message of messages) {
    const from = message?.from || message?.from_ || {};
    if (String(from.username || "").replace(/^@/, "") === ownUsername) return String(from.id || "");
    const to = findRows(message?.to || message?.to_);
    const hit = to.find((item) => String(item?.username || "").replace(/^@/, "") === ownUsername);
    if (hit) return String(hit.id || "");
  }
  return "";
}

async function loadKnownConversations(env) {
  const rows = await env.DB.prepare(
    "SELECT id,COALESCE(json_extract(payload_json,'$.updated_time'),last_message_at) AS remote_updated_at FROM ig_conversations",
  ).all();
  return new Map((rows.results || []).map((row) => [String(row.id), comparableTime(row.remote_updated_at)]));
}

function comparableTime(value) {
  const ms = Date.parse(String(value || ""));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : "";
}

async function loadSyncState(env) {
  const row = await env.DB.prepare(
    "SELECT payload_json FROM snapshots WHERE scope='operator' AND client_id='' AND source='instagram' AND kind='inbox-sync-state'",
  ).first().catch(() => sideEffectFailure(env, "instagram_inbox_operation_3"));
  try { return JSON.parse(row?.payload_json || "{}"); } catch { return {}; }
}

async function saveSyncState(env, state) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO snapshots(scope,client_id,source,kind,captured_at,payload_json)
     VALUES('operator','','instagram','inbox-sync-state',?,?)
     ON CONFLICT(scope,client_id,source,kind) DO UPDATE SET
       captured_at=excluded.captured_at,payload_json=excluded.payload_json`,
  ).bind(now, JSON.stringify(state)).run();
}

async function executeMessages(env, conversationId) {
  try {
    return await composioExecute(env, "INSTAGRAM_LIST_ALL_MESSAGES", {
      conversation_id: conversationId,
      fields: "id,created_time,from,to,message",
      limit: 100,
    });
  } catch (firstError) {
    try {
      return await composioExecute(env, "INSTAGRAM_LIST_ALL_MESSAGES", {
        id: conversationId,
        fields: "id,created_time,from,to,message",
        limit: 100,
      });
    } catch {
      throw firstError;
    }
  }
}

function normalizeMessage(raw, ownId) {
  const id = String(raw?.id || raw?.message_id || "");
  const sentAt = String(raw?.created_time || raw?.timestamp || raw?.sent_at || "");
  if (!id || !sentAt || Number.isNaN(Date.parse(sentAt))) return null;
  const sender = raw?.from || raw?.from_ || raw?.sender || {};
  const senderId = String(sender?.id || raw?.from_id || raw?.sender_id || "");
  return {
    id,
    sentAt: new Date(sentAt).toISOString(),
    direction: ownId && senderId === ownId ? "outbound" : "inbound",
    text: String(raw?.message || raw?.text || "") || null,
    senderId,
    senderName: String(sender?.username || sender?.name || ""),
    raw,
  };
}

export function findParticipant(conversation, ownId, messages) {
  const participants = findRows(conversation?.participants);
  const row = participants.find((item) => String(item?.id || "") && String(item?.id || "") !== ownId) || {};
  const inbound = messages.find((message) => message.direction === "inbound" && message.senderId);
  // Outbound-only threads: the other party is the recipient of our message.
  const recipient = messages.map((message) => findRows(message.raw?.to || message.raw?.to_).find((item) => String(item?.id || "") && String(item?.id || "") !== ownId)).find(Boolean) || {};
  const id = String(row.id || inbound?.senderId || recipient.id || "");
  const username = String(row.username || row.handle || inbound?.senderName || recipient.username || "").replace(/^@/, "");
  const name = String(row.name || recipient.name || username || id || "Instagram lead");
  return { id, username, name };
}

async function projectConversationToCrm(env, participant, conversationId, messages, shouldEmit = true) {
  const outbound = messages.filter((message) => message.direction === "outbound");
  if (!outbound.length) return;
  const name = participant.username || participant.name || participant.id;
  if (!name) return;
  const existing = await env.DB.prepare(
    "SELECT data FROM crm_overrides WHERE name=?",
  ).bind(name).first().catch(() => sideEffectFailure(env, "instagram_inbox_operation_4"));
  let current = {};
  try { current = JSON.parse(existing?.data || "{}"); } catch { current = {}; }
  if (TERMINAL.has(current.status)) return;

  const hasInbound = messages.some((message) => message.direction === "inbound");
  const outboundDays = new Set(outbound.map((message) => message.sentAt.slice(0, 10))).size;
  const status = hasInbound ? "replied" : outboundDays > 1 ? "follow-up" : "sent";
  const ts = Date.now();
  const now = new Date(ts).toISOString();
  const added = {
    n: participant.name || name,
    h: participant.username || name,
    niche: "",
    dms: messages.length,
    stage: "new-lead",
    src: "instagram",
    igConversationId: conversationId,
    _ts: ts,
  };
  const statements = [];
  statements.push(env.DB.prepare(
    `INSERT OR IGNORE INTO crm_added(name,data,ts,sts,updated_at) VALUES(?,?,?,?,?)`,
  ).bind(name, JSON.stringify(added), ts, ts, now));
  if (current.status !== status) {
    const next = { ...current, status, igConversationId: conversationId, _ts: ts };
    statements.push(env.DB.prepare(
      `INSERT INTO crm_overrides(name,data,ts,sts,updated_at) VALUES(?,?,?,?,?)
       ON CONFLICT(name) DO UPDATE SET
         data=excluded.data,ts=excluded.ts,sts=excluded.sts,updated_at=excluded.updated_at
       WHERE excluded.ts > crm_overrides.ts`,
    ).bind(name, JSON.stringify(next), ts, ts, now));
  }
  const results = await env.DB.batch(statements);
  if (shouldEmit && Number(results?.[0]?.meta?.changes || 0)) {
    await emitEvent(env, { scope: "operator", event: "lead.created", data: { name: participant.name || name, handle: participant.username || name, source: "instagram", conversation_id: conversationId } }).catch(() => sideEffectFailure(env, "instagram_inbox_operation_5"));
  }
}
