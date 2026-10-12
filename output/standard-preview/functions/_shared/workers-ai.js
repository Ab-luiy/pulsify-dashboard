// Pulsify's own writer: Cloudflare Workers AI through the `AI` binding (wrangler.toml), so no API key
// exists to leak or rotate. Founder decision 2026-10-12: the app writes for clients on our side.
// GPT-OSS 120B won the 2026-10-12 bake-off on the real story-sequence prompt: valid JSON, tight copy,
// about 470 of the free plan's 10,000 daily neurons per story. Larger models (Kimi K2.6, DeepSeek V4,
// GLM 5.3) need Workers Paid. WORKERS_AI_MODEL overrides the model without a code change.
export const WORKERS_AI_MODEL = "@cf/openai/gpt-oss-120b";

const textOf = (out) => {
  if (typeof out?.response === "string") return out.response;
  const choice = out?.choices?.[0];
  if (typeof choice?.message?.content === "string") return choice.message.content;
  if (typeof choice?.text === "string") return choice.text;
  return "";
};

// Reasoning models may wrap their thinking in <think> tags; only the answer is returned.
const answerOnly = (text) => String(text || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

function friendly(error) {
  const message = String(error?.message || error);
  if (/4006|daily free allocation|neurons/i.test(message)) return new Error("Pulsify AI has reached today's limit. It resets at midnight UTC.");
  return new Error(`Pulsify AI could not answer: ${message.slice(0, 300)}`);
}

/** {system, user} in, the full text out. */
export async function callWorkersAi(prompt, binding, options = {}) {
  if (!binding?.run) throw new Error("The AI binding is not configured");
  let out;
  try {
    out = await binding.run(options.model || WORKERS_AI_MODEL, {
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      max_tokens: options.maxOutputTokens || 6000,
      ...(Number.isFinite(options.temperature) ? { temperature: options.temperature } : {}),
    });
  } catch (error) {
    throw friendly(error);
  }
  const text = answerOnly(textOf(out));
  if (!text) throw new Error("Pulsify AI returned no text");
  return text;
}

/** {system, messages} in, text chunks out. The binding streams server-sent events. */
export async function* streamWorkersAi(prompt, binding, options = {}) {
  if (!binding?.run) throw new Error("The AI binding is not configured");
  let stream;
  try {
    stream = await binding.run(options.model || WORKERS_AI_MODEL, {
      messages: [{ role: "system", content: prompt.system }, ...prompt.messages.map((m) => ({ role: m.role, content: m.content }))],
      max_tokens: options.maxOutputTokens || 4000,
      stream: true,
    });
  } catch (error) {
    throw friendly(error);
  }
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let emitted = false;
  let thinking = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 1);
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      let data;
      try { data = JSON.parse(raw); } catch { continue; }
      let chunk = typeof data?.response === "string" ? data.response : data?.choices?.[0]?.delta?.content || "";
      if (!chunk) continue;
      if (chunk.includes("<think>")) thinking = true;
      if (thinking) {
        if (!chunk.includes("</think>")) continue;
        chunk = chunk.split("</think>").pop();
        thinking = false;
      }
      if (!chunk) continue;
      emitted = true;
      yield chunk;
    }
  }
  if (!emitted) throw new Error("Pulsify AI returned no text");
}
