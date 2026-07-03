// Cloudflare Pages Function — POST /generate
// Body: { prompt: string, key?: string, model?: string, max_tokens?: number }
//
// Routes to a free provider (Google Gemini) when a Gemini key is available, otherwise
// falls back to Anthropic. Set GEMINI_API_KEY (free, no card — aistudio.google.com) and/or
// ANTHROPIC_API_KEY in the Cloudflare Pages project: Settings -> Environment variables.
// A key pasted in the drawer field is detected by prefix (AIza… = Gemini, sk-ant… = Claude).
//
// Both providers return the Anthropic-style shape { content:[{type,text}], model, usage }
// so the frontend parsing is identical regardless of provider.

const ANTHROPIC_MODEL = "claude-sonnet-4-5";
const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 4096;
const ACCESS_HEADER = "x-fn-access-token";
const ALLOWED_ORIGINS = new Set([
  "https://pulsify-dashboard.pages.dev",
  "https://pulsify-funnels.pages.dev"
]);

function responseHeaders(request) {
  const headers = { "Content-Type": "application/json", "Vary": "Origin" };
  const origin = request && request.headers.get("Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(obj, status, request) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: responseHeaders(request)
  });
}

async function callGemini(prompt, apiKey, maxTokens, request) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(apiKey);
  let r;
  try {
    r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens } })
    });
  } catch (e) { return json({ error: { message: "network error contacting Gemini" } }, 502, request); }

  const raw = await r.text();
  let d = null; try { d = JSON.parse(raw); } catch (e) {}
  if (!r.ok) {
    const msg = (d && d.error && d.error.message) || ("Gemini HTTP " + r.status);
    return json({ error: { message: String(msg) } }, r.status, request);
  }
  const cand = d && d.candidates && d.candidates[0];
  let text = "";
  if (cand && cand.content && Array.isArray(cand.content.parts)) {
    text = cand.content.parts.map(function (p) { return p && p.text ? p.text : ""; }).join("");
  }
  if (!text) {
    const fr = cand && cand.finishReason;
    return json({ error: { message: fr ? ("Gemini returned no text (finishReason: " + fr + ")") : "Gemini returned no text" } }, 502, request);
  }
  const um = (d && d.usageMetadata) || {};
  return json({ content: [{ type: "text", text: text }], model: GEMINI_MODEL, usage: { input_tokens: um.promptTokenCount || 0, output_tokens: um.candidatesTokenCount || 0 } }, 200, request);
}

async function callAnthropic(prompt, apiKey, maxTokens, request) {
  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] })
    });
  } catch (e) { return json({ error: { message: "network error contacting Anthropic" } }, 502, request); }
  const text = await r.text();
  return new Response(text, { status: r.status, headers: responseHeaders(request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const expectedToken = String((env && env.FN_ACCESS_TOKEN) || "");
  const suppliedToken = request.headers.get(ACCESS_HEADER) || "";
  if (!suppliedToken) {
    return json({ error: { message: "Unauthorized." } }, 401, request);
  }
  if (!expectedToken) {
    return json({ error: { message: "FN_ACCESS_TOKEN is not configured." } }, 500, request);
  }
  if (suppliedToken !== expectedToken) {
    return json({ error: { message: "Unauthorized." } }, 401, request);
  }

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: { message: "invalid JSON body" } }, 400, request); }
  const prompt = body && body.prompt;
  if (!prompt || typeof prompt !== "string") return json({ error: { message: "missing prompt" } }, 400, request);
  const requestedMax = Number(body && body.max_tokens);
  const maxTokens = Math.min(
    MAX_OUTPUT_TOKENS,
    Number.isFinite(requestedMax) && requestedMax > 0 ? Math.floor(requestedMax) : 2048
  );

  const bodyKey = ((body && body.key) || "").trim();
  const isGeminiKey = bodyKey && bodyKey.indexOf("AIza") === 0;
  const isAnthropicKey = bodyKey && bodyKey.indexOf("sk-ant") === 0;

  const geminiKey = isGeminiKey ? bodyKey : ((!isAnthropicKey && env && env.GEMINI_API_KEY) || "");
  const anthropicKey = isAnthropicKey ? bodyKey : ((env && env.ANTHROPIC_API_KEY) || "");

  if (geminiKey) return await callGemini(prompt, geminiKey, maxTokens, request);
  if (anthropicKey) return await callAnthropic(prompt, anthropicKey, maxTokens, request);
  return json({ error: { message: "No LLM key set. Add GEMINI_API_KEY (free, aistudio.google.com) or ANTHROPIC_API_KEY in Cloudflare Pages -> Settings -> Environment variables, or paste a key in the drawer field." } }, 500, request);
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
