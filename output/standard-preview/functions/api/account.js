import { sideEffectFailure } from "../_shared/side-effect-failure.js";
// Settings backend for both shells.
//   GET  /api/account                    everything the Settings page shows, for the caller's role
//   POST /api/account {action, ...}      client:   password | signout-others | workspace | notifications | export | delete-request
//                                        operator: defaults | notifications
//                                        both:     routing {channels} | channel {channel, webhook_url} | channel-test {channel}
// Client writes need a real session or portal token. The operator previewing a
// workspace (impersonated session) may change its workspace, notification and
// routing settings (founder 2026-09-25, "god access"), each logged to
// operator_events; the client's own password, sessions and deletion stay theirs.
import { json, str, nowIso, sha256Hex, normalizeEmail } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { withOperator } from "../_shared/access.js";
import { CLIENT_SESSION_COOKIE, createPasswordSalt, hashPassword, parseCookies, resolveClientAccess, verifyPassword, PBKDF2_ITERATIONS } from "../_shared/client-auth.js";
import { notify } from "../_shared/notifications.js";
import { emitEvent } from "../_shared/outbound-webhooks.js";
import { operatorEmails } from "./login-lookup.js";
import { listOperators } from "../_shared/access-requests.js";
import { channelState, saveChannels, saveHook, sendTest } from "../_shared/notify-routing.js";

const TIMEZONES = new Set(Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : []);
const CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD", "AED", "SAR", "CHF", "SEK", "NOK", "DKK", "PLN", "NZD", "SGD", "ZAR", "INR", "BRL", "MXN", "JPY"]);
const NOTIFICATION_KEYS = ["weekly_report", "payment_alerts", "sequence_reviews", "product_updates"];
const DEFAULT_NOTIFICATIONS = { weekly_report: true, payment_alerts: true, sequence_reviews: true, product_updates: false };

async function pref(env, client, key, fallback) {
  const row = await env.DB.prepare("SELECT value_json FROM workspace_preferences WHERE client_id=? AND key=?").bind(client, key).first().catch(() => sideEffectFailure(env, "account_operation_1"));
  if (!row) return fallback;
  try { return { ...fallback, ...JSON.parse(row.value_json) }; } catch { return fallback; }
}
async function setPref(env, client, key, value) {
  await env.DB.prepare(
    "INSERT INTO workspace_preferences(client_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(client_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at",
  ).bind(client, key, JSON.stringify(value), nowIso()).run();
}
async function operatorPref(env, email, key, fallback) {
  const row = await env.DB.prepare("SELECT value_json FROM operator_state WHERE operator_email=? AND key=?").bind(email, key).first().catch(() => sideEffectFailure(env, "account_operation_2"));
  if (!row) return fallback;
  try { return { ...fallback, ...JSON.parse(row.value_json) }; } catch { return fallback; }
}
async function setOperatorPref(env, email, key, value) {
  await env.DB.prepare(
    "INSERT INTO operator_state(operator_email,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(operator_email,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at",
  ).bind(email, key, JSON.stringify(value), nowIso()).run();
}

function cleanWorkspace(input, current) {
  const next = { ...current };
  if (input.timezone !== undefined) {
    const tz = str(input.timezone);
    if (tz && TIMEZONES.size && !TIMEZONES.has(tz)) return { error: "Unknown timezone." };
    next.timezone = tz;
  }
  if (input.currency !== undefined) {
    const cur = str(input.currency).toUpperCase();
    if (cur && !CURRENCIES.has(cur)) return { error: "Unsupported currency." };
    next.currency = cur;
  }
  if (input.website !== undefined) {
    const site = str(input.website).slice(0, 200);
    if (site && !/^https?:\/\/[^\s]+$/.test(site)) return { error: "Website must start with http:// or https://." };
    next.website = site;
  }
  return { value: next };
}
function cleanNotifications(input, current) {
  const next = { ...current };
  for (const key of NOTIFICATION_KEYS) if (input[key] !== undefined) next[key] = Boolean(input[key]);
  return next;
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const operator = resolveOperator(request, env);
  if (!operator.error && request.headers.get("x-pulsify-operator") === "1") return operatorView(env, operator);
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowImpersonated: true });
  if (access.error) return access.error;
  return clientView(env, access);
}

