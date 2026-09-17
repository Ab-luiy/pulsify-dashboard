import { withOperator } from '../_shared/access.js';
import { hasOperator } from '../_shared/access.js';
/**
 * One-click page-copy generation for the "New prospect page" flow in /settings.
 *
 * POST /api/generate
 * Header: x-admin-key: <ADMIN_KEY>
 * Body: { brief: string }
 *
 * Builds the same prompt the operator can copy manually (see functions/_shared/
 * provision-prompt.js, twin of js/provision-prompt.js), sends it to whichever LLM
 * key is configured (Gemini preferred, then Anthropic), and returns the parsed,
 * sanitized JSON result. This endpoint only GENERATES — it never writes to the
 * database. The UI feeds the result into the existing "paste JSON" -> "create page"
 * path so the operator reviews before saving.
 *
 * Fails soft: no key configured returns 501 (not an error state, just "not set up
 * yet — use the copy-prompt path"). Any upstream/parse failure returns 502 with a
 * plain-text reason. This function never throws unhandled.
 */

import { buildPrompt, knownTokenKeys } from "../_shared/provision-prompt.js";

const CLIENT_SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/;

async function handle_onRequestPost({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid JSON body" }, 400);
  }

  const brief = String(body?.brief || "").trim();
  if (!brief) return json({ ok: false, error: "brief is required" }, 422);

  const prompt = buildPrompt(brief);

  let rawText;
  try {
    if (env.GEMINI_API_KEY) {
      rawText = await callGemini(prompt, env.GEMINI_API_KEY);
    } else if (env.ANTHROPIC_API_KEY) {
      rawText = await callAnthropic(prompt, env.ANTHROPIC_API_KEY);
    } else {
      return json({ ok: false, error: "no llm key configured" }, 501);
    }
  } catch (error) {
    return json({ ok: false, error: `upstream LLM call failed: ${safeMessage(error)}` }, 502);
  }

  let result;
  try {
    result = extractAndValidate(rawText);
  } catch (error) {
    return json({ ok: false, error: `could not parse model output: ${safeMessage(error)}` }, 502);
  }

  return json({ ok: true, result });
}

async function handle_onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

async function callGemini(prompt, apiKey) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p?.text || "").join("");
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

async function callAnthropic(prompt, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const data = await response.json();
  const text = (data?.content || []).map((block) => block?.text || "").join("");
  if (!text) throw new Error("Anthropic returned no text");
  return text;
}

function extractAndValidate(rawText) {
  const jsonSlice = extractJsonSlice(rawText);
  const parsed = JSON.parse(jsonSlice);

  const clientSlug = sanitizeSlug(parsed.client_slug || parsed.client_name || "");
  if (!clientSlug) throw new Error("no usable client_slug in model output");

  const clientName = String(parsed.client_name || "").trim() || titleCase(clientSlug);
  const templateVariant = parsed.template_variant === "variant-02" ? "variant-02" : "canonical";

  const allowed = new Set(knownTokenKeys());
  const pageContent = {};
  if (parsed.page_content && typeof parsed.page_content === "object") {
    for (const [key, value] of Object.entries(parsed.page_content)) {
      if (allowed.has(key) && value != null && String(value).trim()) {
        pageContent[key] = String(value).trim();
      }
    }
  }

  return {
    client_slug: clientSlug,
    client_name: clientName,
    template_variant: templateVariant,
    page_content: pageContent,
  };
}

function extractJsonSlice(text) {
  let stripped = String(text || "").trim();
  // strip markdown code fences if present
  stripped = stripped.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("no JSON object found in model output");
  }
  return stripped.slice(start, end + 1);
}

function sanitizeSlug(value) {
  const lowered = String(value || "").toLowerCase().trim();
  const slug = lowered
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return CLIENT_SLUG_RE.test(slug) ? slug : "";
}

function titleCase(slug) {
  return String(slug || "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function safeMessage(error) {
  return String(error?.message || error || "unknown error").slice(0, 400);
}

function checkAuth(request, env) {
  if (!hasOperator(request, env)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}

function json(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}

export const onRequestPost = withOperator(handle_onRequestPost);
export const onRequestOptions = withOperator(handle_onRequestOptions);
