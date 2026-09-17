import { youtube } from "./youtube.js";

const QUERIES = {
  trading: ["trading psychology","how to stop revenge trading","how to stop overtrading","trading discipline","how to be a consistent trader","why you keep losing money trading","why 90% of traders fail","how to find your trading edge","taking profit too early trading","stop loss hunting explained","smart money concepts trading","how to pass a prop firm challenge","why i keep failing prop firm challenge","making 10k a month trading","how to read trend lines","my day trading strategy","forex mentorship"],
  ecom: ["why my dropshipping store isnt selling","getting traffic but no sales shopify","low conversion rate shopify","facebook ads not converting dropshipping","tiktok ads not profitable dropshipping","why my dropshipping ads not working","how to scale dropshipping ads","dropshipping ads stopped working","cant find a winning product","how to find winning products that sell","dropshipping product testing not working","tiktok shop views but no sales","tiktok shop no orders","how to get affiliates tiktok shop","how to increase tiktok shop sales","making 10k a month dropshipping","my dropshipping strategy","tiktok shop affiliate strategy","dropshipping mentorship"],
  fba: ["why my amazon product isnt selling","amazon product not ranking","how to rank amazon products","amazon ppc not converting","how to lower acos amazon","amazon fba margins too low","amazon fba too competitive","amazon product launch failed","amazon listing suppressed","how to get reviews on amazon fba","making 10k a month amazon fba","amazon fba product research","my amazon fba strategy","amazon fba mentorship"],
};
const ALL_QUERIES = Object.entries(QUERIES).flatMap(([niche, queries]) => queries.map((query) => ({ niche, query })));
const BATCH_SIZE = 30;
const MIN_SCORE = 7000;
const EXCLUDED_HANDLES = new Set(["franz_wieler1", "abluiy", "imangadzhi"]);
const QUALITY = /\b(for beginners|how to start|step[- ]?by[- ]?step|course|academy|masterclass|mentorship|free training|my students|learn to|tutorial|full guide|day trading|forex|options trading|dropshipping|shopify|tiktok shop|amazon fba|ecommerce|e-commerce)\b/i;
const CRAFT = /(\$[\d,]+|\b\d+\s?k\b|my (strategy|method|system|setup|results?|store|journey)|how i (made|make|built|grew|started|hit|passed)|live (trading|trade)|winning product|product research|first sale|funded account|case study)/i;
const OFF_ICP = /\b(smma|agency|agencies|appointment setter|closer|high ticket sales|lead gen|grow (your|my|on) (youtube|instagram|ig)|go viral|content creator|content creation|personal brand|video editing|thumbnail)\b/i;
const SCAM = /(not clickbait|get rich quick|guaranteed|overnight|free money|easy money|while you sleep|secret loophole|glitch|official music|lyrics)/i;

