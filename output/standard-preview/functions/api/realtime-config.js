// Public config for the browser subscriber: Supabase URL, publishable key and
// the topic for the caller. Operators get the console topic; a client session
// gets its own workspace topic. Only public values leave here.
import { json } from "../_shared/common.js";
import { realtimeConfigured } from "../_shared/realtime.js";
import { operatorIdentity } from "../_shared/access.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

export async function onRequestGet({ request, env, data }) {
  if (!realtimeConfigured(env)) return json({ ok: false, off: true });
  const operator = data?.operator || operatorIdentity(request);
  let topic = "";
  if (operator && request.headers.get("x-pulsify-operator") === "1") topic = "pulsify:operator";
  else {
    const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowImpersonated: true }).catch(() => ({ error: true }));
    if (!access.error && access.client) topic = `pulsify:client:${access.client}`;
    else if (operator) topic = "pulsify:operator";
  }
  if (!topic) return json({ ok: false, error: "unauthorized" }, 401);
  return json({ ok: true, url: env.SUPABASE_URL, key: env.SUPABASE_ANON_KEY, topic }, 200, { "cache-control": "no-store" });
}
