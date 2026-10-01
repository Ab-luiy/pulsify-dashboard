// The one switch for Growth generation (pulsify-saas #18): with ANTHROPIC_API_KEY set, Opus writes the
// draft; without it each generator hands the client the same prompt to run in their own AI.
export const GROWTH_MODEL = "claude-opus-5-5";

export async function callAnthropic(prompt, apiKey) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: GROWTH_MODEL,
      max_tokens: 16000,
      // The method block is identical on every call, so it is cached and billed at the read rate.
      system: [{ type: "text", text: prompt.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt.user }],
    }),
  });
  if (!response.ok) {
    throw new Error(`${response.status}: ${(await response.text()).slice(0, 400)}`);
  }
  const data = await response.json();
  if (data?.stop_reason === "refusal") throw new Error("Anthropic declined this request");
  const text = (data?.content || []).filter((block) => block?.type === "text").map((block) => block.text || "").join("");
  if (!text) throw new Error("Anthropic returned no text");
  return text;
}

/** The first JSON object in a model or pasted answer, fences and chatter around it ignored. */
export function parseModelJson(rawText) {
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
