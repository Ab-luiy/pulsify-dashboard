// Client Instagram DMs, linked to lead records (pulsify-saas #76, founder 2026-10-17).
//
// When someone messages a client's Instagram (through the Zernio inbox), we keep their Instagram
// id, username and name, one row per message for the lead's journey (never the words), and link
// them to the lead by handle, email or phone once known. A DM from someone we have not met is a
// person in the pipeline on their own (key h:<handle>); the moment their handle, email or phone
// matches a lead they are one record (lead-people.js does the matching, with the guards from #74).
//
// Needs a client Instagram connected through Zernio. Nothing here calls Zernio; the inbox job
// and webhook (workers/sync/src/jobs/zernio-inbox.js) pass events in. Tests use fixtures.
//
// The ig.me ref parameter: https://ig.me/m/<username>?ref=<value> starts a DM that Meta can tag
// with that value, which tells us which link started the conversation. One Zernio user reported
// the ref missing, and it has not been tested live (no client Instagram can connect yet), so a DM
// with no ref is normal and the conversation still links by handle, email or phone.

import { cleanId, nowIso, str } from "./common.js";
import { contactDetailsIn, normalizeHandle } from "./lead-identity.js";
import { clientAccountId } from "./follower-places.js";
import { usernameOf } from "./zernio.js";
import { recordStoryReply } from "./story-metrics.js";

const iso = (value) => {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
};

export const contactId = (client, igUserId) => `ig:${cleanId(client)}:${str(igUserId)}`;

/** A link that opens a DM and carries a tracked-link token, for use in a bio or story. Not wired to the Links tab yet. */
export function igMeLink(username, token) {
  const handle = normalizeHandle(username);
  const tag = cleanId(token);
  return handle && tag ? `https://ig.me/m/${handle}?ref=l-${tag}` : null;
}

/** The ref Meta passed with the first message, wherever Zernio puts it. Often missing. */
export function referralOf(message = {}, conversation = {}) {
  const candidates = [
    message.referral?.ref, message.ref, message.metadata?.ref, message.postback?.referral?.ref, message.payload?.ref,
    conversation.referral?.ref, conversation.ref,
  ];
  const found = candidates.map((c) => str(c)).find(Boolean);
  return found ? found.slice(0, 120) : null;
}

async function labelForRef(env, client, ref) {
  if (!ref) return null;
  const tag = /^l-(.+)$/.exec(ref);
  if (tag) {
    const link = await env.DB.prepare("SELECT label, source, placement FROM asset_links WHERE client=? AND token=?").bind(cleanId(client), tag[1]).first().catch(() => null);
    if (link) return str(link.label) || [link.source, link.placement].filter(Boolean).join(" ") || ref.slice(0, 60);
  }
  return ref.slice(0, 60);
}

/**
 * Link a contact to a lead once we know enough. Handle: exactly one lead in this client has the
 * handle. Email: the person wrote an email that belongs to a lead. Phone: kept as a hint; the
 * matching in lead-people.js joins it to a lead with the same number and holds back when the
 * details disagree.
 */
export async function linkContact(env, client, id, { text = "" } = {}) {
  const clientId = cleanId(client);
  const contact = await env.DB.prepare("SELECT * FROM ig_contacts WHERE id=?").bind(id).first();
  if (!contact) return null;
  const set = {};
  const username = normalizeHandle(contact.ig_username);
  if (!contact.lead_email && username) {
    const byHandle = (await env.DB.prepare("SELECT DISTINCT lower(email) AS email FROM leads WHERE client=? AND lower(ig_handle)=? AND email IS NOT NULL AND email<>''")
      .bind(clientId, username).all().catch(() => ({ results: [] }))).results || [];
    if (byHandle.length === 1) { set.lead_email = byHandle[0].email; set.link_source = "handle"; }
  }
  const found = contactDetailsIn(text);
  if (!set.lead_email && !contact.lead_email && found.email) {
    const known = await env.DB.prepare("SELECT 1 AS yes FROM leads WHERE client=? AND lower(email)=? LIMIT 1").bind(clientId, found.email).first().catch(() => null);
    if (known) { set.lead_email = found.email; set.link_source = "email"; }
  }
  if (!contact.lead_phone && found.phone) {
    set.lead_phone = found.phone;
    if (!set.link_source && !contact.link_source) set.link_source = "phone";
  }
  const keys = Object.keys(set);
  if (!keys.length) return { linked: false };
  await env.DB.prepare(`UPDATE ig_contacts SET ${keys.map((k) => `${k}=?`).join(", ")}, updated_at=? WHERE id=?`).bind(...keys.map((k) => set[k]), nowIso(), id).run();
  return { linked: true, ...set };
}

/**
 * A lead just gave an Instagram handle (application form or capture page): link anyone who already
 * messaged the client from that handle. Only when this is the one lead with that handle.
 */
