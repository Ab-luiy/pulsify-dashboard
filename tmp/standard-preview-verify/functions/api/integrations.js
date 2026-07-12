import {
  adminJsonError,
  deleteIntegration,
  getIntegration,
  listIntegrations,
  maskIntegration,
  normalizeScope,
  optionsResponse,
  sendDiscordTest,
  sendKitTest,
  upsertIntegration,
  validateProvider,
} from "../_shared/integrations.js";
import { checkAdmin, cleanId, hasOwn, json, str } from "../_shared/common.js";

export async function onRequestGet({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const scope = normalizeScope(url.searchParams.get("scope") || "client");
  const client = scope === "client" ? cleanId(url.searchParams.get("client")) : "";
  const provider = str(url.searchParams.get("provider")).toLowerCase() || "";
  const action = str(url.searchParams.get("action")).toLowerCase();

  if (!scope) return adminJsonError("scope must be operator or client");
  if (scope === "client" && !client && !action) {
    return adminJsonError("client is required for client scope");
  }

  if (action === "test") {
    if (!provider) return adminJsonError("provider is required for tests");
    const record = await getIntegration(env, scope, client, provider);
    if (!record) return adminJsonError("integration not found", 404);

    if (provider === "kit") {
      const test = await sendKitTest(env, record);
      return json({ ok: test.ok, provider, test });
    }
    if (provider === "discord") {
      const test = await sendDiscordTest(env);
      return json({ ok: test.ok, provider, test });
    }
    return json({
      ok: true,
      provider,
      test: {
        status: record.connected ? "config_present" : "not_configured",
        connected: record.connected,
      },
    });
  }

  const records = await listIntegrations(env, { scope, client, provider: provider || null });
  return json({
    ok: true,
    scope,
    client: scope === "client" ? client : null,
    integrations: records.map(maskIntegration),
  });
}

export async function onRequestPost({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const scope = normalizeScope(body.scope);
  const client = scope === "client" ? cleanId(body.client) : "";
  const provider = str(body.provider).toLowerCase();
  if (!scope) return adminJsonError("scope must be operator or client");
  const checked = validateProvider(provider, scope);
  if (checked.error) return adminJsonError(checked.error);
  if (scope === "client" && !client) return adminJsonError("valid client id required");

  const result = await upsertIntegration(env, {
    scope,
    client,
    provider,
    config: hasOwn(body, "config") && body.config && typeof body.config === "object" ? body.config : {},
    secrets: hasOwn(body, "secrets") && body.secrets && typeof body.secrets === "object" ? body.secrets : {},
    origin: new URL(request.url).origin,
  });

  if (!result.ok) return adminJsonError(result.error, 422);
  return json({
    ok: true,
    integration: result.integration,
    one_time: result.one_time,
  });
}

export async function onRequestDelete({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const scope = normalizeScope(body.scope);
  const client = scope === "client" ? cleanId(body.client) : "";
  const provider = str(body.provider).toLowerCase();
  if (!scope) return adminJsonError("scope must be operator or client");

  const result = await deleteIntegration(env, scope, client, provider);
  if (!result.ok) return adminJsonError(result.error, 422);
  return json(result);
}

export async function onRequestOptions() {
  return optionsResponse("GET, POST, DELETE, OPTIONS");
}
