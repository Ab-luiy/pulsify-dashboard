import {
  cleanId,
  constantTimeEqual,
  generateOpaqueToken,
  hasOwn,
  json,
  normalizeEmail,
  nowIso,
  parseJson,
  str,
  strOrNull,
  titleCase,
} from "./common.js";

export const DEFAULT_ONBOARDING_FORM_URL =
  "https://docs.google.com/forms/d/1zXVRhwBgX3WF1ie194m-FvG7Vd4-OFpwNA9wtKu_gTE/viewform";
export const DEFAULT_ONBOARDING_DOC_URL =
  "https://docs.google.com/document/d/1b3DyzRQ0h9u91l80kl_iqyrhKd6FiGe2xQe1rqN-FdE/view";

export const PROVIDERS = {
  kit: {
    scope: "both",
    configFields: [
      "tag_id",
      "contact_email",
      "contact_name",
      "onboarding_form_url",
      "onboarding_doc_url",
      "onboarding_subject",
      "onboarding_preview_text",
      "onboarding_sender_email",
      "email_template_id",
    ],
    secretFields: ["api_key"],
    operatorConnected(record) {
      return Boolean(record.secrets.api_key);
    },
    clientConnected(record) {
      return Boolean(record.secrets.api_key && record.config.tag_id);
    },
  },
  discord: {
    scope: "operator",
    configFields: [],
    secretFields: ["webhook_url"],
    operatorConnected(record) {
      return Boolean(record.secrets.webhook_url);
    },
  },
  calcom: {
    scope: "client",
    configFields: ["contact_email", "contact_name", "booking_url", "booking_note"],
    secretFields: ["api_key", "path_secret"],
    pathSecret: true,
    clientConnected(record) {
      return Boolean(record.secrets.path_secret);
    },
  },
  calendly: {
    scope: "client",
    configFields: ["contact_email", "contact_name", "booking_url", "booking_note"],
    secretFields: ["path_secret"],
    pathSecret: true,
    clientConnected(record) {
      return Boolean(record.secrets.path_secret);
    },
  },
  whop: {
    scope: "client",
    configFields: ["contact_email", "contact_name", "company_id"],
    secretFields: ["api_key", "path_secret", "webhook_secret"],
    pathSecret: true,
    clientConnected(record) {
      return Boolean(record.secrets.path_secret);
    },
  },
  stripe: {
    scope: "client",
    configFields: ["contact_email", "contact_name", "webhook_description"],
    secretFields: ["api_key", "path_secret", "webhook_secret"],
    pathSecret: true,
    clientConnected(record) {
      return Boolean(record.secrets.path_secret || record.secrets.webhook_secret);
    },
  },
  youtube: {
    scope: "client",
    configFields: ["confirmed", "confirmed_at", "channel_note", "handle"],
    secretFields: [],
    clientConnected(record) {
      return Boolean(record.config.confirmed);
    },
  },
  instagram: {
    scope: "client",
    configFields: ["confirmed", "confirmed_at", "channel_note", "handle"],
    secretFields: [],
    clientConnected(record) {
      return Boolean(record.config.confirmed);
    },
  },
  zapier: {
    scope: "client",
    configFields: ["note"],
    secretFields: ["webhook_url"],
    clientConnected(record) {
      return Boolean(record.secrets.webhook_url);
    },
  },
};

export function validateProvider(provider, scope) {
  const safeProvider = str(provider).toLowerCase();
  const def = PROVIDERS[safeProvider];
  if (!def) return { error: `unknown provider: ${provider}` };
  if (def.scope !== "both" && def.scope !== scope) {
    return { error: `${safeProvider} is not valid for ${scope} scope` };
  }
  return { provider: safeProvider, def };
}

export function normalizeScope(value) {
  return value === "operator" ? "operator" : value === "client" ? "client" : "";
}

