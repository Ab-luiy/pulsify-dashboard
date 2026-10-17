import { humanizeDeep } from '../_shared/humanizer.js';
import { withOperator } from '../_shared/access.js';
import { hasOperator } from '../_shared/access.js';
import { checkAdmin, cleanId, json, nowIso, parseJson } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { clientLabel, notify } from "../_shared/notifications.js";
import { buildGeneratorBrainContext, loadClientBrainData } from "../_shared/client-brain-context.js";
import { carouselLearningBlocks, loadCarouselLearning } from "../_shared/content-learning.js";
import { parseModelJson } from "../_shared/anthropic.js";
import { aiConfigured, aiMode, generateText, resolveAi } from "../_shared/ai-provider.js";
import {
  applyCarouselLayouts,
  safePhoto,
  buildCarouselPrompt,
  buildManualCarouselOutput,
  buildManualCarouselPrompt,
  clampCarouselSlideCount,
  normalizeCarouselGoal,
  normalizeCarouselStructure,
  sanitizeCarouselOutput,
} from "../_shared/carousel-prompt.js";
import { applyRewrite, buildRewritePrompt, readRewriteReply, readRewriteRequest } from "../_shared/carousel-rewrite.js";

const SELECT_COLUMNS = `id, client_id, structure, topic, goal, params_json, output_json,
  manual_prompt, status, review_note, created_at, updated_at`;

async function handle_onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const hasAdminKey = hasOperator(request, env);

  if (hasAdminKey) {
    const status = normalizeStatusFilter(url.searchParams.get("status"));
    const query = status
      ? `SELECT ${SELECT_COLUMNS} FROM studio_carousels WHERE status=? ORDER BY updated_at DESC, id DESC`
      : `SELECT ${SELECT_COLUMNS} FROM studio_carousels ORDER BY updated_at DESC, id DESC`;
    const statement = env.DB.prepare(query);
    const rows = status ? await statement.bind(status).all() : await statement.all();
    return json({ ok: true, rows: (rows.results || []).map(serializeRow) });
  }

  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: true,
    allowImpersonated: true,
  });
  if (access.error) return access.error;
  const client = cleanId(access.client);
  const rows = await env.DB.prepare(
    `SELECT ${SELECT_COLUMNS}
       FROM studio_carousels
      WHERE client_id=?
      ORDER BY updated_at DESC, id DESC`,
  ).bind(client).all();
  return json({ ok: true, rows: (rows.results || []).map(serializeRow) });
}

async function handle_onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "generate").trim().toLowerCase();

  if (action === "approve" || action === "reject") {
    return reviewCarousel(request, env, body, action);
  }

  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;

  if (action === "generate") return generateCarousel(env, access, body);
  if (action === "save") return saveCarousel(env, access, body);
  if (action === "submit-for-review") return submitCarousel(env, access, body);
  if (action === "rewrite") return rewriteCarousel(env, access, body);
  return json({ ok: false, error: "unknown action" }, 422);
}

async function handle_onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

