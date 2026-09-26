// Outreach tracker API (operator).
//   GET  /api/outreach?q=            threads (derived, sorted for work) + stats + recent events
//   GET  /api/outreach?id=<thread>   one thread with full message history
//   POST /api/outreach {id, action}  sentiment:positive|negative|clear, outcome:booked|closed|lost|clear,
//                                    hibernate, wake, note {text},
//                                    tags {tags:[{id,strength}]}, asset-sent {entry:{kind,tag,asset?}},
//                                    relation:personal|lead|clear (ticket #27: who counts as a lead)
// The list response also carries pain_tag_catalog and ready_assets for the inbox (ticket #14).
//   POST {id, action:"suggest-tags"} -> {suggestions:[{id,strength,quote}]}  AI read of their messages, never saved
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { deriveThread, loadThreads, logEvent, RELATION_OVERRIDES, stats, upsertOutreach } from "../_shared/outreach.js";
import { pushOperator } from "../_shared/realtime.js";
import { reviewBooking } from "../_shared/booking-review.js";
import { cleanAssetEntry, cleanTags, PAIN_TAGS, READY_ASSETS, readAssetLog } from "../_shared/pain-tags.js";
import { suggestTags } from "../_shared/tag-suggest.js";

// The list reads every stored message (4,150 rows on 2026-09-25) to derive the
// threads. Several pages ask for it (Overview, Today, Inbox, tracker, dashboard),
// so the computed list is kept in the data centre's cache for 20 seconds and
// shared; any action below clears it at once. Keys are internal URLs, never
// reachable from outside, and the browser still gets no-store.
const LIST_TTL = 20;
const listKey = (period, q) => new Request(`https://outreach-cache.pulsify.internal/list?period=${period}&q=${encodeURIComponent(q)}`);
const listCache = () => (typeof caches !== "undefined" && caches.default ? caches.default : null);

async function clearListCache() {
  const cache = listCache();
  if (!cache) return;
  await Promise.all(["year", "recent"].map((period) => cache.delete(listKey(period, "")).catch(() => false)));
}

