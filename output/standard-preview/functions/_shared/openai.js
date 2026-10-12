// ChatGPT (OpenAI) on the client's own key (founder 2026-10-13: clients connect Claude, ChatGPT or Gemini
// themselves; Pulsify cannot pay for a premium model). Plain fetch to the Chat Completions API.
//   callOpenAI({system, user}, key, {model, json})        -> the full text
//   streamOpenAI({system, messages}, key, {model})        -> async iterator of text chunks
// The model is never hardcoded: when the key is saved, pickOpenAiModel() chooses from the models that key
// can actually use, and that choice is stored with the integration.

const BASE = "https://api.openai.com/v1";

// Strongest first among general chat models; only names present in the key's own /v1/models list are used.
const PREFERENCE = [/^gpt-5(\.\d+)?$/, /^gpt-5(\.\d+)?-mini$/, /^gpt-4\.1$/, /^gpt-4\.1-mini$/, /^gpt-4o$/, /^gpt-4o-mini$/];

/** The best chat model in a /v1/models answer, or "" when none of the known families is there. */
export function pickOpenAiModel(ids) {
  const list = (Array.isArray(ids) ? ids : []).map(String);
  for (const pattern of PREFERENCE) {
    const found = list.filter((id) => pattern.test(id)).sort().reverse()[0];
    if (found) return found;
  }
  return list.find((id) => /^gpt-[\d.]+(-mini)?$/.test(id)) || "";
}

function body(messages, options, stream) {
  return JSON.stringify({
    model: options.model,
    messages,
    // Newer models only accept max_completion_tokens; older ones accept it too.
    max_completion_tokens: options.maxOutputTokens || 8000,
    ...(options.json ? { response_format: { type: "json_object" } } : {}),
    ...(stream ? { stream: true } : {}),
  });
}

function friendly(status, text) {
  if (status === 401) return new Error("OpenAI did not accept the key. Reconnect ChatGPT in Integrations.");
  if (status === 429) return new Error("Your OpenAI account is out of credit or over its limit. Top it up at platform.openai.com.");
  return new Error(`OpenAI could not answer (${status}): ${String(text).slice(0, 300)}`);
}

export async function callOpenAI(prompt, apiKey, options = {}) {
  if (!options.model) throw new Error("No ChatGPT model is stored for this key. Reconnect ChatGPT in Integrations.");
  const messages = [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }];
  const response = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: body(messages, options, false),
  });
  if (!response.ok) throw friendly(response.status, await response.text());
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("ChatGPT returned no text");
  return text;
}

export async function* streamOpenAI(prompt, apiKey, options = {}) {
  if (!options.model) throw new Error("No ChatGPT model is stored for this key. Reconnect ChatGPT in Integrations.");
  const messages = [{ role: "system", content: prompt.system }, ...prompt.messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content ?? "") }))];
  const response = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: body(messages, options, true),
    signal: options.signal,
  });
  if (!response.ok) throw friendly(response.status, await response.text());
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
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
      try {
        const chunk = JSON.parse(raw)?.choices?.[0]?.delta?.content;
        if (chunk) yield chunk;
      } catch {
        /* a partial line; the next read completes it */
      }
    }
  }
}
