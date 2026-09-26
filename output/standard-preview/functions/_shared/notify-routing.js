// Outside notifications (pulsify-saas #32, founder 2026-09-25): which bell
// events also go out by email, Discord or Slack, switched per channel and per
// kind of event, for the operator and for each client workspace.
//
// The bell always gets every row; routing only decides what else is sent.
// Stored as {channels: {email|discord|slack: [groups]}, hooks: {discord, slack}}
// in operator_state (operator_email "operator") or workspace_preferences
// (per client), key "notification-routing". Webhook URLs are checked against
// Discord's and Slack's own hosts before they are saved and are never sent
// back to the browser. Every send is best effort and time-bounded.
import { getIntegration } from "./integrations.js";
import { normalizeEmail, nowIso, parseJson, str } from "./common.js";

export const ROUTE_GROUPS = {
  payments: ["payment"],
  calls: ["booking"],
  applications: ["application"],
  replies: ["lead.replied"],
  pages: ["page.viewed"],
};
export const CHANNELS = ["email", "discord", "slack"];
const KEY = "notification-routing";
const OPERATOR_OWNER = "operator";

// Defaults keep the old rule: the one outside ping was Discord when a lead replied.
export const DEFAULT_CHANNELS = {
  operator: { email: [], discord: ["replies"], slack: [] },
  client: { email: [], discord: [], slack: [] },
};

export function groupOf(kind) {
  for (const [group, kinds] of Object.entries(ROUTE_GROUPS)) if (kinds.includes(kind)) return group;
  return null;
}

export function cleanChannels(input, fallback) {
  const out = {};
  for (const channel of CHANNELS) {
    const list = Array.isArray(input?.[channel]) ? input[channel] : fallback[channel] || [];
    out[channel] = [...new Set(list.map(str).filter((group) => group in ROUTE_GROUPS))];
  }
  return out;
}

/** A webhook URL only when it points at Discord's or Slack's own webhook endpoints. */
export function webhookUrl(channel, value) {
  const text = str(value).trim();
  if (!text || text.length > 500) return "";
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return "";
    if (channel === "discord" && /^(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)$/i.test(url.hostname) && url.pathname.startsWith("/api/webhooks/")) {
      return url.toString();
    }
    if (channel === "slack" && url.hostname.toLowerCase() === "hooks.slack.com" && url.pathname.startsWith("/services/")) return url.toString();
  } catch {
    return "";
  }
  return "";
}

async function readStored(env, scope, clientId) {
  const row = scope === "client"
    ? await env.DB.prepare("SELECT value_json FROM workspace_preferences WHERE client_id=? AND key=?").bind(str(clientId), KEY).first().catch(() => null)
    : await env.DB.prepare("SELECT value_json FROM operator_state WHERE operator_email=? AND key=?").bind(OPERATOR_OWNER, KEY).first().catch(() => null);
  return parseJson(row?.value_json, {});
}

async function writeStored(env, scope, clientId, value) {
  const json = JSON.stringify(value);
  if (scope === "client") {
    await env.DB.prepare(
      "INSERT INTO workspace_preferences(client_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(client_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at",
    ).bind(str(clientId), KEY, json, nowIso()).run();
  } else {
    await env.DB.prepare(
      "INSERT INTO operator_state(operator_email,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(operator_email,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at",
    ).bind(OPERATOR_OWNER, KEY, json, nowIso()).run();
  }
}

/** Channels and hooks for a scope, with the operator's Discord falling back to the one saved in Integrations. */
export async function loadRouting(env, scope, clientId = "") {
  const kind = scope === "client" ? "client" : "operator";
  const stored = await readStored(env, kind, clientId);
  const hooks = { discord: webhookUrl("discord", stored.hooks?.discord), slack: webhookUrl("slack", stored.hooks?.slack) };
  if (kind === "operator" && !hooks.discord) {
    const saved = await getIntegration(env, "operator", "", "discord").catch(() => null);
    hooks.discord = webhookUrl("discord", saved?.secrets?.webhook_url);
  }
  return { channels: cleanChannels(stored.channels, DEFAULT_CHANNELS[kind]), hooks };
}

