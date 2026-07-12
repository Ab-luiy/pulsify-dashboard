import { checkAdmin, json } from "../_shared/common.js";
import { optionsResponse } from "../_shared/integrations.js";

const ENV_SERVICES = [
  { provider: "gemini", envKey: "GEMINI_API_KEY", label: "Gemini" },
  { provider: "anthropic", envKey: "ANTHROPIC_API_KEY", label: "Anthropic" },
  { provider: "supadata", envKey: "SUPADATA_API_KEY", label: "Supadata" },
];

export async function onRequestGet({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;

  return json({
    ok: true,
    services: ENV_SERVICES.map((service) => ({
      provider: service.provider,
      label: service.label,
      connected: Boolean(env[service.envKey]),
    })),
  });
}

export async function onRequestOptions() {
  return optionsResponse("GET, OPTIONS", "x-admin-key");
}