export async function syncYouTubeLeads(env) {
  if (!env.YT_API_KEY) throw new Error("YT_API_KEY is not configured");
  const cursorRow = await env.DB.prepare(
    "SELECT value_json FROM yt_leads_meta WHERE key='query_cursor'",
  ).first();
  const cursor = Number(JSON.parse(cursorRow?.value_json || "0")) || 0;
  const selected = Array.from({ length: Math.min(BATCH_SIZE, ALL_QUERIES.length) }, (_, index) => ALL_QUERIES[(cursor + index) % ALL_QUERIES.length]);
  const publishedAfter = new Date(Date.now() - 90 * 86400000).toISOString();
  const candidates = [];
  for (const item of selected) {
    const result = await youtube(env, "search", {
      part: "snippet",
      q: item.query,
      type: "video",
      order: "relevance",
      relevanceLanguage: "en",
      publishedAfter,
      maxResults: 50,
    });
    for (const row of result.items || []) candidates.push({ ...item, row });
  }
  const unique = new Map();
  for (const candidate of candidates) {
    const id = candidate.row?.id?.videoId;
    if (id && !unique.has(id)) unique.set(id, candidate);
  }
  const videoIds = [...unique.keys()];
  const videos = new Map();
  for (let index = 0; index < videoIds.length; index += 50) {
    const result = await youtube(env, "videos", { part: "contentDetails,statistics,snippet", id: videoIds.slice(index, index + 50).join(",") });
    for (const row of result.items || []) videos.set(row.id, row);
  }
  const channelIds = [...new Set([...videos.values()].map((video) => video.snippet?.channelId).filter(Boolean))];
  const channels = new Map();
  for (let index = 0; index < channelIds.length; index += 50) {
    const result = await youtube(env, "channels", { part: "snippet,statistics,brandingSettings", id: channelIds.slice(index, index + 50).join(",") });
    for (const row of result.items || []) channels.set(row.id, row);
  }

  const bestByChannel = new Map();
  for (const [videoId, candidate] of unique) {
    const video = videos.get(videoId);
    const channel = channels.get(video?.snippet?.channelId);
    if (!video || !channel || durationSeconds(video.contentDetails?.duration) < 60) continue;
    const subscribers = Number(channel.statistics?.subscriberCount || 0);
    if (subscribers < 300 || subscribers > 500000) continue;
    const handle = String(channel.snippet?.customUrl || "").replace(/^@/, "").toLowerCase();
    if (EXCLUDED_HANDLES.has(handle)) continue;
    const score = scoreLead(video, channel, candidate.niche);
    if (score < MIN_SCORE) continue;
    const channelUrl = handle ? `https://www.youtube.com/@${handle}` : `https://www.youtube.com/channel/${channel.id}`;
    const lead = {
      s: score,
      n: channel.snippet?.title || "Unknown",
      cu: channelUrl,
      ig: extractInstagram(channel.snippet?.description || channel.brandingSettings?.channel?.description || ""),
      vt: video.snippet?.title || "",
      vu: `https://www.youtube.com/watch?v=${videoId}`,
      pd: String(video.snippet?.publishedAt || "").slice(0, 10),
      lt: "",
      ol: "",
      tv: Number(video.statistics?.viewCount || 0),
      tw: Number(channel.statistics?.viewCount || 0),
      sq: candidate.query,
      subs: subscribers,
      niche: candidate.niche,
    };
    const prior = bestByChannel.get(channel.id);
    if (!prior || lead.s > prior.s) bestByChannel.set(channel.id, lead);
  }
  const updatedAt = new Date().toISOString();
  for (const [, lead] of bestByChannel) {
    const id = await leadId(lead);
    await env.DB.prepare(
      `INSERT INTO yt_leads(id,payload_json,score,tier,niche,updated_at)
       VALUES(?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET
         payload_json=CASE WHEN excluded.score>=yt_leads.score THEN excluded.payload_json ELSE yt_leads.payload_json END,
         score=MAX(yt_leads.score,excluded.score),niche=excluded.niche,updated_at=excluded.updated_at`,
    ).bind(id, JSON.stringify(lead), lead.s, tier(lead.s), lead.niche, updatedAt).run();
  }
  const nextCursor = (cursor + selected.length) % ALL_QUERIES.length;
  const metadata = {
    scrapedAt: updatedAt.slice(0, 10),
    scrapedAtFull: updatedAt,
    newThisRun: bestByChannel.size,
    queriesRun: selected.length,
    queryCursor: nextCursor,
    totalQueries: ALL_QUERIES.length,
    filters: { min_subs: 300, max_subs: 500000, min_video_seconds: 60, lookback_days: 90 },
  };
  const total = await env.DB.prepare("SELECT COUNT(*) AS count FROM yt_leads").first();
  metadata.count = Number(total?.count || 0);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO yt_leads_meta(key,value_json) VALUES('latest',?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json").bind(JSON.stringify(metadata)),
    env.DB.prepare("INSERT INTO yt_leads_meta(key,value_json) VALUES('query_cursor',?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json").bind(JSON.stringify(nextCursor)),
  ]);
  return bestByChannel.size;
}

function scoreLead(video, channel, niche) {
  const title = String(video.snippet?.title || "");
  const description = String(video.snippet?.description || "");
  const views = Number(video.statistics?.viewCount || 0);
  const subscribers = Number(channel.statistics?.subscriberCount || 0);
  let score = 2000;
  const age = Math.max(0, Math.floor((Date.now() - Date.parse(video.snippet?.publishedAt || 0)) / 86400000));
  score += Math.max(0, 2500 - age * 25);
  if (subscribers >= 2000 && subscribers <= 50000) score += 3500;
  else if (subscribers >= 500 && subscribers <= 120000) score += 2000;
  else if (subscribers > 200000) score -= 2000;
  if (subscribers) score += Math.floor(Math.min(1500, (views / subscribers) * 600));
  if (QUALITY.test(title) || QUALITY.test(description.slice(0, 400))) score += 600;
  if (CRAFT.test(title)) score += 600;
  if (SCAM.test(title)) score -= 4000;
  if (OFF_ICP.test(title) || OFF_ICP.test(description.slice(0, 400))) score -= 5000;
  if (["US", "GB", "CA", "AU", "NZ", "IE"].includes(channel.snippet?.country)) score += 1000;
  score += ["trading", "ecom", "fba"].includes(niche) ? 500 : 0;
  return Math.max(0, score);
}

function durationSeconds(value) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(value || ""));
  return match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : 0;
}

function extractInstagram(value) {
  const text = String(value || "");
  const match = /instagram\.com\/([A-Za-z0-9_.]{2,30})/i.exec(text) || /(?:^|\s)@([A-Za-z0-9_.]{3,30})\s*(?:on\s+(?:ig|instagram)|ig|insta)/i.exec(text);
  return match ? `@${match[1].replace(/^@/, "").toLowerCase()}` : "";
}

function tier(score) {
  if (score >= 10000) return "tier-1";
  if (score >= 8500) return "tier-2";
  return "tier-3";
}

export async function leadId(lead) {
  const source = String(lead?.cu || lead?.n || "").trim().toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
