import { withOperator } from "../../_shared/access.js";
import { json, parseJson } from "../../_shared/common.js";
import { resolveSpineRead } from "../../_shared/spine-auth.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveSpineRead(request, env, "operator", "");
  if (access.error) return access.error;
  const unmatched = new URL(request.url).searchParams.get("unmatched") === "1";
  const where = unmatched
    ? `WHERE NOT EXISTS (
         SELECT 1 FROM crm_added a
          WHERE a.name=COALESCE(NULLIF(c.participant_username,''),NULLIF(c.participant_id,''),c.participant_name)
       )`
    : "";
  const rows = await env.DB.prepare(
    `SELECT c.id,c.participant_id,c.participant_username,c.participant_name,c.first_message_at,c.last_message_at,c.last_direction,c.payload_json,
            (SELECT m.text FROM ig_messages m WHERE m.conversation_id=c.id ORDER BY m.sent_at DESC LIMIT 1) AS last_text
       FROM ig_conversations c
       ${where}
      ORDER BY c.last_message_at DESC LIMIT 200`,
  ).all();
  return json({
    ok: true,
    conversations: (rows.results || []).map((row) => ({
      ...row,
      payload: parseJson(row.payload_json, {}),
      payload_json: undefined,
    })),
  });
}

export const onRequestGet = withOperator(handleGet);