export async function saveChannels(env, scope, clientId, channels) {
  const kind = scope === "client" ? "client" : "operator";
  const stored = await readStored(env, kind, clientId);
  const next = { ...stored, channels: cleanChannels(channels, DEFAULT_CHANNELS[kind]) };
  await writeStored(env, kind, clientId, next);
  return next.channels;
}

/** Save or clear a Discord or Slack webhook. Returns an error message for a URL that is not theirs. */
export async function saveHook(env, scope, clientId, channel, value) {
  if (channel !== "discord" && channel !== "slack") return { error: "Unknown channel." };
  const url = value ? webhookUrl(channel, value) : "";
  if (value && !url) {
    return { error: channel === "discord" ? "Paste a Discord webhook URL (https://discord.com/api/webhooks/...)." : "Paste a Slack webhook URL (https://hooks.slack.com/services/...)." };
  }
  const kind = scope === "client" ? "client" : "operator";
  const stored = await readStored(env, kind, clientId);
  await writeStored(env, kind, clientId, { ...stored, hooks: { ...(stored.hooks || {}), [channel]: url } });
  return { ok: true, connected: Boolean(url) };
}

async function recipient(env, scope, clientId) {
  if (scope !== "client") {
    return normalizeEmail(str(env.OPERATOR_EMAIL) || str(env.OPERATOR_EMAILS).split(",")[0] || "");
  }
  const row = await env.DB.prepare("SELECT email FROM client_auth WHERE client_id=?").bind(str(clientId)).first().catch(() => null);
  return normalizeEmail(row?.email || "");
}

/** What the Settings page shows about each channel: can it send, and where to. Never the webhook itself. */
export async function channelState(env, scope, clientId = "") {
  const routing = await loadRouting(env, scope, clientId);
  const to = await recipient(env, scope, clientId);
  return {
    channels: routing.channels,
    email: { available: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM && to), to: to ? to.replace(/^(.).*(@.*)$/, "$1***$2") : "" },
    discord: { connected: Boolean(routing.hooks.discord) },
    slack: { connected: Boolean(routing.hooks.slack) },
  };
}

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  return response?.ok ? "sent" : response ? `http_${response.status}` : "network_error";
}

async function sendTo(env, channel, routing, scope, clientId, message) {
  const title = str(message.title).slice(0, 200);
  const body = str(message.body).slice(0, 1000);
  if (channel === "discord") {
    if (!routing.hooks.discord) return "not_configured";
    return post(routing.hooks.discord, { content: body ? `**${title}**\n${body}` : `**${title}**`, allowed_mentions: { parse: [] } });
  }
  if (channel === "slack") {
    if (!routing.hooks.slack) return "not_configured";
    return post(routing.hooks.slack, { text: body ? `*${title}*\n${body}` : `*${title}*` });
  }
  const to = await recipient(env, scope, clientId);
  if (!to || !env.RESEND_API_KEY || !env.EMAIL_FROM) return "not_configured";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject: title, text: body || title }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  return response?.ok ? "sent" : response ? `http_${response.status}` : "network_error";
}

/** Send a bell row to every channel switched on for its kind of event. Never throws. */
export async function routeOutside(env, { scope, clientId = "", kind, title, body = "" }) {
  const group = groupOf(kind);
  if (!group || !env?.DB) return [];
  const routing = await loadRouting(env, scope, clientId).catch(() => null);
  if (!routing) return [];
  const targets = CHANNELS.filter((channel) => routing.channels[channel].includes(group));
  return Promise.all(targets.map(async (channel) => ({ channel, status: await sendTo(env, channel, routing, scope, clientId, { title, body }).catch(() => "error") })));
}

/** The Test button in Settings: one message on one channel. */
export async function sendTest(env, scope, clientId, channel) {
  if (!CHANNELS.includes(channel)) return "unknown_channel";
  const routing = await loadRouting(env, scope, clientId);
  return sendTo(env, channel, routing, scope, clientId, { title: "Pulsify test", body: "Notifications reach this channel." });
}
