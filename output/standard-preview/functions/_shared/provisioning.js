// One provisioning function, three triggers: a completed DocuSign envelope,
// a confirmed payment for a prospect, or the operator's "Provision now".
// Idempotent on client id. Creates the workspace and login shell if missing,
// seeds the checklist, sends the welcome email through Resend with retries,
// sets status to onboarding, and emits client.provisioned once.
import { cleanId, generateOpaqueToken, normalizeEmail, nowIso, sha256Hex, str, titleCase } from "./common.js";
import { createSetupLink } from "./client-auth.js";
import { seedChecklist } from "./checklist.js";
import { recordFailure } from "./integrations.js";
import { emitEvent } from "./outbound-webhooks.js";
import { welcomeEmail } from "./welcome-email.js";

export const WELCOME_ATTEMPTS = 3;
const BACKOFF_MS = [500, 1500, 4000];

export async function provisionClient(env, { source, client, email, name, contractRef, origin, actor, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), fetcher = fetch }) {
  if (!env?.DB) return { ok: false, error: "no database bound" };
  if (!["docusign", "payment", "operator"].includes(source)) return { ok: false, error: "unknown provisioning source" };
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { ok: false, error: "valid email required" };
  let clientId = cleanId(client, "");
  const now = nowIso();

  // Existing login for this email always wins; never create a second workspace.
  const byEmail = await env.DB.prepare("SELECT client_id FROM client_auth WHERE email=?").bind(normalizedEmail).first();
  if (byEmail?.client_id) clientId = cleanId(byEmail.client_id);
  if (!clientId) clientId = "client-" + (await sha256Hex(normalizedEmail)).slice(0, 24);

  const already = await env.DB.prepare("SELECT client_id, welcome_state FROM client_provisioning WHERE client_id=?").bind(clientId).first();
  if (already) return { ok: true, client: clientId, duplicate: true, welcome_state: already.welcome_state };

  // Workspace row: create if missing, otherwise move it to onboarding.
  const cfg = await env.DB.prepare("SELECT client, client_name, status FROM client_config WHERE client=?").bind(clientId).first();
  const clientName = str(name).slice(0, 160) || cfg?.client_name || titleCase(clientId);
  if (!cfg) {
    await env.DB.prepare("INSERT INTO client_config (client, client_name, status, updated_at) VALUES (?,?,?,?)").bind(clientId, clientName, "onboarding", now).run();
  } else {
    await env.DB.prepare("UPDATE client_config SET status='onboarding', client_name=COALESCE(client_name, ?), updated_at=? WHERE client=?").bind(clientName, now, clientId).run();
  }

  // Login shell plus one-time setup link (existing helper, rotates any prior link).
  const setup = await createSetupLink(env, origin || "https://pulsify-ai.com", clientId, normalizedEmail);
  if (!setup.ok) return { ok: false, error: setup.error };

  // Provisioning record first so a retry after a crash is a no-op.
  try {
    await env.DB.prepare(
      "INSERT INTO client_provisioning (client_id, email, source, contract_ref, provisioned_at, provisioned_by) VALUES (?,?,?,?,?,?)",
    ).bind(clientId, normalizedEmail, source, str(contractRef) || null, now, str(actor) || source).run();
  } catch {
    return { ok: true, client: clientId, duplicate: true };
  }

  await seedChecklist(env, clientId);
  await env.DB.prepare("INSERT INTO operator_events (actor, action, client, detail, created_at) VALUES (?,?,?,?,?)")
    .bind(str(actor) || source, "client-provisioned", clientId, JSON.stringify({ source, contract_ref: contractRef || null, email: normalizedEmail }), now).run().catch(() => null);
  await emitEvent(env, { scope: "client", clientId, event: "client.provisioned", data: { client_id: clientId, email: normalizedEmail, source, contract_ref: contractRef || null } }).catch(() => null);

  const welcome = await sendWelcome(env, { clientId, email: normalizedEmail, name: clientName, setupLink: setup.link, sleep, fetcher });
  return { ok: true, client: clientId, duplicate: false, setup_link: setup.link, welcome_state: welcome.state };
}

export async function sendWelcome(env, { clientId, email, name, setupLink, sleep, fetcher = fetch }) {
  const from = str(env.EMAIL_FROM);
  if (!env.RESEND_API_KEY || !from) {
    await env.DB.prepare("UPDATE client_provisioning SET welcome_state='skipped', welcome_error='email not configured' WHERE client_id=?").bind(clientId).run();
    await recordFailure(env, clientId, "welcome_email", "RESEND_API_KEY or EMAIL_FROM missing");
    return { state: "skipped" };
  }
  const bookingLine = await bookingLineFor(env, clientId);
  const { subject, text, html } = welcomeEmail({ firstName: str(name).split(" ")[0] || "there", setupLink, bookingLine });
  let lastError = "";
  for (let attempt = 1; attempt <= WELCOME_ATTEMPTS; attempt++) {
    try {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: [email], subject, text, html, headers: { "X-Entity-Ref-ID": `welcome-${clientId}` } }),
      });
      if (response.ok) {
        await env.DB.prepare("UPDATE client_provisioning SET welcome_state='sent', welcome_attempts=?, welcome_sent_at=?, welcome_error=NULL WHERE client_id=?").bind(attempt, nowIso(), clientId).run();
        return { state: "sent", attempt };
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = String(error?.message || error).slice(0, 300);
    }
    await env.DB.prepare("UPDATE client_provisioning SET welcome_attempts=?, welcome_error=? WHERE client_id=?").bind(attempt, lastError, clientId).run();
    if (attempt < WELCOME_ATTEMPTS) await sleep(BACKOFF_MS[attempt - 1]);
  }
  await env.DB.prepare("UPDATE client_provisioning SET welcome_state='failed' WHERE client_id=?").bind(clientId).run();
  await recordFailure(env, clientId, "welcome_email", lastError);
  return { state: "failed", error: lastError };
}

async function bookingLineFor(env, clientId) {
  try {
    const row = await env.DB.prepare(
      "SELECT provider, config_json FROM integrations WHERE scope='client' AND client_id=? AND provider IN ('calcom','calendly') LIMIT 1",
    ).bind(clientId).first();
    if (!row) return "";
    const config = JSON.parse(row.config_json || "{}");
    const url = str(config.booking_url || config.url);
    return url ? `Want to talk it through first? Book a call: ${url}` : "";
  } catch {
    return "";
  }
}

export function newContractRef(prefix = "op") {
  return `${prefix}_${generateOpaqueToken(6)}`;
}
