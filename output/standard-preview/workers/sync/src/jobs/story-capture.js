// Story capture (founder 2026-10-30, pulsify-saas Instagram > Metrics). Runs every minute.
//
// Instagram serves a story's insights only while it is up, and on Instagram Login there is no
// story webhook, so the numbers have to be read in time: every connected account's live stories
// are listed every 10 minutes, and each live frame is read every 15 minutes, every 5 in its last
// two hours. The last reading before it expires is its final number. New frames are copied to R2
// (Instagram's media links expire) and grouped into sequences; a sequence the story board
// registered takes its look, roles and ask from the registration. With what is left of the run,
// story conversations that became a back-and-forth get their label from the AI.

import { zernioConfigured, zernioConnection, zernioFetch } from "../../../../functions/_shared/zernio.js";
import { cleanId, nowIso, parseJson, str } from "../../../../functions/_shared/common.js";
import { generateText, resolveAi, aiConfigured } from "../../../../functions/_shared/ai-provider.js";
import {
  SEQUENCE_GAP_MS, frameFrom, labelPrompt, nextReadAt, parseLabel, postedOn, readingFrom, sequenceIdFor,
} from "../../../../functions/_shared/story-metrics.js";

// Zernio's free plan allows 60 requests a minute; the inbox sweep takes up to 16 every five minutes.
export const CALL_BUDGET = 20;
const SCAN_EVERY_MS = 10 * 60000;
const SCANS_PER_RUN = 4;
const MEDIA_PER_RUN = 6;
const LABELS_PER_RUN = 3;
const LABEL_LOOKBACK_MS = 30 * 86400000;
const REGISTRATION_WINDOW_MS = 72 * 3600000;
const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const READING_COLUMNS = ["views", "reach", "replies", "shares", "reposts", "follows", "profile_visits", "interactions", "navigation", "taps_forward", "taps_back", "exits", "swipes_forward"];

export async function captureStories(env, { now = Date.now(), fetcher = fetch } = {}) {
  if (!zernioConfigured(env)) return 0;
  const budget = { calls: 0, media: 0 };
  let written = 0;

  for (const account of await accountsToScan(env, now)) {
    if (budget.calls >= CALL_BUDGET / 2) break;
    budget.calls += 1;
    written += await scanAccount(env, account, { now, fetcher, budget });
  }

  const statements = [];
  const due = (await env.DB.prepare(
    "SELECT story_id, account_id, expires_at FROM story_frames WHERE final=0 AND next_read_at<=? ORDER BY next_read_at LIMIT ?",
  ).bind(new Date(now).toISOString(), Math.max(0, CALL_BUDGET - budget.calls)).all()).results || [];
  for (const frame of due) {
    const next = nextReadAt(frame.expires_at, now);
    if (!next) {
      statements.push(env.DB.prepare("UPDATE story_frames SET final=1, next_read_at=? WHERE story_id=?").bind(frame.expires_at, frame.story_id));
      continue;
    }
    budget.calls += 1;
    const result = await zernioFetch(env, `/v1/accounts/${encodeURIComponent(frame.account_id)}/instagram/stories/${encodeURIComponent(frame.story_id)}/insights`, {}, fetcher).catch(() => null);
    const reading = readingFrom(result?.data);
    if (!reading) {
      // Not served right now (or a hiccup): try again at the next slot; the earlier reading stays.
      statements.push(env.DB.prepare("UPDATE story_frames SET next_read_at=? WHERE story_id=?").bind(next, frame.story_id));
      continue;
    }
    statements.push(env.DB.prepare(
      `UPDATE story_frames SET ${READING_COLUMNS.map((c) => `${c}=COALESCE(?, ${c})`).join(", ")},
              readings=readings+1, last_read_at=?, next_read_at=? WHERE story_id=?`,
    ).bind(...READING_COLUMNS.map((c) => reading[c]), new Date(now).toISOString(), next, frame.story_id));
    written += 1;
  }
  if (statements.length) await env.DB.batch(statements);

  if (budget.calls < CALL_BUDGET) written += await labelConversations(env, { now, fetcher, limit: Math.min(LABELS_PER_RUN, CALL_BUDGET - budget.calls) });
  return written;
}

