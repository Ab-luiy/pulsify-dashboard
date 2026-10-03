// POST /api/youtube-ideas {answers:[{id, question, answer}]} -> video ideas for the signed-in client.
// With an AI key (ai-provider.js): {mode:"generated", ideas}. Without: {mode:"manual", prompt} for the client's own AI;
// the portal parses the pasted answer with the same shape. Nothing is stored here: the portal saves the
// ideation to the client's video project (workspace_records kind "youtube").
import { withOperator } from "../_shared/access.js";
import { cleanId, json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { buildGeneratorBrainContext, loadClientBrainData } from "../_shared/client-brain-context.js";
import { parseModelJson } from "../_shared/anthropic.js";
import { aiConfigured, generateText } from "../_shared/ai-provider.js";
import { loadVideoLearning } from "../_shared/content-learning.js";
import { buildIdeasPrompt, normalizeAnswers, sanitizeIdeas } from "../_shared/youtube-ideas.js";

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;

  const body = await request.json().catch(() => ({}));
  const answers = normalizeAnswers(body.answers);
  if (answers.length < 3) return json({ ok: false, error: "Answer at least three questions first." }, 422);

  const client = cleanId(access.client);
  const [config, brain, learning] = await Promise.all([
    env.DB.prepare("SELECT COALESCE(client_name, client) AS client_name FROM client_config WHERE client=?").bind(client).first(),
    loadClientBrainData(env, client),
    loadVideoLearning(env, client),
  ]);
  const brainContext = buildGeneratorBrainContext(brain);
  const prompt = buildIdeasPrompt({
    clientName: config?.client_name || access.client_name || client,
    clientBrain: brainContext.prompt_text,
    proofLines: brainContext.proof_lines,
    learning,
    answers,
  });
  const brainUsed = { used: brainContext.used, fields_used: brainContext.fields_used };

  if (!aiConfigured(env)) {
    return json({ ok: true, mode: "manual", prompt: `${prompt.system}\n\n${prompt.user}`, brain_context: brainUsed });
  }

  let rawText;
  try {
    rawText = await generateText(prompt, env, { json: true });
  } catch (error) {
    return json({ ok: false, error: "The idea generator could not answer. Try again.", detail: String(error?.message || error).slice(0, 300) }, 502);
  }
  let ideas = [];
  try {
    ideas = sanitizeIdeas(parseModelJson(rawText));
  } catch {
    ideas = [];
  }
  if (!ideas.length) {
    return json({ ok: true, mode: "manual", prompt: `${prompt.system}\n\n${prompt.user}`, warning: "The answer came back unreadable. Run the prompt in your own AI instead.", brain_context: brainUsed });
  }
  return json({ ok: true, mode: "generated", ideas, brain_context: brainUsed });
}

export const onRequestPost = withOperator(handlePost);
