// Self-serve registration with operator approval.
//   createRequest()  public: someone asks for access on the sign-in page
//   listRequests()   operator: pending first, then the latest decisions
//   decideRequest()  operator: approve (runs provisioning) or decline
// Nothing here creates a login by itself. A workspace only exists after the
// operator approves, and approval reuses provisionClient() so the welcome email,
// setup link, checklist and events are the same as every other way in.
import { cleanId, generateOpaqueToken, normalizeEmail, nowIso, str } from "./common.js";
import { notify } from "./notifications.js";
import { operatorEmails } from "./operator-session.js";
import { provisionClient } from "./provisioning.js";

const PER_IP_PER_HOUR = 5;
const PER_EMAIL_PER_HOUR = 3;
const LIST_LIMIT = 40;

export const REQUEST_RECEIVED = "Request received. You will get an email as soon as your workspace is approved.";

export function cleanRequest(body = {}) {
  const email = normalizeEmail(body.email);
  const name = str(body.name).replace(/\s+/g, " ").trim().slice(0, 120);
  const link = str(body.link).trim().slice(0, 300);
  const note = str(body.note).trim().slice(0, 600);
  if (!name) return { error: "Add your name." };
  if (!email) return { error: "Enter a valid email address." };
  return { value: { name, email, link: link || null, note: note || null } };
}

async function allow(env, key, limit) {
  const bucket = new Date().toISOString().slice(0, 13);
  try {
    await env.DB.prepare("INSERT INTO api_key_usage (key_id, bucket, count) VALUES (?,?,1) ON CONFLICT(key_id, bucket) DO UPDATE SET count=count+1").bind(key, bucket).run();
    const row = await env.DB.prepare("SELECT count FROM api_key_usage WHERE key_id=? AND bucket=?").bind(key, bucket).first();
    return (row?.count || 0) <= limit;
  } catch {
    return true;
  }
}

/** Store the request and tell the operator. The caller always shows the same reply, so nothing here leaks who already has an account. */
export async function createRequest(env, { value, ipKey = "", origin = "https://pulsify-ai.com", fetcher = fetch }) {
  if (!env?.DB) return { ok: false, error: "no database bound" };
  if (ipKey && !(await allow(env, `access-req:ip:${ipKey}`, PER_IP_PER_HOUR))) return { ok: true, throttled: true };
  if (!(await allow(env, `access-req:email:${value.email}`, PER_EMAIL_PER_HOUR))) return { ok: true, throttled: true };

  const hasLogin = await env.DB.prepare("SELECT client_id FROM client_auth WHERE email=?").bind(value.email).first();
  if (hasLogin) return { ok: true, existing: true };

  const now = nowIso();
  const pending = await env.DB.prepare("SELECT id FROM access_requests WHERE email=? AND status='pending'").bind(value.email).first();
  if (pending) {
    await env.DB.prepare("UPDATE access_requests SET name=?, link=?, note=?, updated_at=? WHERE id=?").bind(value.name, value.link, value.note, now, pending.id).run();
    return { ok: true, id: pending.id, repeat: true };
  }
  const id = `req_${generateOpaqueToken(8)}`;
  await env.DB.prepare("INSERT INTO access_requests (id, email, name, link, note, status, created_at, updated_at) VALUES (?,?,?,?,?,'pending',?,?)")
    .bind(id, value.email, value.name, value.link, value.note, now, now).run();

  await notify(env, {
    scope: "operator", kind: "access.request", severity: "info", title: `${value.name} asked for access`,
    body: [value.email, value.link].filter(Boolean).join(" · "), link: "clients", dedupeKey: `access:${id}`, outside: false,
  }).catch(() => null);
  await emailOperator(env, value, origin, fetcher).catch(() => null);
  return { ok: true, id };
}

// The bell is easy to miss, so a short email goes to the founder's public address (Cloudflare forwards it).
async function emailOperator(env, value, origin, fetcher) {
  const from = str(env.EMAIL_FROM);
  const to = /<([^>]+)>/.exec(from)?.[1] || from;
  if (!env.RESEND_API_KEY || !to) return;
  await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from, to: [to], subject: `${value.name} asked for access to Pulsify`,
      text: emailText(value, origin),
    }),
  });
}

export async function listRequests(env) {
  const pending = await env.DB.prepare("SELECT id, email, name, link, note, status, role, created_at, decided_at, decided_by, client_id FROM access_requests WHERE status='pending' ORDER BY created_at ASC LIMIT ?").bind(LIST_LIMIT).all();
  const recent = await env.DB.prepare("SELECT id, email, name, link, note, status, role, created_at, decided_at, decided_by, client_id FROM access_requests WHERE status<>'pending' ORDER BY decided_at DESC LIMIT 10").all();
  return { pending: pending.results || [], recent: recent.results || [] };
}

// A readable workspace id from the person's name, kept unique.
async function workspaceId(env, name, email) {
  const base = cleanId(name.toLowerCase().replace(/\s+/g, "-"), "").slice(0, 40) || cleanId(email.split("@")[0]).slice(0, 40) || "client";
  for (let n = 0; n < 20; n++) {
    const candidate = n ? `${base}-${n + 1}` : base;
    const taken = await env.DB.prepare("SELECT 1 AS x FROM client_config WHERE client=? UNION SELECT 1 FROM client_auth WHERE client_id=?").bind(candidate, candidate).first();
    if (!taken) return candidate;
  }
  return `${base}-${generateOpaqueToken(3)}`;
}

// Operators are the founder's own team (full console access). Only owners, the addresses in the
// OPERATOR_EMAILS secret, can add or remove them, so an operator cannot hand out the keys.
export function isOwner(env, actor) {
  const who = normalizeEmail(actor);
  return actor === "automation" || (Boolean(who) && operatorEmails(env).has(who));
}

