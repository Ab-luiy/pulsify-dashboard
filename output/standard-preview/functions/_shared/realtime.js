// Live push through Supabase Realtime, used as a signal channel only. Nothing
// sensitive travels here: payloads are opaque ids and kinds; browsers refetch
// details through Pulsify's own authenticated APIs. That is why the public
// (publishable) key is the only credential involved and it is set as a plain
// var, not a secret.
//   env.SUPABASE_URL      https://<ref>.supabase.co
//   env.SUPABASE_ANON_KEY sb_publishable_...
// Topics: "pulsify:operator" for the console, "pulsify:client:<id>" for a portal.
export function realtimeConfigured(env) {
  return Boolean(env?.SUPABASE_URL && env?.SUPABASE_ANON_KEY);
}

const reasons = new Set(["reply", "sent", "seen", "sync", "left-on-read", "sentiment", "outcome", "note", "hibernate", "wake", "reset"]);
export function signalPayload(payload = {}) {
  const safe = {};
  for (const key of ["id", "conversation_id"]) {
    const value = payload?.[key];
    if (typeof value === "string" && /^[A-Za-z0-9_:.=-]{1,200}$/.test(value)) safe[key] = value;
  }
  if (reasons.has(payload?.reason)) safe.reason = payload.reason;
  return safe;
}

export async function broadcast(env, topic, event, payload = {}, fetcher = fetch) {
  if (!realtimeConfigured(env)) return { ok: false, skipped: true };
  try {
    const r = await fetcher(`${String(env.SUPABASE_URL).replace(/\/$/, "")}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${env.SUPABASE_ANON_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ topic, event, payload: { ...signalPayload(payload), at: new Date().toISOString() } }] }),
    });
    return { ok: r.status === 202 || r.ok, status: r.status };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

// Operator-side conveniences. Fire and forget; never let a push failure break the caller.
export const pushOperator = (env, event, payload) => broadcast(env, "pulsify:operator", event, payload).catch(() => ({ ok: false }));
export const pushClient = (env, clientId, event, payload) => broadcast(env, `pulsify:client:${clientId}`, event, payload).catch(() => ({ ok: false }));
