// In-house notifications. One writer (notify), one reader (the bell).
// emitEvent() calls describeEvent() so every event the platform already
// produces becomes a notification without each feature knowing about it;
// features can also call notify() directly for things that are not events.
// Outside delivery is deliberately narrow: Discord only, only for a lead reply.
import { generateOpaqueToken, nowIso, str } from "./common.js";

const money = (cents, cur) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD", maximumFractionDigits: 0 }).format(Number(cents || 0) / 100);
const who = (d) => d?.name && d?.handle ? `${d.name}, @${d.handle}` : d?.handle ? `@${d.handle}` : d?.name || d?.email || "someone";

// Event -> what the bell shows. link is a shell route (view[:section]) the
// notification opens. Return null to stay silent for an event.
export function describeEvent(event, data = {}, scope = "operator") {
  switch (event) {
    case "conversation.new_message":
      if (data.direction !== "inbound") return null;
      return { kind: "lead.replied", severity: "success", title: `${who(data)} replied`, body: str(data.text).slice(0, 200) || "(attachment)", link: "outreach", discord: true };
    case "lead.created":
      return { kind: "lead.created", severity: "info", title: `New lead ${who(data)}`, body: data.source ? `Source: ${data.source}` : "", link: "leads" };
    case "lead.stage_changed":
      return { kind: "lead.stage", severity: "info", title: `${data.name || "Lead"} moved to ${data.to || "a new stage"}`, body: data.from ? `From ${data.from}` : "", link: "crm" };
    case "payment.received":
      return { kind: "payment", severity: "success", title: `Payment ${money(data.amount_cents, data.currency)} from ${who(data)}`, body: data.provider ? `Via ${data.provider}` : "", link: scope === "client" ? "revenue" : "payments" };
    case "payment.matched":
      return { kind: "payment", severity: "success", title: `Payment matched to ${data.target_label || who(data)}`, body: money(data.amount_cents, data.currency), link: scope === "client" ? "revenue" : "payments" };
    case "payment.unmatched":
      return { kind: "payment", severity: "warn", title: `Payment ${money(data.amount_cents, data.currency)} needs a lead`, body: "No confident match. Link it by hand.", link: scope === "client" ? "revenue" : "payments" };
    case "payment.refunded":
      return { kind: "payment", severity: "warn", title: `Refund ${money(data.refunded_cents || data.amount_cents, data.currency)}`, body: who(data), link: scope === "client" ? "revenue" : "payments" };
    case "client.provisioned":
      return { kind: "client", severity: "success", title: `${data.name || data.client || "A client"} is provisioned`, body: `Source: ${data.source || "operator"}. Welcome email ${data.welcome_state || "pending"}.`, link: "clients" };
    case "client.checklist_step_completed":
      return { kind: "checklist", severity: "success", title: `Launch step done: ${str(data.step).replace(/-/g, " ")}`, body: data.by ? `By ${data.by}` : "", link: "home" };
    case "content.sequence_published":
      return { kind: "content", severity: "success", title: `Sequence published: ${data.title || data.id || ""}`, body: "", link: "content" };
    case "integration.sync_failed":
      return null; // Technical failures belong in sync_runs / delivery_failures, not the bell.
    case "client.delete_requested":
      return { kind: "client", severity: "warn", title: `${data.client || "A client"} asked to close their workspace`, body: str(data.reason).slice(0, 200) || "No reason given. Nothing deleted.", link: "clients" };
    default:
      return null;
  }
}