export async function linkContactsForLead(env, client, email, handle) {
  const clientId = cleanId(client);
  const username = normalizeHandle(handle);
  const mail = String(email || "").trim().toLowerCase();
  if (!clientId || !username || !mail) return 0;
  const owners = (await env.DB.prepare("SELECT DISTINCT lower(email) AS email FROM leads WHERE client=? AND lower(ig_handle)=? AND email IS NOT NULL AND email<>''")
    .bind(clientId, username).all().catch(() => ({ results: [] }))).results || [];
  if (owners.length !== 1 || owners[0].email !== mail) return 0;
  const result = await env.DB.prepare("UPDATE ig_contacts SET lead_email=?, link_source='handle', updated_at=? WHERE client_id=? AND lower(ig_username)=? AND (lead_email IS NULL OR lead_email='')")
    .bind(mail, nowIso(), clientId, username).run().catch(() => ({ meta: { changes: 0 } }));
  return result.meta?.changes || 0;
}

/**
 * Keep one DM from a client's Instagram. Returns { stored, contact } and is safe to repeat:
 * a message id is kept once.
 */
export async function storeClientDm(env, client, conversation = {}, message = {}) {
  const clientId = cleanId(client);
  const igUserId = str(conversation.participantId);
  const messageId = str(message.platformMessageId) || str(message.id);
  const at = iso(message.sentAt || message.createdAt);
  if (!clientId || !igUserId || !messageId || !at) return { stored: false, reason: "incomplete" };
  const seen = await env.DB.prepare("SELECT 1 AS yes FROM ig_dm_events WHERE message_id=?").bind(messageId).first();
  if (seen) return { stored: false, duplicate: true, contact: contactId(clientId, igUserId) };

  const direction = message.direction === "outgoing" ? "outbound" : "inbound";
  const id = contactId(clientId, igUserId);
  const username = normalizeHandle(usernameOf(conversation));
  const rawName = str(conversation.participantName).replace(/^@/, "");
  const name = rawName && rawName.toLowerCase() !== (username || "") ? rawName.slice(0, 120) : null;
  const ref = direction === "inbound" ? referralOf(message, conversation) : null;
  const refLabel = await labelForRef(env, clientId, ref);
  const now = nowIso();

  const existing = await env.DB.prepare("SELECT * FROM ig_contacts WHERE id=?").bind(id).first();
  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO ig_contacts (id, client_id, ig_user_id, ig_username, ig_name, first_dm_at, last_dm_at, first_ref, first_ref_label, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(id, clientId, igUserId, username, name, at, at, ref, refLabel, now, now).run();
  } else {
    await env.DB.prepare(
      `UPDATE ig_contacts SET
         ig_username=COALESCE(?, ig_username), ig_name=COALESCE(?, ig_name),
         first_dm_at=CASE WHEN first_dm_at>? THEN ? ELSE first_dm_at END,
         last_dm_at=CASE WHEN last_dm_at<? THEN ? ELSE last_dm_at END,
         first_ref=COALESCE(first_ref, ?), first_ref_label=COALESCE(first_ref_label, ?), updated_at=? WHERE id=?`,
    ).bind(username, name, at, at, at, at, ref, refLabel, now, id).run();
  }
  await env.DB.prepare("INSERT OR IGNORE INTO ig_dm_events (message_id, client_id, contact_id, direction, at, ref, ref_label) VALUES (?,?,?,?,?,?,?)")
    .bind(messageId, clientId, id, direction, at, ref, refLabel).run();
  const link = direction === "inbound" ? await linkContact(env, clientId, id, { text: message.text ?? message.message ?? "" }) : null;
  // A reply to one of the client's stories also counts on that story (Instagram > Metrics).
  if (direction === "inbound") await recordStoryReply(env, clientId, id, conversation, message, at).catch(() => null);
  return { stored: true, contact: id, created: !existing, link, ref: ref || null };
}

/** The webhook, for an account that belongs to a client. Only messages are kept; reads and deletes are ignored. */
export async function handleClientEvent(env, client, payload = {}) {
  const event = str(payload.event);
  if (event !== "message.received" && event !== "message.sent") return { ok: true, client, ignored: event };
  const zc = payload.conversation || {};
  const zm = payload.message || {};
  const conversation = { ...zc, id: zc.id || zm.conversationId, participantId: zc.participantId || zm.participantId };
  const result = await storeClientDm(env, client, conversation, zm);
  return { ok: true, client, ...result };
}

/** What the Leads screen says about Instagram DMs: connected or not, and how many people are linked. */
export async function dmStatus(env, client) {
  const clientId = cleanId(client);
  const connected = Boolean(await clientAccountId(env, clientId));
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS people, SUM(CASE WHEN lead_email IS NOT NULL AND lead_email<>'' THEN 1 ELSE 0 END) AS linked,
            SUM(CASE WHEN first_ref IS NOT NULL THEN 1 ELSE 0 END) AS with_ref, MAX(last_dm_at) AS last_dm_at
       FROM ig_contacts WHERE client_id=?`,
  ).bind(clientId).first().catch(() => null);
  return {
    connected,
    people: Number(row?.people || 0),
    linked: Number(row?.linked || 0),
    with_ref: Number(row?.with_ref || 0),
    last_dm_at: row?.last_dm_at || null,
  };
}