/** Client accounts (and Pulsify's own) whose live stories were last listed over 10 minutes ago, oldest first. */
async function accountsToScan(env, now) {
  const before = new Date(now - SCAN_EVERY_MS).toISOString();
  const clients = (await env.DB.prepare(
    `SELECT i.client_id AS client_id, json_extract(i.config_json, '$.account_id') AS account_id, s.scanned_at AS scanned_at
       FROM integrations i
       LEFT JOIN client_config c ON c.client = i.client_id
       LEFT JOIN story_scans s ON s.account_id = json_extract(i.config_json, '$.account_id')
      WHERE i.scope='client' AND i.provider='instagram'
        AND COALESCE(json_extract(i.config_json, '$.account_id'), '') <> ''
        AND COALESCE(c.status, '') NOT IN ('archived')
        AND (s.scanned_at IS NULL OR s.scanned_at < ?)
      ORDER BY COALESCE(s.scanned_at, '') LIMIT ?`,
  ).bind(before, SCANS_PER_RUN).all()).results || [];
  const list = clients.map((row) => ({ client_id: cleanId(row.client_id), account_id: str(row.account_id) }));
  // Pulsify's own account too (client ''): the founder's stories are where the likes check happens.
  const own = await zernioConnection(env).catch(() => null);
  if (own?.connected && own.account_id && !list.some((a) => a.account_id === own.account_id)) {
    const scanned = await env.DB.prepare("SELECT scanned_at FROM story_scans WHERE account_id=?").bind(own.account_id).first().catch(() => null);
    if (!scanned || String(scanned.scanned_at) < before) list.push({ client_id: "", account_id: String(own.account_id) });
  }
  return list.slice(0, SCANS_PER_RUN);
}

/** List one account's live stories; keep the new ones and copy any frame we have no picture of yet. */
async function scanAccount(env, account, { now, fetcher, budget }) {
  const listed = await zernioFetch(env, `/v1/accounts/${encodeURIComponent(account.account_id)}/instagram/stories`, {}, fetcher).catch(() => null);
  await env.DB.prepare(
    "INSERT INTO story_scans (account_id, client_id, scanned_at) VALUES (?,?,?) ON CONFLICT(account_id) DO UPDATE SET scanned_at=excluded.scanned_at",
  ).bind(account.account_id, account.client_id, new Date(now).toISOString()).run();
  const frames = (Array.isArray(listed?.data) ? listed.data : [])
    .map((row) => frameFrom(row, { clientId: account.client_id, accountId: account.account_id, now }))
    .filter(Boolean);
  if (!frames.length) return 0;
  const known = new Map(((await env.DB.prepare(
    `SELECT story_id, media_key FROM story_frames WHERE story_id IN (${frames.map(() => "?").join(",")})`,
  ).bind(...frames.map((f) => f.story_id)).all()).results || []).map((r) => [r.story_id, r]));

  const statements = [];
  for (const frame of frames) {
    const row = known.get(frame.story_id);
    if (row && !row.media_key && budget.media < MEDIA_PER_RUN) {
      const key = await copyFrame(env, account.client_id, frame.media_url, fetcher, budget);
      if (key) statements.push(env.DB.prepare("UPDATE story_frames SET media_key=? WHERE story_id=?").bind(key, frame.story_id));
    }
  }
  const fresh = frames.filter((f) => !known.has(f.story_id)).sort((a, b) => a.posted_at.localeCompare(b.posted_at));
  if (fresh.length) statements.push(...await placeFrames(env, account, fresh, { now, fetcher, budget }));
  if (statements.length) await env.DB.batch(statements);
  return fresh.length;
}

