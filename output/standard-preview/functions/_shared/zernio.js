// Zernio bridge: the Instagram inbox through an already-approved Meta app.
// Gives us what Composio polling cannot: read receipts (message.read),
// profile pictures, follower context and real-time webhooks.
// Docs: https://docs.zernio.com (OpenAPI at https://zernio.com/openapi.json).
// Shared by the Pages API (connect, status) and the Worker (webhook, sync).
import { nowIso, str } from "./common.js";
import { getIntegration, upsertIntegration } from "./integrations.js";
import { upsertOutreach } from "./outreach.js";

export const ZERNIO_BASE = "https://zernio.com/api";
export const WEBHOOK_EVENTS = ["message.received", "message.sent", "message.read", "message.deleted", "conversation.started"];

export function zernioConfigured(env) {
  return Boolean(env?.ZERNIO_API_KEY);
}

export async function zernioFetch(env, path, init = {}, fetcher = fetch) {
  if (!env.ZERNIO_API_KEY) throw new Error("ZERNIO_API_KEY is not set");
  const r = await fetcher(`${ZERNIO_BASE}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${env.ZERNIO_API_KEY}`, "content-type": "application/json", ...(init.headers || {}) },
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`zernio ${init.method || "GET"} ${path} -> ${r.status}: ${body.error || body.message || body.code || "error"}`);
  return body;
}

// One profile holds the operator's accounts. Reuse the default one.
export async function ensureProfile(env, fetcher = fetch) {
  const listed = await zernioFetch(env, "/v1/profiles?limit=50", {}, fetcher);
  const profiles = listed.profiles || [];
  const pick = profiles.find((p) => p.name === "Pulsify") || profiles.find((p) => p.isDefault) || profiles[0];
  if (pick) return pick._id;
  const created = await zernioFetch(env, "/v1/profiles", { method: "POST", body: JSON.stringify({ name: "Pulsify", description: "Pulsify operator accounts" }) }, fetcher);
  return created._id || created.profile?._id || created.id;
}

// Hosted OAuth: Zernio returns the URL the operator opens to log into Instagram.
export async function connectUrl(env, { redirectUrl, profileId, platform = "instagram", fetcher = fetch } = {}) {
  if (!profileId) profileId = await ensureProfile(env, fetcher);
  const qs = new URLSearchParams({ profileId, redirect_url: redirectUrl });
  if (platform === "instagram") qs.set("loginMethod", "instagram_login");
  const r = await zernioFetch(env, `/v1/connect/${encodeURIComponent(platform)}?${qs}`, {}, fetcher);
  return { authUrl: r.authUrl, profileId };
}

export async function listAccounts(env, fetcher = fetch) {
  const r = await zernioFetch(env, "/v1/accounts?platform=instagram&page=1&limit=50", {}, fetcher);
  return (r.accounts || []).map((a) => ({ id: a._id, username: a.username, displayName: a.displayName, profilePicture: a.profilePicture, followersCount: a.followersCount, isActive: a.isActive, needsReconnection: a.needsReconnection }));
}

// Register (or find) our webhook subscription. Secret is ours; Zernio signs
// every delivery with HMAC-SHA256 hex of the raw body under X-Zernio-Signature.
export async function ensureWebhook(env, { url, secret, fetcher = fetch }) {
  const existing = (await zernioFetch(env, "/v1/webhooks/settings", {}, fetcher)).webhooks || [];
  const mine = existing.find((w) => String(w.url || "").replace(/\/$/, "") === url.replace(/\/$/, ""));
  if (mine) {
    const missing = WEBHOOK_EVENTS.filter((e) => !(mine.events || []).includes(e));
    if (missing.length || mine.isActive === false) {
      await zernioFetch(env, "/v1/webhooks/settings", { method: "PUT", body: JSON.stringify({ webhookId: mine._id || mine.id, events: [...new Set([...(mine.events || []), ...WEBHOOK_EVENTS])], isActive: true, secret }) }, fetcher).catch(() => null);
    }
    return mine._id || mine.id;
  }
  const created = await zernioFetch(env, "/v1/webhooks/settings", { method: "POST", body: JSON.stringify({ name: "pulsify-sync", url, secret, events: WEBHOOK_EVENTS, isActive: true }) }, fetcher);
  return created.webhook?._id || created.webhook?.id || created.id;
}

// Save the connected account on the operator integration record.
export async function recordConnection(env, { accountId, username, profileId, webhookId }) {
  return upsertIntegration(env, {
    scope: "operator",
    client: "",
    provider: "zernio",
    config: { account_id: accountId, username, profile_id: profileId, webhook_id: webhookId, connected_at: nowIso() },
    secrets: {},
  });
}

export async function zernioConnection(env) {
  const record = await getIntegration(env, "operator", "", "zernio").catch(() => null);
  const config = record?.config || {};
  return { connected: Boolean(config.account_id), ...config };
}

// ---- mapping into the tables the tracker reads ----

const RESERVED = new Set(["direct", "p", "reel", "reels", "stories", "explore", "accounts", "www"]);
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;
export function usernameFromUrl(url) {
  const m = /instagram\.com\/([A-Za-z0-9._]+)/.exec(String(url || ""));
  return m && !RESERVED.has(m[1].toLowerCase()) ? m[1] : "";
}
// Zernio puts the Instagram handle in participantName and links to the /direct
// thread, so the name is the handle when it looks like one.
export function usernameOf(zc) {
  const explicit = String(zc.participantUsername || "").replace(/^@/, "");
  if (explicit) return explicit;
  const fromUrl = usernameFromUrl(zc.url);
  if (fromUrl) return fromUrl;
  const name = String(zc.participantName || "").replace(/^@/, "");
  return HANDLE.test(name) && !name.includes(" ") ? name : "";
}
export function pictureOf(zc) {
  return String(zc.participantPicture || zc.participantPictureUrl || zc.participantAvatar || zc.profilePicture || zc.avatar || "");
}

