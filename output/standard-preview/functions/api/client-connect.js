// Clients connect their own Instagram and YouTube (founder 2026-10-12: "I don't want to be connecting
// people's shit"). Zernio hosts the platform sign-in; each client workspace gets its own Zernio profile.
//   GET  /api/client-connect?action=start&platform=instagram|youtube  -> 302 to the platform sign-in
//   GET  /api/client-connect?action=status                            -> {available}: is connecting switched on at all
// Add &return=onboarding to start and the client comes back to the onboarding form, not the Integrations page.
//   GET  /api/client-connect?action=callback&state=...                <- Zernio returns here with accountId&username
//   POST /api/client-connect {action:"disconnect", platform}           forget it here and remove it on Zernio
// The state carries the client and platform, signed with INTEGRATION_ENCRYPTION_KEY and valid for 30 minutes,
// so a callback cannot attach an account to a workspace that did not start the flow.
import { json, nowIso, str } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { deleteIntegration, getIntegration, upsertIntegration } from "../_shared/integrations.js";
import { connectUrl, zernioConfigured, zernioFetch } from "../_shared/zernio.js";

const PORTAL = "/app/portal/access";
// Where each caller wants to land afterwards (the onboarding form passes return=onboarding).
const RETURNS = { onboarding: "/app/portal/onboarding" };
const returnOf = (value) => (Object.hasOwn(RETURNS, str(value)) ? str(value) : "");
const PLATFORMS = new Set(["instagram", "youtube"]);
const STATE_TTL_MS = 30 * 60000;

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sign(env, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(env.INTEGRATION_ENCRYPTION_KEY || "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text)));
}

export async function makeState(env, client, platform, now = Date.now()) {
  const body = `${client}.${platform}.${now + STATE_TTL_MS}`;
  return `${body}.${await sign(env, body)}`;
}

export async function readState(env, state, now = Date.now()) {
  const parts = String(state || "").split(".");
  if (parts.length !== 4) return null;
  const [client, platform, expires, mac] = parts;
  if (!PLATFORMS.has(platform) || !client || Number(expires) < now) return null;
  const expected = await sign(env, `${client}.${platform}.${expires}`);
  if (expected.length !== mac.length) return null;
  let diff = 0;
  for (let i = 0; i < mac.length; i += 1) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? { client, platform } : null;
}

// One Zernio profile per client workspace, remembered on whichever of its connections exists.
async function clientProfile(env, client) {
  for (const provider of ["instagram", "youtube"]) {
    const id = (await getIntegration(env, "client", client, provider).catch(() => null))?.config?.profile_id;
    if (id) return id;
  }
  const created = await zernioFetch(env, "/v1/profiles", {
    method: "POST",
    body: JSON.stringify({ name: `client-${client}`, description: `Pulsify client workspace ${client}` }),
  });
  return created._id || created.profile?._id || created.id;
}

const back = (origin, query, ret = "") => Response.redirect(`${origin}${RETURNS[ret] || PORTAL}?${query}`, 302);

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = str(url.searchParams.get("action"));

  if (action === "status") {
    const access = await resolveClientAccess(request, env, { allowHeaderToken: false, allowQueryToken: false });
    if (access.error) return access.error;
    return json({ ok: true, available: zernioConfigured(env) && Boolean(env.INTEGRATION_ENCRYPTION_KEY) });
  }

  if (action === "start") {
    const ret = returnOf(url.searchParams.get("return"));
    const platform = str(url.searchParams.get("platform"));
    if (!PLATFORMS.has(platform)) return json({ ok: false, error: "platform must be instagram or youtube" }, 400);
    const access = await resolveClientAccess(request, env, { allowHeaderToken: false, allowQueryToken: false });
    if (access.error) return access.error;
    if (!zernioConfigured(env) || !env.INTEGRATION_ENCRYPTION_KEY) return back(url.origin, `connect_error=${platform}&reason=unavailable`, ret);
    try {
      const profileId = await clientProfile(env, access.client);
      const state = await makeState(env, access.client, platform);
      const redirectUrl = `${url.origin}/api/client-connect?action=callback&state=${encodeURIComponent(state)}${ret ? `&return=${ret}` : ""}`;
      const { authUrl } = await connectUrl(env, { profileId, platform, redirectUrl });
      return Response.redirect(authUrl, 302);
    } catch (error) {
      console.error("client-connect start", String(error?.message || error));
      // Zernio answers 402 when the plan has no room for another profile or account.
      const reason = / -> 402:/.test(String(error?.message || "")) ? "full" : "start";
      return back(url.origin, `connect_error=${platform}&reason=${reason}`, ret);
    }
  }

  if (action === "callback") {
    const ret = returnOf(url.searchParams.get("return"));
    const signed = await readState(env, url.searchParams.get("state"));
    if (!signed) return back(url.origin, "connect_error=unknown&reason=expired", ret);
    const { client, platform } = signed;
    if (url.searchParams.get("error")) return back(url.origin, `connect_error=${platform}&reason=${encodeURIComponent(str(url.searchParams.get("error")).slice(0, 40))}`, ret);
    const accountId = str(url.searchParams.get("accountId"));
    const username = str(url.searchParams.get("username")).replace(/^@/, "");
    if (!accountId) return back(url.origin, `connect_error=${platform}&reason=no-account`, ret);
    const config = {
      account_id: accountId,
      username,
      profile_id: str(url.searchParams.get("profileId")),
      connected_at: nowIso(),
      // The cash-by-video job reads the channel handle; a YouTube sign-in supplies it.
      ...(platform === "youtube" && username ? { handle: `@${username}` } : {}),
    };
    const saved = await upsertIntegration(env, { scope: "client", client, provider: platform, config, secrets: {}, origin: url.origin });
    if (saved?.ok === false) return back(url.origin, `connect_error=${platform}&reason=save`, ret);
    return back(url.origin, `connected=${platform}`, ret);
  }

  return json({ ok: false, error: "unknown action" }, 400);
}

export async function onRequestPost({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({}));
  const platform = str(body.platform);
  if (body.action !== "disconnect" || !PLATFORMS.has(platform)) return json({ ok: false, error: "send {action:'disconnect', platform}" }, 400);
  const record = await getIntegration(env, "client", access.client, platform).catch(() => null);
  const accountId = record?.config?.account_id;
  // Removing it on Zernio stops the per-account charge; a failure there still forgets it here.
  if (accountId && zernioConfigured(env)) {
    await zernioFetch(env, `/v1/accounts/${encodeURIComponent(accountId)}`, { method: "DELETE" }).catch((error) => console.error("client-connect disconnect", String(error?.message || error)));
  }
  await deleteIntegration(env, "client", access.client, platform);
  return json({ ok: true, platform, connected: false });
}
