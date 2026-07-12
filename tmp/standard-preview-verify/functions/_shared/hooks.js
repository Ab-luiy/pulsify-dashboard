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

export async function handleHookRequest({ request, env, params }) {
  const provider = str(params.provider).toLowerCase();
  const pathSecret = str(params.secret || "");

  try {
    const raw = await request.text();
    const body = raw ? JSON.parse(raw) : {};
    let integration = null;
    if (pathSecret) integration = await resolveIntegrationBySecret(env, provider, pathSecret);

    if (!integration && provider === "stripe") {
      const hintedClient = extractStripeClientHint(body);
      if (hintedClient) integration = await getIntegration(env, "client", hintedClient, "stripe");
    }

    if (!integration) {
      await recordFailure(env, "unknown", `hook_${provider}`, "unknown client or invalid webhook path");
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
    await recordFailure(env, cleanId(params.client, "unknown"), `hook_${provider}`, detail);
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
  const payment = provider === "stripe"
    ? normalizeStripePayment(body)
    : normalizeWhopPayment(body);

  if (!payment) {
    return recordIgnored(env, integration.client, provider, body, "payment shape not recognized");
  }

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
  });
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

function normalizeWhopPayment(body) {
  const type = str(body?.event || body?.type).toLowerCase();
  if (!type.includes("payment") && !type.includes("invoice")) return null;

  const data = body?.data || body?.payment || body;
  const amount = numberOrNull(
    data?.amount_in_cents ?? data?.amount_cents ?? data?.amount ?? data?.total,
  );
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

function normalizeStripePayment(body) {
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

  if (type === "charge.succeeded") {
    const cents = numberOrNull(object.amount);
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
  const parts = Object.fromEntries(
    String(header)
      .split(",")
      .map((piece) => piece.split("=").map((item) => item.trim()))
      .filter((pair) => pair.length === 2),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

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
  return constantTimeEqual(expected, signature);
}

function summarizePayload(provider, body) {
  const sample = body && typeof body === "object" ? body : {};
  return {
    provider,
    id: sample.id || sample.event_id || null,
    type: sample.type || sample.event || sample.event_type || null,
  };
}