async function handleGet({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const id = str(url.searchParams.get("id"));
  if (id) {
    const conversation = await env.DB.prepare(
      `SELECT c.*, o.pfp_url, o.sentiment, o.outcome, o.hibernated_at, o.notes, o.seen_at, o.pain_tags, o.asset_log, o.relation
         FROM ig_conversations c LEFT JOIN ig_outreach o ON o.conversation_id=c.id WHERE c.id=?`,
    ).bind(id).first();
    if (!conversation) return json({ ok: false, error: "thread not found" }, 404);
    const messages = (await env.DB.prepare("SELECT id, direction, sent_at, text, payload_json FROM ig_messages WHERE conversation_id=? ORDER BY sent_at ASC LIMIT 1000").bind(id).all()).results || [];
    return json({ ok: true, thread: deriveThread(conversation, messages, conversation), messages });
  }
  const q = url.searchParams.get("q") || "";
  const period = url.searchParams.get("period") === "recent" ? "recent" : "year";
  const cache = listCache();
  const key = listKey(period, q);
  // ?fresh=1 (sent right after a "tracker.changed" push or Refresh) skips the shared copy.
  const hit = cache && url.searchParams.get("fresh") !== "1" ? await cache.match(key).catch(() => null) : null;
  if (hit) return new Response(hit.body, { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store", "x-outreach-cache": "hit" } });
  const threads = await loadThreads(env, { q, period });
  const events = (await env.DB.prepare("SELECT id, conversation_id, kind, handle, name, text, created_at, delivered_at FROM ig_outreach_events ORDER BY created_at DESC LIMIT 30").all().catch(() => ({ results: [] }))).results || [];
  const body = JSON.stringify({ ok: true, threads, stats: stats(threads), events, pain_tag_catalog: PAIN_TAGS, ready_assets: READY_ASSETS, timezone: env.OPERATOR_TIMEZONE || "Europe/Istanbul", generated_at: new Date().toISOString() });
  if (cache) await cache.put(key, new Response(body, { headers: { "content-type": "application/json", "cache-control": `max-age=${LIST_TTL}` } })).catch(() => null);
  return new Response(body, { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

async function handlePost({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const id = str(body.id);
  const action = str(body.action);
  const conversation = await env.DB.prepare("SELECT id, participant_username, participant_name FROM ig_conversations WHERE id=?").bind(id).first();
  if (!conversation) return json({ ok: false, error: "thread not found" }, 404);
  const actor = denied.operatorEmail;
  const meta = { conversationId: id, handle: conversation.participant_username, name: conversation.participant_name };

  if (action === 'review-booking') {
    const messages = (await env.DB.prepare('SELECT direction,sent_at,text FROM ig_messages WHERE conversation_id=? ORDER BY sent_at DESC LIMIT 80').bind(id).all()).results || [];
    try { return json({ok:true,review:await reviewBooking(env,messages.reverse())}); }
    catch { return json({ok:false,error:'Booking review unavailable. Try again.'},502); }
  }

  if (action === "suggest-tags") {
    const messages = (await env.DB.prepare("SELECT direction, sent_at, text FROM ig_messages WHERE conversation_id=? ORDER BY sent_at DESC LIMIT 120").bind(id).all()).results || [];
    return json({ ok: true, ...(await suggestTags(env, messages.reverse())) });
  }

  if (action.startsWith("sentiment:")) {
    const value = action.slice(10);
    if (!["positive", "negative", "clear"].includes(value)) return json({ ok: false, error: "bad sentiment" }, 422);
    await upsertOutreach(env, id, { sentiment: value === "clear" ? null : value }, actor);
  } else if (action.startsWith("outcome:")) {
    const value = action.slice(8);
    if (!["booked", "closed", "lost", "clear"].includes(value)) return json({ ok: false, error: "bad outcome" }, 422);
    await upsertOutreach(env, id, { outcome: value === "clear" ? null : value, hibernated_at: null }, actor);
    if (value === "booked" || value === "closed") await logEvent(env, { ...meta, kind: value, delivered: true });
  } else if (action.startsWith("relation:")) {
    const value = action.slice(9);
    if (![...RELATION_OVERRIDES, "clear"].includes(value)) return json({ ok: false, error: "bad relation" }, 422);
    await upsertOutreach(env, id, { relation: value === "clear" ? null : value }, actor);
  } else if (action === "hibernate") {
    await upsertOutreach(env, id, { hibernated_at: new Date().toISOString() }, actor);
    await logEvent(env, { ...meta, kind: "hibernated", delivered: true });
  } else if (action === "wake") {
    await upsertOutreach(env, id, { hibernated_at: null }, actor);
  } else if (action === "note") {
    await upsertOutreach(env, id, { notes: str(body.text).slice(0, 2000) }, actor);
  } else if (action === "tags") {
    await upsertOutreach(env, id, { pain_tags: JSON.stringify(cleanTags(body.tags)) }, actor);
  } else if (action === "asset-sent") {
    const entry = cleanAssetEntry(body.entry, new Date().toISOString());
    if (!entry) return json({ ok: false, error: "bad asset entry" }, 422);
    const current = await env.DB.prepare("SELECT asset_log FROM ig_outreach WHERE conversation_id=?").bind(id).first();
    await upsertOutreach(env, id, { asset_log: JSON.stringify([...readAssetLog(current?.asset_log), entry].slice(-50)) }, actor);
  } else {
    return json({ ok: false, error: "unknown action" }, 422);
  }
  const row = await env.DB.prepare(
    `SELECT c.*, o.pfp_url, o.sentiment, o.outcome, o.hibernated_at, o.notes, o.seen_at, o.pain_tags, o.asset_log, o.relation
       FROM ig_conversations c LEFT JOIN ig_outreach o ON o.conversation_id=c.id WHERE c.id=?`,
  ).bind(id).first();
  const messages = (await env.DB.prepare("SELECT direction, sent_at, text, payload_json FROM ig_messages WHERE conversation_id=? ORDER BY sent_at ASC").bind(id).all()).results || [];
  await clearListCache();
  await pushOperator(env, "tracker.changed", { conversation_id: id, reason: action.split(":")[0] });
  return json({ ok: true, thread: deriveThread(row, messages, row) });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
