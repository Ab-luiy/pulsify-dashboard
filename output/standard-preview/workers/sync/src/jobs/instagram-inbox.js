import { composioExecute, findRows } from "../composio.js";

const TERMINAL = new Set(["call-booked", "won", "dead"]);

export async function syncInstagramInbox(env) {
  const operatorEmail = env.OPERATOR_EMAIL || "operator";
  const profile = await composioExecute(env, "INSTAGRAM_GET_USER_INFO", { ig_user_id: "me" });
  const ownId = String(profile?.id || profile?.data?.id || "");
  const connectedAccountId = String(profile?.id || "");
  const conversationsPayload = await composioExecute(env, "INSTAGRAM_LIST_ALL_CONVERSATIONS", {
    platform: "instagram",
    fields: "id,updated_time,participants,messages",
    limit: 100,
  });
  const conversations = findRows(conversationsPayload);
  let written = 0;

  for (const rawConversation of conversations) {
    const conversationId = String(rawConversation.id || rawConversation.conversation_id || "");
    if (!conversationId) continue;
    let messages = findRows(rawConversation.messages);
    if (!messages.length) {
      const payload = await executeMessages(env, conversationId);
      messages = findRows(payload);
    }
    const normalized = messages.map((message) => normalizeMessage(message, ownId)).filter(Boolean)
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    if (!normalized.length) continue;

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

    for (const message of normalized) {
      const result = await env.DB.prepare(
        `INSERT OR IGNORE INTO ig_messages(
           id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at
         ) VALUES(?,?,?,?,?,?,?,?)`,
      ).bind(
        message.id,
        conversationId,
        operatorEmail,
        message.direction,
        message.sentAt,
        message.text,
        JSON.stringify(message.raw),
        now,
      ).run();
      written += Number(result.meta?.changes || 0);
    }
    await projectConversationToCrm(env, participant, conversationId, normalized);
  }
  return written;
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
  const sender = raw?.from || raw?.sender || {};
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

function findParticipant(conversation, ownId, messages) {
  const participants = findRows(conversation?.participants);
  const row = participants.find((item) => String(item?.id || "") !== ownId) || {};
  const inbound = messages.find((message) => message.direction === "inbound");
  const id = String(row.id || inbound?.senderId || "");
  const username = String(row.username || row.handle || inbound?.senderName || "").replace(/^@/, "");
  const name = String(row.name || username || id || "Instagram lead");
  return { id, username, name };
}

async function projectConversationToCrm(env, participant, conversationId, messages) {
  const outbound = messages.filter((message) => message.direction === "outbound");
  if (!outbound.length) return;
  const name = participant.username || participant.name || participant.id;
  if (!name) return;
  const existing = await env.DB.prepare(
    "SELECT data FROM crm_overrides WHERE name=?",
  ).bind(name).first().catch(() => null);
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
  await env.DB.batch(statements);
}
