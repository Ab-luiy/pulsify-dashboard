// One-key connections. The person pastes a single key; Pulsify checks it,
// registers its own webhook on the provider's side, stores the signing secret
// and the provider's ids, and the sync Worker imports history on its next pass.
// Replaces the old three-field flow (key + webhook created by hand + secret).
import { buildWebhookUrl, deleteIntegration, getIntegration, upsertIntegration } from "./integrations.js";
import { generateOpaqueToken, str } from "./common.js";

export const AUTOCONNECT = new Set(["stripe", "whop", "calcom", "calendly"]);

const STRIPE_EVENTS = ["checkout.session.completed", "payment_intent.succeeded", "invoice.paid", "charge.succeeded", "charge.refunded", "refund.created"];
const WHOP_EVENTS = ["payment.succeeded", "refund.created", "refund.updated"];
const CAL_TRIGGERS = ["BOOKING_CREATED", "BOOKING_CANCELLED", "BOOKING_RESCHEDULED"];
const CALENDLY_EVENTS = ["invitee.created", "invitee.canceled"];

class ConnectError extends Error {}
const fail = (message) => { throw new ConnectError(message); };

async function call(fetcher, url, init, provider) {
  let response;
  try { response = await fetcher(url, { ...init, signal: AbortSignal.timeout(15000) }); }
  catch { fail(`Could not reach ${provider}. Try again in a minute.`); }
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) fail(`${provider} rejected that key. Copy it again and make sure nothing was cut off.`);
  if (response.status === 403) fail(permissionHelp[provider] || `${provider} says this key is missing a permission.`);
  if (!response.ok) fail(`${provider} returned ${response.status}: ${str(body?.error?.message || body?.message || body?.error || "unknown error").slice(0, 200)}`);
  return body;
}

const permissionHelp = {
  Stripe: "Stripe refused: the restricted key needs Webhook Endpoints set to Write, plus read access to Charges, Payment Intents, Checkout Sessions, Invoices and Refunds.",
  Whop: "Whop refused: the company API key needs permission to manage webhooks and read payments.",
  "Cal.com": "Cal.com refused: the API key cannot create webhooks. Create a fresh key under Settings, Developer, API keys.",
  Calendly: "Calendly refused. Webhooks need a paid Calendly plan (Standard or above), and the token must belong to that account.",
};

async function stripe(apiKey, hookUrl, fetcher) {
  if (!/^(rk|sk)_(live|test)_/.test(apiKey)) fail("That is not a Stripe secret or restricted key. It starts with rk_live_ (restricted, recommended) or sk_live_.");
  const auth = { authorization: `Bearer ${apiKey}` };
  // Re-connecting: Stripe only shows a secret on creation, so replace our old endpoint.
  const listed = await call(fetcher, "https://api.stripe.com/v1/webhook_endpoints?limit=100", { headers: auth }, "Stripe");
  for (const endpoint of listed.data || []) {
    if (String(endpoint.url || "") === hookUrl) await call(fetcher, `https://api.stripe.com/v1/webhook_endpoints/${encodeURIComponent(endpoint.id)}`, { method: "DELETE", headers: auth }, "Stripe");
  }
  const form = new URLSearchParams({ url: hookUrl, description: "Pulsify: payments, refunds and lead matching" });
  for (const event of STRIPE_EVENTS) form.append("enabled_events[]", event);
  const created = await call(fetcher, "https://api.stripe.com/v1/webhook_endpoints", { method: "POST", headers: { ...auth, "content-type": "application/x-www-form-urlencoded" }, body: form }, "Stripe");
  if (!created.secret) fail("Stripe created the webhook but returned no signing secret. Try again.");
  return { secrets: { webhook_secret: created.secret }, config: { webhook_endpoint_id: created.id, livemode: created.livemode ? "true" : "false" }, account: created.livemode ? "Live mode" : "Test mode" };
}

async function whop(apiKey, hookUrl, fetcher) {
  const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };
  const created = await call(fetcher, "https://api.whop.com/api/v1/webhooks", { method: "POST", headers, body: JSON.stringify({ url: hookUrl, enabled: true, events: WHOP_EVENTS }) }, "Whop");
  if (!created.webhook_secret) fail("Whop created the webhook but returned no signing secret. Try again.");
  return { secrets: { webhook_secret: created.webhook_secret }, config: { webhook_id: str(created.id), company_id: str(created.resource_id) }, account: created.resource_id ? `Company ${created.resource_id}` : "" };
}

async function calcom(apiKey, hookUrl, fetcher) {
  const signing = generateOpaqueToken(24);
  const created = await call(fetcher, "https://api.cal.com/v2/webhooks", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ subscriberUrl: hookUrl, triggers: CAL_TRIGGERS, active: true, secret: signing }) }, "Cal.com");
  return { secrets: { api_key: apiKey, webhook_secret: signing }, config: { webhook_id: str(created?.data?.id) }, account: "" };
}

async function calendly(apiKey, hookUrl, fetcher) {
  const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };
  const me = await call(fetcher, "https://api.calendly.com/users/me", { headers }, "Calendly");
  const user = me?.resource || {};
  if (!user.uri || !user.current_organization) fail("Calendly did not return the account details. Use a personal access token from Integrations, API and webhooks.");
  const signing = generateOpaqueToken(24);
  const created = await call(fetcher, "https://api.calendly.com/webhook_subscriptions", { method: "POST", headers, body: JSON.stringify({ url: hookUrl, events: CALENDLY_EVENTS, organization: user.current_organization, user: user.uri, scope: "user", signing_key: signing }) }, "Calendly");
  return { secrets: { webhook_secret: signing }, config: { webhook_uri: str(created?.resource?.uri), booking_url: str(user.scheduling_url), contact_email: str(user.email), contact_name: str(user.name) }, account: str(user.email || user.name) };
}

const PROVIDER_FNS = { stripe, whop, calcom, calendly };

export async function autoConnect(env, { scope, client, provider, apiKey, origin, fetcher = fetch }) {
  const id = str(provider).toLowerCase();
  if (!AUTOCONNECT.has(id)) return { ok: false, error: "This service does not support one-key setup." };
  const key = str(apiKey);
  if (key.length < 12 || key.length > 400 || /\s/.test(key)) return { ok: false, error: "Paste the full key, with no spaces." };
  const before = await getIntegration(env, scope, client, id);
  // Save the key first so a path secret exists for the webhook URL.
  const saved = await upsertIntegration(env, { scope, client, provider: id, secrets: { api_key: key }, config: {}, origin });
  if (!saved.ok) return saved;
  const record = await getIntegration(env, scope, client, id);
  const hookUrl = buildWebhookUrl(origin, id, record.secrets.path_secret);
  try {
    const result = await PROVIDER_FNS[id](key, hookUrl, fetcher);
    await upsertIntegration(env, { scope, client, provider: id, secrets: result.secrets, config: { ...result.config, connected_via: "one-key", connected_at: new Date().toISOString() }, origin });
    return { ok: true, provider: id, account: result.account || "", webhook: "registered" };
  } catch (error) {
    // Leave nothing half-connected: undo a new connection, or restore the old key.
    if (!before) await deleteIntegration(env, scope, client, id).catch(() => null);
    else await upsertIntegration(env, { scope, client, provider: id, secrets: { api_key: before.secrets?.api_key ?? null }, config: {}, origin }).catch(() => null);
    if (error instanceof ConnectError) return { ok: false, error: error.message };
    return { ok: false, error: `Setup failed: ${str(error?.message || error).slice(0, 200)}` };
  }
}