export async function listIntegrations(env, filters = {}) {
  if (!env.DB) return [];
  const where = [];
  const params = [];
  if (filters.scope) {
    where.push("scope=?");
    params.push(filters.scope);
  }
  if (hasOwn(filters, "client")) {
    where.push("COALESCE(client_id,'')=?");
    params.push(filters.client ? cleanId(filters.client) : "");
  }
  if (filters.provider) {
    where.push("provider=?");
    params.push(str(filters.provider).toLowerCase());
  }
  const result = await env.DB.prepare(
    `SELECT scope, client_id, provider, config_json, secret_json, created_at, updated_at
       FROM integrations${where.length ? ` WHERE ${where.join(" AND ")}` : ""}
       ORDER BY scope, COALESCE(client_id,''), provider`,
  ).bind(...params).all();

  const rows = result.results || [];
  const eventRows = await env.DB.prepare(
    `SELECT provider, COALESCE(client,'') AS client_key, MAX(ts) AS last_event_ts
       FROM integration_events GROUP BY provider, COALESCE(client,'')`,
  ).all().catch(() => ({ results: [] }));
  const eventMap = new Map(
    (eventRows.results || []).map((row) => [`${row.provider}:${row.client_key}`, row.last_event_ts]),
  );

  return rows.map((row) => inflateIntegrationRow(row, eventMap));
}

export async function getIntegration(env, scope, client, provider) {
  const rows = await listIntegrations(env, { scope, client, provider });
  return rows[0] || null;
}

export async function upsertIntegration(env, input) {
  if (!env.DB) return { ok: false, error: "no database bound" };
  const scope = normalizeScope(input.scope);
  const client = scope === "client" ? cleanId(input.client) : "";
  const checked = validateProvider(input.provider, scope);
  if (checked.error) return { ok: false, error: checked.error };
  if (scope === "client" && !client) return { ok: false, error: "valid client id required" };

  const existing = await getIntegration(env, scope, client, checked.provider);
  const existingConfig = existing?.config || {};
  const existingSecrets = existing?.secrets || {};

  const nextConfig = mergeObject(existingConfig, input.config || {}, checked.def.configFields);
  const nextSecrets = mergeObject(existingSecrets, input.secrets || {}, checked.def.secretFields, true);
  let generatedPathSecret = null;
  if (checked.def.pathSecret && !nextSecrets.path_secret) {
    generatedPathSecret = generateOpaqueToken(18);
    nextSecrets.path_secret = generatedPathSecret;
  }

  const createdAt = existing?.created_at || nowIso();
  const updatedAt = nowIso();
  await env.DB.prepare(
    `INSERT INTO integrations (scope, client_id, provider, config_json, secret_json, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(scope, client_id, provider) DO UPDATE SET
       config_json=excluded.config_json,
       secret_json=excluded.secret_json,
       updated_at=excluded.updated_at`,
  ).bind(
    scope,
    client,
    checked.provider,
    JSON.stringify(nextConfig),
    JSON.stringify(nextSecrets),
    createdAt,
    updatedAt,
  ).run();

  const saved = await getIntegration(env, scope, client, checked.provider);
  const webhookUrl = generatedPathSecret || input?.secrets?.path_secret
    ? buildWebhookUrl(input.origin, checked.provider, generatedPathSecret || str(input.secrets.path_secret))
    : null;

  return {
    ok: true,
    integration: saved ? maskIntegration(saved) : null,
    one_time: webhookUrl ? { webhook_url: webhookUrl } : null,
  };
}

export async function deleteIntegration(env, scope, client, provider) {
  if (!env.DB) return { ok: false, error: "no database bound" };
  const safeScope = normalizeScope(scope);
  const safeClient = safeScope === "client" ? cleanId(client) : "";
  const checked = validateProvider(provider, safeScope);
  if (checked.error) return { ok: false, error: checked.error };
  const result = await env.DB.prepare(
    "DELETE FROM integrations WHERE scope=? AND COALESCE(client_id,'')=? AND provider=?",
  ).bind(safeScope, safeClient, checked.provider).run();
  return { ok: true, deleted: Boolean(result.meta?.changes) };
}

export function maskIntegration(record) {
  const def = PROVIDERS[record.provider];
  const masked = {
    scope: record.scope,
    client: record.client,
    provider: record.provider,
    config: { ...record.config },
    created_at: record.created_at,
    updated_at: record.updated_at,
    last_event_ts: record.last_event_ts || null,
    connected: isIntegrationConnected(record),
  };
  for (const field of def.secretFields) {
    masked.config[`${field}_set`] = Boolean(record.secrets[field]);
  }
  return masked;
}

