// What the founder's reviews taught the YouTube steps (pulsify-saas #18): the client's approved video
// packages become examples, and every active rejection reason for this client or all clients becomes a
// rule (studio_feedback is shared with story sequences, so a rule like "never call revenue profit" holds
// everywhere). Both are best-effort: before migrations 0042/0044 exist the prompts simply go without.
import { parseJson } from "./common.js";

const line = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

export async function loadVideoLearning(env, client) {
  const [approved, rules] = await Promise.all([
    env.DB.prepare(
      `SELECT title, snapshot_json
         FROM content_reviews
        WHERE client_id=? AND format='youtube' AND status='approved'
        ORDER BY decided_at DESC
        LIMIT 3`,
    ).bind(client).all().catch(() => ({ results: [] })),
    env.DB.prepare(
      `SELECT rule
         FROM studio_feedback
        WHERE active=1 AND (scope='all' OR client_id=?)
        ORDER BY CASE WHEN scope='all' THEN 0 ELSE 1 END, created_at DESC
        LIMIT 20`,
    ).bind(client).all().catch(() => ({ results: [] })),
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
    rules: [...new Set((rules.results || []).map((row) => line(row.rule, 600)).filter(Boolean))],
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
