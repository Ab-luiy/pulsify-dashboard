// Call-day nudge (InfoOS brief item 4): every morning, each client with booked calls today
// gets one bell notification to post a student-result story before them, so people on
// today's calls see proof on the way in (wiki/concepts/hammer-them-strategy.md). Runs on
// the sync Worker's daily cron; days are UTC. One notification per client per day.

import { parseJson } from "./common.js";
import { notify } from "./notifications.js";

export async function callDayNudges(env, now = Date.now()) {
  if (!env?.DB) return { sent: 0 };
  const day = new Date(now).toISOString().slice(0, 10);
  const rows = await env.DB.prepare(
    `SELECT client_id, external_id, payload_json, ts FROM pipeline_touches
      WHERE kind='booking' AND substr(COALESCE(json_extract(payload_json,'$.starts_at'), ts), 1, 10) = ?`,
  ).bind(day).all();
  const cancelled = new Set((rows.results || []).filter((r) => /#canceled$/.test(String(r.external_id || ""))).map((r) => `${r.client_id}|${String(r.external_id).replace(/#canceled$/, "")}`));
  const byClient = new Map();
  for (const r of rows.results || []) {
    if (/#canceled$/.test(String(r.external_id || "")) || cancelled.has(`${r.client_id}|${r.external_id}`)) continue;
    const starts = parseJson(r.payload_json, {}).starts_at || r.ts;
    const list = byClient.get(r.client_id) || [];
    list.push(starts);
    byClient.set(r.client_id, list);
  }
  let sent = 0;
  for (const [client, calls] of byClient) {
    const archived = await env.DB.prepare("SELECT status FROM client_config WHERE client=?").bind(client).first().catch(() => null);
    if (!archived || archived.status === "archived") continue;
    calls.sort();
    const first = new Date(calls[0]).toISOString().slice(11, 16);
    const id = await notify(env, {
      scope: "client",
      clientId: client,
      kind: "calls.today",
      severity: "info",
      title: `${calls.length} ${calls.length === 1 ? "call" : "calls"} today, first at ${first} UTC`,
      body: "Post a student result story before them.",
      link: "leads?tab=calls",
      dedupeKey: `call-day:${client}:${day}`,
    }).catch(() => null);
    if (id) sent += 1;
  }
  return { sent, clients: byClient.size };
}
