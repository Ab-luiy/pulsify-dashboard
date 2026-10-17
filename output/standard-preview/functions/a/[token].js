import {
  FALLBACK_URL, cleanToken, findLinkBySlug, findLinkByToken, followLink, linkTarget, redirect, videoTarget,
} from "../_shared/link-redirect.js";

// The redirect itself lives in _shared/link-redirect.js so the client's own domain
// (_shared/link-domains.js) counts and redirects the same way.
export { linkTarget, videoTarget };

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const token = cleanToken(params?.token);
  if (!env.DB || !token) return redirect(FALLBACK_URL);

  // A real token wins; otherwise the path is a readable ending (/a/trading-ep12).
  const link = (await findLinkByToken(env, token)) || (await findLinkBySlug(env, token.toLowerCase()));
  if (!link) return redirect(FALLBACK_URL);

  return followLink(context, link, { pageOrigin: new URL(request.url).origin });
}
