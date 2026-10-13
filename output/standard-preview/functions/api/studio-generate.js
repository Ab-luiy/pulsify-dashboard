import { humanizeDeep } from "../_shared/humanizer.js";
import {
  buildManualPrompt,
  buildManualSequenceOutput,
  buildSequencePrompt,
  sanitizeDesignDirection,
} from "../_shared/sequence-prompt.js";
import { cleanId, json, nowIso, parseJson } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { parseModelJson } from "../_shared/anthropic.js";
import { aiConfigured, aiMode, generateText, resolveAi } from "../_shared/ai-provider.js";
import { loadRules } from "../_shared/content-learning.js";
import { buildGeneratorBrainContext, loadClientBrainData } from "../_shared/client-brain-context.js";

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
  // One switch per client (see ai-provider.js): their own key, else a prompt for their own AI.
  const ai = await resolveAi(env, client);
  const forceManual = !aiConfigured(ai);
  const clientContext = await loadClientContext(env, client);
  const brainContext = buildGeneratorBrainContext(clientContext.brain);
  const learning = await loadReviewLearning(env, client, type);
  const effectiveTriggerWord = triggerWord || brainContext.trigger_words[0] || "";
  const effectiveProofLines = uniqueLines([...proofLines, ...brainContext.proof_lines]);
  const promptInput = {
    clientName: clientContext.client_name || access.client_name || client,
    clientProfile: clientContext.client_profile,
    clientBrain: brainContext.prompt_text,
    type,
    intent,
    topic,
    goal,
    triggerWord: effectiveTriggerWord,
    proofLines: effectiveProofLines,
    slideCount,
    examples: learning.examples,
    rules: learning.rules,
  };
  const prompt = buildSequencePrompt(promptInput);
  const manualPrompt = buildManualPrompt(promptInput);
  const paramsPayload = {
    type: type || null,
    intent: intent || null,
    topic,
    goal,
    trigger_word: effectiveTriggerWord || null,
    proof_lines: effectiveProofLines,
    slide_count: slideCount,
    brain_context: {
      used: brainContext.used,
      fields_used: brainContext.fields_used,
      updated_at: brainContext.updated_at,
      truncated: brainContext.truncated,
    },
    learning: {
      example_ids: learning.exampleIds,
      rules_used: learning.rules.length,
    },
  };

  if (forceManual) {
    const manualOutput = buildManualSequenceOutput(promptInput);
    const rowId = await insertSequence(env, {
      client,
      type: type || null,
      intent: intent || null,
      topic,
      goal,
      triggerWord: effectiveTriggerWord || null,
      paramsJson: JSON.stringify(paramsPayload),
      outputJson: JSON.stringify(manualOutput),
      manualPrompt,
      status: "draft",
      reviewNote: null,
    });
    return json({
      ok: true,
      id: rowId,
      mode: "manual",
      manual_prompt: manualPrompt,
      output: manualOutput,
      brain_context: paramsPayload.brain_context,
    });
  }

  const provider = aiMode(ai);
  let rawText = "";
  try {
    rawText = await generateText(prompt, ai, { json: true });
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
    parsed = sanitizeSequenceOutput(humanizeDeep(parseModelJson(rawText)), {
      type,
      intent,
      slideCount,
      goal,
      triggerWord: effectiveTriggerWord,
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
    triggerWord: effectiveTriggerWord || null,
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
    brain_context: paramsPayload.brain_context,
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
  const [configRow, sectionRows, brain] = await Promise.all([
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
    loadClientBrainData(env, client),
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
    brain,
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

// What the review gate taught: the client's approved sequences (same type first) are shown as
// examples, and every active rejection reason for this client or for all clients is a rule.
async function loadReviewLearning(env, client, type) {
  const [exampleRows, ruleRows] = await Promise.all([
    env.DB.prepare(
      `SELECT id, type, topic, output_json
         FROM studio_sequences
        WHERE client_id=? AND status='approved'
        ORDER BY CASE WHEN type=? THEN 0 ELSE 1 END, updated_at DESC
        LIMIT 3`,
    ).bind(client, type || "").all().catch(() => ({ results: [] })),
    loadRules(env, client, 'sequence'),
  ]);
  const examples = [];
  const exampleIds = [];
  for (const row of exampleRows.results || []) {
    const output = parseJson(row.output_json, null);
    const slides = Array.isArray(output?.slides) ? output.slides.filter((slide) => (slide?.text_pills || []).some(Boolean)) : [];
    if (!slides.length) continue;
    examples.push({ type: row.type || output.type || "", topic: row.topic || "", slides });
    exampleIds.push(Number(row.id));
  }
  return { examples, exampleIds, rules: ruleRows };
}

function sanitizeSequenceOutput(value, fallback) {
  const result = value && typeof value === "object" ? value : {};
  const slides = Array.isArray(result.slides) ? result.slides : [];
  if (!slides.length) throw new Error("Missing slides array.");

  return {
    type: normalizeType(result.type) || fallback.type || "value-driven",
    mapped_from_intent: String(result.mapped_from_intent || fallback.intent || "").trim(),
    slides: slides.map((slide, index) => {
      const slideNumber = Number(slide?.n || index + 1);
      const job = String(slide?.job || "").trim();
      const designDirection = sanitizeDesignDirection(slide?.design || slide?.design_direction, {
        type: normalizeType(result.type) || fallback.type || "value-driven",
        slideNumber,
        slideCount: fallback.slideCount,
        job,
      });
      return {
        n: slideNumber,
        job,
        text_pills: Array.isArray(slide?.text_pills)
          ? slide.text_pills.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
          : [],
        emphasis: String(slide?.emphasis || "").trim(),
        photo: {
          primary: String(slide?.photo?.primary || "").trim(),
          alternative: String(slide?.photo?.alternative || "").trim(),
        },
        interactive: String(slide?.interactive || "none").trim() || "none",
        design: toDesignBlock(designDirection),
        design_direction: designDirection,
      };
    }).slice(0, clampSlideCount(fallback.slideCount)),
    hooks: Array.isArray(result.hooks)
      ? result.hooks.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 2)
      : [],
    why_order: String(result.why_order || "").trim(),
    posting_note: String(result.posting_note || "").trim(),
  };
}

function toDesignBlock(direction) {
  return {
    annotation: direction.annotations,
    image_class: {
      type: direction.image_class,
      artifact: direction.artifact_slot,
    },
    treatment: direction.treatment,
    chips: direction.chips,
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

function uniqueLines(value) {
  return [...new Set(normalizeLines(value))].slice(0, 12);
}

function clampSlideCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 8;
  return Math.max(3, Math.min(12, Math.round(number)));
}

function safeMessage(error) {
  return String(error?.message || error || "unknown error").slice(0, 400);
}