// Write one notification. dedupeKey makes repeated calls a no-op.
export async function notify(env, { scope = "operator", clientId = "", kind, severity = "info", title, body = "", link = "", entity = null, dedupeKey = null, discord = false }) {
  if (!env?.DB || !title || kind === "system") return null;
  const id = `ntf_${generateOpaqueToken(10)}`;
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO notifications (id, scope, client_id, kind, severity, title, body, link, entity_json, dedupe_key, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(id, scope === "client" ? "client" : "operator", str(clientId), str(kind || "system"), severity, str(title).slice(0, 200), str(body).slice(0, 1000) || null, str(link) || null, entity ? JSON.stringify(entity) : null, dedupeKey ? str(dedupeKey) : null, nowIso()).run();
  if (!Number(inserted.meta?.changes || 0)) return null;
  if (discord && kind === "lead.replied" && scope === "operator") await discordLeadReply(env, { title, body }).catch(() => null);
  try {
    const { pushOperator, pushClient } = await import("./realtime.js");
    if (scope === "operator" && typeof pushOperator === "function") await pushOperator(env, "notification", { id });
    else if (scope === "client" && clientId) await pushClient(env, clientId, "notification", { id });
  } catch { /* push is optional; the 30 s poll still catches it */ }
  return id;
}

// The one outside channel: Discord, and only when a lead replied.
async function discordLeadReply(env, { title, body }) {
  const { sendDiscordAlert } = await import("./integrations.js");
  return sendDiscordAlert(env, { kind: "lead.replied", title, lines: [body].filter(Boolean) }, { skipFailureLog: true });
}

export async function notifyFromEvent(env, { scope, clientId, event, data }) {
  const d = describeEvent(event, data, scope);
  if (!d) return null;
  // Client-scoped events also tell the operator; the operator copy links to the client.
  const own = await notify(env, { scope, clientId, ...d, entity: { event, ...data }, dedupeKey: data?.message_id ? `${scope}:${clientId}:${event}:${data.message_id}` : null });
  if (scope === "client" && clientId) {
    const forOperator = describeEvent(event, data, "operator") || d;
    await notify(env, { scope: "operator", clientId, ...forOperator, title: `${clientId}: ${forOperator.title}`, entity: { event, client: clientId, ...data }, discord: false, dedupeKey: data?.message_id ? `operator:${clientId}:${event}:${data.message_id}` : null });
  }
  return own;
}

// Operator feed: every operator row (client_id there only says which client it
// is about). Client feed: rows for that one workspace.
function where(scope, clientId) {
  return scope === "operator" ? { sql: "scope='operator' AND kind != 'system'", args: [] } : { sql: "scope='client' AND client_id=? AND kind != 'system'", args: [str(clientId)] };
}

export async function listNotifications(env, { scope, clientId = "", limit = 50, unreadOnly = false }) {
  const w = where(scope, clientId);
  const rows = await env.DB.prepare(
    `SELECT id, client_id, kind, severity, title, body, link, entity_json, created_at, read_at
       FROM notifications WHERE ${w.sql} ${unreadOnly ? "AND read_at IS NULL" : ""}
      ORDER BY created_at DESC LIMIT ?`,
  ).bind(...w.args, Math.max(1, Math.min(200, Math.trunc(Number(limit)) || 50))).all();
  const unread = await env.DB.prepare(`SELECT COUNT(*) AS n FROM notifications WHERE ${w.sql} AND read_at IS NULL`).bind(...w.args).first();
  return { items: (rows.results || []).map((r) => ({ ...r, entity: safeParse(r.entity_json), entity_json: undefined })), unread: Number(unread?.n || 0) };
}

export async function markRead(env, { scope, clientId = "", ids = [], all = false }) {
  const now = nowIso();
  const w = where(scope, clientId);
  if (all) {
    const r = await env.DB.prepare(`UPDATE notifications SET read_at=? WHERE ${w.sql} AND read_at IS NULL`).bind(now, ...w.args).run();
    return Number(r.meta?.changes || 0);
  }
  let n = 0;
  for (const id of ids.slice(0, 100)) {
    const r = await env.DB.prepare(`UPDATE notifications SET read_at=? WHERE id=? AND ${w.sql} AND read_at IS NULL`).bind(now, str(id), ...w.args).run();
    n += Number(r.meta?.changes || 0);
  }
  return n;
}

function safeParse(v) { try { return v ? JSON.parse(v) : null; } catch { return null; } }
