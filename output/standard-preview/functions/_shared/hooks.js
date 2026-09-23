import { sideEffectFailure } from "./side-effect-failure.js";
import {
  cleanId,
  constantTimeEqual,
  json,
  normalizeEmail,
  numberOrNull,
  nowIso,
  str,
  strOrNull,
} from "./common.js";
import {
  buildWebhookUrl,
  getIntegration,
  recordFailure,
  recordIntegrationEvent,
  resolveIntegrationBySecret,
  sendDiscordAlert,
} from "./integrations.js";
import { processNormalizedPayment } from "./payments.js";
import { applyRefund, matchPayment } from "./payment-matching.js";
import { emitEvent } from "./outbound-webhooks.js";
import { recordTouch } from "./pipeline-touches.js";
import { notify } from "./notifications.js";

export async function handleHookRequest({ request, env, params }) {
  const provider = str(params.provider).toLowerCase();
  const pathSecret = str(params.secret || "");

  try {
    const raw = await request.text();
    const body = raw ? JSON.parse(raw) : {};
    let integration = null;
    if (pathSecret) integration = await resolveIntegrationBySecret(env, provider, pathSecret);

    if (!integration && provider === "stripe") {
      // The body names the client, so only a signed request may use this path.
      // Without a stored signing secret the claim is unverifiable.
      const hintedClient = extractStripeClientHint(body);
      const hinted = hintedClient ? await getIntegration(env, "client", hintedClient, "stripe") : null;
      if (hinted?.secrets?.webhook_secret) integration = hinted;
    }

    if (!integration) {
      await recordFailure(env, "unknown", "webhook_unknown_secret", `Unmatched ${provider} webhook configuration`);
      return json({ ok: true, recorded: false, reason: "unknown client" });
    }

    if (provider === "stripe" && integration.secrets.webhook_secret) {
      const verified = await verifyStripeSignature(
        request.headers.get("Stripe-Signature"),
        raw,
        integration.secrets.webhook_secret,
      );
      if (!verified) {
        await recordFailure(env, integration.client, "stripe_signature", "invalid Stripe signature");
        return json({ ok: false, error: "invalid Stripe signature" }, 401);
      }
    }
    if (provider === "whop" && integration.secrets.webhook_secret) {
      const verified = await verifyStandardWebhook(request, raw, integration.secrets.webhook_secret);
      if (!verified) {
        await recordFailure(env, integration.client, "whop_signature", "invalid Whop signature");
        return json({ ok: false, error: "invalid Whop signature" }, 401);
      }
    }

    if (provider === "calcom" || provider === "calendly") {
      return handleBookingHook(env, provider, integration, body);
    }
    if (provider === "whop" || provider === "stripe") {
      return handlePaymentHook(env, provider, integration, body, request.url);
    }

    await recordIntegrationEvent(env, {
      provider,
      kind: "raw",
      client: integration.client,
      externalId: body.id || body.event_id || null,
      payloadSummary: summarizePayload(provider, body),
    });
    return json({ ok: true, recorded: true, kind: "raw" });
  } catch (error) {
    const detail = error?.message || String(error);
    await recordFailure(env, "unknown", `hook_${provider}`, detail);
    return json({ ok: true, recorded: false, reason: "logged" });
  }
}

function handleBookingHook(env, provider, integration, body) {
  const booking = provider === "calcom"
    ? normalizeCalBooking(body)
    : normalizeCalendlyBooking(body);

  if (!booking) {
    return recordIgnored(env, integration.client, provider, body, "booking shape not recognized");
  }

  return recordBooking(env, integration, provider, booking);
}

