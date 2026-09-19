// Instagram inbox for the operator Leads view.
//   GET /api/spine/conversations?q=&unmatched=1     threads, newest first, with in_crm flag
//   GET /api/spine/conversations?id=<thread>        one thread with its messages
import { withOperator } from "../../_shared/access.js";
import { json, parseJson, str } from "../../_shared/common.js";
import { resolveSpineRead } from "../../_shared/spine-auth.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveSpineRead(request, env, "operator", "");
  if (access.error) return access.error;
  const url = new URL(request.url);
  const id = str(url.searchParams.get("id"));
  if (id) return thread(env, id);

  const unmatched = url.searchParams.get("unmatched") === "1";
  const q = str(url.searchParams.get("q")).toLowerCase();
  const like = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null;
  // A thread is "in CRM" when the handle exists as an added lead or carries an override.
  const inCrm = `EXISTS (
      SELECT 1 FROM crm_added a
       WHERE a.name=COALESCE(NULLIF(c.participant_username,''),NULLIF(c.participant_id,''),c.participant_name)
    ) OR EXISTS (
      SELECT 1 FROM crm_overrides o
       WHERE o.name=COALESCE(NULLIF(c.participant_username,''),NULLIF(c.participant_id,''),c.participant_name)
    )`;
  const where = [
    unmatched ? `NOT (${inCrm})` : null,
    like ? `(LOWER(COALESCE(c.participant_username,'')) LIKE ? ESCAPE '\\' OR LOWER(COALESCE(c.participant_name,'')) LIKE ? ESCAPE '\\')` : null,
  ].filter(Boolean);
  const rows = await env.DB.prepare(
    `SELECT c.id,c.participant_id,c.participant_username,c.participant_name,c.first_message_at,c.last_message_at,c.last_direction,c.payload_json,
            (SELECT m.text FROM ig_messages m WHERE m.conversation_id=c.id ORDER BY m.sent_at DESC LIMIT 1) AS last_text,
            (SELECT COUNT(*) FROM ig_messages m WHERE m.conversation_id=c.id) AS message_count,
            (SELECT COUNT(*) FROM ig_messages m WHERE m.conversation_id=c.id AND m.direction='inbound') AS inbound_count,
            (${inCrm}) AS in_crm
       FROM ig_conversations c
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY c.last_message_at DESC LIMIT 200`,
  ).bind(...(like ? [like, like] : [])).all();
  return json({
    ok: true,
    conversations: (rows.results || []).map((row) => ({
      ...row,
      in_crm: Boolean(row.in_crm),
      payload: parseJson(row.payload_json, {}),
      payload_json: undefined,
    })),
  });
}

async function thread(env, id) {
  const conversation = await env.DB.prepare(
    "SELECT id,participant_id,participant_username,participant_name,first_message_at,last_message_at,last_direction FROM ig_conversations WHERE id=?",
  ).bind(id).first();
  if (!conversation) return json({ ok: false, error: "thread not found" }, 404);
  const messages = await env.DB.prepare(
    "SELECT id,direction,sent_at,text FROM ig_messages WHERE conversation_id=? ORDER BY sent_at ASC LIMIT 500",
  ).bind(id).all();
  return json({ ok: true, conversation, messages: messages.results || [] });
}

export const onRequestGet = withOperator(handleGet);
