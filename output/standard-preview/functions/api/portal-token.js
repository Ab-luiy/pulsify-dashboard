import { withOperator } from '../_shared/access.js';
import { checkAdmin, cleanId, json } from "../_shared/common.js";
import { getPortalTokenState, mintPortalToken } from "../_shared/portal-tokens.js";
import { optionsResponse } from "../_shared/integrations.js";

async function handle_onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const client = cleanId(url.searchParams.get("client") || "");
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);

  const result = await mintPortalToken(env, client, url.origin);
  return json(result, result.ok ? 200 : 404);
}

async function handle_onRequestGet({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const client = cleanId(url.searchParams.get("client") || "");
  const row = await getPortalTokenState(env, client);

  return json({ ok: true, client, has_token: Boolean(row?.portal_token_hash) });
}

async function handle_onRequestOptions() {
  return optionsResponse("GET, POST, OPTIONS");
}

export const onRequestPost = withOperator(handle_onRequestPost);
export const onRequestGet = withOperator(handle_onRequestGet);
export const onRequestOptions = withOperator(handle_onRequestOptions);
