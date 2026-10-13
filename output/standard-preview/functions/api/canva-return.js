// Canva's Return button lands here (return navigation, founder 2026-10-13). Canva adds correlation_jwt,
// signed with its keys; once verified, its correlation_state ("c<carousel id>") says which carousel to
// reopen, and the editor brings the edited slides back (?canva=back). An unverified or expired token
// just opens the carousel list: nothing is read or changed from it.
import { verifyReturnJwt } from "../_shared/canva.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const claims = await verifyReturnJwt(env, url.searchParams.get("correlation_jwt"));
  const match = String(claims?.correlation_state || "").match(/^c(\d{1,12})$/);
  const target = match ? `/app/portal/instagram/carousels?id=${match[1]}&canva=back` : "/app/portal/instagram/carousels";
  return new Response(null, { status: 302, headers: { location: `${url.origin}${target}`, "cache-control": "no-store" } });
}
