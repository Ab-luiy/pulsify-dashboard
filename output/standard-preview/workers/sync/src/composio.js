const BASE = "https://backend.composio.dev/api/v3/tools/execute";
export const COMPOSIO_TIMEOUT_MS = 20000;

export async function composioExecute(env, slug, args = {}) {
  if (!env.COMPOSIO_API_KEY) throw new Error("COMPOSIO_API_KEY is not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COMPOSIO_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${BASE}/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.COMPOSIO_API_KEY,
        "user-agent": "Pulsify-Sync/1.0",
      },
      body: JSON.stringify({
        user_id: env.COMPOSIO_USER_ID || "owner",
        arguments: args,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`${slug} timed out after ${COMPOSIO_TIMEOUT_MS / 1000}s`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const reason = body.error ?? body.message ?? "unknown error";
    const text = typeof reason === "string" ? reason : JSON.stringify(reason);
    throw new Error(`${slug} failed (${response.status}): ${text.slice(0, 500)}`);
  }
  return body.data ?? body;
}

export function findRows(value) {
  if (Array.isArray(value)) return value.filter((row) => row && typeof row === "object");
  if (!value || typeof value !== "object") return [];
  for (const key of ["data", "items", "conversations", "messages", "results"]) {
    if (Array.isArray(value[key])) return value[key];
    if (value[key] && typeof value[key] === "object") {
      const nested = findRows(value[key]);
      if (nested.length) return nested;
    }
  }
  for (const nestedValue of Object.values(value)) {
    const nested = findRows(nestedValue);
    if (nested.length) return nested;
  }
  return [];
}