async function handlePaymentHook(env, provider, integration, body, requestUrl) {
  const refund = provider === "stripe" ? normalizeStripeRefund(body) : normalizeWhopRefund(body);
  if (refund) {
    const event = await recordIntegrationEvent(env, {
      provider,
      kind: "refund",
      client: integration.client,
      externalId: refund.event_id,
      payloadSummary: {
        references: refund.references,
        amount_cents: refund.amount_cents,
        mode: refund.mode,
      },
    });
    if (event.duplicate) return json({ ok: true, refund: { ok: true, duplicate: true } });
    const applied = await applyRefund(
      env,
      integration.client,
      refund.references,
      refund.amount_cents,
      { mode: refund.mode },
    );
    if (!applied.ok) {
      await env.DB.prepare("DELETE FROM integration_events WHERE provider=? AND kind='refund' AND external_id=?")
        .bind(provider, refund.event_id).run().catch(() => sideEffectFailure(env, "hooks_operation_1"));
    }
    return json({ ok: true, refund: applied });
  }

  const payment = provider === "stripe"
    ? normalizeStripePayment(body)
    : normalizeWhopPayment(body);

  if (!payment) {
    return recordIgnored(env, integration.client, provider, body, "payment shape not recognized");
  }
  const customer = provider === "stripe" ? stripeCustomer(body) : whopCustomer(body);

  const result = await processNormalizedPayment(env, {
    client: integration.client,
    amountCents: payment.amount_cents,
    currency: payment.currency,
    rail: provider,
    reference: payment.reference,
    note: payment.note,
    recordedBy: `webhook:${provider}`,
    occurredAt: payment.occurred_at,
    eventId: payment.event_id,
    origin: new URL(requestUrl).origin,
    customerEmail: customer.email,
    customerName: customer.name,
  });
  if (result.ok && !result.duplicate && result.payment?.id) {
    if (customer.email || customer.name) {
      await env.DB.prepare("UPDATE payments SET customer_email=?, customer_name=? WHERE id=?")
        .bind(customer.email, customer.name, result.payment.id).run().catch(() => sideEffectFailure(env, "hooks_operation_2"));
    }
    await emitEvent(env, { scope: "client", clientId: integration.client, event: "payment.received", data: { payment_id: result.payment.id, amount_cents: payment.amount_cents, currency: payment.currency, reference: payment.reference, source: provider, customer_name: customer.name, customer_email: customer.email } });
    await matchPayment(env, { ...result.payment, customer_email: customer.email, customer_name: customer.name }).catch(() => sideEffectFailure(env, "hooks_operation_3"));
  }
  return json({
    ok: true,
    recorded: !result.duplicate,
    duplicate: Boolean(result.duplicate),
    payment: result.payment,
  });
}

async function recordBooking(env, integration, provider, booking) {
  const event = await recordIntegrationEvent(env, {
    provider,
    kind: "booking",
    client: integration.client,
    externalId: booking.event_id,
    payloadSummary: {
      client: integration.client,
      email: booking.email,
      name: booking.name,
      starts_at: booking.starts_at,
      status: booking.status,
    },
  });

  if (!event.duplicate) {
    await recordTouch(env, { client: integration.client, email: booking.email, name: booking.name, kind: "booking", ts: booking.starts_at || nowIso(), source: provider, externalId: booking.event_id, payload: { starts_at: booking.starts_at, status: booking.status } }).catch(() => sideEffectFailure(env, "hooks_operation_4"));
    const cancelled = /cancel/i.test(String(booking.status || ""));
    await notify(env, {
      scope: "operator",
      clientId: integration.client,
      kind: "booking",
      severity: cancelled ? "warn" : "success",
      title: `${booking.name || booking.email || "Someone"} ${cancelled ? "cancelled a call" : "booked a call"}`,
      body: booking.starts_at ? new Date(booking.starts_at).toUTCString().replace(":00 GMT", " UTC") : "",
      link: "campaigns",
      entity: { client: integration.client, email: booking.email, name: booking.name || "", provider, starts_at: booking.starts_at },
      dedupeKey: `booking:${provider}:${booking.event_id}`,
    }).catch(() => null);
    await sendDiscordAlert(env, {
      client: integration.client,
      title: "Booking received",
      lines: [
        `${integration.client} booked via ${provider}.`,
        booking.name || booking.email || "No attendee name supplied.",
        booking.starts_at ? `Start: ${booking.starts_at}` : null,
      ].filter(Boolean),
    });
  }

  return json({ ok: true, recorded: !event.duplicate, duplicate: Boolean(event.duplicate) });
}

async function recordIgnored(env, client, provider, body, reason) {
  await recordIntegrationEvent(env, {
    provider,
    kind: "ignored",
    client,
    externalId: body.id || body.event_id || null,
    payloadSummary: {
      reason,
      sample: summarizePayload(provider, body),
    },
  });
  await recordFailure(env, client, `hook_${provider}`, reason);
  return json({ ok: true, recorded: false, reason });
}

function normalizeCalBooking(body) {
  const payload = body?.payload || body?.data || body;
  const type = str(body?.triggerEvent || body?.eventType || body?.type || payload?.type).toLowerCase();
  if (!type.includes("booking")) return null;

  const attendee = payload?.attendee || payload?.booking?.attendees?.[0] || {};
  const eventId = str(payload?.id || payload?.booking?.id || body?.id || body?.eventId);
  if (!eventId) return null;

  return {
    event_id: eventId,
    email: normalizeEmail(attendee?.email || payload?.email),
    name: strOrNull(attendee?.name || payload?.name),
    starts_at: strOrNull(payload?.startTime || payload?.startsAt || payload?.start_time),
    status: strOrNull(payload?.status || type),
  };
}