export function isIntegrationConnected(record) {
  const def = PROVIDERS[record.provider];
  if (!def) return false;
  if (record.scope === "operator" && typeof def.operatorConnected === "function") {
    return def.operatorConnected(record);
  }
  if (record.scope === "client" && typeof def.clientConnected === "function") {
    return def.clientConnected(record);
  }
  return false;
}

export async function recordIntegrationEvent(env, event) {
  if (!env.DB) return { ok: false, duplicate: false };
  const payload = event.payloadSummary || {};
  try {
    const result = await env.DB.prepare(
      `INSERT INTO integration_events (provider, kind, client, external_id, payload_summary_json, ts)
       VALUES (?,?,?,?,?,?)`,
    ).bind(
      str(event.provider).toLowerCase(),
      str(event.kind).toLowerCase(),
      cleanId(event.client, null),
      strOrNull(event.externalId),
      JSON.stringify(payload),
      event.ts || nowIso(),
    ).run();
    return { ok: true, duplicate: false, id: result.meta?.last_row_id ?? null };
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unique")) {
      return { ok: true, duplicate: true };
    }
    throw error;
  }
}

export async function getLatestEventFor(env, provider, client) {
  if (!env.DB) return null;
  return env.DB.prepare(
    `SELECT provider, kind, client, payload_summary_json, external_id, ts
       FROM integration_events
      WHERE provider=? AND COALESCE(client,'')=?
      ORDER BY ts DESC LIMIT 1`,
  ).bind(str(provider).toLowerCase(), client ? cleanId(client) : "").first();
}

export async function recordFailure(env, client, kind, detail, options = {}) {
  try {
    if (!env.DB) return;
    await env.DB.prepare(
      "INSERT INTO delivery_failures (client,kind,detail,at) VALUES (?,?,?,?)",
    ).bind(
      cleanId(client, "unknown"),
      str(kind).slice(0, 120),
      detail == null ? null : String(detail).slice(0, 500),
      nowIso(),
    ).run();
  } catch {
    return;
  }

  if (options.skipDiscord) return;
  await sendDiscordAlert(env, {
    title: "Delivery failure",
    lines: [
      `Client: ${client || "unknown"}`,
      `Kind: ${kind}`,
      String(detail || "").slice(0, 220),
    ],
  }, { skipFailureLog: true });
}

export async function sendDiscordAlert(env, alert, options = {}) {
  const discord = await getIntegration(env, "operator", "", "discord");
  const url = discord?.secrets?.webhook_url;
  if (!url) return { ok: false, status: "not_configured" };

  const content = formatDiscordMessage(alert);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      const detail = `discord_${response.status}: ${await safeText(response)}`;
      if (!options.skipFailureLog) {
        await recordFailure(env, alert.client || "operator", "discord", detail, { skipDiscord: true });
      }
      return { ok: false, status: `http_${response.status}` };
    }
    return { ok: true, status: "sent" };
  } catch (error) {
    if (!options.skipFailureLog) {
      await recordFailure(
        env,
        alert.client || "operator",
        "discord",
        `network_error: ${error?.message || error}`,
        { skipDiscord: true },
      );
    }
    return { ok: false, status: "network_error" };
  }
}

export async function sendDiscordTest(env) {
  return sendDiscordAlert(env, {
    title: "Integrations test",
    lines: ["Discord webhook received the Pulsify test ping."],
  });
}

export async function sendKitTest(env, record) {
  if (!record?.secrets?.api_key) {
    return { ok: false, status: "not_configured", error: "Kit API key not configured" };
  }

  try {
    const response = await fetch("https://api.kit.com/v4/tags?per_page=5", {
      headers: { "X-Kit-Api-Key": record.secrets.api_key },
    });
    if (!response.ok) {
      return {
        ok: false,
        status: `http_${response.status}`,
        error: await safeText(response),
      };
    }
    const data = await response.json().catch(() => ({}));
    return {
      ok: true,
      status: "connected",
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 5).map((tag) => tag.name) : [],
    };
  } catch (error) {
    return { ok: false, status: "network_error", error: error?.message || String(error) };
  }
}

export function buildWebhookUrl(origin, provider, secret) {
  return `${origin}/api/hooks/${encodeURIComponent(provider)}/${encodeURIComponent(secret)}`;
}

