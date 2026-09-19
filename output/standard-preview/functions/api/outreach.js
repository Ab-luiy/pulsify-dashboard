// Outreach tracker API (operator).
//   GET  /api/outreach?q=            threads (derived, sorted for work) + stats + recent events
//   GET  /api/outreach?id=<thread>   one thread with full message history
//   POST /api/outreach {id, action}  sentiment:positive|negative|clear, outcome:booked|closed|lost|clear,
//                                    hibernate, wake, note {text}
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { deriveThread, loadThreads, logEvent, stats, upsertOutreach } from "../_shared/outreach.js";
import { pushOperator } from "../_shared/realtime.js";

async function handleGet({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const id = str(url.searchParams.get("id"));
  if (id) {
    const conversation = await env.DB.prepare(
      `SELECT c.*, o.pfp_url, o.sentiment, o.outcome, o.hibernated_at, o.notes, o.seen_at
         FROM ig_conversations c LEFT JOIN ig_outreach o ON o.conversation_id=c.id WHERE c.id=?`,
    ).bind(id).first();
    if (!conversation) return json({ ok: false, error: "thread not found" }, 404);
    const messages = (await env.DB.prepare("SELECT id, direction, sent_at, text FROM ig_messages WHERE conversation_id=? ORDER BY sent_at ASC LIMIT 1000").bind(id).all()).results || [];
    return json({ ok: true, thread: deriveThread(conversation, messages, conversation), messages });
  }
  const threads = await loadThreads(env, { q: url.searchParams.get("q") || "" });
  const events = (await env.DB.prepare("SELECT id, conversation_id, kind, handle, name, text, created_at, delivered_at FROM ig_outreach_events ORDER BY created_at DESC LIMIT 30").all().catch(() => ({ results: [] }))).results || [];
  return json({ ok: true, threads, stats: stats(threads), events, timezone: env.OPERATOR_TIMEZONE || "Europe/Istanbul", generated_at: new Date().toISOString() });
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

  if (action.startsWith("sentiment:")) {
    const value = action.slice(10);
    if (!["positive", "negative", "clear"].includes(value)) return json({ ok: false, error: "bad sentiment" }, 422);
    await upsertOutreach(env, id, { sentiment: value === "clear" ? null : value }, actor);
  } else if (action.startsWith("outcome:")) {
    const value = action.slice(8);
    if (!["booked", "closed", "lost", "clear"].includes(value)) return json({ ok: false, error: "bad outcome" }, 422);
    await upsertOutreach(env, id, { outcome: value === "clear" ? null : value, hibernated_at: null }, actor);
    if (value === "booked" || value === "closed") await logEvent(env, { ...meta, kind: value, delivered: true });
  } else if (action === "hibernate") {
    await upsertOutreach(env, id, { hibernated_at: new Date().toISOString() }, actor);
    await logEvent(env, { ...meta, kind: "hibernated", delivered: true });
  } else if (action === "wake") {
    await upsertOutreach(env, id, { hibernated_at: null }, actor);
  } else if (action === "note") {
    await upsertOutreach(env, id, { notes: str(body.text).slice(0, 2000) }, actor);
  } else {
    return json({ ok: false, error: "unknown action" }, 422);
  }
  const row = await env.DB.prepare(
    `SELECT c.*, o.pfp_url, o.sentiment, o.outcome, o.hibernated_at, o.notes, o.seen_at
       FROM ig_conversations c LEFT JOIN ig_outreach o ON o.conversation_id=c.id WHERE c.id=?`,
  ).bind(id).first();
  const messages = (await env.DB.prepare("SELECT direction, sent_at, text FROM ig_messages WHERE conversation_id=? ORDER BY sent_at ASC").bind(id).all()).results || [];
  await pushOperator(env, "tracker.changed", { conversation_id: id, reason: action.split(":")[0] });
  return json({ ok: true, thread: deriveThread(row, messages, row) });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
