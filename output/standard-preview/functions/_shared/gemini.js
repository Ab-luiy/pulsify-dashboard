// Google Gemini, the free alternative behind the Growth generators until the Anthropic key is in
// (see ai-provider.js for the one switch). Plain fetch, no SDK, so it runs in a Pages Function.
//   callGemini({system, user}, key)          -> the full text
//   streamGemini({system, messages}, key)    -> async iterator of text chunks
// `messages` is [{role: "user" | "assistant", content}] and ends with the user turn.

export const GEMINI_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash"];
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function bodyFor({ system, messages, json, temperature, maxOutputTokens }) {
  return {
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents: messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.content ?? "") }],
    })),
    generationConfig: {
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxOutputTokens ?? 8192,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };
}

function modelsFor(options) {
  const wanted = String(options?.model || "").trim();
  return wanted ? [wanted, ...GEMINI_MODELS.filter((model) => model !== wanted)] : GEMINI_MODELS;
}

/** Quota and overload answers are worth trying the next model for; anything else is a real error. */
const retryable = (status) => status === 429 || status === 500 || status === 503;

function textOf(data) {
  const candidate = data?.candidates?.[0];
  return (candidate?.content?.parts || []).map((part) => part?.text || "").join("");
}

function blockedReason(data) {
  const block = data?.promptFeedback?.blockReason;
  if (block) return `Gemini declined this request (${block})`;
  const finish = data?.candidates?.[0]?.finishReason;
  if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT") return `Gemini declined this request (${finish})`;
  return "";
}

export async function callGemini(prompt, apiKey, options = {}) {
  const messages = [{ role: "user", content: prompt.user }];
  const payload = JSON.stringify(bodyFor({ system: prompt.system, messages, ...options }));
  let lastError;
  for (const model of modelsFor(options)) {
    const response = await fetch(`${BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: payload,
    });
    if (!response.ok) {
      lastError = new Error(`${response.status}: ${(await response.text()).slice(0, 400)}`);
      if (retryable(response.status)) continue;
      throw lastError;
    }
    const data = await response.json();
    const blocked = blockedReason(data);
    if (blocked) throw new Error(blocked);
    const text = textOf(data);
    if (!text) throw new Error("Gemini returned no text");
    return text;
  }
  throw lastError || new Error("Gemini is unavailable");
}

export async function* streamGemini(prompt, apiKey, options = {}) {
  const payload = JSON.stringify(bodyFor({ system: prompt.system, messages: prompt.messages, ...options }));
  let response;
  let lastError;
  for (const model of modelsFor(options)) {
    response = await fetch(`${BASE}/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: payload,
      signal: options.signal,
    });
    if (response.ok) break;
    const status = response.status;
    lastError = new Error(`${status}: ${(await response.text()).slice(0, 400)}`);
    response = null;
    if (!retryable(status)) throw lastError;
  }
  if (!response) throw lastError || new Error("Gemini is unavailable");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let emitted = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut;
    while ((cut = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const event = buffer.slice(0, cut);
      buffer = buffer.slice(cut).replace(/^\r?\n\r?\n/, "");
      for (const line of event.split(/\r?\n/)) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        let data;
        try { data = JSON.parse(raw); } catch { continue; }
        const blocked = blockedReason(data);
        if (blocked && !emitted) throw new Error(blocked);
        const text = textOf(data);
        if (text) {
          emitted = true;
          yield text;
        }
      }
    }
  }
  if (!emitted) throw new Error("Gemini returned no text");
}