export async function listOperators(env) {
  const owners = [...operatorEmails(env)].map((email) => ({ email, name: null, role: "owner", added_by: null, created_at: null }));
  const rows = await env.DB.prepare("SELECT email, name, added_by, created_at FROM operator_users WHERE removed_at IS NULL ORDER BY created_at ASC").all().catch(() => ({ results: [] }));
  const added = (rows.results || []).filter((r) => !owners.some((o) => o.email === r.email)).map((r) => ({ ...r, role: "operator" }));
  return [...owners, ...added];
}

async function teamEmail(env, { email, name, origin, fetcher }) {
  const from = str(env.EMAIL_FROM);
  if (!env.RESEND_API_KEY || !from) return "skipped";
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from, to: [email], subject: "You are on the Pulsify team",
        text: [`Hi ${str(name).split(" ")[0] || "there"},`, "", "You now have operator access to the Pulsify console. Sign in with this email address:", `${origin}/login/operator`, "", "Pulsify"].join("\n"),
      }),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export async function addOperator(env, { email, name = "", actor, origin, fetcher = fetch, requestId = null }) {
  const clean = normalizeEmail(email);
  if (!clean) return { status: 422, body: { ok: false, error: "Enter a valid email address." } };
  if (!isOwner(env, actor)) return { status: 403, body: { ok: false, error: "Only the owner can add operators." } };
  const now = nowIso();
  await env.DB.prepare(
    "INSERT INTO operator_users (email, name, added_by, created_at, removed_at) VALUES (?,?,?,?,NULL) ON CONFLICT(email) DO UPDATE SET removed_at=NULL, name=COALESCE(excluded.name, name), added_by=excluded.added_by",
  ).bind(clean, str(name).slice(0, 120) || null, actor, now).run();
  await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
    .bind(actor, "operator-added", null, JSON.stringify({ email: clean, request: requestId }), now).run().catch(() => null);
  const welcome_state = await teamEmail(env, { email: clean, name, origin, fetcher });
  return { status: 200, body: { ok: true, operator: { email: clean }, welcome_state } };
}

export async function removeOperator(env, { email, actor }) {
  const clean = normalizeEmail(email);
  if (!clean) return { status: 422, body: { ok: false, error: "Enter a valid email address." } };
  if (!isOwner(env, actor)) return { status: 403, body: { ok: false, error: "Only the owner can remove operators." } };
  if (operatorEmails(env).has(clean)) return { status: 422, body: { ok: false, error: "Owners cannot be removed here." } };
  const now = nowIso();
  await env.DB.prepare("UPDATE operator_users SET removed_at=? WHERE email=? AND removed_at IS NULL").bind(now, clean).run();
  // Their open sessions stop working on the next request (the session check reads this table); revoke them anyway.
  await env.DB.prepare("UPDATE operator_sessions SET revoked_at=? WHERE email=? AND revoked_at IS NULL").bind(now, clean).run().catch(() => null);
  await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
    .bind(actor, "operator-removed", null, JSON.stringify({ email: clean }), now).run().catch(() => null);
  return { status: 200, body: { ok: true, removed: clean } };
}

export async function decideRequest(env, { id, action, role = "client", actor, origin, fetcher = fetch, sleep }) {
  const row = await env.DB.prepare("SELECT * FROM access_requests WHERE id=?").bind(str(id)).first();
  if (!row) return { status: 404, body: { ok: false, error: "Request not found." } };
  if (row.status !== "pending") return { status: 200, body: { ok: true, request: { id: row.id, status: row.status }, already: true } };
  const now = nowIso();
  if (action === "decline") {
    await env.DB.prepare("UPDATE access_requests SET status='declined', decided_at=?, decided_by=?, updated_at=? WHERE id=? AND status='pending'").bind(now, actor, now, row.id).run();
    return { status: 200, body: { ok: true, request: { id: row.id, status: "declined" } } };
  }
  if (role === "operator") {
    const added = await addOperator(env, { email: row.email, name: row.name, actor, origin, fetcher, requestId: row.id });
    if (added.status !== 200) return added;
    await env.DB.prepare("UPDATE access_requests SET status='approved', role='operator', decided_at=?, decided_by=?, updated_at=? WHERE id=? AND status='pending'").bind(now, actor, now, row.id).run();
    return { status: 200, body: { ok: true, request: { id: row.id, status: "approved", role: "operator" }, welcome_state: added.body.welcome_state } };
  }
  const clientId = await workspaceId(env, row.name, row.email);
  const result = await provisionClient(env, { source: "operator", client: clientId, email: row.email, name: row.name, contractRef: `request_${row.id}`, origin, actor, fetcher, ...(sleep ? { sleep } : {}) });
  if (!result.ok) return { status: 422, body: { ok: false, error: result.error || "Could not create the workspace." } };
  await env.DB.prepare("UPDATE access_requests SET status='approved', role='client', decided_at=?, decided_by=?, updated_at=?, client_id=? WHERE id=? AND status='pending'").bind(now, actor, now, result.client, row.id).run();
  return { status: 200, body: { ok: true, request: { id: row.id, status: "approved", client: result.client }, welcome_state: result.welcome_state || null } };
}

function emailText(value, origin) {
  const lines = [`${value.name} (${value.email}) asked for a workspace.`];
  if (value.link) lines.push(`Link: ${value.link}`);
  if (value.note) lines.push(`Note: ${value.note}`);
  lines.push("", `Approve or decline: ${origin}/app/clients`);
  return lines.join("\n");
}