function normalizeCalendlyBooking(body) {
  const event = body?.event || body?.event_type || body?.type || "";
  const payload = body?.payload || body;
  if (!String(event).toLowerCase().includes("invitee") && !String(event).toLowerCase().includes("event")) {
    return null;
  }

  const invitee = payload?.invitee || body?.invitee || {};
  const eventId = str(payload?.event || invitee?.uri || payload?.uri || body?.id);
  if (!eventId) return null;

  return {
    event_id: eventId,
    email: normalizeEmail(invitee?.email || payload?.email),
    name: strOrNull(invitee?.name || payload?.name),
    starts_at: strOrNull(payload?.start_time || payload?.startTime || body?.created_at),
    status: strOrNull(event || payload?.status),
  };
}

export function normalizeWhopPayment(body) {
  const type = str(body?.event || body?.type).toLowerCase();
  if (!["payment.succeeded", "payment.completed", "invoice.paid"].includes(type)) return null;

  const data = body?.data || body?.payment || body;
  if (data?.status && !["succeeded", "completed", "paid"].includes(str(data.status).toLowerCase())) return null;
  if (data?.substatus && !["succeeded", "completed", "paid"].includes(str(data.substatus).toLowerCase())) return null;
  const amount = whopAmountCents(data, ["amount_in_cents", "amount_cents"], ["amount", "total"]);
  const reference = str(
    data?.id || data?.payment_id || data?.invoice_id || body?.id || body?.event_id,
  );
  if (!reference || amount == null) return null;

  return {
    event_id: str(body?.event_id || body?.id || reference),
    reference: `whop:${reference}`,
    amount_cents: amount,
    currency: str(data?.currency || "USD").toUpperCase(),
    occurred_at: strOrNull(data?.created_at || data?.occurred_at || body?.created_at) || nowIso(),
    note: strOrNull(type),
  };
}

export function normalizeStripePayment(body) {
  const type = str(body?.type).toLowerCase();
  const object = body?.data?.object || {};
  if (!type) return null;

  if (type === "checkout.session.completed") {
    const cents = numberOrNull(object.amount_total);
    const reference = str(object.payment_intent || object.id);
    if (cents == null || !reference) return null;
    return {
      event_id: str(body.id || reference),
      reference: `stripe:${reference}`,
      amount_cents: cents,
      currency: str(object.currency || "USD").toUpperCase(),
      occurred_at: strOrNull(object.created ? new Date(Number(object.created) * 1000).toISOString() : null) || nowIso(),
      note: strOrNull(type),
    };
  }

  if (type === "payment_intent.succeeded") {
    const cents = numberOrNull(object.amount_received ?? object.amount);
    const reference = str(object.id);
    if (cents == null || !reference) return null;
    return {
      event_id: str(body.id || reference),
      reference: `stripe:${reference}`,
      amount_cents: cents,
      currency: str(object.currency || "USD").toUpperCase(),
      occurred_at: stripeCreatedAt(object.created),
      note: strOrNull(type),
    };
  }

  if (type === "invoice.paid") {
    const cents = numberOrNull(object.amount_paid ?? object.total);
    const reference = str(object.payment_intent || object.id);
    if (cents == null || !reference) return null;
    return {
      event_id: str(body.id || reference),
      reference: `stripe:${reference}`,
      amount_cents: cents,
      currency: str(object.currency || "USD").toUpperCase(),
      occurred_at: stripeCreatedAt(object.created),
      note: strOrNull(type),
    };
  }

  if (type === "charge.succeeded") {
    const cents = numberOrNull(object.amount);
    // Stripe emits both Charge and PaymentIntent events for one card payment.
    // Canonicalize both to the PaymentIntent so the unique payment reference
    // suppresses the second event instead of counting the same sale twice.
    const reference = str(object.payment_intent || object.id);
    if (cents == null || !reference) return null;
    return {
      event_id: str(body.id || reference),
      reference: `stripe:${reference}`,
      amount_cents: cents,
      currency: str(object.currency || "USD").toUpperCase(),
      occurred_at: stripeCreatedAt(object.created),
      note: strOrNull(type),
    };
  }

  return null;
}

