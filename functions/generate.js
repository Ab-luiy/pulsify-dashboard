// Cloudflare Pages Function — POST /generate
// Body: { prompt: string, key?: string, model?: string, max_tokens?: number }
//
// Proxies to the Anthropic Messages API using ANTHROPIC_API_KEY (server-side) so the
// browser never needs the key. A per-request `key` (from the optional drawer field)
// overrides the env var when provided. Set ANTHROPIC_API_KEY in the Cloudflare Pages
// project: Settings -> Environment variables.

const DEFAULT_MODEL = "claude-sonnet-4-5";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: { message: "invalid JSON body" } }, 400); }

  const prompt = body && body.prompt;
  if (!prompt || typeof prompt !== "string") return json({ error: { message: "missing prompt" } }, 400);

  const apiKey = (body && body.key) || (env && env.ANTHROPIC_API_KEY);
  if (!apiKey) {
    return json({ error: { message: "ANTHROPIC_API_KEY is not set on this Cloudflare Pages project (Settings -> Environment variables), and no key was entered." } }, 500);
  }

  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: (body && body.model) || DEFAULT_MODEL,
        max_tokens: (body && body.max_tokens) || 2048,
        messages: [{ role: "user", content: prompt }]
      })
    });
  } catch (e) {
    return json({ error: { message: "network error contacting Anthropic" } }, 502);
  }

  // Pass Anthropic's JSON straight through — same shape the frontend already parses.
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
