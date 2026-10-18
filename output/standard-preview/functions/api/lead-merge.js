// POST /api/lead-merge {client?, a, b, decision: "same" | "different" | "clear"}
// The operator settles a possible match (pulsify-saas #74). A name alone never merges two
// people: it shows as a suggestion on the lead card, and this is where it is confirmed or
// dismissed. a and b are the `anchor` values the lead card returns (e:<email>, c:<id>, v:<id>).
// "same" joins the two records for good, "different" stops them being suggested or merged
// again, "clear" takes the decision back. A client writes to its own workspace, an operator
// to the client named in the body; previews are read-only.

import { json, nowIso } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportWriter } from "../_shared/client-read.js";

const NODE = /^(?:e|c|v):[^\s]{1,200}$/;

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  const a = String(body?.a || "").trim();
  const b = String(body?.b || "").trim();
  const decision = String(body?.decision || "");
  if (!NODE.test(a) || !NODE.test(b) || a === b) return json({ ok: false, error: "Choose two different people." }, 422);
  if (!["same", "different", "clear"].includes(decision)) return json({ ok: false, error: "Say whether they are the same person." }, 422);
  // One row per pair, whichever order it was sent in.
  const [first, second] = a < b ? [a, b] : [b, a];
  if (decision === "clear") {
    await env.DB.prepare("DELETE FROM lead_merge_decisions WHERE client_id=? AND key_a=? AND key_b=?").bind(access.client, first, second).run();
    return json({ ok: true, decision: null });
  }
  await env.DB.prepare(
    `INSERT INTO lead_merge_decisions (client_id, key_a, key_b, decision, decided_by, decided_at) VALUES (?,?,?,?,?,?)
     ON CONFLICT(client_id, key_a, key_b) DO UPDATE SET decision=excluded.decision, decided_by=excluded.decided_by, decided_at=excluded.decided_at`,
  ).bind(access.client, first, second, decision, access.actor || "operator", nowIso()).run();
  return json({ ok: true, decision });
}

export const onRequestPost = withOperator(handlePost);
