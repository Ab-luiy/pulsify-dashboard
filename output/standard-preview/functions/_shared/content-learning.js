// What the founder's reviews taught the YouTube steps (pulsify-saas #18): the client's approved video
// packages become examples, and every active rejection reason for this client or all clients becomes a
// rule (studio_feedback is shared with story sequences, so a rule like "never call revenue profit" holds
// everywhere). Both are best-effort: before migrations 0042/0044 exist the prompts simply go without.
import { parseJson } from "./common.js";

const line = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

// Active review rules for this client (and every-client rules). A rule tagged with a format is only shown to
// that format; untagged rules (format '') are shown everywhere. Before migration 0058 the column does not
// exist, so the first query fails and the untagged query takes over: rules never silently disappear.
export async function loadRules(env, client, format) {
  const base = `SELECT rule FROM studio_feedback WHERE active=1 AND (scope='all' OR client_id=?)`;
  const order = ` ORDER BY CASE WHEN scope='all' THEN 0 ELSE 1 END, created_at DESC LIMIT 20`;
  let rows;
  try {
    rows = await env.DB.prepare(`${base} AND (format='' OR format=?)${order}`).bind(client, format).all();
  } catch {
    rows = await env.DB.prepare(`${base}${order}`).bind(client).all().catch(() => ({ results: [] }));
  }
  return [...new Set((rows.results || []).map((row) => line(row.rule, 600)).filter(Boolean))];
}

export async function loadVideoLearning(env, client) {
  const [approved, rules] = await Promise.all([
    env.DB.prepare(
      `SELECT title, snapshot_json
         FROM content_reviews
        WHERE client_id=? AND format='youtube' AND status='approved'
        ORDER BY decided_at DESC
        LIMIT 3`,
    ).bind(client).all().catch(() => ({ results: [] })),
    loadRules(env, client, 'youtube'),
  ]);
  const examples = (approved.results || []).map((row) => {
    const data = parseJson(row.snapshot_json, {}) || {};
    return {
      idea: line(row.title, 200),
      title: line(data.headline, 120),
      thumbnail_text: line(data.thumbnail_text, 60),
      hook: line(data.hook, 600),
    };
  }).filter((example) => example.title || example.idea);
  return {
    examples,
    rules,
  };
}

/** Prompt blocks for the user message; empty strings when there is nothing learned yet. */
export function learningBlocks(learning, { hooks = false } = {}) {
  const rules = learning?.rules?.length ? `Team rules from past reviews (follow every one):\n- ${learning.rules.join("\n- ")}` : "";
  const examples = learning?.examples?.length
    ? `Videos the Pulsify team approved for this creator (match their angle and voice, never repeat them):\n${learning.examples
        .map((example, index) => [
          `${index + 1}. ${example.idea}`,
          example.title && `   Title: ${example.title}`,
          example.thumbnail_text && `   Thumbnail text: ${example.thumbnail_text}`,
          hooks && example.hook && `   Opening: ${example.hook}`,
        ].filter(Boolean).join("\n"))
        .join("\n")}`
    : "";
  return [rules, examples].filter(Boolean);
}

// Carousels: the client's approved carousels (same structure first) become examples. Each example is the
// cover and the slide headlines, enough to show the angle and voice without reprinting every body.
export async function loadCarouselLearning(env, client, structure) {
  const [approved, rules] = await Promise.all([
    env.DB.prepare(
      `SELECT id, structure, topic, output_json
         FROM studio_carousels
        WHERE client_id=? AND status='approved'
        ORDER BY CASE WHEN structure=? THEN 0 ELSE 1 END, updated_at DESC
        LIMIT 3`,
    ).bind(client, structure || "").all().catch(() => ({ results: [] })),
    loadRules(env, client, "carousel"),
  ]);
  const examples = [];
  const exampleIds = [];
  for (const row of approved.results || []) {
    const output = parseJson(row.output_json, null);
    const slides = Array.isArray(output?.slides) ? output.slides.filter((slide) => slide?.headline) : [];
    if (!slides.length) continue;
    examples.push({
      structure: row.structure || output.structure || "",
      topic: line(row.topic, 200),
      title: line(output.title, 160),
      headlines: slides.map((slide) => line(slide.headline, 120)),
      cta: line(slides[slides.length - 1]?.cta, 160),
    });
    exampleIds.push(Number(row.id));
  }
  return { examples, exampleIds, rules };
}

/** Carousel prompt blocks; empty when nothing is learned yet. */
export function carouselLearningBlocks(learning) {
  const rules = learning?.rules?.length ? `Team rules from past reviews (follow every one):\n- ${learning.rules.join("\n- ")}` : "";
  const examples = learning?.examples?.length
    ? `Carousels the Pulsify team approved for this client (match their angle and voice, never repeat them):\n${learning.examples
        .map((example, index) => [
          `${index + 1}. ${example.topic || example.title} (${example.structure})`,
          example.headlines.length && `   Slide headlines: ${example.headlines.join(" | ")}`,
          example.cta && `   Closing CTA: ${example.cta}`,
        ].filter(Boolean).join("\n"))
        .join("\n")}`
    : "";
  return [rules, examples].filter(Boolean);
}
