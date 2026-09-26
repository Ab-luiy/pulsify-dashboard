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
//
// Policy (founder, 2026-09-23): the bell carries things other people did that
// need the founder: a real DM, money, a signature, a client action, a funnel
// application or booking. Anything the founder did himself (stage moves,
// manual matches) and automatic bookkeeping stays silent.
export function describeEvent(event, data = {}, scope = "operator") {
  const customer = data.customer_name || data.customer_email || "";
  switch (event) {
    case "conversation.new_message":
      // Instagram DMs are announced by the inbox sync through dmPolicy, which
      // filters spam and requests. Only other channels (Push API) land here.
      if (data.direction !== "inbound" || data.source === "instagram") return null;
      return { kind: "lead.replied", severity: "success", title: `${who(data)} sent a message`, body: str(data.text).slice(0, 200) || "(attachment)", link: "outreach", discord: true };
    case "lead.created":
    case "lead.stage_changed":
    case "payment.matched":
    case "payment.unmatched":
    case "integration.sync_failed":
      return null;
    case "payment.received":
      // Imports backfill history; only fresh money is news.
      if (data.occurred_at && Date.now() - Date.parse(data.occurred_at) > 3 * 86400000) return null;
      return { kind: "payment", severity: "success", title: `${money(data.amount_cents, data.currency)} received${customer ? ` from ${customer}` : ""}`, body: data.source || data.provider ? `Via ${titleWord(data.source || data.provider)}` : "", link: scope === "client" ? "revenue" : "payments" };
    case "payment.refunded":
      return { kind: "payment", severity: "warn", title: `Refund of ${money(data.refunded_cents || data.amount_cents, data.currency)}`, body: customer, link: scope === "client" ? "revenue" : "payments" };
    case "client.provisioned": {
      if (scope === "operator" && data.source === "operator") return null;
      const name = data.name || data.client_id || data.client || "A client";
      const title = data.source === "docusign" ? `${name} signed the contract` : data.source === "payment" ? `${name} paid and their workspace is ready` : `${name}'s workspace is ready`;
      return { kind: "client", severity: "success", title, body: data.email ? `Login: ${data.email}` : "", link: "clients" };
    }
    case "client.checklist_step_completed":
      // Steps the operator ticked himself are not news to him.
      if (scope === "operator" && data.by && !/^(client:|system$)/.test(str(data.by))) return null;
      return { kind: "checklist", severity: "success", title: `Launch step done: ${str(data.step).replace(/-/g, " ")}`, body: "", link: "home" };
    case "content.sequence_published":
      // The operator approves sequences; only the client hears about it.
      if (scope === "operator") return null;
      return { kind: "content", severity: "success", title: "Your sequence was approved", body: "", link: "content" };
    case "client.delete_requested":
      return { kind: "client", severity: "warn", title: `${data.client || "A client"} asked to close their workspace`, body: str(data.reason).slice(0, 200) || "No reason given. Nothing deleted.", link: "clients" };
    default:
      return null;
  }
}

const titleWord = (value) => { const v = str(value); return v ? v[0].toUpperCase() + v.slice(1) : ""; };

// Display name for a client id; falls back to the id.
export async function clientLabel(env, clientId) {
  if (!clientId || !env?.DB) return str(clientId);
  const row = await env.DB.prepare("SELECT client_name FROM client_config WHERE client=?").bind(str(clientId)).first().catch(() => null);
  return str(row?.client_name) || str(clientId);
}

// Kinds the bell no longer shows. Old rows stay in the table but are hidden
// from the feed and the unread count.
export const RETIRED_KINDS = ["lead.stage", "lead.created", "suppressed"];

// Write one notification. dedupeKey makes repeated calls a no-op.
// `outside: false` keeps a row in the bell only (the operator's copy of a
// client event); otherwise notification routing decides email, Discord, Slack.
export async function notify(env, { scope = "operator", clientId = "", kind, severity = "info", title, body = "", link = "", entity = null, dedupeKey = null, outside = true }) {
  if (!env?.DB || !title || kind === "system") return null;
  const id = `ntf_${generateOpaqueToken(10)}`;
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO notifications (id, scope, client_id, kind, severity, title, body, link, entity_json, dedupe_key, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(id, scope === "client" ? "client" : "operator", str(clientId), str(kind || "system"), severity, str(title).slice(0, 200), str(body).slice(0, 1000) || null, str(link) || null, entity ? JSON.stringify(entity) : null, dedupeKey ? str(dedupeKey) : null, nowIso()).run();
  if (!Number(inserted.meta?.changes || 0)) return null;
  if (outside) {
    // Email, Discord and Slack per the Settings switches (pulsify-saas #32). Best effort, never blocks the bell.
    try {
      const { routeOutside } = await import("./notify-routing.js");
      await routeOutside(env, { scope: scope === "client" ? "client" : "operator", clientId: str(clientId), kind: str(kind), title, body });
    } catch { /* routing is optional */ }
  }
  try {
    const { pushOperator, pushClient } = await import("./realtime.js");
    if (scope === "operator" && typeof pushOperator === "function") await pushOperator(env, "notification", { id });
    else if (scope === "client" && clientId) await pushClient(env, clientId, "notification", { id });
  } catch { /* push is optional; the 30 s poll still catches it */ }
  return id;
}

export async function notifyFromEvent(env, { scope, clientId, event, data }) {
  const d = describeEvent(event, data, scope);
  if (!d) return null;
  // Client-scoped events also tell the operator; the operator copy links to the client.
  const own = await notify(env, { scope, clientId, ...d, entity: { event, ...data }, dedupeKey: data?.message_id ? `${scope}:${clientId}:${event}:${data.message_id}` : null });
  if (scope === "client" && clientId) {
    const forOperator = describeEvent(event, data, "operator");
    if (forOperator) await notify(env, { scope: "operator", clientId, ...forOperator, title: `${await clientLabel(env, clientId)}: ${forOperator.title}`, entity: { event, client: clientId, ...data }, outside: false, dedupeKey: data?.message_id ? `operator:${clientId}:${event}:${data.message_id}` : null });
  }
  return own;
}

// Operator feed: every operator row (client_id there only says which client it
// is about). Client feed: rows for that one workspace.
function where(scope, clientId) {
  const hidden = `kind NOT IN ('system',${RETIRED_KINDS.map((k) => `'${k}'`).join(",")})`;
  return scope === "operator" ? { sql: `scope='operator' AND ${hidden}`, args: [] } : { sql: `scope='client' AND client_id=? AND ${hidden}`, args: [str(clientId)] };
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
