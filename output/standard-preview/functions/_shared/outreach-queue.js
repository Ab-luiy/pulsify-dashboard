// Outreach queue: the daily list of who to message next. Rows live in
// outreach_queue (migration 0035). Candidates are proposed from the CRM
// (crm_added merged with crm_overrides) and from yt_leads payloads that
// carry an Instagram handle. Sent and replied are reconciled from the
// Instagram inbox tables by handle, so the operator never has to mark a
// DM sent by hand once Zernio has synced it.
import { generateOpaqueToken, nowIso, parseJson, str } from "./common.js";
import { composeDraft, gradeDraft, needsDetail } from "./dm-draft.js";

export const SOURCES = new Set(["crm", "yt_leads", "manual"]);
export const STATUSES = new Set(["queued", "sent", "skipped", "replied"]);
export const DEFAULT_CAP = 25;
const PRIORITY_TIERS = new Set(["a", "b", "tier-1", "tier-2"]);
const HANDLE = /^[a-z0-9_.]{2,30}$/;

// Accepts "@handle", "handle", "instagram.com/handle/?x", "https://www.instagram.com/handle".
export function normalizeHandle(value) {
  let text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";
  const url = /instagram\.com\/([a-z0-9_.]{2,30})/i.exec(text);
  if (url) text = url[1];
  text = text.replace(/^@+/, "").replace(/[/?#].*$/, "").replace(/\.+$/, "");
  return HANDLE.test(text) ? text : "";
}

// yt_leads payloads carry the handle under `ig` (sync worker and dashboard
// backfill) and sometimes only as an instagram.com URL inside `links`.
// The other keys are checked defensively in case a future scraper differs.
export function extractInstagramHandle(payload) {
  if (!payload || typeof payload !== "object") return "";
  const direct = [payload.instagram, payload.ig, payload.ig_handle, payload.igHandle, payload.handle, payload.socials?.instagram, payload.social?.instagram];
  for (const value of direct) {
    if (typeof value !== "string") continue;
    const handle = normalizeHandle(value);
    if (handle) return handle;
  }
  const links = Array.isArray(payload.links) ? payload.links : [];
  for (const link of links) {
    if (typeof link !== "string" || !/instagram\.com\//i.test(link)) continue;
    const handle = normalizeHandle(link);
    if (handle) return handle;
  }
  return "";
}

export function isPriorityTier(tier) {
  return PRIORITY_TIERS.has(String(tier || "").trim().toLowerCase());
}

const all = async (env, sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results || [];

async function queuedHandles(env) {
  return new Set((await all(env, "SELECT handle FROM outreach_queue")).map((r) => r.handle));
}

async function threadHandles(env) {
  const rows = await all(env, "SELECT DISTINCT LOWER(participant_username) AS handle FROM ig_conversations WHERE participant_username IS NOT NULL AND participant_username<>''");
  return new Set(rows.map((r) => normalizeHandle(r.handle)).filter(Boolean));
}

// Handles not yet queued and not yet in a thread. CRM new-leads first, then
// yt_leads with a handle (tier A/B ahead of the rest, by score inside).
export async function candidates(env, { limit = 50 } = {}) {
  const taken = await queuedHandles(env);
  const threads = await threadHandles(env);
  const seen = new Set();
  const out = [];
  const consider = (candidate) => {
    if (!candidate.handle || seen.has(candidate.handle) || taken.has(candidate.handle) || threads.has(candidate.handle)) return;
    seen.add(candidate.handle);
    out.push(candidate);
  };

  const added = await all(env, "SELECT name, data FROM crm_added").catch(() => []);
  const overrides = new Map((await all(env, "SELECT name, data FROM crm_overrides").catch(() => [])).map((r) => [r.name, parseJson(r.data, {})]));
  const removed = new Set((await all(env, "SELECT name FROM crm_removed").catch(() => [])).map((r) => r.name));
  for (const row of added) {
    if (removed.has(row.name)) continue;
    const base = parseJson(row.data, {});
    const data = { ...base, ...(overrides.get(row.name) || {}) };
    const stage = str(data.status || data.stage).toLowerCase();
    if (stage && stage !== "new-lead") continue;
    const src = str(data.src || data.source || data._source).toLowerCase();
    if (src === "instagram" || data.igConversationId) continue;
    consider({
      handle: normalizeHandle(data.h || row.name),
      source: "crm",
      name: str(data.n || row.name),
      niche: str(data.niche).replace(/^[\u2014-]+$/, ""),
      hint: str(data._vt || data.vt),
      tier: str(data._tier || data.tier),
      priority: true,
    });
  }

  const leads = await all(env, "SELECT id, payload_json, score, tier, niche FROM yt_leads ORDER BY score DESC LIMIT 5000").catch(() => []);
  const scored = [];
  for (const row of leads) {
    const payload = parseJson(row.payload_json, {});
    const handle = extractInstagramHandle(payload);
    if (!handle) continue;
    const tier = str(row.tier || payload.tier);
    scored.push({
      handle,
      source: "yt_leads",
      name: str(payload.n || payload.name),
      niche: str(row.niche || payload.niche),
      hint: str(payload.vt),
      tier,
      priority: isPriorityTier(tier),
      score: Number(row.score ?? payload.s ?? 0) || 0,
      lead_id: row.id,
    });
  }
  scored.sort((a, b) => Number(b.priority) - Number(a.priority) || b.score - a.score);
  for (const candidate of scored) consider(candidate);
  return out.slice(0, Math.max(1, Number(limit) || 50));
}

export function presentItem(row) {
  if (!row) return null;
  const grade = gradeDraft(row.draft || "");
  return {
    ...row,
    needs_detail: needsDetail(row.draft || "") || !str(row.detail),
    grade,
    instagram_url: `https://www.instagram.com/${row.handle}/`,
  };
}

export async function getItem(env, id) {
  const row = await env.DB.prepare("SELECT * FROM outreach_queue WHERE id=?").bind(str(id)).first();
  return presentItem(row);
}

async function nextPosition(env) {
  const row = await env.DB.prepare("SELECT COALESCE(MAX(position),0) AS p FROM outreach_queue").first();
  return Number(row?.p || 0) + 1;
}

// Insert one handle. Deduped by handle: adding an existing one returns the
// existing row with existed=true and changes nothing.
export async function addToQueue(env, { handle, source = "manual", name = "", niche = "", detail = "", gap = "", link = "", seed } = {}) {
  const clean = normalizeHandle(handle);
  if (!clean) return { error: "invalid handle" };
  const src = SOURCES.has(String(source)) ? String(source) : "manual";
  const existing = await env.DB.prepare("SELECT * FROM outreach_queue WHERE handle=?").bind(clean).first();
  if (existing) return { item: presentItem(existing), existed: true };
  const now = nowIso();
  const id = generateOpaqueToken(12);
  const fields = { name: str(name).slice(0, 200), niche: str(niche).slice(0, 60), detail: str(detail).slice(0, 400), gap: str(gap).slice(0, 400), link: str(link).slice(0, 500) };
  const draft = composeDraft({ ...fields, handle: clean, seed: seed ?? clean }).text;
  await env.DB.prepare(
    `INSERT INTO outreach_queue (id, handle, source, name, niche, detail, gap, link, draft, status, position, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,'queued',?,?,?)`,
  ).bind(id, clean, src, fields.name || null, fields.niche || null, fields.detail || null, fields.gap, fields.link || null, draft, await nextPosition(env), now, now).run();
  return { item: await getItem(env, id), existed: false };
}

// Operator edits. A supplied draft is stored as written; when only the brief
// changes the draft is rebuilt from it.
export async function updateItem(env, id, patch = {}) {
  const row = await env.DB.prepare("SELECT * FROM outreach_queue WHERE id=?").bind(str(id)).first();
  if (!row) return { error: "not found" };
  const next = { ...row };
  let briefChanged = false;
  for (const key of ["name", "niche", "detail", "gap", "link"]) {
    if (patch[key] === undefined) continue;
    const value = str(patch[key]).slice(0, key === "link" ? 500 : 400);
    if (value !== str(row[key])) briefChanged = true;
    next[key] = key === "gap" ? value : value || null;
  }
  if (patch.draft !== undefined) next.draft = str(patch.draft).slice(0, 1000) || null;
  else if (briefChanged || patch.rebuild) next.draft = composeDraft({ ...next, handle: row.handle, seed: patch.seed ?? row.handle }).text;
  next.updated_at = nowIso();
  await env.DB.prepare(
    "UPDATE outreach_queue SET name=?, niche=?, detail=?, gap=?, link=?, draft=?, updated_at=? WHERE id=?",
  ).bind(next.name, next.niche, next.detail, next.gap, next.link, next.draft, next.updated_at, row.id).run();
  return { item: await getItem(env, row.id) };
}

// Rebuild the draft from the stored brief, optionally with a new seed so the
// operator can cycle openers.
export async function redraft(env, id, seed) {
  return updateItem(env, id, { rebuild: true, seed });
}

export async function setStatus(env, id, status, { at = nowIso(), conversationId } = {}) {
  if (!STATUSES.has(status)) return { error: "bad status" };
  const row = await env.DB.prepare("SELECT * FROM outreach_queue WHERE id=?").bind(str(id)).first();
  if (!row) return { error: "not found" };
  const sentAt = status === "sent" ? (row.sent_at || at) : status === "replied" ? row.sent_at : null;
  const skippedAt = status === "skipped" ? at : null;
  await env.DB.prepare(
    "UPDATE outreach_queue SET status=?, sent_at=?, skipped_at=?, conversation_id=COALESCE(?, conversation_id), updated_at=? WHERE id=?",
  ).bind(status, sentAt, skippedAt, conversationId || null, at, row.id).run();
  return { item: await getItem(env, row.id) };
}

// The listed ids take positions 1..n in the given order; every other queued
// item follows in its current order, so positions never collide. Unknown
// ids are ignored.
export async function reorder(env, ids = []) {
  const list = [...new Set((Array.isArray(ids) ? ids : []).map((v) => str(v)).filter(Boolean))];
  if (!list.length) return { error: "no ids" };
  const known = new Set((await all(env, "SELECT id FROM outreach_queue")).map((r) => r.id));
  const queued = (await all(env, "SELECT id FROM outreach_queue WHERE status='queued' ORDER BY position ASC, created_at ASC")).map((r) => r.id);
  const listed = list.filter((id) => known.has(id));
  const order = [...listed, ...queued.filter((id) => !listed.includes(id))];
  if (!order.length) return { ok: true, updated: 0 };
  const now = nowIso();
  const statements = order.map((id, index) => env.DB.prepare("UPDATE outreach_queue SET position=?, updated_at=? WHERE id=?").bind(index + 1, now, id));
  const results = await env.DB.batch(statements);
  const changed = results.reduce((n, r) => n + Number(r?.meta?.changes || 0), 0);
  return { ok: true, updated: changed };
}

// Flip queued items to sent when a thread with our handle shows an outbound
// message, and sent items to replied when the thread has an inbound message
// after we sent. Safe to run on every read.
export async function reconcile(env) {
  const queued = await all(env,
    `SELECT q.id, q.created_at, c.id AS conversation_id,
            (SELECT MIN(m.sent_at) FROM ig_messages m WHERE m.conversation_id=c.id AND m.direction='outbound' AND m.sent_at>=q.created_at) AS after_at,
            (SELECT MAX(m.sent_at) FROM ig_messages m WHERE m.conversation_id=c.id AND m.direction='outbound') AS latest_at
       FROM outreach_queue q
       JOIN ig_conversations c ON LOWER(c.participant_username)=q.handle
      WHERE q.status='queued'`,
  );
  let sent = 0;
  for (const row of queued) {
    const at = row.after_at || row.latest_at;
    if (!at) continue;
    await env.DB.prepare("UPDATE outreach_queue SET status='sent', sent_at=?, conversation_id=?, skipped_at=NULL, updated_at=? WHERE id=? AND status='queued'")
      .bind(at, row.conversation_id, nowIso(), row.id).run();
    sent += 1;
  }
  const replied = await all(env,
    `SELECT q.id, c.id AS conversation_id
       FROM outreach_queue q
       JOIN ig_conversations c ON c.id=q.conversation_id OR (q.conversation_id IS NULL AND LOWER(c.participant_username)=q.handle)
      WHERE q.status='sent' AND q.sent_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM ig_messages m WHERE m.conversation_id=c.id AND m.direction='inbound' AND m.sent_at>q.sent_at)`,
  );
  let flipped = 0;
  const done = new Set();
  for (const row of replied) {
    if (done.has(row.id)) continue;
    done.add(row.id);
    const result = await env.DB.prepare("UPDATE outreach_queue SET status='replied', conversation_id=?, updated_at=? WHERE id=? AND status='sent'")
      .bind(row.conversation_id, nowIso(), row.id).run();
    flipped += Number(result?.meta?.changes || 0);
  }
  return { sent, replied: flipped };
}

function dayKey(iso, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  } catch {
    return String(iso).slice(0, 10);
  }
}

// The queue as the Today view reads it. Follow-ups come from /api/outreach,
// so follow_ups_note stays null here; the frontend merges the two.
export async function listToday(env, { cap = DEFAULT_CAP, now = nowIso() } = {}) {
  const limit = Math.max(1, Math.min(200, Number(cap) || DEFAULT_CAP));
  const timeZone = env.OPERATOR_TIMEZONE || "Europe/Istanbul";
  const today = dayKey(now, timeZone);
  const recent = await all(env, "SELECT sent_at FROM outreach_queue WHERE status IN ('sent','replied') AND sent_at IS NOT NULL AND sent_at>=?", new Date(Date.parse(now) - 48 * 3600000).toISOString());
  const sentToday = recent.filter((r) => dayKey(r.sent_at, timeZone) === today).length;
  const remaining = Math.max(0, limit - sentToday);
  const rows = await all(env, "SELECT * FROM outreach_queue WHERE status='queued' ORDER BY position ASC, created_at ASC LIMIT ?", limit);
  const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM outreach_queue WHERE status='queued'").first();
  return {
    follow_ups_note: null,
    queued: rows.map(presentItem),
    queued_total: Number(total?.n || 0),
    sent_today: sentToday,
    remaining,
    cap: limit,
    timezone: timeZone,
  };
}