async function generateCarousel(env, access, body) {
  const structure = normalizeCarouselStructure(body.structure);
  const topic = String(body.topic || "").trim();
  const goal = normalizeCarouselGoal(body.goal);
  const slideCount = clampCarouselSlideCount(body.slide_count);
  const forceManual = body.manual_mode !== false;
  // From the question-led Create flow (2026-10-12): photos the client picked and proof they typed.
  const photos = (Array.isArray(body.photos) ? body.photos : []).map(safePhoto).filter(Boolean).slice(0, 6);
  const briefProof = (Array.isArray(body.proof_lines) ? body.proof_lines : []).map((line) => String(line || "").trim()).filter(Boolean).slice(0, 8);
  if (!structure) return json({ ok: false, error: "valid structure is required" }, 422);
  if (!topic) return json({ ok: false, error: "topic is required" }, 422);

  const client = cleanId(access.client);
  const context = await loadClientContext(env, client);
  const brain = buildGeneratorBrainContext(context.brain);
  const triggerWord = String(body.trigger_word || "").trim() || brain.trigger_words[0] || "";
  const learning = await loadCarouselLearning(env, client, structure);
  const input = {
    clientName: context.client_name || access.client_name || client,
    clientProfile: context.client_profile,
    clientBrain: brain.prompt_text,
    structure,
    topic,
    goal,
    triggerWord,
    proofLines: [...briefProof, ...brain.proof_lines.filter((line) => !briefProof.includes(line))],
    slideCount,
    learningBlocks: carouselLearningBlocks(learning),
  };
  const prompt = buildCarouselPrompt(input);
  const manualPrompt = buildManualCarouselPrompt(input);
  const params = {
    structure,
    topic,
    goal,
    trigger_word: triggerWord || null,
    proof_lines: input.proofLines,
    photos,
    slide_count: slideCount,
    learning: { example_ids: learning.exampleIds, rules_used: learning.rules.length },
    brain_context: {
      used: brain.used,
      fields_used: brain.fields_used,
      updated_at: brain.updated_at,
      truncated: brain.truncated,
    },
  };

  let mode = "manual";
  let provider = "";
  let output = buildManualCarouselOutput(input);
  let reviewNote = null;
  const ai = forceManual ? null : await resolveAi(env, client);
  if (ai && aiConfigured(ai)) {
    provider = aiMode(ai);
    try {
      const raw = await generateText(prompt, ai, { json: true });
      output = applyCarouselLayouts(sanitizeCarouselOutput(humanizeDeep(parseModelJson(raw)), { structure, topic, goal, triggerWord, slideCount }), { photos, proofLines: input.proofLines, goal, triggerWord });
      mode = "generated";
    } catch (error) {
      reviewNote = `Generator fallback: ${safeMessage(error)}`;
    }
  }

  const timestamp = nowIso();
  const result = await env.DB.prepare(
    `INSERT INTO studio_carousels (
       client_id, structure, topic, goal, params_json, output_json, manual_prompt,
       status, review_note, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
  ).bind(
    client,
    structure,
    topic,
    goal,
    JSON.stringify(params),
    JSON.stringify(output),
    manualPrompt,
    reviewNote,
    timestamp,
    timestamp,
  ).run();

  return json({
    ok: true,
    id: Number(result.meta?.last_row_id || 0),
    mode,
    provider: provider || undefined,
    output,
    manual_prompt: manualPrompt,
    warning: reviewNote || undefined,
    brain_context: params.brain_context,
  });
}

async function saveCarousel(env, access, body) {
  const id = Number(body.id || 0);
  if (!id) return json({ ok: false, error: "carousel id is required" }, 422);
  const row = await findOwnedCarousel(env, id, access.client);
  if (!row) return json({ ok: false, error: "carousel not found" }, 404);
  if (row.status !== "draft" && row.status !== "rejected") {
    return json({ ok: false, error: "only draft or rejected carousels can be saved" }, 422);
  }

  const value = body.output ?? body.raw_text;
  if (value == null || (typeof value === "string" && !value.trim())) {
    return json({ ok: false, error: "output or raw_text is required" }, 422);
  }
  let output;
  try {
    const parsed = typeof value === "string" ? parseModelJson(value) : value;
    const params = parseJson(row.params_json, {});
    output = sanitizeCarouselOutput(parsed, {
      structure: row.structure,
      topic: row.topic,
      goal: row.goal,
      triggerWord: params.trigger_word,
      slideCount: params.slide_count,
    });
  } catch (error) {
    // A saved design (object) that fails the checks is refused, never flattened into text over the
    // client's work; only a pasted string falls back to raw text (the manual copy path).
    if (typeof value !== "string") return json({ ok: false, error: safeMessage(error) || "The design could not be saved." }, 422);
    output = { raw_text: String(value || "").trim() };
  }
  await env.DB.prepare(
    `UPDATE studio_carousels
        SET output_json=?, status='draft', review_note=NULL, updated_at=?
      WHERE id=?`,
  ).bind(JSON.stringify(output), nowIso(), id).run();
  return json({ ok: true, status: "draft", output });
}

// Highlight-and-ask (founder 2026-10-12): one slide's headline or body, or the caption, rewritten
// by the AI on the client's instruction; the rest of the carousel stays exactly as it is.
async function rewriteCarousel(env, access, body) {
  const id = Number(body.id || 0);
  if (!id) return json({ ok: false, error: "carousel id is required" }, 422);
  const row = await findOwnedCarousel(env, id, access.client);
  if (!row) return json({ ok: false, error: "carousel not found" }, 404);
  if (row.status !== "draft" && row.status !== "rejected") {
    return json({ ok: false, error: "this carousel is with the team; it can change after review" }, 422);
  }
  const stored = await env.DB.prepare("SELECT output_json FROM studio_carousels WHERE id=?").bind(id).first();
  const output = parseJson(stored?.output_json, null);
  const request = readRewriteRequest(body, output);
  if (request.error) return json({ ok: false, error: request.error }, 422);
  const ai = await resolveAi(env, cleanId(access.client));
  if (!ai || !aiConfigured(ai)) return json({ ok: false, error: "writing is switched off right now" }, 503);
  const brain = buildGeneratorBrainContext(await loadClientBrainData(env, cleanId(access.client)));
  let next;
  try {
    const raw = await generateText(buildRewritePrompt({ output, request, clientBrain: brain.prompt_text }), ai, { json: true });
    next = applyRewrite(output, request, humanizeDeep(readRewriteReply(raw)));
  } catch (error) {
    if (error?.code === "AI_ALLOWANCE") return json({ ok: false, error: error.message, allowance: true }, 429);
    return json({ ok: false, error: `The rewrite did not work: ${safeMessage(error)}` }, 502);
  }
  await env.DB.prepare(
    `UPDATE studio_carousels SET output_json=?, status='draft', review_note=NULL, updated_at=? WHERE id=?`,
  ).bind(JSON.stringify(next), nowIso(), id).run();
  return json({ ok: true, status: "draft", output: next });
}

async function submitCarousel(env, access, body) {
  const id = Number(body.id || 0);
  if (!id) return json({ ok: false, error: "carousel id is required" }, 422);
  const row = await findOwnedCarousel(env, id, access.client);
  if (!row) return json({ ok: false, error: "carousel not found" }, 404);
  if (row.status !== "draft" && row.status !== "rejected") {
    return json({ ok: false, error: "only draft or rejected carousels can be sent for review" }, 422);
  }
  await env.DB.prepare(
    `UPDATE studio_carousels SET status='review', review_note=NULL, updated_at=? WHERE id=?`,
  ).bind(nowIso(), id).run();
  await notify(env, { scope: "operator", clientId: access.client, kind: "content.review", severity: "info", title: `${await clientLabel(env, access.client)} sent a carousel for review`, body: String(row.topic || "").slice(0, 160), link: "home", entity: { client: access.client, carousel_id: id }, dedupeKey: `review:carousel:${id}:${Date.now()}` }).catch(() => null);
  return json({ ok: true, status: "review" });
}

async function reviewCarousel(request, env, body, action) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  const id = Number(body.id || 0);
  if (!id) return json({ ok: false, error: "carousel id is required" }, 422);
  const note = String(body.note || "").trim();
  if (action === "reject" && !note) {
    return json({ ok: false, error: "review note is required when rejecting" }, 422);
  }
  const status = action === "approve" ? "approved" : "rejected";
  const review = await env.DB.prepare("SELECT client_id FROM studio_carousels WHERE id=? AND status='review'").bind(id).first();
  const result = await env.DB.prepare(
    `UPDATE studio_carousels
        SET status=?, review_note=?, updated_at=?
      WHERE id=? AND status='review'`,
  ).bind(status, note || null, nowIso(), id).run();
  if (!Number(result.meta?.changes || 0)) {
    return json({ ok: false, error: "carousel not found or not in review" }, 404);
  }
  if (status === "rejected" && review?.client_id) {
    // The reason outlives review_note (cleared on resubmit): it becomes a rule for future carousels. Tagged
    // 'carousel' so it does not steer sequences or YouTube; the plain insert covers a database that has not
    // had migration 0058 yet.
    const stamp = nowIso();
    const scope = body.apply_to_all ? "all" : "client";
    await env.DB.prepare(
      `INSERT INTO studio_feedback (client_id, sequence_id, rule, scope, active, created_at, updated_at, format)
       VALUES (?, NULL, ?, ?, 1, ?, ?, 'carousel')`,
    ).bind(review.client_id, note.slice(0, 600), scope, stamp, stamp).run().catch(() => env.DB.prepare(
      `INSERT INTO studio_feedback (client_id, sequence_id, rule, scope, active, created_at, updated_at)
       VALUES (?, NULL, ?, ?, 1, ?, ?)`,
    ).bind(review.client_id, note.slice(0, 600), scope, stamp, stamp).run());
  }
  return json({ ok: true, status });
}

async function findOwnedCarousel(env, id, client) {
  const row = await env.DB.prepare(
    `SELECT id, client_id, structure, topic, goal, status, params_json
       FROM studio_carousels
      WHERE id=?`,
  ).bind(id).first();
  return row && cleanId(row.client_id) === cleanId(client) ? row : null;
}

async function loadClientContext(env, client) {
  const [config, brain] = await Promise.all([
    env.DB.prepare(
      `SELECT client, COALESCE(client_name, client) AS client_name, page_content_json
         FROM client_config
        WHERE client=?`,
    ).bind(client).first(),
    loadClientBrainData(env, client),
  ]);
  const page = parseJson(config?.page_content_json, {});
  const profile = [
    page.AUDIENCE_PILL ? `Audience: ${page.AUDIENCE_PILL}` : "",
    page.HEADLINE_LINE_ONE ? `Headline: ${page.HEADLINE_LINE_ONE}` : "",
    page.HERO_SUBHEAD ? `Offer context: ${page.HERO_SUBHEAD}` : "",
  ].filter(Boolean).join(" | ");
  return {
    client_name: config?.client_name || client,
    client_profile: profile || "No structured client profile is saved in the dashboard yet.",
    brain,
  };
}

function serializeRow(row) {
  return {
    id: Number(row.id || 0),
    client_id: row.client_id,
    structure: row.structure || "",
    topic: row.topic || "",
    goal: row.goal || "reach",
    params: parseJson(row.params_json, {}),
    output: parseJson(row.output_json, null),
    manual_prompt: row.manual_prompt || "",
    status: row.status || "draft",
    review_note: row.review_note || "",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
  };
}

function normalizeStatusFilter(value) {
  const status = String(value || "").trim().toLowerCase();
  return ["draft", "review", "approved", "rejected"].includes(status) ? status : "";
}

function safeMessage(error) {
  return String(error?.message || error || "unknown error").slice(0, 400);
}

export const onRequestGet = withOperator(handle_onRequestGet);
export const onRequestPost = withOperator(handle_onRequestPost);
export const onRequestOptions = withOperator(handle_onRequestOptions);