function stripeCreatedAt(value) {
  return value ? new Date(Number(value) * 1000).toISOString() : nowIso();
}

function extractStripeClientHint(body) {
  return cleanId(
    body?.data?.object?.metadata?.client ||
      body?.data?.object?.client_reference_id ||
      body?.data?.object?.metadata?.client_id,
  );
}

async function verifyStripeSignature(header, payload, secret) {
  if (!header || !secret) return false;
  // Stripe sends one t= and one v1= per active secret (several during rotation).
  const pairs = String(header)
    .split(",")
    .map((piece) => piece.split("=").map((item) => item.trim()))
    .filter((pair) => pair.length === 2);
  const timestamp = pairs.find(([name]) => name === "t")?.[1];
  const signatures = pairs.filter(([name]) => name === "v1").map(([, value]) => value);
  if (!timestamp || !signatures.length) return false;
  if (!Number.isFinite(Number(timestamp)) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = [...new Uint8Array(signed)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return signatures.some((signature) => constantTimeEqual(expected, signature));
}

async function verifyStandardWebhook(request, payload, secret) {
  const id = request.headers.get("webhook-id") || "";
  const timestamp = request.headers.get("webhook-timestamp") || "";
  const signatures = request.headers.get("webhook-signature") || "";
  const seconds = Number(timestamp);
  if (!id || !Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300 || !signatures) return false;
  const encoded = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBytes;
  try { keyBytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)); }
  catch { keyBytes = new TextEncoder().encode(encoded); }
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`)));
  const expected = btoa(String.fromCharCode(...bytes));
  return signatures.split(" ").some((part) => constantTimeEqual(part.replace(/^v1,/, ""), expected));
}

function summarizePayload(provider, body) {
  const sample = body && typeof body === "object" ? body : {};
  return {
    provider,
    id: sample.id || sample.event_id || null,
    type: sample.type || sample.event || sample.event_type || null,
  };
}

function stripeCustomer(body) {
  const object = body?.data?.object || {};
  const details = object.customer_details || object.billing_details || {};
  const email = String(object.receipt_email || details.email || object.customer_email || "").trim().toLowerCase() || null;
  const name = String(details.name || object.customer_name || "").trim() || null;
  return { email, name };
}

function whopCustomer(body) {
  const data = body?.data || body?.payment || body || {};
  const user = data.user || data.member || {};
  const email = String(user.email || data.email || "").trim().toLowerCase() || null;
  const name = String(user.name || user.username || data.customer_name || "").trim() || null;
  return { email, name };
}

export function normalizeStripeRefund(body) {
  const type = String(body?.type || "").toLowerCase();
  if (type !== "charge.refunded" && type !== "refund.created") return null;
  const object = body?.data?.object || {};
  if (type === "refund.created" && object.status && object.status !== "succeeded") return null;
  const references = [...new Set([
    object.payment_intent,
    object.charge,
    type === "charge.refunded" ? object.id : null,
  ].filter(Boolean).map((value) => `stripe:${String(value)}`))];
  const cents = Number(object.amount_refunded ?? object.amount);
  if (!references.length || !Number.isFinite(cents)) return null;
  return {
    event_id: String(body?.id || `${type}:${references[0]}:${cents}`),
    references,
    amount_cents: cents,
    mode: type === "charge.refunded" ? "absolute" : "increment",
  };
}

export function normalizeWhopRefund(body) {
  const type = String(body?.event || body?.type || "").toLowerCase();
  if (!type.includes("refund")) return null;
  const data = body?.data || body?.payment || body || {};
  if (data?.status && !["succeeded", "completed"].includes(str(data.status).toLowerCase())) return null;
  const reference = String(data.payment_id || data.payment?.id || data.id || "");
  const cents = whopAmountCents(data, ["amount_in_cents", "amount_cents", "refunded_amount_cents"], ["amount", "refunded_amount"]);
  if (!reference || !Number.isFinite(cents)) return null;
  return {
    event_id: String(body?.id || body?.event_id || `${type}:${reference}:${cents}`),
    references: [`whop:${reference}`],
    amount_cents: cents,
    mode: "increment",
  };
}

function whopAmountCents(data, centFields, majorFields) {
  for (const field of centFields) {
    const value = numberOrNull(data?.[field]);
    if (value != null) return Math.round(value);
  }
  for (const field of majorFields) {
    const value = numberOrNull(data?.[field]);
    if (value != null) return Math.round(value * 100);
  }
  return null;
}
