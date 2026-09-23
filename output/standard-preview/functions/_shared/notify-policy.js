// Who is allowed to ping the founder about a DM.
//
// Instagram's Primary / General / Requests folders are not exposed by the
// Graph API or Zernio, so the policy uses what we can prove from the thread:
//   outbound  we sent the first message -> a reply to our outreach, always worth a ping
//   inbound   they wrote first -> only when the founder approved them in the CRM
// A dropped prospect or a muted sender never pings. Everything stays in the
// inbox and the tracker either way; this only decides the bell.
import { parseJson, str } from "./common.js";

const MUTES_KEY = "notification-mutes";
const MUTES_OWNER = "operator";

export async function conversationOrigin(env, conversationId) {
  const first = await env.DB.prepare(
    "SELECT direction FROM ig_messages WHERE conversation_id=? ORDER BY sent_at ASC LIMIT 1",
  ).bind(conversationId).first().catch(() => null);
  return first?.direction === "outbound" ? "outbound" : "inbound";
}

// CRM rows are keyed by handle (sometimes with @). Returns 'approved',
// 'dropped' or ''.
export async function crmVetting(env, handle) {
  const h = str(handle).replace(/^@/, "").toLowerCase();
  if (!h) return "";
  const row = await env.DB.prepare(
    "SELECT data FROM crm_overrides WHERE lower(name) IN (?, ?) ORDER BY ts DESC LIMIT 1",
  ).bind(h, `@${h}`).first().catch(() => null);
  const data = parseJson(row?.data, {});
  if (data.vetting === "approved" || data.vetting === "dropped") return data.vetting;
  return "";
}

export async function loadMutes(env) {
  const row = await env.DB.prepare(
    "SELECT value_json FROM operator_state WHERE operator_email=? AND key=?",
  ).bind(MUTES_OWNER, MUTES_KEY).first().catch(() => null);
  const value = parseJson(row?.value_json, {});
  return new Set((Array.isArray(value.handles) ? value.handles : []).map((h) => str(h).toLowerCase()).filter(Boolean));
}

export async function setMute(env, handle, muted) {
  const h = str(handle).replace(/^@/, "").toLowerCase().slice(0, 100);
  if (!h) return null;
  const mutes = await loadMutes(env);
  if (muted) mutes.add(h); else mutes.delete(h);
  const handles = [...mutes].slice(-2000);
  await env.DB.prepare(
    `INSERT INTO operator_state(operator_email,key,value_json,updated_at) VALUES(?,?,?,?)
     ON CONFLICT(operator_email,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`,
  ).bind(MUTES_OWNER, MUTES_KEY, JSON.stringify({ handles }), new Date().toISOString()).run();
  return handles;
}

// Decide whether a DM in this conversation should reach the bell.
export async function dmPolicy(env, { conversationId, handle }) {
  const h = str(handle).replace(/^@/, "").toLowerCase();
  const [origin, vetting, mutes] = await Promise.all([
    conversationOrigin(env, conversationId),
    crmVetting(env, h),
    loadMutes(env),
  ]);
  if (h && mutes.has(h)) return { notify: false, origin, vetting, reason: "muted" };
  if (vetting === "dropped") return { notify: false, origin, vetting, reason: "dropped" };
  if (origin === "outbound") return { notify: true, origin, vetting, reason: "outreach reply" };
  if (vetting === "approved") return { notify: true, origin, vetting, reason: "approved prospect" };
  return { notify: false, origin, vetting, reason: "inbound, not approved" };
}
