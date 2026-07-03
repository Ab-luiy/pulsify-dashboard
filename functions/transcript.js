// Cloudflare Pages Function — POST /transcript
// Body: { urls: ["https://youtube.com/watch?v=...", ...] }  (max 3)
// Returns: { transcripts: [ {url, videoId, lang, text} | {url, videoId, error} ] }
//
// Pulls real YouTube caption tracks via the Supadata API (server-side, so the
// key stays off the client and YouTube's proof-of-origin lockdown is handled
// by the provider). Set SUPADATA_API_KEY in the Cloudflare Pages project's
// environment variables (Settings -> Environment variables).

const SUPADATA_ENDPOINT = "https://api.supadata.ai/v1/youtube/transcript";
const ACCESS_HEADER = "x-fn-access-token";
const ALLOWED_ORIGINS = new Set([
  "https://pulsify-dashboard.pages.dev",
  "https://pulsify-funnels.pages.dev"
]);

function extractVideoId(input) {
  if (!input) return null;
  input = String(input).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const u = new URL(input);
    if (u.hostname.indexOf("youtu.be") !== -1) {
      const id = u.pathname.slice(1, 12);
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
    const v = u.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const m = u.pathname.match(/\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch (e) { /* not a URL, fall through */ }
  const m = input.match(/[A-Za-z0-9_-]{11}/);
  return m ? m[0] : null;
}

async function fetchOne(rawUrl, apiKey) {
  const videoId = extractVideoId(rawUrl);
  if (!videoId) return { url: rawUrl, error: "could not parse a YouTube video id" };
  const watch = "https://www.youtube.com/watch?v=" + videoId;
  // lang=en: without it Supadata may return a translated track (e.g. Arabic) instead of the
  // creator's original words. Our ICP is English-speaking, so prefer the English/original track.
  const api = SUPADATA_ENDPOINT + "?url=" + encodeURIComponent(watch) + "&text=true&lang=en";

  let r;
  try {
    r = await fetch(api, { headers: { "x-api-key": apiKey } });
  } catch (e) {
    return { url: rawUrl, videoId, error: "network error contacting transcript API" };
  }

  const body = await r.text();
  let data = null;
  try { data = JSON.parse(body); } catch (e) { /* non-JSON */ }

  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || ("transcript API HTTP " + r.status);
    return { url: rawUrl, videoId, error: String(msg) };
  }
  if (data && data.jobId && !data.content) {
    return { url: rawUrl, videoId, error: "transcript is processing async (long video) — try a shorter video or paste manually" };
  }

  let text = "";
  if (data) {
    if (typeof data.content === "string") text = data.content;
    else if (Array.isArray(data.content)) text = data.content.map(function (c) { return c && c.text ? c.text : ""; }).join(" ");
  }
  text = (text || "").replace(/\s+/g, " ").trim();
  if (!text) return { url: rawUrl, videoId, error: "no transcript returned (captions may be disabled on this video)" };

  const lang = (data && (data.lang || (Array.isArray(data.availableLangs) && data.availableLangs[0]))) || "";
  return { url: rawUrl, videoId, lang, text };
}

function responseHeaders(request) {
  const headers = { "Content-Type": "application/json", "Vary": "Origin" };
  const origin = request && request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(obj, status, request) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: responseHeaders(request)
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const expectedToken = String((env && env.FN_ACCESS_TOKEN) || "");
  const suppliedToken = request.headers.get(ACCESS_HEADER) || "";
  if (!suppliedToken) {
    return jsonResponse({ error: "Unauthorized." }, 401, request);
  }
  if (!expectedToken) {
    return jsonResponse({ error: "FN_ACCESS_TOKEN is not configured." }, 500, request);
  }
  if (suppliedToken !== expectedToken) {
    return jsonResponse({ error: "Unauthorized." }, 401, request);
  }
  const apiKey = env && env.SUPADATA_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "SUPADATA_API_KEY is not set on this Cloudflare Pages project (Settings -> Environment variables)." }, 500, request);
  }

  let parsed;
  try { parsed = await request.json(); } catch (e) { return jsonResponse({ error: "invalid JSON body" }, 400, request); }

  let urls = parsed && parsed.urls;
  if (typeof urls === "string") urls = [urls];
  if (!Array.isArray(urls) || !urls.length) return jsonResponse({ error: "provide { urls: [...] }" }, 400, request);
  urls = urls.slice(0, 3);

  const transcripts = [];
  for (let i = 0; i < urls.length; i++) {
    transcripts.push(await fetchOne(urls[i], apiKey)); // sequential — gentler on rate limits
  }
  return jsonResponse({ transcripts }, 200, request);
}

export async function onRequestOptions(context) {
  const headers = responseHeaders(context.request);
  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  headers["Access-Control-Allow-Headers"] = "Content-Type, X-FN-Access-Token";
  return new Response(null, {
    status: 204,
    headers
  });
}
