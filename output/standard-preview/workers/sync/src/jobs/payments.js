// Every 30 minutes: import provider payments/refunds, then rematch anything
// that arrived before its lead. Provider pulls overlap the prior successful
// window; payment references and refund event ids make the overlap safe.
import { listIntegrations, recordFailure, recordIntegrationEvent } from "../../../../functions/_shared/integrations.js";
import { emitEvent } from "../../../../functions/_shared/outbound-webhooks.js";
import { applyRefund, matchPayment } from "../../../../functions/_shared/payment-matching.js";
import { processNormalizedPayment } from "../../../../functions/_shared/payments.js";

const WHOP_API_VERSION = "2026-08-21-1";
const MAX_PAGES = 5;

export async function syncPayments(env, options = {}) {
  const fetcher = options.fetcher || fetch;
  const connections = (await listIntegrations(env, { scope: "client" }))
    .filter((row) => ["stripe", "whop"].includes(row.provider) && row.secrets?.api_key);
  let imported = 0;
  const failures = [];
  for (const connection of connections) {
    try {
      imported += connection.provider === "stripe"
        ? await importStripe(env, connection, fetcher)
        : await importWhop(env, connection, fetcher);
    } catch (error) {
      const detail = String(error?.message || error);
      failures.push(`${connection.provider}:${connection.client}: ${detail}`);
      await recordFailure(env, connection.client, `${connection.provider}_payment_import`, detail);
      await emitEvent(env, {
        scope: "client",
        clientId: connection.client,
        event: "integration.sync_failed",
        data: { provider: connection.provider, job: "payments", error: detail.slice(0, 300) },
      });
    }
  }
  const rematched = await rematchPayments(env);
  if (failures.length) throw new Error(failures.join("; "));
  return imported + rematched;
}

export async function rematchPayments(env) {
  const rows = await env.DB.prepare(
    `SELECT p.id, p.client, p.customer_email, p.customer_name, p.occurred_at
       FROM payments p
      WHERE p.kind='charge' AND p.occurred_at >= datetime('now','-90 days')
        AND NOT EXISTS (SELECT 1 FROM payment_matches m WHERE m.payment_id=p.id AND m.status IN ('confirmed','suggested'))
      ORDER BY p.occurred_at DESC LIMIT 200`,
  ).all();
  let touched = 0;
  for (const payment of rows.results || []) {
    const result = await matchPayment(env, payment).catch(() => null);
    if (result && (result.confirmed || result.suggested)) touched += 1;
  }
  return touched;
}

async function importStripe(env, connection, fetcher) {
  const since = await importSince(env, connection.client, "stripe");
  const headers = { authorization: `Bearer ${connection.secrets.api_key}` };
  let touched = 0;
  const intents = await listStripe(fetcher, "payment_intents", headers, since, "expand[]=data.latest_charge");
  for (const item of intents) {
    if (item.status !== "succeeded") continue;
    touched += await insertPayment(env, connection.client, "stripe", {
      id: item.id,
      amountCents: item.amount_received ?? item.amount,
      currency: item.currency,
      occurredAt: unixDate(item.created),
      email: item.receipt_email || item.latest_charge?.billing_details?.email || null,
      name: item.latest_charge?.billing_details?.name || null,
      note: "payment_intent.succeeded",
    });
  }
  const refunds = await listStripe(fetcher, "refunds", headers, since);
  for (const item of refunds) {
    const event = await recordIntegrationEvent(env, {
      provider: "stripe",
      kind: "refund",
      client: connection.client,
      externalId: item.id,
      payloadSummary: { payment_intent: item.payment_intent, charge: item.charge, amount_cents: item.amount },
      ts: unixDate(item.created),
    });
    if (event.duplicate) continue;
    const applied = await applyRefund(
      env,
      connection.client,
      [item.payment_intent, item.charge].filter(Boolean).map((value) => `stripe:${value}`),
      item.amount,
      { mode: "increment" },
    );
    if (!applied.ok) {
      await env.DB.prepare("DELETE FROM integration_events WHERE provider='stripe' AND kind='refund' AND external_id=?")
        .bind(item.id).run().catch(() => null);
    }
    if (applied.ok && !applied.duplicate) touched += 1;
  }
  return touched;
}

