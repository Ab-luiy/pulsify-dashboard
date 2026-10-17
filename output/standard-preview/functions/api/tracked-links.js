// Tracked links for any placement (InfoOS build, the Links tab):
//   GET    /api/tracked-links[?client=]                  every link with clicks, visits, applications, calls, buyers, cash
//   POST   /api/tracked-links {label, source, placement, target_url?, slug?}   create one
//   POST   /api/tracked-links {youtube_url, mode?, page_url?, ...}            create one from a YouTube address (#72)
//   PATCH  /api/tracked-links?token= {slug}               change the readable ending
//   DELETE /api/tracked-links?token=                      archive one
// A link lands on the client's page (or target_url) wearing utm_source=<source>,
// utm_medium=<placement>, utm_content=l-<token> (functions/a/[token].js). Credit is first
// touch per person and cash is confirmed payments, the same rules as cash by video.
//
// YouTube (#72): paste a video or channel address. mode "youtube" (default) sends people straight to
// YouTube: the click is counted, but YouTube cannot tell us who the person is, so nothing after the click
// can be tied to them (tracks_people is false). mode "page" sends them to the client's own page with the
// video on it, where the tracker follows visits, applications, calls and sales (tracks_people is true).
// The sync also makes one link per new video on its own (_shared/video-cash.js, origin 'youtube-sync').
//
// The address a link is shown with follows the client's domain (#73): https://go.clientname.com/<ending>
// once that domain is active, otherwise <this site>/a/<ending>.
// Reads: client, preview or operator (?client=). Writes: client or operator, never a preview.

import { cleanId, json, str } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient, resolveReportWriter } from "../_shared/client-read.js";
import { loadPipeline } from "../_shared/lead-people.js";
import { domainForClient } from "../_shared/link-domains.js";
import { claimSlug } from "../_shared/link-slug.js";
import { createTrackedLink, publicLinkUrl } from "../_shared/tracked-link-store.js";
import { fallbackLabel, isYouTubeHost, parseYouTubeUrl } from "../_shared/youtube-url.js";

export const LINK_SOURCES = ["instagram", "tiktok", "youtube", "email", "facebook", "x", "linkedin", "ads", "other"];
export const LINK_PLACEMENTS = ["bio", "story", "post", "dm", "newsletter", "ad", "description", "other"];
const NEW_DAYS = 14;

function hostOf(value) {
  try {
    return new URL(String(value || "")).hostname;
  } catch {
    return "";
  }
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const origin = new URL(request.url).origin;
  const client = access.client;
  const [links, clicks, visits, pipeline, domain] = await Promise.all([
    env.DB.prepare(
      `SELECT token, label, source, placement, target_url, created_at, slug, origin, video_id, video_url FROM asset_links
        WHERE client=? AND kind='link' AND archived=0 ORDER BY created_at DESC`,
    ).bind(client).all(),
    env.DB.prepare(
      `SELECT e.token, COUNT(*) AS clicks FROM asset_events e JOIN asset_links l ON l.token=e.token
        WHERE l.client=? AND l.kind='link' GROUP BY e.token`,
    ).bind(client).all(),
    env.DB.prepare(
      `SELECT utm_content, COUNT(DISTINCT visitor_id) AS visitors FROM page_events
        WHERE client=? AND utm_content LIKE 'l-%' AND event='page_view' GROUP BY utm_content`,
    ).bind(client).all(),
    loadPipeline(env, client),
    domainForClient(env, client),
  ]);
  const clickBy = new Map((clicks.results || []).map((r) => [r.token, Number(r.clicks || 0)]));
  const visitBy = new Map((visits.results || []).map((r) => [r.utm_content, Number(r.visitors || 0)]));
  const people = new Map();
  for (const person of pipeline.raw) {
    const tag = String(person.source?.utm?.utm_content || "");
    if (!tag.startsWith("l-")) continue;
    const s = people.get(tag) || { applications: 0, booked: 0, buyers: 0, cash_cents: 0 };
    if (person.stages.applied) s.applications += 1;
    if (person.stages.booked) s.booked += 1;
    if (person.stages.bought) { s.buyers += 1; s.cash_cents += person.money.collected_cents; }
    people.set(tag, s);
  }
  const newSince = Date.now() - NEW_DAYS * 86_400_000;
  return json({
    ok: true,
    client,
    link_domain: domain ? { host: domain.host, status: domain.status } : null,
    links: (links.results || []).map((l) => ({
      token: l.token,
      url: publicLinkUrl({ origin, domain, link: l }),
      slug: l.slug || null,
      label: l.label,
      source: l.source,
      placement: l.placement,
      target_url: l.target_url,
      created_at: l.created_at,
      // YouTube (#72). A link that goes straight to YouTube counts clicks only.
      from_youtube: Boolean(l.video_url) || isYouTubeHost(hostOf(l.target_url)),
      video_id: l.video_id || null,
      video_url: l.video_url || (isYouTubeHost(hostOf(l.target_url)) ? l.target_url : null),
      automatic: l.origin === "youtube-sync",
      is_new: l.origin === "youtube-sync" && Date.parse(l.created_at) >= newSince,
      tracks_people: !isYouTubeHost(hostOf(l.target_url)),
      clicks: clickBy.get(l.token) || 0,
      visitors: visitBy.get(`l-${l.token}`) || 0,
      ...(people.get(`l-${l.token}`) || { applications: 0, booked: 0, buyers: 0, cash_cents: 0 }),
    })),
  });
}

