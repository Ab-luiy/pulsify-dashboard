// Readable endings for tracked links (pulsify-saas #72): /a/trading-ep12, go.clientname.com/case-study.
// Pure rules plus one claim helper. A slug is lowercase letters, digits and single hyphens, 3 to 60 long.

export const SLUG_MIN = 3;
export const SLUG_MAX = 60;
const DERIVED_MAX = 40;

// Words the site itself answers on, plus anything that would look like a page of ours.
const RESERVED = new Set([
  "a", "api", "app", "admin", "login", "logout", "portal", "settings", "event", "leads", "m", "r", "media",
  "onboard", "assets", "css", "js", "client", "site", "privacy", "terms", "campaigns", "integrations",
  "templates", "index", "www", "help", "status", "robots", "favicon", "sitemap", "null", "undefined",
]);

export function slugify(text, max = DERIVED_MAX) {
  let value = String(text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (value.length > max) {
    const cut = value.slice(0, max);
    const at = cut.lastIndexOf("-");
    value = (at >= Math.floor(max * 0.6) ? cut.slice(0, at) : cut).replace(/-+$/g, "");
  }
  return value;
}

// null when the ending is fine, otherwise one plain sentence for the person to read.
export function slugProblem(slug) {
  const value = String(slug ?? "");
  if (value.length < SLUG_MIN) return `Use at least ${SLUG_MIN} characters for the link ending.`;
  if (value.length > SLUG_MAX) return `Keep the link ending under ${SLUG_MAX} characters.`;
  if (!/^[a-z0-9-]+$/.test(value)) return "The link ending can only use lowercase letters, numbers and hyphens.";
  if (value.startsWith("-") || value.endsWith("-") || value.includes("--")) {
    return "Don't start or end the link ending with a hyphen, or use two in a row.";
  }
  if (RESERVED.has(value)) return `"${value}" is kept for the site itself. Pick another ending.`;
  return null;
}

function withSuffix(base, n) {
  const tail = `-${n}`;
  return `${base.slice(0, SLUG_MAX - tail.length).replace(/-+$/g, "")}${tail}`;
}

async function holders(env, slug) {
  const rows = await env.DB.prepare(
    "SELECT token, client, archived, slug FROM asset_links WHERE slug=? OR token=?",
  ).bind(slug, slug).all();
  return rows.results || [];
}

/**
 * Find an ending this client can use.
 *  wanted     the ending asked for (already lowercase) or a base derived from the name
 *  exact      true when the person typed it: report a clash instead of adding -2, -3
 *  ownDomain  true when the client answers on its own active domain: the ending then only has to be
 *             free inside the client's own links. Otherwise it has to be free across all clients,
 *             because the shared domain has one /a/ for everyone.
 * Returns { slug } or { error }. A link the same client archived gives its ending back.
 */
export async function claimSlug(env, client, wanted, { exact = false, ownDomain = false } = {}) {
  const base = String(wanted || "");
  const problem = slugProblem(base);
  if (problem) return { error: problem, invalid: true };
  for (let n = 1; n <= 60; n += 1) {
    const candidate = n === 1 ? base : withSuffix(base, n);
    if (slugProblem(candidate)) continue;
    const taken = await holders(env, candidate);
    let blocked = false;
    for (const row of taken) {
      if (row.token === candidate) {
        blocked = true; // never shadow a real token
      } else if (row.client === client) {
        if (Number(row.archived)) {
          await env.DB.prepare("UPDATE asset_links SET slug=NULL WHERE token=?").bind(row.token).run();
        } else {
          blocked = true;
        }
      } else if (!ownDomain) {
        blocked = true;
      }
    }
    if (!blocked) return { slug: candidate };
    if (exact) return { error: `"${candidate}" is already used by another link. Try ${withSuffix(base, 2)}.` };
  }
  return { error: "Couldn't find a free ending for that name. Type your own." };
}
