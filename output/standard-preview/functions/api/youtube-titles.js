// POST /api/youtube-titles {idea, layout, answers:[{id, question, answer}]} -> title and thumbnail pairs
// for the signed-in client. With an AI key (ai-provider.js): {mode:"generated", pairs}. Without: {mode:"manual",
// prompt} for the client's own AI. Nothing is stored here: the portal saves the pick to the video project.
import { humanizeDeep } from "../_shared/humanizer.js";
import { withOperator } from "../_shared/access.js";
import { cleanId, json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { buildGeneratorBrainContext, loadClientBrainData } from "../_shared/client-brain-context.js";
import { parseModelJson } from "../_shared/anthropic.js";
import { aiConfigured, generateText } from "../_shared/ai-provider.js";
import { checkCreateNumbers, resolveCreateAi, withCreateFacts, writerFailure } from "../_shared/create-writer.js";
import { loadVideoLearning } from "../_shared/content-learning.js";
import { normalizeAnswers } from "../_shared/youtube-ideas.js";
import { LAYOUTS, buildTitlesPrompt, normalizeIdea, sanitizePairs } from "../_shared/youtube-titles.js";

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;

  const body = await request.json().catch(() => ({}));
  const idea = normalizeIdea(body.idea);
  if (!idea.idea) return json({ ok: false, error: "Choose a video idea first." }, 422);
  const layout = Object.hasOwn(LAYOUTS, body.layout) ? body.layout : "";

  const client = cleanId(access.client);
  const [config, brain, learning] = await Promise.all([
    env.DB.prepare("SELECT COALESCE(client_name, client) AS client_name FROM client_config WHERE client=?").bind(client).first(),
    loadClientBrainData(env, client),
    loadVideoLearning(env, client),
  ]);
  const brainContext = buildGeneratorBrainContext(brain);
  const prompt = withCreateFacts(buildTitlesPrompt({
    clientName: config?.client_name || access.client_name || client,
    clientBrain: brainContext.prompt_text,
    proofLines: brainContext.proof_lines,
    learning,
    idea,
    answers: normalizeAnswers(body.answers),
    layout,
    niche: brainContext.niche?.id || null,
  }));
  const manual = { ok: true, mode: "manual", prompt: `${prompt.system}\n\n${prompt.user}` };

  const ai = await resolveCreateAi(env, client);
  if (!aiConfigured(ai)) return json(manual);

  let rawText;
  try {
    rawText = await generateText(prompt, ai, { json: true });
  } catch (error) {
    const failure = writerFailure(error);
    if (failure) return json(failure.body, failure.status);
    return json({ ok: false, error: "The title generator could not answer. Try again.", detail: String(error?.message || error).slice(0, 300) }, 502);
  }
  let pairs = [];
  let numbers = [];
  try {
    ({ output: pairs, numbers } = checkCreateNumbers(sanitizePairs(humanizeDeep(parseModelJson(rawText))), [prompt.user]));
  } catch {
    pairs = [];
  }
  if (!pairs.length) return json({ ...manual, warning: "The answer came back unreadable. Run the prompt in your own AI instead." });
  return json({ ok: true, mode: "generated", pairs, checks: { numbers } });
}

export const onRequestPost = withOperator(handlePost);