// Find or create the ig_conversations row for a Zernio conversation. Match
// by participant id first so Composio-era threads merge instead of duplicating.
export async function resolveConversationId(env, zc, operatorEmail) {
  const zid = str(zc.id);
  const mapped = await env.DB.prepare("SELECT conversation_id FROM zernio_conversation_map WHERE zernio_id=?").bind(zid).first();
  if (mapped) return mapped.conversation_id;
  const participantId = str(zc.participantId);
  let conversationId = null;
  if (participantId) {
    const byParticipant = await env.DB.prepare("SELECT id FROM ig_conversations WHERE participant_id=? ORDER BY last_message_at DESC LIMIT 1").bind(participantId).first();
    if (byParticipant) conversationId = byParticipant.id;
  }
  if (!conversationId) {
    conversationId = `z:${zid}`;
    const now = nowIso();
    await env.DB.prepare(
      `INSERT OR IGNORE INTO ig_conversations(id,operator_email,connected_account_id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction,payload_json,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(conversationId, operatorEmail, str(zc.accountId), participantId, usernameOf(zc), str(zc.participantName) || usernameOf(zc) || "Instagram lead", str(zc.updatedTime) || now, str(zc.updatedTime) || now, "inbound", JSON.stringify({ zernio: zid }), now, now).run();
  }
  await env.DB.prepare(
    "INSERT INTO zernio_conversation_map(zernio_id,conversation_id,account_id,updated_time,synced_at) VALUES(?,?,?,?,?) ON CONFLICT(zernio_id) DO UPDATE SET conversation_id=excluded.conversation_id,account_id=excluded.account_id,synced_at=excluded.synced_at",
  ).bind(zid, conversationId, str(zc.accountId), null, nowIso()).run();
  return conversationId;
}

// Refresh identity fields Zernio knows better than we do: handle, name, picture.
export async function refreshIdentity(env, conversationId, zc) {
  const username = usernameOf(zc);
  const name = str(zc.participantName);
  await env.DB.prepare(
    `UPDATE ig_conversations SET
       participant_username=CASE WHEN ?<>'' THEN ? ELSE participant_username END,
       participant_name=CASE WHEN ?<>'' THEN ? ELSE participant_name END,
       participant_id=CASE WHEN participant_id='' THEN ? ELSE participant_id END,
       updated_at=? WHERE id=?`,
  ).bind(username, username, name, name, str(zc.participantId), nowIso(), conversationId).run();
  const picture = pictureOf(zc);
  if (picture) await upsertOutreach(env, conversationId, { pfp_url: picture });
}

// Store one Zernio message. Returns true when it was new.
export async function storeMessage(env, conversationId, zm, operatorEmail) {
  // Zernio's message id is the platform's own id (Graph mid on Instagram), so it
  // matches what the Composio path stored; only fall back to a prefixed id if
  // neither looks usable.
  const id = str(zm.platformMessageId) || str(zm.id) || "";
  if (!id) return false;
  const direction = zm.direction === "outgoing" ? "outbound" : "inbound";
  const sentAt = str(zm.sentAt || zm.createdAt);
  if (!sentAt) return false;
  const text = zm.text ?? zm.message ?? null;
  const known = await env.DB.prepare("SELECT id FROM ig_messages WHERE id=?").bind(id).first();
  await env.DB.prepare(
    `INSERT INTO ig_messages(id,conversation_id,operator_email,direction,sent_at,text,payload_json,created_at)
     VALUES(?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET direction=excluded.direction, text=COALESCE(excluded.text, ig_messages.text), payload_json=excluded.payload_json`,
  ).bind(id, conversationId, operatorEmail, direction, new Date(sentAt).toISOString(), text ? String(text) : null, JSON.stringify(zm), nowIso()).run();
  await env.DB.prepare(
    `UPDATE ig_conversations SET
       first_message_at=CASE WHEN first_message_at IS NULL OR first_message_at>? THEN ? ELSE first_message_at END,
       last_message_at=CASE WHEN last_message_at<? THEN ? ELSE last_message_at END,
       last_direction=CASE WHEN last_message_at<=? THEN ? ELSE last_direction END,
       updated_at=? WHERE id=?`,
  ).bind(sentAt, sentAt, sentAt, sentAt, sentAt, direction, nowIso(), conversationId).run();
  // Read receipt on an outgoing message: the prospect saw it.
  if (direction === "outbound" && zm.readAt) await markSeen(env, conversationId, str(zm.readAt));
  return !known;
}

export async function markSeen(env, conversationId, at) {
  const row = await env.DB.prepare("SELECT seen_at FROM ig_outreach WHERE conversation_id=?").bind(conversationId).first().catch(() => null);
  if (row?.seen_at && row.seen_at >= at) return false;
  await upsertOutreach(env, conversationId, { seen_at: at, seen_notified_at: null });
  return true;
}

export async function verifySignature(rawBody, secret, signature) {
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = String(signature).trim().toLowerCase().replace(/^sha256=/, "");
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i += 1) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