async function importWhop(env, connection, fetcher) {
  const since = await importSince(env, connection.client, "whop");
  const headers = {
    authorization: `Bearer ${connection.secrets.api_key}`,
    "api-version-date": WHOP_API_VERSION,
  };
  const company = connection.config?.company_id ? `&company_id=${encodeURIComponent(connection.config.company_id)}` : "";
  let touched = 0;
  for (const item of await listWhop(fetcher, "payments", headers, since, company)) {
    if (item.status !== "succeeded" && item.substatus !== "succeeded") continue;
    touched += await insertPayment(env, connection.client, "whop", {
      id: item.id,
      amountCents: majorToCents(item.total),
      currency: item.currency,
      occurredAt: item.paid_at || item.created_at,
      email: item.user?.email || null,
      name: item.user?.name || item.user?.username || null,
      note: "payment.succeeded",
    });
  }
  for (const item of await listWhop(fetcher, "refunds", headers, since, company)) {
    if (item.status && item.status !== "succeeded") continue;
    const event = await recordIntegrationEvent(env, {
      provider: "whop",
      kind: "refund",
      client: connection.client,
      externalId: item.id,
      payloadSummary: { payment_id: item.payment?.id, amount_cents: majorToCents(item.amount) },
      ts: item.created_at,
    });
    if (event.duplicate) continue;
    const applied = await applyRefund(env, connection.client, `whop:${item.payment?.id || ""}`, majorToCents(item.amount), { mode: "increment" });
    if (!applied.ok) {
      await env.DB.prepare("DELETE FROM integration_events WHERE provider='whop' AND kind='refund' AND external_id=?")
        .bind(item.id).run().catch(() => null);
    }
    if (applied.ok && !applied.duplicate) touched += 1;
  }
  return touched;
}

async function insertPayment(env, client, provider, input) {
  if (!input.id || !Number.isFinite(Number(input.amountCents))) return 0;
  const result = await processNormalizedPayment(env, {
    client,
    reference: `${provider}:${input.id}`,
    amountCents: Math.round(Number(input.amountCents)),
    currency: String(input.currency || "USD").toUpperCase(),
    rail: provider,
    occurredAt: input.occurredAt || new Date().toISOString(),
    recordedBy: `worker:${provider}`,
    note: input.note,
    eventId: `${provider}:${input.id}`,
    customerEmail: input.email,
    customerName: input.name,
    skipSideEffects: true,
  });
  if (!result.ok || result.duplicate) return 0;
  await env.DB.prepare("UPDATE payments SET customer_email=?, customer_name=? WHERE id=?")
    .bind(input.email, input.name, result.payment.id).run();
  await emitEvent(env, {
    scope: "client",
    clientId: client,
    event: "payment.received",
    data: { payment_id: result.payment.id, amount_cents: Number(input.amountCents), currency: input.currency, reference: result.payment.reference, source: provider },
  });
  await matchPayment(env, { ...result.payment, customer_email: input.email, customer_name: input.name });
  return 1;
}

async function importSince(env, client, provider) {
  const row = await env.DB.prepare(
    "SELECT MAX(occurred_at) AS latest FROM payments WHERE client=? AND rail=?",
  ).bind(client, provider).first().catch(() => null);
  const latest = Date.parse(row?.latest || "");
  return new Date(Number.isFinite(latest) ? latest - 86400000 : Date.now() - 90 * 86400000).toISOString();
}

async function listStripe(fetcher, resource, headers, since, extra = "") {
  const rows = [];
  let startingAfter = "";
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const cursor = startingAfter ? `&starting_after=${encodeURIComponent(startingAfter)}` : "";
    const response = await fetcher(`https://api.stripe.com/v1/${resource}?limit=100&created[gte]=${Math.floor(Date.parse(since) / 1000)}${cursor}${extra ? `&${extra}` : ""}`, { headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Stripe ${resource} ${response.status}: ${body?.error?.message || "request failed"}`);
    const data = Array.isArray(body.data) ? body.data : [];
    rows.push(...data);
    if (!body.has_more || !data.length) break;
    startingAfter = data.at(-1).id;
  }
  return rows;
}

async function listWhop(fetcher, resource, headers, since, suffix) {
  const rows = [];
  let after = "";
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const cursor = after ? `&after=${encodeURIComponent(after)}` : "";
    const response = await fetcher(`https://api.whop.com/api/v1/${resource}?first=100&created_after=${encodeURIComponent(since)}${suffix}${cursor}`, { headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Whop ${resource} ${response.status}: ${body?.error?.message || "request failed"}`);
    const data = Array.isArray(body.data) ? body.data : [];
    rows.push(...data);
    if (!body.page_info?.has_next_page || !body.page_info?.end_cursor) break;
    after = body.page_info.end_cursor;
  }
  return rows;
}

function majorToCents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
}

function unixDate(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}