async function clientView(env, access) {
  const client = access.client;
  const [auth, config, sessions, workspace, notifications, brain, records, proof] = await Promise.all([
    env.DB.prepare("SELECT email, pass_hash IS NOT NULL AS has_password, updated_at FROM client_auth WHERE client_id=?").bind(client).first(),
    env.DB.prepare("SELECT client_name, status FROM client_config WHERE client=?").bind(client).first(),
    env.DB.prepare("SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM client_sessions WHERE client_id=? AND expires_at>?").bind(client, nowIso()).first(),
    pref(env, client, "workspace-settings", { timezone: "", currency: "USD", website: "" }),
    pref(env, client, "notification-settings", DEFAULT_NOTIFICATIONS),
    env.DB.prepare("SELECT COUNT(*) AS n FROM client_brain WHERE client_id=?").bind(client).first().catch(() => ({ n: 0 })),
    env.DB.prepare("SELECT COUNT(*) AS n FROM workspace_records WHERE client_id=?").bind(client).first().catch(() => ({ n: 0 })),
    env.DB.prepare("SELECT COUNT(*) AS n FROM proof_items WHERE client_id=?").bind(client).first().catch(() => ({ n: 0 })),
  ]);
  return json({
    ok: true,
    role: "client",
    read_only: Boolean(access.impersonated),
    account: { email: auth?.email || "", has_password: Boolean(auth?.has_password), password_updated_at: auth?.updated_at || null },
    workspace: { client, name: config?.client_name || client, status: config?.status || "", ...workspace },
    sessions: { active: Number(sessions?.n || 0), oldest: sessions?.oldest || null },
    notifications,
    routing: await channelState(env, "client", client),
    data: { brain_fields: Number(brain?.n || 0), records: Number(records?.n || 0), proof_items: Number(proof?.n || 0) },
    timezones: TIMEZONES.size ? [...TIMEZONES] : [],
    currencies: [...CURRENCIES],
  });
}

async function operatorView(env, operator) {
  const email = normalizeEmail(operator.operatorEmail || "");
  const [defaults, notifications, keyUse] = await Promise.all([
    operatorPref(env, email || "operator", "defaults", { timezone: env.OPERATOR_TIMEZONE || "Europe/Istanbul", currency: "USD" }),
    operatorPref(env, email || "operator", "notifications", { discord_payments: true, discord_failures: true, weekly_summary: true }),
    env.DB.prepare("SELECT COUNT(*) AS n, MAX(created_at) AS last FROM operator_events WHERE action='admin-key-use'").first().catch(() => ({ n: 0, last: null })),
  ]);
  return json({
    ok: true,
    role: "operator",
    timezone: defaults.timezone || env.OPERATOR_TIMEZONE || "Europe/Istanbul",
    account: { email, via: operator.via || "access" },
    team: { operators: [...new Set([...operatorEmails(env), ...(await listOperators(env)).map((o) => o.email)])] },
    security: { admin_key_uses: Number(keyUse?.n || 0), admin_key_last_used: keyUse?.last || null, access_protected_paths: ["/admin", "/integrations", "/settings", "/campaigns", "ops.pulsify-ai.com"] },
    defaults,
    notifications,
    routing: await channelState(env, "operator"),
    timezones: TIMEZONES.size ? [...TIMEZONES] : [],
    currencies: [...CURRENCIES],
  });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const action = str(body.action);

  const operator = resolveOperator(request, env);
  if (!operator.error && request.headers.get("x-pulsify-operator") === "1") {
    const email = normalizeEmail(operator.operatorEmail || "") || "operator";
    if (action === "defaults") {
      const current = await operatorPref(env, email, "defaults", { timezone: env.OPERATOR_TIMEZONE || "Europe/Istanbul", currency: "USD" });
      const cleaned = cleanWorkspace(body, current);
      if (cleaned.error) return json({ ok: false, error: cleaned.error }, 422);
      await setOperatorPref(env, email, "defaults", cleaned.value);
      return json({ ok: true, defaults: cleaned.value });
    }
    if (action === "notifications") {
      const current = await operatorPref(env, email, "notifications", { discord_payments: true, discord_failures: true, weekly_summary: true });
      const next = { ...current };
      for (const key of ["discord_payments", "discord_failures", "weekly_summary"]) if (body[key] !== undefined) next[key] = Boolean(body[key]);
      await setOperatorPref(env, email, "notifications", next);
      return json({ ok: true, notifications: next });
    }
    const routed = await routingAction(env, "operator", "", action, body);
    if (routed) return routed;
    return json({ ok: false, error: "unknown action" }, 422);
  }

  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowImpersonated: true });
  if (access.error) return access.error;
  const client = access.client;
  if (access.impersonated) {
    if (!OPERATOR_PREVIEW_ACTIONS.has(action)) return json({ ok: false, error: "read only while impersonating" }, 403);
    await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
      .bind("operator-preview", `settings:${action}`, client, JSON.stringify({ fields: Object.keys(body).filter((key) => key !== "action" && key !== "webhook_url") }), nowIso())
      .run().catch(() => sideEffectFailure(env, "account_operation_6"));
  }

  const routed = await routingAction(env, "client", client, action, body);
  if (routed) return routed;

  if (action === "password") {
    const current = str(body.current), next = str(body.next);
    if (next.length < 10) return json({ ok: false, error: "New password must be at least 10 characters." }, 422);
    const row = await env.DB.prepare("SELECT email, pass_hash, pass_salt, iterations FROM client_auth WHERE client_id=?").bind(client).first();
    if (!row) return json({ ok: false, error: "No login exists for this workspace yet." }, 404);
    if (row.pass_hash && !(await verifyPassword(current, row))) return json({ ok: false, error: "Current password is not right." }, 401);
    const salt = createPasswordSalt();
    const hash = await hashPassword(next, salt, PBKDF2_ITERATIONS);
    await env.DB.prepare("UPDATE client_auth SET pass_hash=?, pass_salt=?, iterations=?, updated_at=? WHERE client_id=?").bind(hash, salt, PBKDF2_ITERATIONS, nowIso(), client).run();
    await signOutOthers(env, request, client);
    return json({ ok: true, signed_out_others: true });
  }

  if (action === "signout-others") {
    const removed = await signOutOthers(env, request, client);
    return json({ ok: true, removed });
  }

  if (action === "workspace") {
    const current = await pref(env, client, "workspace-settings", { timezone: "", currency: "USD", website: "" });
    const cleaned = cleanWorkspace(body, current);
    if (cleaned.error) return json({ ok: false, error: cleaned.error }, 422);
    const name = body.name !== undefined ? str(body.name).slice(0, 80) : null;
    if (name !== null && name.length < 2) return json({ ok: false, error: "Workspace name is too short." }, 422);
    await setPref(env, client, "workspace-settings", cleaned.value);
    if (name !== null) {
      await env.DB.prepare("UPDATE client_config SET client_name=?, updated_at=? WHERE client=?").bind(name, nowIso(), client).run();
    }
    return json({ ok: true, workspace: cleaned.value });
  }

  if (action === "notifications") {
    const current = await pref(env, client, "notification-settings", DEFAULT_NOTIFICATIONS);
    const next = cleanNotifications(body, current);
    await setPref(env, client, "notification-settings", next);
    return json({ ok: true, notifications: next });
  }

  if (action === "export") {
    const [brain, records, proof, config] = await Promise.all([
      env.DB.prepare("SELECT section, field, value_json, source, updated_at FROM client_brain WHERE client_id=? ORDER BY section, field").bind(client).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT id, kind, title, data_json, updated_at FROM workspace_records WHERE client_id=? ORDER BY updated_at DESC LIMIT 2000").bind(client).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT * FROM proof_items WHERE client_id=? ORDER BY created_at DESC LIMIT 500").bind(client).all().catch(() => ({ results: [] })),
      env.DB.prepare("SELECT client, client_name, status FROM client_config WHERE client=?").bind(client).first(),
    ]);
    const bundle = { exported_at: nowIso(), workspace: config, brain: brain.results, records: records.results, proof: proof.results };
    return new Response(JSON.stringify(bundle, null, 2), {
      headers: { "content-type": "application/json", "content-disposition": `attachment; filename="pulsify-${client}-export.json"`, "cache-control": "no-store" },
    });
  }

  if (action === "delete-request") {
    const reason = str(body.reason).slice(0, 500);
    await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
      .bind(`client:${client}`, "workspace-delete-request", client, JSON.stringify({ reason }), nowIso()).run().catch(() => sideEffectFailure(env, "account_operation_3"));
    await emitEvent(env, { scope: "operator", event: "client.delete_requested", data: { client, reason } }).catch(() => sideEffectFailure(env, "account_operation_4"));
    await notify(env, { scope: "operator", clientId: client, kind: "client", severity: "warn", title: `${client} asked to close their workspace`, body: reason || "No reason given. Nothing was deleted; confirm with them first.", link: "clients" }).catch(() => sideEffectFailure(env, "account_operation_5"));
    return json({ ok: true, message: "Request sent. Nothing is deleted until Pulsify confirms with you by email." });
  }

  return json({ ok: false, error: "unknown action" }, 422);
}

