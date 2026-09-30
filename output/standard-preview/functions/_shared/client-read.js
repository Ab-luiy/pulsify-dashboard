// Read access for per-client reports that both sides use (funnel health, cash by video).
// A client session, portal token or impersonation reads its own workspace; an operator
// (signed in, or the admin key) reads any existing client named in ?client=.

import { cleanId, json } from "./common.js";
import { resolveSpineRead } from "./spine-auth.js";

export async function resolveReportClient(request, env) {
  const url = new URL(request.url);
  const requested = cleanId(url.searchParams.get("client"), "");
  const access = await resolveSpineRead(request, env, "client", requested);
  if (access.error) return access;
  if (access.role !== "operator") return { client: access.client, role: "client" };
  if (!access.client) return { error: json({ ok: false, error: "choose a client" }, 422) };
  const known = await env.DB.prepare("SELECT client FROM client_config WHERE client=?").bind(access.client).first();
  if (!known) return { error: json({ ok: false, error: "client not found" }, 404) };
  return { client: access.client, role: "operator" };
}
