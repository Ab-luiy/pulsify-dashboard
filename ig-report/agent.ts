// agent.ts — connects Instagram via Composio's hosted Tool Router and pulls a
// full snapshot (profile + account insights + audience + reels/posts/stories),
// writing it to ../dashboard-data-v2.json for the dashboard's Instagram tab,
// plus a standalone report.html.
//
// Usage:
//   npm start            full run (connect if needed → pull → write data + report)
//   npm start connect    only run the Instagram authorization step
//   npm start discover   dump Instagram tool schemas (debugging)
//
// Requires COMPOSIO_API_KEY in .env. Instagram must be a Business/Creator account.
//
// Stories expire in 24h and the API only returns ACTIVE stories, so each run
// merges freshly-pulled stories into the accumulated history (never loses past
// stories). Run daily (the refresh-ig-analytics workflow) to capture them all.

import "dotenv/config";
import { Composio } from "@composio/core";
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { scoreReels, renderReport, type Reel, type ReelInsights, type ScoredReel } from "./render.ts";

const USER_ID = process.env.COMPOSIO_USER_ID ?? "owner";
const TOOLKIT = "instagram";
const REELS_DAYS = 90; // window for the leaderboard/trend (more posts = better ranking)
const TREND_DAYS = 30; // window for account-level growth series
const DEBUG = process.env.DEBUG === "1";

const REEL_METRICS = ["reach", "views", "likes", "comments", "shares", "saved", "total_interactions", "ig_reels_avg_watch_time"];
const POST_METRICS = ["reach", "saved", "likes", "comments", "shares", "total_interactions"];
const STORY_METRICS = ["reach", "replies", "navigation", "profile_visits", "follows"];
// Account-level time-series (valid in Graph API v21; profile_views / website_clicks / impressions are deprecated).
const ACCOUNT_SERIES_METRICS = ["reach", "views", "follower_count", "accounts_engaged", "total_interactions", "profile_links_taps"];

type Session = Awaited<ReturnType<Composio["create"]>>;

interface Series { series: number[]; total: number; }
interface Demo { name: string; value: number; }
interface PostInsights { reach: number; saved: number; shares: number; likes: number; comments: number; totalInteractions: number; }
interface Post { id: string; caption: string; permalink: string; timestamp: string; mediaType: string; thumbnailDataUri: string; insights: PostInsights; }
interface StoryInsights { reach: number; replies: number; navigation: number; profileVisits: number; follows: number; }
interface Story { id: string; permalink: string; timestamp: string; capturedAt: string; thumbnailDataUri: string; insights: StoryInsights; }

function log(...args: unknown[]): void { console.log(...args); }
function debug(label: string, value: unknown): void { if (DEBUG) console.dir({ [label]: value }, { depth: 8 }); }