export async function resolveIntegrationBySecret(env, provider, secret) {
  const safeProvider = str(provider).toLowerCase();
  const safeSecret = str(secret);
  if (!env.DB || !safeProvider || !safeSecret) return null;
  const rows = await listIntegrations(env, { scope: "client", provider: safeProvider });
  return rows.find((row) => row.secrets.path_secret === safeSecret) || null;
}

export async function getClientKitConfig(env, client) {
  const integration = await getIntegration(env, "client", client, "kit");
  if (integration?.secrets?.api_key || integration?.config?.tag_id) {
    return {
      kit_api_key: integration.secrets.api_key || null,
      kit_tag_id: integration.config.tag_id || null,
      contact_email: normalizeEmail(integration.config.contact_email),
      contact_name: strOrNull(integration.config.contact_name),
    };
  }

  if (!env.DB) return null;
  const legacy = await env.DB.prepare(
    `SELECT kit_api_key, kit_tag_id FROM client_config WHERE client=?`,
  ).bind(cleanId(client)).first().catch(() => null);
  return legacy || null;
}

export async function getClientIntegrationStatuses(env, client) {
  const safeClient = cleanId(client);
  const rows = await listIntegrations(env, { scope: "client", client: safeClient });
  const statuses = new Map(
    rows.map((row) => [
      row.provider,
      {
        provider: row.provider,
        connected: isIntegrationConnected(row),
        last_event_ts: row.last_event_ts || null,
      },
    ]),
  );

  if (!statuses.has("kit") && env.DB) {
    const legacy = await env.DB.prepare(
      `SELECT kit_api_key FROM client_config WHERE client=?`,
    ).bind(safeClient).first().catch(() => null);
    if (legacy) {
      statuses.set("kit", {
        provider: "kit",
        connected: Boolean(legacy.kit_api_key),
        last_event_ts: (await getLatestEventFor(env, "kit", safeClient))?.ts || null,
      });
    }
  }

  return ["kit", "calcom", "calendly", "whop", "stripe", "youtube", "instagram", "zapier"]
    .map((provider) => statuses.get(provider))
    .filter(Boolean);
}

export async function ensureClientConfigRow(env, client) {
  if (!env.DB) return;
  const safeClient = cleanId(client);
  if (!safeClient) return;
  await env.DB.prepare(
    `INSERT INTO client_config (client, client_name, status, updated_at)
     VALUES (?,?,?,?)
     ON CONFLICT(client) DO UPDATE SET
       client_name=COALESCE(client_config.client_name, excluded.client_name),
       updated_at=excluded.updated_at`,
  ).bind(safeClient, titleCase(safeClient), "prospect", nowIso()).run();
}

function inflateIntegrationRow(row, eventMap) {
  const scope = row.scope === "operator" ? "operator" : "client";
  const client = scope === "client" ? cleanId(row.client_id) : "";
  return {
    scope,
    client,
    provider: str(row.provider).toLowerCase(),
    config: parseJson(row.config_json),
    secrets: parseJson(row.secret_json),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    last_event_ts: eventMap.get(`${row.provider}:${client}`) || null,
  };
}

function mergeObject(existing, incoming, allowedFields, preserveBlank = false) {
  const next = { ...(existing || {}) };
  for (const field of allowedFields) {
    if (!hasOwn(incoming, field)) continue;
    const value = incoming[field];
    if (value === null) {
      delete next[field];
      continue;
    }
    if (preserveBlank && str(value) === "") continue;
    if (!preserveBlank && typeof value === "string" && str(value) === "") continue;
    next[field] = typeof value === "string" ? value.trim() : value;
  }
  for (const key of Object.keys(next)) {
    if (!allowedFields.includes(key)) delete next[key];
  }
  return next;
}

function formatDiscordMessage(alert) {
  const bits = [`**${alert.title || "Pulsify alert"}**`];
  for (const line of alert.lines || []) {
    if (line) bits.push(String(line));
  }
  return bits.join("\n").slice(0, 1900);
}

async function safeText(response) {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "";
  }
}

export function optionsResponse(methods, headers = "content-type, x-admin-key") {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": methods,
      "access-control-allow-headers": headers,
      "access-control-max-age": "86400",
    },
  });
}

export function adminJsonError(message, status = 422) {
  return json({ ok: false, error: message }, status);
}