/** Copy a frame into R2 under the public client/UUID.image key that functions/m serves. */
async function copyFrame(env, clientId, url, fetcher, budget) {
  if (!url || !env.MEDIA) return null;
  budget.media += 1;
  try {
    const response = await fetcher(url);
    const type = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const extension = IMAGE_TYPES[type];
    if (!response.ok || !extension) return null;
    const key = `${cleanId(clientId) || "operator"}/${crypto.randomUUID()}.${extension}`;
    await env.MEDIA.put(key, await response.arrayBuffer(), { httpMetadata: { contentType: type } });
    return key;
  } catch {
    return null;
  }
}

/**
 * New frames join the sequence of the frame posted just before them when it was less than two hours
 * earlier; otherwise they start one. A new sequence takes over the story board's latest unused
 * registration from the last three days.
 */
async function placeFrames(env, account, fresh, { now, fetcher, budget }) {
  const statements = [];
  let previous = await env.DB.prepare(
    "SELECT f.story_id, f.sequence_id, f.posted_at, s.registration_id FROM story_frames f LEFT JOIN story_sequences s ON s.id = f.sequence_id WHERE f.account_id=? ORDER BY f.posted_at DESC LIMIT 1",
  ).bind(account.account_id).first();
  const counts = new Map();
  const registrations = new Map();
  const countOf = async (sequenceId) => {
    if (!counts.has(sequenceId)) {
      const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM story_frames WHERE sequence_id=?").bind(sequenceId).first();
      counts.set(sequenceId, Number(row?.n || 0));
    }
    return counts.get(sequenceId);
  };
  const registrationFrames = async (id) => {
    if (!id) return [];
    if (!registrations.has(id)) {
      const row = await env.DB.prepare("SELECT frames_json FROM story_registrations WHERE id=?").bind(id).first();
      registrations.set(id, parseJson(row?.frames_json, []));
    }
    return registrations.get(id);
  };

  for (const frame of fresh) {
    let sequenceId = previous?.sequence_id || null;
    let registrationId = previous?.registration_id || null;
    if (!sequenceId || Date.parse(frame.posted_at) - Date.parse(previous.posted_at) > SEQUENCE_GAP_MS) {
      sequenceId = sequenceIdFor(frame.story_id);
      const registration = account.client_id
        ? await env.DB.prepare(
          "SELECT * FROM story_registrations WHERE client_id=? AND used_by IS NULL AND created_at<=? AND created_at>=? ORDER BY created_at DESC LIMIT 1",
        ).bind(account.client_id, frame.posted_at, new Date(Date.parse(frame.posted_at) - REGISTRATION_WINDOW_MS).toISOString()).first()
        : null;
      registrationId = registration?.id || null;
      const stamp = nowIso();
      statements.push(env.DB.prepare(
        `INSERT OR IGNORE INTO story_sequences (id, client_id, posted_at, posted_on, look, title, source, registration_id, cta_kind, cta_label, cta_word, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).bind(
        sequenceId, account.client_id, frame.posted_at, postedOn(frame.posted_at), registration?.look || null, registration?.title || null,
        registration ? "board" : "instagram", registrationId, registration?.cta_kind || null, registration?.cta_label || null, registration?.cta_word || null, stamp, stamp,
      ));
      if (registration) {
        statements.push(env.DB.prepare("UPDATE story_registrations SET used_by=? WHERE id=?").bind(sequenceId, registration.id));
        registrations.set(registration.id, parseJson(registration.frames_json, []));
      }
      counts.set(sequenceId, 0);
    }
    const n = (await countOf(sequenceId)) + 1;
    counts.set(sequenceId, n);
    const planned = (await registrationFrames(registrationId))[n - 1] || null;
    const key = budget.media < MEDIA_PER_RUN ? await copyFrame(env, account.client_id, frame.media_url, fetcher, budget) : null;
    statements.push(env.DB.prepare(
      `INSERT OR IGNORE INTO story_frames (story_id, client_id, account_id, sequence_id, n, posted_at, expires_at, media_type, media_key, permalink,
         role, elements_json, tags_json, has_link, first_seen_at, next_read_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(
      frame.story_id, account.client_id, account.account_id, sequenceId, n, frame.posted_at, frame.expires_at, frame.media_type, key, frame.permalink,
      planned?.role || null, planned ? JSON.stringify(planned.elements || []) : null, planned ? JSON.stringify(planned.tags || []) : null, planned?.has_link ? 1 : 0,
      new Date(now).toISOString(), new Date(now).toISOString(),
    ));
    previous = { story_id: frame.story_id, sequence_id: sequenceId, posted_at: frame.posted_at, registration_id: registrationId };
  }
  return statements;
}

/**
 * Story conversations that became a back-and-forth and have no label yet: the AI reads the thread
 * once and gives one label. The words are not kept. Nothing happens when the client has no AI.
 */
export async function labelConversations(env, { now = Date.now(), fetcher = fetch, limit = LABELS_PER_RUN } = {}) {
  if (limit <= 0) return 0;
  const pending = (await env.DB.prepare(
    `SELECT r.client_id AS client_id, r.contact_id AS contact_id, f.sequence_id AS sequence_id, MIN(r.at) AS first_at,
            MAX(r.zernio_conversation_id) AS conversation_id, MAX(r.account_id) AS account_id
       FROM story_replies r JOIN story_frames f ON f.story_id = r.story_id
      WHERE f.sequence_id IS NOT NULL AND r.at >= ?
        AND NOT EXISTS (SELECT 1 FROM story_conversation_labels l WHERE l.client_id=r.client_id AND l.contact_id=r.contact_id AND l.sequence_id=f.sequence_id)
        AND EXISTS (SELECT 1 FROM ig_dm_events o WHERE o.client_id=r.client_id AND o.contact_id=r.contact_id AND o.direction='outbound' AND o.at>r.at
                      AND EXISTS (SELECT 1 FROM ig_dm_events i WHERE i.client_id=o.client_id AND i.contact_id=o.contact_id AND i.direction='inbound' AND i.at>o.at))
      GROUP BY r.client_id, r.contact_id, f.sequence_id
      ORDER BY first_at DESC LIMIT ?`,
  ).bind(new Date(now - LABEL_LOOKBACK_MS).toISOString(), limit).all()).results || [];
  let labelled = 0;
  for (const row of pending) {
    if (!row.conversation_id || !row.account_id) continue;
    const ai = await resolveAi(env, row.client_id).catch(() => null);
    if (!ai || !aiConfigured(ai)) continue;
    const thread = await zernioFetch(env, `/v1/inbox/conversations/${encodeURIComponent(row.conversation_id)}/messages?accountId=${encodeURIComponent(row.account_id)}&limit=40&sortOrder=desc`, {}, fetcher).catch(() => null);
    const lines = (Array.isArray(thread?.messages) ? thread.messages : [])
      .filter((m) => String(m.sentAt || m.createdAt || "") >= String(row.first_at))
      .reverse()
      .slice(0, 20)
      .map((m) => ({ from: m.direction === "outgoing" ? "you" : "them", text: m.text ?? m.message ?? "" }))
      .filter((line) => str(line.text));
    if (!lines.length) continue;
    const answer = await generateText(labelPrompt(lines), ai, { uncounted: true, maxOutputTokens: 400 }).catch(() => "");
    const label = parseLabel(answer);
    if (!label) continue;
    await env.DB.prepare(
      "INSERT OR IGNORE INTO story_conversation_labels (client_id, contact_id, sequence_id, label, labelled_by, labelled_at) VALUES (?,?,?,?,'ai',?)",
    ).bind(row.client_id, row.contact_id, row.sequence_id, label, nowIso()).run();
    labelled += 1;
  }
  return labelled;
}