async function main(): Promise<void> {
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) { console.error("✗ Missing COMPOSIO_API_KEY. Add it to ig-report/.env and re-run."); process.exit(1); }
  const mode = process.argv[2] ?? "run";
  const composio = new Composio({ apiKey });

  log(`→ Creating Composio Tool Router session (user: ${USER_ID}, toolkit: ${TOOLKIT})…`);
  const session: Session = await composio.create(USER_ID, { toolkits: [TOOLKIT], manageConnections: true });
  log(`✓ Session ${session.sessionId}`);

  await ensureConnected(session);
  if (mode === "connect") { log("✓ Connection step complete."); return; }
  if (mode === "discover") { await discover(session); return; }

  const existing = readExisting();

  log("→ Fetching profile (INSTAGRAM_GET_USER_INFO)…");
  const profile = await fetchProfile(session);
  log(`✓ @${profile.username} — ${profile.followers} followers, ${profile.mediaCount} posts`);

  log("→ Fetching account insights (INSTAGRAM_GET_USER_INSIGHTS)…");
  const series = await fetchSeries(session, ACCOUNT_SERIES_METRICS);

  log("→ Fetching audience demographics…");
  const audience = await fetchAudience(session);

  log("→ Fetching media (reels + posts)…");
  const { reels, posts } = await pullMedia(session);
  const scored = scoreReels(reels);
  log(`✓ ${scored.length} reel(s), ${posts.length} post(s).`);

  log("→ Fetching active stories…");
  const freshStories = await pullStories(session);
  const stories = accumulateStories((existing.instagram?.stories as Story[]) ?? [], freshStories);
  log(`✓ ${freshStories.length} active story(ies) this run · ${stories.length} in accumulated history.`);

  const content = buildContentStats(scored);
  const account = {
    reach30d: series.get("reach")?.total ?? 0,
    views30d: series.get("views")?.total ?? 0,
    newFollowers30d: series.get("follower_count")?.total ?? 0,
    accountsEngaged30d: series.get("accounts_engaged")?.total ?? 0,
    totalInteractions30d: series.get("total_interactions")?.total ?? 0,
    profileLinkTaps30d: series.get("profile_links_taps")?.total ?? 0,
    reachSeries: series.get("reach")?.series ?? [],
    followerSeries: series.get("follower_count")?.series ?? [],
    viewsSeries: series.get("views")?.series ?? [],
    available: false,
  };
  account.available = [account.reach30d, account.views30d, account.newFollowers30d, account.accountsEngaged30d, account.totalInteractions30d, account.profileLinkTaps30d].some((x) => x > 0);
  if (!account.available) log("  • account-level daily insights sparse — Growth uses reel-derived totals.");

  const now = Date.now();
  const within7 = (ts: string) => now - Date.parse(ts) < 7 * 864e5;
  const cadence = {
    reels7d: scored.filter((r) => within7(r.timestamp)).length,
    posts7d: posts.filter((p) => within7(p.timestamp)).length,
    stories7d: stories.filter((s) => within7(s.capturedAt || s.timestamp)).length,
  };

  const instagram = {
    updatedAt: new Date().toISOString(),
    profile,
    content,
    account,
    audience,
    cadence,
    reels: scored,
    reelsSummary: { count: scored.length, avgHook: content.avgHook, topReelId: scored[0]?.id ?? null },
    posts,
    postsSummary: buildPostStats(posts),
    stories,
    storiesSummary: buildStoryStats(stories),
  };

  writeFileSync("reels.json", JSON.stringify(scored, null, 2));
  writeFileSync("report.html", renderReport(scored));
  const dataPath = writeDashboardData(instagram, content, profile);
  log(`✓ Wrote ${path.basename(dataPath)} (dashboard), report.html, reels.json`);
  log("\nRefresh the dashboard Instagram tab to see it.");
}

function readExisting(): Record<string, any> {
  try { return JSON.parse(readFileSync(path.resolve("..", "dashboard-data-v2.json"), "utf8")); } catch { return {}; }
}