// The video's name for the link: what we already synced, else YouTube's public embed lookup.
async function videoTitle(env, client, parsed) {
  if (parsed.kind !== "video") return "";
  try {
    const row = await env.DB.prepare("SELECT title FROM yt_videos WHERE client_id=? AND video_id=?").bind(client, parsed.id).first();
    if (row?.title) return String(row.title);
  } catch {
    // not synced yet
  }
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(parsed.url)}`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (response.ok) return str((await response.json())?.title);
  } catch {
    // offline or blocked: the person can still name it
  }
  return "";
}

function httpUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  const source = LINK_SOURCES.includes(body.source) ? body.source : "other";
  const placement = LINK_PLACEMENTS.includes(body.placement) ? body.placement : "other";
  const origin = new URL(request.url).origin;
  let label = str(body?.label).slice(0, 80);
  let target = str(body.youtube_url) || str(body.target_url);
  let videoId = null;
  let videoUrl = null;

  const youtube = target ? parseYouTubeUrl(target) : null;
  if (youtube) {
    if (youtube.kind === "other") {
      return json({ ok: false, error: "Paste the address of one video or one channel. That YouTube address doesn't point to either." }, 422);
    }
    const mode = body.mode === "page" ? "page" : "youtube";
    if (mode === "page" && youtube.kind !== "video") {
      return json({ ok: false, error: "A page with the video on it needs one video. Paste a video address." }, 422);
    }
    if (youtube.kind === "video") videoId = youtube.id;
    videoUrl = youtube.url;
    if (!label) label = (await videoTitle(env, access.client, youtube)).slice(0, 80) || fallbackLabel(youtube);
    if (mode === "page") {
      const page = str(body.page_url);
      if (page) {
        const parsedPage = httpUrl(page);
        if (!parsedPage) return json({ ok: false, error: "The page must be a full web address, starting with https://." }, 422);
        if (isYouTubeHost(parsedPage.hostname)) {
          return json({ ok: false, error: "That is a YouTube address. Paste your own page, the one with the video on it." }, 422);
        }
        target = parsedPage.toString();
      } else {
        target = `${origin}/${cleanId(access.client)}`;
      }
    } else {
      target = youtube.url;
    }
  } else if (target) {
    const url = httpUrl(target);
    if (!url) return json({ ok: false, error: "The destination must be a full web address." }, 422);
    target = url.toString();
  }
  if (!label) return json({ ok: false, error: "Name the link, e.g. Instagram bio." }, 422);

  const made = await createTrackedLink(env, {
    client: access.client,
    label,
    source,
    placement,
    targetUrl: target || `${origin}/${cleanId(access.client)}`,
    slug: str(body.slug),
    videoId,
    videoUrl,
  });
  if (!made.ok) return json({ ok: false, error: made.error }, made.status || 422);
  const link = { token: made.token, slug: made.slug };
  return json({
    ok: true,
    token: made.token,
    slug: made.slug,
    label,
    url: publicLinkUrl({ origin, domain: made.domain, link }),
    tracks_people: !isYouTubeHost(hostOf(target)),
  }, 201);
}

async function handlePatch({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  const token = str(new URL(request.url).searchParams.get("token")).slice(0, 40);
  const link = await env.DB.prepare(
    "SELECT token, slug FROM asset_links WHERE token=? AND client=? AND kind='link' AND archived=0",
  ).bind(token, access.client).first();
  if (!link) return json({ ok: false, error: "That link isn't in this workspace." }, 404);
  const domain = await domainForClient(env, access.client);
  const wanted = str(body?.slug).toLowerCase();
  if (wanted === (link.slug || "")) return json({ ok: true, slug: link.slug });
  const claimed = await claimSlug(env, access.client, wanted, { exact: true, ownDomain: domain?.status === "active" });
  if (claimed.error) return json({ ok: false, error: claimed.error }, claimed.invalid ? 422 : 409);
  await env.DB.prepare("UPDATE asset_links SET slug=? WHERE token=? AND client=?").bind(claimed.slug, token, access.client).run();
  const origin = new URL(request.url).origin;
  return json({ ok: true, slug: claimed.slug, url: publicLinkUrl({ origin, domain, link: { token, slug: claimed.slug } }) });
}

async function handleDelete({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportWriter(request, env);
  if (access.error) return access.error;
  const token = str(new URL(request.url).searchParams.get("token")).slice(0, 40);
  const result = await env.DB.prepare(
    "UPDATE asset_links SET archived=1 WHERE token=? AND client=? AND kind='link'",
  ).bind(token, access.client).run();
  if (!result.meta?.changes) return json({ ok: false, error: "That link isn't in this workspace." }, 404);
  return json({ ok: true });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
export const onRequestPatch = withOperator(handlePatch);
export const onRequestDelete = withOperator(handleDelete);
