import { buildManualPrompt, buildSequencePrompt } from "../_shared/sequence-prompt.js";
import { cleanId, json, nowIso, parseJson } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;

  const body = await request.json().catch(() => ({}));
  const type = normalizeType(body.type);
  const intent = String(body.intent || "").trim();
  const topic = String(body.topic || "").trim();
  const goal = normalizeGoal(body.goal);
  const triggerWord = String(body.trigger_word || "").trim();
  const proofLines = normalizeLines(body.proof_lines);
  const slideCount = clampSlideCount(body.slide_count);

  if (!type && !intent) {
    return json({ ok: false, error: "type or intent is required" }, 422);
  }
  if (!topic) {
    return json({ ok: false, error: "topic is required" }, 422);
  }

  const client = cleanId(access.client);
  const clientContext = await loadClientContext(env, client);
  const promptInput = {
    clientName: clientContext.client_name || access.client_name || client,
    clientProfile: clientContext.client_profile,
    type,
    intent,
    topic,
    goal,
    triggerWord,
    proofLines,
    slideCount,
  };
  const prompt = buildSequencePrompt(promptInput);
  const manualPrompt = buildManualPrompt(promptInput);
  const paramsPayload = {
    type: type || null,
    intent: intent || null,
    topic,
    goal,
    trigger_word: triggerWord || null,
    proof_lines: proofLines,
    slide_count: slideCount,
  };

  if (!env.GEMINI_API_KEY && !env.ANTHROPIC_API_KEY) {
    const rowId = await insertSequence(env, {
      client,
      type: type || null,
      intent: intent || null,
      topic,
      goal,
      triggerWord: triggerWord || null,
      paramsJson: JSON.stringify(paramsPayload),
      outputJson: null,
      manualPrompt,
      status: "draft",
      reviewNote: null,
    });
    return json({
      ok: true,
      id: rowId,
      mode: "manual",
      manual_prompt: manualPrompt,
      output: null,
    });
  }

  const provider = env.GEMINI_API_KEY ? "gemini" : "anthropic";
  let rawText = "";
  try {
    rawText = provider === "gemini"
      ? await callGemini(prompt, env.GEMINI_API_KEY)
      : await callAnthropic(prompt, env.ANTHROPIC_API_KEY);
  } catch (error) {
    return json({
      ok: false,
      provider,
      error: `upstream ${provider} call failed: ${safeMessage(error)}`,
      manual_prompt: manualPrompt,
    }, 502);
  }

  let parsed;
  let outputJson = null;
  let mode = "generated";
  let warning = "";
  try {
    parsed = sanitizeSequenceOutput(parseModelJson(rawText), {
      type,
      intent,
      slideCount,
      goal,
      triggerWord,
    });
    outputJson = JSON.stringify(parsed);
  } catch (error) {
    mode = "manual";
    warning = `Model output was not valid JSON: ${safeMessage(error)}`;
    outputJson = JSON.stringify({ raw_text: rawText, parse_error: warning });
    parsed = null;
  }

  const rowId = await insertSequence(env, {
    client,
    type: type || parsed?.type || null,
    intent: intent || null,
    topic,
    goal,
    triggerWord: triggerWord || null,
    paramsJson: JSON.stringify(paramsPayload),
    outputJson,
    manualPrompt,
    status: "draft",
    reviewNote: warning || null,
  });

  return json({
    ok: true,
    id: rowId,
    provider,
    mode,
    output: parsed,
    raw_text: parsed ? undefined : rawText,
    warning: warning || undefined,
    manual_prompt: manualPrompt,
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

async function loadClientContext(env, client) {
  const [configRow, sectionRows] = await Promise.all([
    env.DB.prepare(
      `SELECT client, COALESCE(client_name, client) AS client_name, page_content_json
         FROM client_config
        WHERE client=?`,
    ).bind(client).first(),
    env.DB.prepare(
      `SELECT section, json
         FROM client_dashboard_content
        WHERE client_id=?`,
    ).bind(client).all(),
  ]);

  const pageContent = parseJson(configRow?.page_content_json, {});
  const sections = {};
  for (const row of sectionRows.results || []) {
    sections[row.section] = parseJson(row.json, null);
  }

  const profileParts = [
    pageContent.AUDIENCE_PILL ? `Audience: ${pageContent.AUDIENCE_PILL}` : "",
    pageContent.HEADLINE_LINE_ONE ? `Headline: ${pageContent.HEADLINE_LINE_ONE}` : "",
    pageContent.HERO_SUBHEAD ? `Offer context: ${pageContent.HERO_SUBHEAD}` : "",
    sections.momentum?.headline ? `Momentum headline: ${sections.momentum.headline}` : "",
  ].filter(Boolean);

  return {
    client_name: configRow?.client_name || client,
    client_profile: profileParts.join(" | ") || "No structured client profile is saved in the dashboard yet.",
  };
}

async function insertSequence(env, input) {
  const timestamp = nowIso();
  const result = await env.DB.prepare(
    `INSERT INTO studio_sequences (
       client_id, type, intent, topic, goal, trigger_word,
       params_json, output_json, manual_prompt, status, review_note,
       created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    input.client,
    input.type,
    input.intent,
    input.topic,
    input.goal,
    input.triggerWord,
    input.paramsJson,
    input.outputJson,
    input.manualPrompt,
    input.status,
    input.reviewNote,
    timestamp,
    timestamp,
  ).run();
  return Number(result.meta?.last_row_id || 0);
}

async function callGemini(prompt, apiKey) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: prompt.system }] },
          { role: "user", parts: [{ text: prompt.user }] },
        ],
        generationConfig: {
          temperature: 0.5,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`${response.status}: ${(await response.text()).slice(0, 400)}`);
  }
  const data = await response.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((part) => part?.text || "").join("");
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
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
    }),
  });
  if (!response.ok) {
    throw new Error(`${response.status}: ${(await response.text()).slice(0, 400)}`);
  }
  const data = await response.json();
  const text = (data?.content || []).map((block) => block?.text || "").join("");
  if (!text) throw new Error("Anthropic returned no text");
  return text;
}

function parseModelJson(rawText) {
  const text = String(rawText || "").trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No JSON object found.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function sanitizeSequenceOutput(value, fallback) {
  const result = value && typeof value === "object" ? value : {};
  const slides = Array.isArray(result.slides) ? result.slides : [];
  if (!slides.length) throw new Error("Missing slides array.");

  return {
    type: normalizeType(result.type) || fallback.type || "value-driven",
    mapped_from_intent: String(result.mapped_from_intent || fallback.intent || "").trim(),
    slides: slides.map((slide, index) => ({
      n: Number(slide?.n || index + 1),
      job: String(slide?.job || "").trim(),
      text_pills: Array.isArray(slide?.text_pills)
        ? slide.text_pills.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
        : [],
      emphasis: String(slide?.emphasis || "").trim(),
      photo: {
        primary: String(slide?.photo?.primary || "").trim(),
        alternative: String(slide?.photo?.alternative || "").trim(),
      },
      interactive: String(slide?.interactive || "none").trim() || "none",
    })).slice(0, clampSlideCount(fallback.slideCount)),
    hooks: Array.isArray(result.hooks)
      ? result.hooks.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 2)
      : [],
    why_order: String(result.why_order || "").trim(),
    posting_note: String(result.posting_note || "").trim(),
  };
}

function normalizeType(value) {
  const type = String(value || "").trim().toLowerCase();
  return [
    "value-driven",
    "credibility",
    "q&a",
    "day-in-the-life",
    "breakdown",
    "lifestyle",
    "cta",
    "start-here",
    "story launch",
  ].includes(type) ? type : "";
}

function normalizeGoal(value) {
  const goal = String(value || "").trim().toLowerCase();
  if (goal === "dms" || goal === "dm") return "dms";
  if (goal === "booked calls" || goal === "calls") return "booked calls";
  return "reach";
}

function normalizeLines(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12);
}

function clampSlideCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 8;
  return Math.max(3, Math.min(12, Math.round(number)));
}

function safeMessage(error) {
  return String(error?.message || error || "unknown error").slice(0, 400);
}