// What the operator may change while previewing a client's workspace. The rest
// (password, their sessions, closing the workspace) belongs to the client alone.
const OPERATOR_PREVIEW_ACTIONS = new Set(["workspace", "notifications", "routing", "channel", "channel-test", "export"]);

// Notification routing, same for both scopes (functions/_shared/notify-routing.js).
async function routingAction(env, scope, client, action, body) {
  if (action === "routing") {
    const channels = await saveChannels(env, scope, client, body.channels || {});
    return json({ ok: true, routing: await channelState(env, scope, client), channels });
  }
  if (action === "channel") {
    const saved = await saveHook(env, scope, client, str(body.channel), body.clear === true ? "" : str(body.webhook_url));
    if (saved.error) return json({ ok: false, error: saved.error }, 422);
    return json({ ok: true, routing: await channelState(env, scope, client) });
  }
  if (action === "channel-test") {
    const status = await sendTest(env, scope, client, str(body.channel));
    if (status !== "sent") return json({ ok: false, error: status === "not_configured" ? "That channel is not set up yet." : "The test did not go through. Check the webhook and try again.", status }, 422);
    return json({ ok: true, status, message: "Test sent." });
  }
  return null;
}

// Delete every session for this client except the one making the request.
async function signOutOthers(env, request, client) {
  const token = parseCookies(request.headers.get("cookie")).get(CLIENT_SESSION_COOKIE);
  const keep = token ? await sha256Hex(token) : "";
  const result = await env.DB.prepare("DELETE FROM client_sessions WHERE client_id=? AND token_hash<>?").bind(client, keep).run();
  return Number(result.meta?.changes || 0);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
