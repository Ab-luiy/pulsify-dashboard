// Canva Connect for the carousel editor (founder 2026-10-13: "do both, start with our own editor").
// The Pulsify app in the founder's Canva developer account (App ID AAHOGILsm6c) asks only for what the flow uses:
// design:content:write (import the .pptx as a design) and design:content:read (export it back as PNGs). Credentials are Pages
// secrets CANVA_CLIENT_ID and CANVA_CLIENT_SECRET. Each client signs in to their own Canva account
// (OAuth with PKCE); the tokens are sealed per client in integrations(provider='canva') and refreshed
// automatically (Canva rotates refresh tokens, so the newest one is stored every time).
// API shapes checked against canva.dev on 2026-10-13: /oauth/token, /imports, /exports, /connect/keys.
import { nowIso } from "./common.js";
import { getIntegration, upsertIntegration } from "./integrations.js";
import { seal, unseal } from "./secret-box.js";

export const CANVA_API = "https://api.canva.com/rest/v1";
export const CANVA_AUTHORIZE = "https://www.canva.com/api/oauth/authorize";
export const CANVA_SCOPES = "design:content:read design:content:write";
export const canvaRedirect = (origin) => `${origin}/api/canva-connect`;
const STATE_TTL_MS = 30 * 60000;

export const canvaConfigured = (env) => Boolean(env?.CANVA_CLIENT_ID && env?.CANVA_CLIENT_SECRET && env?.INTEGRATION_ENCRYPTION_KEY);
const context = (client) => `canva:${client}`;

export const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(env, text) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(env.INTEGRATION_ENCRYPTION_KEY || "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`canva:${text}`)));
}

/** client.carousel.expires.mac: signed, 30 minutes, so a callback only attaches Canva to the workspace that asked. */
export async function makeCanvaState(env, client, carousel, now = Date.now()) {
  const body = `${client}.${Number(carousel) || 0}.${now + STATE_TTL_MS}`;
  return `${body}.${await hmac(env, body)}`;
}

export async function readCanvaState(env, state, now = Date.now()) {
  const parts = String(state || "").split(".");
  if (parts.length !== 4) return null;
  const [client, carousel, expires, mac] = parts;
  if (!client || Number(expires) < now) return null;
  const expected = await hmac(env, `${client}.${carousel}.${expires}`);
  if (expected.length !== mac.length) return null;
  let diff = 0;
  for (let i = 0; i < mac.length; i += 1) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? { client, carousel: Number(carousel) || 0 } : null;
}

/** PKCE: a random verifier and its S256 challenge. */
export async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}

export function authorizeUrl(env, origin, challenge, state) {
  const url = new URL(CANVA_AUTHORIZE);
  url.searchParams.set("code_challenge_method", "s256");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.CANVA_CLIENT_ID);
  url.searchParams.set("redirect_uri", canvaRedirect(origin));
  url.searchParams.set("scope", CANVA_SCOPES);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("state", state);
  return url.toString();
}

async function tokenRequest(env, form) {
  const response = await fetch(`${CANVA_API}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${btoa(`${env.CANVA_CLIENT_ID}:${env.CANVA_CLIENT_SECRET}`)}` },
    body: new URLSearchParams(form).toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(`Canva sign-in failed (${response.status}) ${String(data.error_description || data.error || data.message || "").slice(0, 200)}`);
  return data;
}

async function storeTokens(env, client, data, extra = {}) {
  await upsertIntegration(env, {
    scope: "client",
    client,
    provider: "canva",
    // A minute early, so a call never starts with a token about to lapse; 0 means already expired.
    config: { expires_at: new Date(Date.now() + (Number.isFinite(Number(data.expires_in)) ? Number(data.expires_in) : 14400) * 1000 - 60000).toISOString(), ...extra },
    secrets: {
      access_token: await seal(env, data.access_token, context(client)),
      ...(data.refresh_token ? { refresh_token: await seal(env, data.refresh_token, context(client)) } : {}),
    },
  });
}

export async function exchangeCode(env, client, origin, code, verifier) {
  const data = await tokenRequest(env, { grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: canvaRedirect(origin) });
  await storeTokens(env, client, data, { connected_at: nowIso() });
}

/** A live access token for the client, refreshed when it has expired; null when Canva is not connected. */
export async function canvaToken(env, client) {
  const row = await getIntegration(env, "client", client, "canva");
  const sealed = row?.secrets?.access_token;
  if (!sealed) return null;
  const fresh = row.config?.expires_at && Date.parse(row.config.expires_at) > Date.now();
  if (fresh) return unseal(env, sealed, context(client));
  const refresh = row.secrets?.refresh_token ? await unseal(env, row.secrets.refresh_token, context(client)) : "";
  if (!refresh) return null;
  const data = await tokenRequest(env, { grant_type: "refresh_token", refresh_token: refresh });
  await storeTokens(env, client, data);
  return data.access_token;
}

export async function canvaFetch(token, path, init = {}) {
  const response = await fetch(`${CANVA_API}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(data?.message || data?.error || `Canva answered ${response.status}`).slice(0, 300));
    error.status = response.status;
    throw error;
  }
  return data;
}

/** Poll an import or export job until it finishes (Canva jobs usually take a few seconds). */
export async function waitForJob(token, path, { tries = 20, delay = 1500 } = {}) {
  for (let i = 0; i < tries; i += 1) {
    const data = await canvaFetch(token, path);
    const job = data?.job || {};
    if (job.status === "success") return job;
    if (job.status === "failed") throw new Error(String(job.error?.message || "Canva could not finish this.").slice(0, 300));
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("Canva is taking longer than usual. Try again in a minute.");
}

const b64urlDecode = (text) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

/** Verify the return-navigation JWT with Canva's public keys; returns its claims or null. */
export async function verifyReturnJwt(env, token, now = Date.now()) {
  try {
    const [head, body, signature] = String(token || "").split(".");
    const header = JSON.parse(new TextDecoder().decode(b64urlDecode(head)));
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    const keys = await (await fetch(`${CANVA_API}/connect/keys`)).json();
    const jwk = (keys?.keys || []).find((key) => key.kid === header.kid);
    if (!jwk || header.alg !== "RS256") return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlDecode(signature), new TextEncoder().encode(`${head}.${body}`));
    if (!valid) return null;
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audience.includes(env.CANVA_CLIENT_ID) || claims.type !== "rti" || Number(claims.exp) * 1000 < now) return null;
    return claims;
  } catch {
    return null;
  }
}
