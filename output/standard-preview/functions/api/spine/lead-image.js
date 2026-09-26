// Real pictures for CRM prospects (pulsify-saas #34). The app's CSP only allows
// images from our own origin, so this fetches a lead's YouTube channel picture
// (the og:image on their channel page) or their top video's thumbnail, keeps a
// copy in R2 and serves it. The channel or video URL always comes from the
// stored lead (yt_leads, crm_added, crm_overrides), never from the caller.
//   GET /api/spine/lead-image?lead=<yt_leads id>&kind=avatar|video
//   GET /api/spine/lead-image?name=<CRM key>&kind=avatar|video
// A channel without a picture is remembered for a week, so a broken lead does
// not cost a YouTube fetch on every board render.
import { withOperator } from "../../_shared/access.js";
import { resolveSpineRead } from "../../_shared/spine-auth.js";
import { parseJson, sha256Hex, str } from "../../_shared/common.js";

const CHANNEL = /^https:\/\/(?:www\.|m\.)?youtube\.com\/(@[\w.%-]{1,100}|channel\/UC[\w-]{10,40}|c\/[\w.%-]{1,100}|user\/[\w.%-]{1,100})\/?$/i;
const VIDEO = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([\w-]{11})/i;
const AVATAR_HOSTS = /^(yt3\.googleusercontent\.com|yt3\.ggpht\.com)$/i;
const MAX_BYTES = 1_500_000;
const MISSING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The lead's channel URL, normalised, or "" when it is not a plain YouTube channel link. */
export function channelUrl(value) {
  const url = str(value).trim().split(/[?#]/)[0];
  const match = url.match(CHANNEL);
  return match ? `https://www.youtube.com/${match[1]}` : "";
}

export function videoId(value) {
  return str(value).match(VIDEO)?.[1] || "";
}

/** The channel picture from the channel page's og:image, resized to 176 px. Only Google's avatar hosts pass. */
export function avatarFromHtml(html) {
  const match = str(html).match(/<meta property="og:image" content="([^"]+)"/i);
  if (!match) return "";
  try {
    const url = new URL(match[1].replace(/&amp;/g, "&"));
    if (url.protocol !== "https:" || !AVATAR_HOSTS.test(url.hostname)) return "";
    return url.toString().replace(/=s\d+[^/]*$/, "=s176-c-k-c0x00ffffff-no-rj");
  } catch {
    return "";
  }
}

async function leadData(env, params) {
  const id = str(params.get("lead"));
  if (id) {
    if (id.length > 120) return null;
    const row = await env.DB.prepare("SELECT payload_json FROM yt_leads WHERE id=?").bind(id).first().catch(() => null);
    return row ? parseJson(row.payload_json, {}) : null;
  }
  const name = str(params.get("name"));
  if (!name || name.length > 200) return null;
  for (const table of ["crm_overrides", "crm_added"]) {
    const row = await env.DB.prepare(`SELECT data FROM ${table} WHERE name=?`).bind(name).first().catch(() => null);
    const data = parseJson(row?.data, {});
    if (data.cu || data.vu) return data;
  }
  const row = await env.DB.prepare("SELECT payload_json FROM yt_leads WHERE json_extract(payload_json,'$.n')=? LIMIT 1").bind(name).first().catch(() => null);
  return row ? parseJson(row.payload_json, {}) : null;
}

async function pictureUrl(kind, data) {
  if (kind === "video") {
    const id = videoId(data.vu);
    return id ? { key: `video/${id}`, url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` } : null;
  }
  const channel = channelUrl(data.cu);
  if (!channel) return null;
  return {
    key: `avatar/${await sha256Hex(channel)}`,
    // Resolved lazily: the channel page is fetched only when R2 has no copy yet.
    resolve: async () => {
      const page = await fetch(channel, {
        // SOCS skips the EU cookie-consent interstitial, which has no og:image.
        headers: { cookie: "SOCS=CAI", "accept-language": "en", "user-agent": "Mozilla/5.0 (compatible; Pulsify)" },
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      if (!page?.ok) return "";
      return avatarFromHtml((await page.text()).slice(0, 800_000));
    },
  };
}

const image = (body, type) => new Response(body, { headers: { "content-type": type, "cache-control": "private, max-age=86400" } });
const missing = () => new Response("Not found", { status: 404, headers: { "cache-control": "private, max-age=3600" } });

async function get({ request, env }) {
  const access = await resolveSpineRead(request, env, "operator", "");
  if (access.error) return access.error;
  if (!env.DB || !env.MEDIA) return missing();
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") === "video" ? "video" : "avatar";
  const data = await leadData(env, params);
  if (!data) return missing();
  const picture = await pictureUrl(kind, data);
  if (!picture) return missing();

  const key = `lead-images/${picture.key}`;
  const stored = await env.MEDIA.get(key);
  if (stored) {
    if (stored.customMetadata?.missing && Date.now() - Number(stored.customMetadata.at || 0) < MISSING_TTL_MS) return missing();
    if (!stored.customMetadata?.missing) return image(stored.body, stored.httpMetadata?.contentType || "image/jpeg");
  }

  const source = picture.url || (await picture.resolve());
  const response = source ? await fetch(source, { signal: AbortSignal.timeout(8000) }).catch(() => null) : null;
  const type = response?.headers.get("content-type") || "";
  const bytes = response?.ok && /^image\/(jpeg|png|webp)(;|$)/i.test(type) ? await response.arrayBuffer() : null;
  if (!bytes || !bytes.byteLength || bytes.byteLength > MAX_BYTES) {
    await env.MEDIA.put(key, "", { customMetadata: { missing: "1", at: String(Date.now()) } });
    return missing();
  }
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type } });
  return image(bytes, type);
}

export const onRequestGet = withOperator(get);
