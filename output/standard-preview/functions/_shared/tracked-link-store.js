// Making a tracked link, and the address it is shown with. One copy for the Links tab
// (functions/api/tracked-links.js) and the YouTube sync (_shared/video-cash.js), pulsify-saas #72 and #73.

import { claimSlug, slugify } from "./link-slug.js";
import { domainForClient } from "./link-domain-store.js";

const TOKEN_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function newLinkToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join("");
}

// The address people copy. On the client's own domain once it is active, otherwise the shared domain.
export function publicLinkUrl({ origin, domain, link }) {
  const end = link.slug || link.token;
  return domain && domain.status === "active"
    ? `https://${domain.host}/${end}`
    : `${origin}/a/${end}`;
}

/**
 * Insert one kind='link' row.
 *  input.slug         an ending the person typed (exact) or nothing (derive one from the name)
 *  input.origin       'youtube-sync' for a link the sync made, else null
 * -> { ok: true, token, slug, domain } | { ok: false, error, status }
 */
export async function createTrackedLink(env, input) {
  const domain = await domainForClient(env, input.client);
  const ownDomain = domain?.status === "active";
  const typed = String(input.slug || "").trim().toLowerCase();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let slug = null;
    if (typed) {
      const claimed = await claimSlug(env, input.client, typed, { exact: true, ownDomain });
      if (claimed.error) return { ok: false, error: claimed.error, status: claimed.invalid ? 422 : 409 };
      slug = claimed.slug;
    } else {
      const base = slugify(input.label);
      if (base.length >= 3) {
        const claimed = await claimSlug(env, input.client, base, { ownDomain });
        slug = claimed.slug || null; // no free ending: the link still works with its token
      }
    }
    const token = newLinkToken();
    try {
      const result = await env.DB.prepare(
        `INSERT INTO asset_links
           (token, client, label, target_url, created_at, archived, kind, source, placement, slug, origin, video_id, video_url)
         VALUES (?,?,?,?,?,0,'link',?,?,?,?,?,?)`,
      ).bind(
        token, input.client, input.label, input.targetUrl, input.createdAt || new Date().toISOString(),
        input.source || "other", input.placement || "other", slug, input.origin || null,
        input.videoId || null, input.videoUrl || null,
      ).run();
      if (!result.meta || result.meta.changes === 0) continue;
      return { ok: true, token, slug, domain };
    } catch (error) {
      const message = String(error?.message || error);
      // A second run made this video's automatic link first: nothing to add.
      if (input.origin && /video_id/.test(message) && /UNIQUE|constraint/i.test(message)) {
        return { ok: false, error: "already made", status: 200, duplicate: true };
      }
      // Two people claimed the same ending at once: pick again.
      if (!/UNIQUE|constraint/i.test(message) || attempt === 2) throw error;
    }
  }
  return { ok: false, error: "The link wasn't made. Try again.", status: 500 };
}
