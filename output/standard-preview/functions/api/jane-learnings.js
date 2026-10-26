// Operator: the queue of things Jane noticed in client chats (migration 0084, pulsify-saas #92).
//   GET  /api/jane-learnings?status=pending|approved|rejected  -> {ok, learnings[], counts}
//   POST /api/jane-learnings {action: "approve", id, text?}     shared lesson -> Jane's prompts; client fact -> that client's memory
//   POST /api/jane-learnings {action: "reject", id}             also retires an approved shared lesson
import { withOperator } from "../_shared/access.js";
import { json, nowIso, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { anonymise } from "../_shared/jane-learnings.js";

const NO_STORE = { "cache-control": "no-store" };
const STATUSES = ["pending", "approved", "rejected"];
const MEMORY_CAP = 30;

async function handleGet({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const asked = new URL(request.url).searchParams.get("status");
  const status = STATUSES.includes(asked) ? asked : "pending";
  const rows = await env.DB.prepare(`SELECT l.id, l.client_id, c.client_name, l.kind, l.shared, l.text, l.evidence, l.chat_id, l.status, l.created_at, l.reviewed_at, l.reviewed_by
    FROM jane_learnings l LEFT JOIN client_config c ON c.client = l.client_id WHERE l.status=? ORDER BY l.id DESC LIMIT 200`).bind(status).all();
  const counts = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM jane_learnings GROUP BY status").all();
  return json({
    ok: true, status,
    learnings: (rows.results || []).map((row) => ({ ...row, shared: Boolean(row.shared) })),
    counts: Object.fromEntries(STATUSES.map((name) => [name, Number((counts.results || []).find((row) => row.status === name)?.n || 0)])),
  }, 200, NO_STORE);
}

async function handlePost({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const action = str(body.action);
  const row = await env.DB.prepare("SELECT l.*, c.client_name FROM jane_learnings l LEFT JOIN client_config c ON c.client = l.client_id WHERE l.id=?").bind(Number(body.id) || 0).first();
  if (!row) return json({ ok: false, error: "Learning not found." }, 404, NO_STORE);
  const now = nowIso();
  const actor = denied.operatorEmail;

  if (action === "reject") {
    await env.DB.prepare("UPDATE jane_learnings SET status='rejected', reviewed_at=?, reviewed_by=? WHERE id=?").bind(now, actor, row.id).run();
    return json({ ok: true, id: row.id, status: "rejected" }, 200, NO_STORE);
  }
  if (action !== "approve") return json({ ok: false, error: "unknown action" }, 422, NO_STORE);
  if (row.status === "approved") return json({ ok: false, error: "Already approved." }, 409, NO_STORE);

  // The reviewer may reword it; a shared lesson is anonymised again after editing.
  const edited = str(body.text).replace(/\s+/g, " ").trim().slice(0, 200) || row.text;
  const text = row.shared ? anonymise(edited, row.client_name) : edited;
  if (text.length < 8) return json({ ok: false, error: "Write the learning in a sentence first." }, 422, NO_STORE);
  if (!row.shared) await addClientMemory(env, row.client_id, text, now);
  await env.DB.prepare("UPDATE jane_learnings SET status='approved', text=?, reviewed_at=?, reviewed_by=? WHERE id=?").bind(text, now, actor, row.id).run();
  return json({ ok: true, id: row.id, status: "approved", text }, 200, NO_STORE);
}

async function addClientMemory(env, client, note, now) {
  const existing = await env.DB.prepare("SELECT id, note FROM copy_memory WHERE client_id=? AND active=1 ORDER BY id").bind(client).all();
  const rows = existing.results || [];
  if (rows.some((row) => row.note.toLowerCase() === note.toLowerCase())) return;
  await env.DB.prepare("INSERT INTO copy_memory (client_id, note, source, active, created_at) VALUES (?, ?, 'chat', 1, ?)").bind(client, note, now).run();
  for (const row of rows.slice(0, Math.max(0, rows.length + 1 - MEMORY_CAP))) {
    await env.DB.prepare("UPDATE copy_memory SET active=0 WHERE id=? AND client_id=?").bind(row.id, client).run();
  }
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
