// Clients connect their own Canva (founder 2026-10-13). See _shared/canva.js.
//   GET  /api/canva-connect?action=start&carousel=ID   -> 302 to Canva's sign-in (PKCE verifier in an HttpOnly cookie)
//   GET  /api/canva-connect?code=...&state=...          <- Canva returns here; tokens are stored sealed
//   GET  /api/canva-connect?action=status               -> {ok, configured, connected}
//   POST /api/canva-connect {action:"disconnect"}
import { json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { deleteIntegration, getIntegration } from "../_shared/integrations.js";
import { authorizeUrl, canvaConfigured, exchangeCode, makeCanvaState, pkcePair, readCanvaState } from "../_shared/canva.js";

const COOKIE = "pulsify_canva_pkce";
const back = (origin, carousel, query) => `${origin}/app/portal/instagram/carousels${carousel ? `?id=${carousel}&` : "?"}${query}`;
const cookieValue = (request, name) => (String(request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)) || [])[1] || "";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const action = url.searchParams.get("action") || (url.searchParams.has("code") || url.searchParams.has("error") ? "callback" : "");
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;

  if (action === "status") {
    const row = canvaConfigured(env) ? await getIntegration(env, "client", access.client, "canva") : null;
    return json({ ok: true, configured: canvaConfigured(env), connected: Boolean(row?.secrets?.access_token) });
  }

  if (action === "start") {
    if (access.impersonated) return json({ ok: false, error: "Operator preview is read-only." }, 403);
    if (!canvaConfigured(env)) return json({ ok: false, error: "Canva is not set up on this server." }, 503);
    const { verifier, challenge } = await pkcePair();
    const state = await makeCanvaState(env, access.client, url.searchParams.get("carousel"));
    return new Response(null, {
      status: 302,
      headers: {
        location: authorizeUrl(env, origin, challenge, state),
        "set-cookie": `${COOKIE}=${verifier}; Path=/api/canva-connect; HttpOnly; Secure; SameSite=Lax; Max-Age=1800`,
        "cache-control": "no-store",
      },
    });
  }

  if (action === "callback") {
    const state = await readCanvaState(env, url.searchParams.get("state"));
    const clear = `${COOKIE}=; Path=/api/canva-connect; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
    const go = (target) => new Response(null, { status: 302, headers: { location: target, "set-cookie": clear, "cache-control": "no-store" } });
    // The signed state must belong to the signed-in workspace; otherwise nothing is attached.
    if (!state || state.client !== access.client) return go(back(origin, 0, "canva=error"));
    if (url.searchParams.get("error")) return go(back(origin, state.carousel, "canva=cancelled"));
    const verifier = cookieValue(request, COOKIE);
    if (!verifier) return go(back(origin, state.carousel, "canva=error"));
    try {
      await exchangeCode(env, access.client, origin, url.searchParams.get("code") || "", verifier);
      return go(back(origin, state.carousel, "canva=connected"));
    } catch {
      return go(back(origin, state.carousel, "canva=error"));
    }
  }

  return json({ ok: false, error: "unknown action" }, 422);
}

export async function onRequestPost({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  if (access.impersonated) return json({ ok: false, error: "Operator preview is read-only." }, 403);
  const body = await request.json().catch(() => ({}));
  if (body.action !== "disconnect") return json({ ok: false, error: "unknown action" }, 422);
  await deleteIntegration(env, "client", access.client, "canva");
  return json({ ok: true });
}
