import {
  deleteIntegration,
  getIntegration,
  isIntegrationConnected,
  listIntegrations,
  maskIntegration,
  optionsResponse,
  sendKitTest,
  upsertIntegration,
} from "../_shared/integrations.js";
import { cleanId, hasOwn, json, sha256Hex, str } from "../_shared/common.js";

const CLIENT_ALLOWED = [
  "kit",
  "calcom",
  "calendly",
  "whop",
  "stripe",
  "youtube",
  "instagram",
  "zapier",
];
const CLIENT_ALLOWED_SET = new Set(CLIENT_ALLOWED);
const DELEGATED_PROVIDERS = new Set(["youtube", "instagram"]);

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const access = await resolveAccess(request, env);
  if (access.error) return access.error;
  const client = access.client;
  const url = new URL(request.url);
  const provider = str(url.searchParams.get("provider")).toLowerCase();
  const action = str(url.searchParams.get("action")).toLowerCase();

  if (action === "test") {
    if (!provider) return clientJsonError("provider is required for tests");
    if (!CLIENT_ALLOWED_SET.has(provider)) {
      return clientJsonError(`provider is not available to clients: ${provider}`);
    }

    const record = await getIntegration(env, "client", client, provider);
    if (!record) return clientJsonError("integration not found", 404);

    if (provider === "kit") {
      const test = await sendKitTest(env, record);
      return json({ ok: test.ok, provider, test });
    }

    const connected = isIntegrationConnected(record);
    return json({
      ok: true,
      provider,
      test: {
        status: connected ? "config_present" : "not_configured",
        connected,
      },
    });
  }

  const records = await listIntegrations(env, { scope: "client", client });
  const byProvider = new Map(
    records
      .filter((record) => CLIENT_ALLOWED_SET.has(record.provider))
      .map((record) => [record.provider, record]),
  );
  const integrations = CLIENT_ALLOWED.map((allowedProvider) => {
    const record = byProvider.get(allowedProvider) || {
      scope: "client",
      client,
      provider: allowedProvider,
      config: {},
      secrets: {},
      created_at: null,
      updated_at: null,
      last_event_ts: null,
    };
    return maskIntegration(record);
  });

  return json({ ok: true, client, integrations });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const access = await resolveAccess(request, env);
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({}));
  const provider = str(body.provider).toLowerCase();
  if (!CLIENT_ALLOWED_SET.has(provider)) {
    return clientJsonError(`provider is not available to clients: ${provider}`);
  }

  const config = hasOwn(body, "config") && body.config && typeof body.config === "object"
    ? { ...body.config }
    : {};
  let secrets = hasOwn(body, "secrets") && body.secrets && typeof body.secrets === "object"
    ? body.secrets
    : {};

  if (DELEGATED_PROVIDERS.has(provider)) {
    delete config.confirmed;
    delete config.confirmed_at;
    secrets = {};
    if (hasOwn(body, "confirm")) {
      if (body.confirm === true) {
        config.confirmed = "true";
        config.confirmed_at = new Date().toISOString();
      } else if (body.confirm === false) {
        config.confirmed = null;
      }
    }
  }

  const result = await upsertIntegration(env, {
    scope: "client",
    client: access.client,
    provider,
    config,
    secrets,
    origin: new URL(request.url).origin,
  });
  if (!result.ok) return clientJsonError(result.error);

  return json({
    ok: true,
    integration: result.integration,
    one_time: result.one_time,
  });
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const access = await resolveAccess(request, env);
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({}));
  const provider = str(body.provider).toLowerCase();
  if (!CLIENT_ALLOWED_SET.has(provider)) {
    return clientJsonError(`provider is not available to clients: ${provider}`);
  }

  const result = await deleteIntegration(env, "client", access.client, provider);
  if (!result.ok) return clientJsonError(result.error);
  return json(result);
}

export async function onRequestOptions() {
  return optionsResponse(
    "GET, POST, DELETE, OPTIONS",
    "content-type, x-portal-token",
  );
}

async function resolveAccess(request, env) {
  const portalToken = request.headers.get("x-portal-token");
  if (!portalToken) {
    return {
      error: json({ ok: false, error: "invalid or expired portal link" }, 401),
    };
  }

  const hash = await sha256Hex(portalToken.trim());
  const row = await env.DB.prepare(
    "SELECT client FROM client_config WHERE portal_token_hash=?",
  ).bind(hash).first();
  if (!row) {
    return {
      error: json({ ok: false, error: "invalid or expired portal link" }, 401),
    };
  }
  return { client: cleanId(row.client) };
}

function clientJsonError(message, status = 422) {
  return json({ ok: false, error: message }, status);
}
