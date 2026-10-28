// POST /api/thumbnail-suggest {idea, audience, show, proof, have:{you, proof, board, twoPeople}}
//   -> {ok, mode: "writer" | "basic", suggestions: [{style, words, reason}], needs?: [...]}
// Two suggestions for a client's thumbnail, chosen from the styles their own photos can build. The writer (the client's
// own AI, else Pulsify AI) chooses and explains; _shared/thumbnail-suggest.js checks every rule in code. Without any
// writer, or when it fails, the same rules give plain suggestions ("basic"), so the client is never left with nothing.
import { json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { buildGeneratorBrainContext, loadClientBrainData } from "../_shared/client-brain-context.js";
import { parseModelJson } from "../_shared/anthropic.js";
import { aiConfigured, generateText } from "../_shared/ai-provider.js";
import { checkCreateNumbers, resolveCreateAi, withCreateFacts } from "../_shared/create-writer.js";
import { humanizeDeep } from "../_shared/humanizer.js";
import { availableStyles, buildSuggestPrompt, checkSuggestions, normalizeInput, STYLE_RULES } from "../_shared/thumbnail-suggest.js";

export async function onRequestPost({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const input = normalizeInput(await request.json().catch(() => ({})));
  if (!input.idea) return json({ ok: false, error: "Say what the video is about first." }, 422);
  const styles = availableStyles(input.have);
  if (!styles.length) {
    // No photo can build anything yet: say which photos would unlock which style.
    return json({ ok: true, mode: "basic", suggestions: [], needs: Object.entries(STYLE_RULES).map(([id, rule]) => ({ style: id, label: rule.label })) });
  }

  const client = String(access.client).toLowerCase();
  const brain = buildGeneratorBrainContext(await loadClientBrainData(env, client).catch(() => null));
  const ai = await resolveCreateAi(env, client);
  let raw = null;
  let mode = "basic";
  if (aiConfigured(ai)) {
    try {
      const prompt = withCreateFacts(buildSuggestPrompt({ input, styles, brainText: brain.prompt_text, references: [] }));
      // Thumbnail words may only show a number the creator gave (a real screen, a real result).
      raw = checkCreateNumbers(humanizeDeep(parseModelJson(await generateText(prompt, ai, { json: true }))), [prompt.user]).output;
      mode = "writer";
    } catch (error) {
      console.error("thumbnail-suggest writer", String(error?.message || error).slice(0, 200));
    }
  }
  return json({ ok: true, mode, suggestions: checkSuggestions(raw, { input, styles }) });
}
