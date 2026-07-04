import { cleanId, generateOpaqueToken, nowIso, sha256Hex } from "./common.js";

export function buildPortalLink(origin, client, token) {
  return `${origin}/client?client=${encodeURIComponent(client)}&t=${token}`;
}

export async function getPortalTokenState(env, client) {
  if (!env.DB) return null;
  const safeClient = cleanId(client);
  if (!safeClient) return null;
  return env.DB.prepare(
    "SELECT portal_token_hash FROM client_config WHERE client=?",
  ).bind(safeClient).first();
}

export async function mintPortalToken(env, client, origin) {
  if (!env.DB) return { ok: false, error: "no database bound" };
  const safeClient = cleanId(client);
  if (!safeClient) return { ok: false, error: "valid client id required" };

  const token = generateOpaqueToken(32);
  const hash = await sha256Hex(token);
  const result = await env.DB.prepare(
    "UPDATE client_config SET portal_token_hash=?, updated_at=? WHERE client=?",
  ).bind(hash, nowIso(), safeClient).run();

  if (!result.meta?.changes) {
    return {
      ok: false,
      error: "save this client in Settings before creating a portal link",
    };
  }

  return {
    ok: true,
    client: safeClient,
    token,
    link: buildPortalLink(origin, safeClient, token),
    note: "Shown once. If lost, generate a new link - the old one stops working.",
  };
}