/** Merge freshly-pulled (active) stories into accumulated history; fresh metrics win, past stories preserved. */
function accumulateStories(existing: Story[], fresh: Story[]): Story[] {
  const byId = new Map<string, Story>();
  for (const s of existing) byId.set(s.id, s);
  for (const s of fresh) byId.set(s.id, s); // re-seen stories get their latest numbers
  return Array.from(byId.values()).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

function writeDashboardData(instagram: Record<string, unknown>, content: { totalReach: number }, profile: { followers: number; mediaCount: number }): string {
  const outPath = path.resolve("..", "dashboard-data-v2.json");
  let existing: Record<string, any> = {};
  try { existing = JSON.parse(readFileSync(outPath, "utf8")); } catch { /* first run */ }
  const merged = {
    ...existing,
    lastUpdated: new Date().toISOString(),
    instagram,
    content: { ...(existing.content ?? {}), igFollowers: profile.followers, igReach30d: content.totalReach, igReelsShipped: profile.mediaCount },
  };
  writeFileSync(outPath, JSON.stringify(merged, null, 2));
  return outPath;
}

function buildContentStats(scored: ScoredReel[]) {
  const sum = (f: (r: ScoredReel) => number) => scored.reduce((s, r) => s + f(r), 0);
  const n = scored.length;
  const totalReach = sum((r) => r.insights.reach);
  const totalViews = sum((r) => r.insights.views);
  const reachByPost = [...scored]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((r) => ({ date: r.timestamp, reach: r.insights.reach, views: r.insights.views, hook: r.hookScore, caption: (r.caption || "").slice(0, 60) }));
  return {
    reelsCount: n, totalReach, totalViews,
    totalInteractions: sum((r) => r.insights.totalInteractions),
    totalSaves: sum((r) => r.insights.saved),
    totalShares: sum((r) => r.insights.shares),
    avgReach: n ? Math.round(totalReach / n) : 0,
    avgViews: n ? Math.round(totalViews / n) : 0,
    avgWatchMs: n ? Math.round(sum((r) => r.insights.avgWatchTimeMs) / n) : 0,
    avgHook: n ? Math.round(sum((r) => r.hookScore) / n) : 0,
    reachByPost,
  };
}

function buildPostStats(posts: Post[]) {
  const sum = (f: (p: Post) => number) => posts.reduce((s, p) => s + f(p), 0);
  const n = posts.length;
  const totalReach = sum((p) => p.insights.reach);
  const totalSaves = sum((p) => p.insights.saved);
  return {
    count: n, totalReach, totalSaves,
    totalShares: sum((p) => p.insights.shares),
    totalInteractions: sum((p) => p.insights.totalInteractions),
    avgReach: n ? Math.round(totalReach / n) : 0,
    avgSaveRate: totalReach ? totalSaves / totalReach : 0,
  };
}

function buildStoryStats(stories: Story[]) {
  const sum = (f: (s: Story) => number) => stories.reduce((a, s) => a + f(s), 0);
  const n = stories.length;
  const totalReach = sum((s) => s.insights.reach);
  return {
    count: n, totalReach,
    totalReplies: sum((s) => s.insights.replies),
    totalProfileVisits: sum((s) => s.insights.profileVisits),
    totalNavigation: sum((s) => s.insights.navigation),
    avgReach: n ? Math.round(totalReach / n) : 0,
  };
}

async function fetchProfile(session: Session) {
  const res = await exec(session, "INSTAGRAM_GET_USER_INFO", { ig_user_id: "me" });
  debug("profile_raw", res);
  const d = (res as Record<string, unknown>) ?? {};
  return {
    id: String(d.id ?? ""), username: String(d.username ?? ""), name: String((d as any).name ?? d.username ?? ""),
    biography: String(d.biography ?? ""), website: String(d.website ?? ""), accountType: String(d.account_type ?? ""),
    followers: Number(d.followers_count ?? 0), following: Number(d.follows_count ?? 0),
    mediaCount: Number(d.media_count ?? 0), profilePicture: String(d.profile_picture_url ?? ""),
  };
}

async function fetchSeries(session: Session, metrics: string[]): Promise<Map<string, Series>> {
  const since = Math.floor((Date.now() - TREND_DAYS * 864e5) / 1000);
  const until = Math.floor(Date.now() / 1000);
  const out = new Map<string, Series>();
  const batch = await tryExec(session, "INSTAGRAM_GET_USER_INSIGHTS", { metric: metrics, period: "day", metric_type: "time_series", since, until });
  for (const row of batch ? extractArray(batch) : []) out.set(String(row.name), seriesFromRow(row));
  for (const m of metrics) {
    if (out.has(m)) continue;
    const r = await tryExec(session, "INSTAGRAM_GET_USER_INSIGHTS", { metric: [m], period: "day", metric_type: "time_series", since, until });
    const rows = r ? extractArray(r) : [];
    out.set(m, rows.length ? seriesFromRow(rows[0]) : { series: [], total: 0 });
  }
  return out;
}

function seriesFromRow(row: Record<string, unknown>): Series {
  const raw = Array.isArray(row.values) ? (row.values as Array<{ value?: unknown }>) : [];
  const series = raw.map((v) => Number(v.value ?? 0));
  return { series, total: series.reduce((a, b) => a + b, 0) };
}

async function fetchAudience(session: Session) {
  const dims = ["country", "city", "gender", "age"] as const;
  const result: Record<string, Demo[] | null> = {};
  for (const dim of dims) result[dim] = await fetchDemographic(session, dim);
  if (!Object.values(result).some((v) => v && v.length)) { log("  • audience demographics unavailable for this account."); return null; }
  return { countries: result.country ?? [], cities: result.city ?? [], gender: result.gender ?? [], age: result.age ?? [] };
}

async function fetchDemographic(session: Session, breakdown: string): Promise<Demo[] | null> {
  const r = await tryExec(session, "INSTAGRAM_GET_USER_INSIGHTS", { metric: ["follower_demographics"], period: "lifetime", metric_type: "total_value", breakdown });
  if (!r) return null;
  const rows = extractArray(r);
  const tv = (rows[0] as { total_value?: { breakdowns?: Array<{ results?: unknown }> } })?.total_value;
  const results = tv?.breakdowns?.[0]?.results;
  if (!Array.isArray(results)) return null;
  return (results as Array<{ dimension_values?: unknown[]; value?: unknown }>)
    .map((x) => ({ name: String((x.dimension_values ?? ["?"])[0] ?? "?"), value: Number(x.value ?? 0) }))
    .filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
}

async function ensureConnected(session: Session): Promise<void> {
  const { items } = await session.toolkits({ toolkits: [TOOLKIT] });
  const ig = items.find((i) => i.slug === TOOLKIT);
  if (ig?.connection?.isActive) { log("✓ Instagram already connected."); return; }
  log("• Instagram not connected yet — starting authorization…");
  const request = await session.authorize(TOOLKIT);
  if (request.redirectUrl) {
    log("\n========================================================");
    log("👉 Open this link, log into Instagram, and APPROVE access:");
    log(`\n   ${request.redirectUrl}\n`);
    log("========================================================\n");
  }
  log("⏳ Waiting for approval (up to 5 min)…");
  await request.waitForConnection(300_000);
  log("✓ Instagram connected!");
}

async function discover(session: Session): Promise<void> {
  const query = process.argv[3] ?? "instagram account insights media reels stories demographics";
  console.dir(await session.search({ query, toolkits: [TOOLKIT] }), { depth: 10 });
}

/** Pull recent media and split into reels (with watch time) and feed posts. */
async function pullMedia(session: Session): Promise<{ reels: Reel[]; posts: Post[] }> {
  const cutoff = Date.now() - REELS_DAYS * 864e5;
  const mediaRes = await exec(session, "INSTAGRAM_GET_IG_USER_MEDIA", {
    ig_user_id: "me",
    fields: "id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp",
    since: Math.floor(cutoff / 1000),
    limit: 100,
  });
  debug("media_raw", mediaRes);

  const reels: Reel[] = [];
  const posts: Post[] = [];
  for (const m of extractArray(mediaRes)) {
    const productType = String(m.media_product_type ?? "").toUpperCase();
    const ts = m.timestamp ? Date.parse(String(m.timestamp)) : NaN;
    if (!Number.isNaN(ts) && ts < cutoff) continue;
    const id = String(m.id);
    const base = {
      id,
      caption: String(m.caption ?? ""),
      permalink: String(m.permalink ?? ""),
      timestamp: String(m.timestamp ?? new Date().toISOString()),
      thumbnailDataUri: await toDataUri((m.thumbnail_url as string) || (m.media_url as string) || ""),
    };
    if (productType === "REELS") {
      log(`  • reel ${id} — insights…`);
      const mp = await fetchInsightMap(session, id, REEL_METRICS);
      reels.push({ ...base, insights: reelInsights(mp) });
    } else {
      log(`  • post ${id} — insights…`);
      const mp = await fetchInsightMap(session, id, POST_METRICS);
      posts.push({ ...base, mediaType: String(m.media_type ?? ""), insights: postInsights(mp) });
    }
  }
  return { reels, posts };
}

/** Pull currently-active stories (≤24h) + their insights. */
async function pullStories(session: Session): Promise<Story[]> {
  const res = await tryExec(session, "INSTAGRAM_GET_IG_USER_STORIES", { ig_user_id: "me" });
  debug("stories_raw", res);
  const stories: Story[] = [];
  for (const m of res ? extractArray(res) : []) {
    const id = String(m.id);
    const mp = await fetchInsightMap(session, id, STORY_METRICS);
    stories.push({
      id,
      permalink: String(m.permalink ?? ""),
      timestamp: String(m.timestamp ?? new Date().toISOString()),
      capturedAt: new Date().toISOString(),
      thumbnailDataUri: await toDataUri((m.thumbnail_url as string) || (m.media_url as string) || ""),
      insights: storyInsights(mp),
    });
  }
  return stories;
}

/** Generic media-insights fetch → metric-name→value map (handles values[] and total_value shapes). */
async function fetchInsightMap(session: Session, mediaId: string, metrics: string[]): Promise<Record<string, number>> {
  try {
    const res = await exec(session, "INSTAGRAM_GET_IG_MEDIA_INSIGHTS", { ig_media_id: mediaId, metric: metrics });
    debug(`insights_${mediaId}`, res);
    const map: Record<string, number> = {};
    for (const row of extractArray(res)) {
      const name = String(row.name ?? "");
      const values = (row as any).values;
      const tv = (row as any).total_value;
      if (Array.isArray(values) && values.length) map[name] = Number(values[0]?.value ?? 0);
      else if (tv && typeof tv === "object") map[name] = Number(tv.value ?? 0);
      else map[name] = Number((row as any).value ?? 0);
    }
    return map;
  } catch (err) {
    log(`    ⚠ insights ${mediaId}: ${err instanceof Error ? err.message : err}`);
    return {};
  }
}

function reelInsights(m: Record<string, number>): ReelInsights {
  const o: ReelInsights = {
    reach: m.reach ?? 0, views: m.views ?? m.plays ?? m.video_views ?? 0, likes: m.likes ?? 0,
    comments: m.comments ?? 0, shares: m.shares ?? 0, saved: m.saved ?? 0,
    totalInteractions: m.total_interactions ?? 0, avgWatchTimeMs: m.ig_reels_avg_watch_time ?? 0,
  };
  if (!o.totalInteractions) o.totalInteractions = o.likes + o.comments + o.shares + o.saved;
  return o;
}

function postInsights(m: Record<string, number>): PostInsights {
  const o: PostInsights = {
    reach: m.reach ?? 0, saved: m.saved ?? 0, shares: m.shares ?? 0,
    likes: m.likes ?? 0, comments: m.comments ?? 0, totalInteractions: m.total_interactions ?? 0,
  };
  if (!o.totalInteractions) o.totalInteractions = o.likes + o.comments + o.shares + o.saved;
  return o;
}

function storyInsights(m: Record<string, number>): StoryInsights {
  return { reach: m.reach ?? 0, replies: m.replies ?? 0, navigation: m.navigation ?? 0, profileVisits: m.profile_visits ?? 0, follows: m.follows ?? 0 };
}

async function exec(session: Session, slug: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = (await session.execute(slug, args)) as { data?: Record<string, unknown>; error?: string | null };
  if (res.error) throw new Error(`${slug} failed: ${res.error}`);
  return res.data ?? (res as Record<string, unknown>);
}

async function tryExec(session: Session, slug: string, args: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try { return await exec(session, slug, args); }
  catch (err) { log(`  ⚠ ${slug} ${JSON.stringify(args.metric ?? args.breakdown ?? "")} unavailable: ${err instanceof Error ? err.message : err}`); return null; }
}

function extractArray(obj: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(obj)) return obj as Array<Record<string, unknown>>;
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as Array<Record<string, unknown>>;
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v as Array<Record<string, unknown>>;
      if (v && typeof v === "object" && Array.isArray((v as Record<string, unknown>).data)) return (v as Record<string, unknown>).data as Array<Record<string, unknown>>;
    }
  }
  return [];
}

async function toDataUri(url: string): Promise<string> {
  if (!url) return "";
  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const type = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch { return ""; }
}

main().catch((err) => { console.error("\n✗ Error:", err instanceof Error ? err.message : err); process.exit(1); });
