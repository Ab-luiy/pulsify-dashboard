import { provisionClient } from "./provisioning.js";
import { recordTouch } from "./pipeline-touches.js";
import {
  amountToCents,
  centsToAmount,
  cleanId,
  escapeHtml,
  humanCurrency,
  normalizeEmail,
  nowIso,
  str,
  strOrNull,
  titleCase,
} from "./common.js";
import {
  DEFAULT_ONBOARDING_DOC_URL,
  DEFAULT_ONBOARDING_FORM_URL,
  ensureClientConfigRow,
  getIntegration,
  recordFailure,
  recordIntegrationEvent,
  sendDiscordAlert,
} from "./integrations.js";
import { mintPortalToken } from "./portal-tokens.js";

export async function processNormalizedPayment(env, input) {
  if (!env.DB) return { ok: false, error: "no database bound" };

  const client = cleanId(input.client);
  const reference = str(input.reference);
  const currency = str(input.currency || "USD").toUpperCase();
  const rail = str(input.rail || "manual").toLowerCase();
  const occurredAt = input.occurredAt || nowIso();
  const recordedBy = str(input.recordedBy || `webhook:${rail}`);
  const amountCents = normalizeAmountCents(input.amountCents, input.amount);

  if (!client) return { ok: false, error: "valid client id required" };
  if (amountCents == null) return { ok: false, error: "valid amount required" };
  if (!reference) return { ok: false, error: "reference is required" };

  const existing = await env.DB.prepare(
    `SELECT id, client, amount_cents, currency, rail, reference, occurred_at, recorded_by, note
       FROM payments WHERE reference=?`,
  ).bind(reference).first().catch(() => null);
  if (existing) {
    return { ok: true, duplicate: true, payment: existing, side_effects: { skipped: true } };
  }

  await ensureClientConfigRow(env, client);
  await env.DB.prepare(
    `INSERT INTO payments (
      client, amount_cents, currency, rail, reference, occurred_at, recorded_by, note, created_at
    ) VALUES (?,?,?,?,?,?,?,?,?)`,
  ).bind(
    client,
    amountCents,
    currency,
    rail,
    reference,
    occurredAt,
    recordedBy,
    strOrNull(input.note),
    nowIso(),
  ).run();

  await recordIntegrationEvent(env, {
    provider: rail,
    kind: "payment",
    client,
    externalId: input.eventId || reference,
    payloadSummary: {
      reference,
      amount_cents: amountCents,
      currency,
      recorded_by: recordedBy,
      note: strOrNull(input.note),
    },
  });

  const payment = await env.DB.prepare(
    `SELECT id, client, amount_cents, currency, rail, reference, occurred_at, recorded_by, note
       FROM payments WHERE reference=?`,
  ).bind(reference).first();

  // Push API and rematch paths record revenue for clients who are already
  // onboarded. They must never mint a new portal link or send onboarding mail.
  if (input.customerEmail || input.customer_email) {
    await recordTouch(env, { client, email: input.customerEmail || input.customer_email, name: input.customerName || input.customer_name, kind: "payment", ts: occurredAt, source: rail, externalId: reference, amountCents, payload: { reference, currency } }).catch(() => null);
  }
  const sideEffects = input.skipSideEffects
    ? { skipped: true, reason: "side effects disabled for this rail" }
    : await runPaymentSideEffects(env, {
      ...payment,
      origin: input.origin,
      client_name: input.clientName,
    });

  return { ok: true, duplicate: false, payment, side_effects: sideEffects };
}

async function runPaymentSideEffects(env, payment) {
  const client = cleanId(payment.client);
  const clientRow = await env.DB.prepare(
    `SELECT client, COALESCE(client_name, client) AS client_name, portal_token_hash
       FROM client_config WHERE client=?`,
  ).bind(client).first().catch(() => null);
  const clientName = clientRow?.client_name || titleCase(client);
  const recipient = await resolvePaymentRecipient(env, client, payment.rail);
  const operatorKit = await getIntegration(env, "operator", "", "kit");
  const draft = await buildOnboardingDraft(operatorKit, payment, {
    client,
    clientName,
    recipient,
    origin: payment.origin,
    hasPortalToken: Boolean(clientRow?.portal_token_hash),
  });

  let portal = null;
  if (!clientRow?.portal_token_hash || draft.needs_fresh_portal_link) {
    portal = await mintPortalToken(env, client, payment.origin);
    if (portal.ok) {
      draft.links.portal_url = portal.link;
      draft.html = renderOnboardingHtml({
        ...draft,
        links: draft.links,
      });
      draft.text = renderOnboardingText(draft);
    } else {
      await recordFailure(env, client, "portal_token", portal.error || "could not mint portal token");
    }
  }

  const email = await sendOnboardingEmail(env, operatorKit, draft, recipient, payment);

  // A first payment on a prospect provisions the workspace (idempotent). The
  // status moves to 'onboarding' there; it becomes 'client' when the checklist
  // finishes. Clients already provisioned are untouched.
  if (recipient?.email) {
    await provisionClient(env, { source: "payment", client, email: recipient.email, name: recipient.name || clientName, contractRef: payment.reference, origin: payment.origin, actor: payment.recorded_by || "payment" }).catch(async (error) => {
      await recordFailure(env, client, "client_status", error?.message || String(error));
    });
  } else {
    await env.DB.prepare(
      `UPDATE client_config SET status='client', updated_at=? WHERE client=?`,
    ).bind(nowIso(), client).run().catch(async (error) => {
      await recordFailure(env, client, "client_status", error?.message || String(error));
    });
  }

  const alert = await sendDiscordAlert(env, {
    client,
    title: "Payment recorded",
    lines: [
      `${clientName} paid ${humanCurrency(payment.amount_cents, payment.currency)} via ${payment.rail}.`,
      `Reference: ${payment.reference}`,
      email.status === "sent" ? "Onboarding email queued in Kit." : "Onboarding email fell back to operator draft.",
    ],
  });

  return {
    email,
    draft: email.status === "sent" ? null : {
      to: recipient.email || null,
      subject: draft.subject,
      preview_text: draft.preview_text,
      html: draft.html,
      text: draft.text,
      links: draft.links,
    },
    portal: portal || {
      ok: Boolean(clientRow?.portal_token_hash),
      reused: Boolean(clientRow?.portal_token_hash),
      link: draft.links.portal_url || null,
    },
    client_status: "client",
    discord: alert.status,
  };
}

async function resolvePaymentRecipient(env, client, rail) {
  const railIntegration = await getIntegration(env, "client", client, rail);
  const kitIntegration = await getIntegration(env, "client", client, "kit");
  const candidates = [
    {
      email: normalizeEmail(railIntegration?.config?.contact_email),
      name: strOrNull(railIntegration?.config?.contact_name),
    },
    {
      email: normalizeEmail(kitIntegration?.config?.contact_email),
      name: strOrNull(kitIntegration?.config?.contact_name),
    },
  ];

  if (env.DB) {
    const lead = await env.DB.prepare(
      `SELECT email, name FROM leads
         WHERE client=? AND email IS NOT NULL AND email!=''
         ORDER BY applied_at DESC, id DESC LIMIT 1`,
    ).bind(client).first().catch(() => null);
    candidates.push({
      email: normalizeEmail(lead?.email),
      name: strOrNull(lead?.name),
    });
  }

  return candidates.find((item) => item.email) || { email: null, name: null };
}

async function buildOnboardingDraft(operatorKit, payment, context) {
  const config = operatorKit?.config || {};
  const links = {
    onboarding_form_url: config.onboarding_form_url || DEFAULT_ONBOARDING_FORM_URL,
    onboarding_doc_url: config.onboarding_doc_url || DEFAULT_ONBOARDING_DOC_URL,
    portal_url: null,
  };

  const subject = config.onboarding_subject || `${context.clientName} - onboarding starts here`;
  const preview_text = config.onboarding_preview_text || "Your form, portal, and next steps are inside.";
  const draft = {
    client: context.client,
    client_name: context.clientName,
    subject,
    preview_text,
    links,
    amount_cents: payment.amount_cents,
    currency: payment.currency,
    recipient_name: context.recipient.name || context.clientName,
    needs_fresh_portal_link: true,
  };

  draft.html = renderOnboardingHtml(draft);
  draft.text = renderOnboardingText(draft);
  return draft;
}

function renderOnboardingHtml(draft) {
  return [
    `<p>${escapeHtml(draft.recipient_name)},</p>`,
    `<p>We've recorded ${escapeHtml(humanCurrency(draft.amount_cents, draft.currency))}.</p>`,
    "<p>Start here:</p>",
    "<ul>",
    `<li><a href="${escapeHtml(draft.links.onboarding_form_url)}">Complete the onboarding form</a></li>`,
    `<li><a href="${escapeHtml(draft.links.onboarding_doc_url)}">Read the CO1 onboarding doc</a></li>`,
    draft.links.portal_url
      ? `<li><a href="${escapeHtml(draft.links.portal_url)}">Open your private portal</a></li>`
      : "<li>Your portal link needs to be generated manually before sending.</li>",
    "</ul>",
    "<p>Next step: we'll set the game-plan call within 72 hours.</p>",
  ].join("");
}

function renderOnboardingText(draft) {
  return [
    `${draft.recipient_name},`,
    "",
    `We've recorded ${humanCurrency(draft.amount_cents, draft.currency)}.`,
    "",
    "Start here:",
    `1. Onboarding form: ${draft.links.onboarding_form_url}`,
    `2. CO1 onboarding doc: ${draft.links.onboarding_doc_url}`,
    `3. Private portal: ${draft.links.portal_url || "[generate link before sending]"}`,
    "",
    "Next step: we'll set the game-plan call within 72 hours.",
  ].join("\n");
}

async function sendOnboardingEmail(env, operatorKit, draft, recipient, payment) {
  const apiKey = operatorKit?.secrets?.api_key;
  if (!apiKey) {
    await recordFailure(env, payment.client, "kit_onboarding", "operator Kit integration not configured");
    return { ok: false, status: "not_configured" };
  }
  if (!recipient.email) {
    await recordFailure(env, payment.client, "kit_onboarding", "no client email found for onboarding");
    return { ok: false, status: "no_recipient" };
  }

  try {
    const subscriber = await fetch("https://api.kit.com/v4/subscribers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      body: JSON.stringify({
        email_address: recipient.email,
        first_name: recipient.name || null,
        state: "active",
      }),
    });
    const subscriberData = await subscriber.json().catch(() => ({}));
    const subscriberId = subscriberData?.subscriber?.id;
    if (!subscriber.ok || !subscriberId) {
      await recordFailure(
        env,
        payment.client,
        "kit_onboarding",
        `subscriber_${subscriber.status}: ${summarizeObject(subscriberData)}`,
      );
      return { ok: false, status: "subscriber_error" };
    }

    const tagName = `pulsify-onboarding-${payment.reference}`;
    const tagResponse = await fetch("https://api.kit.com/v4/tags", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      body: JSON.stringify({ name: tagName }),
    });
    const tagData = await tagResponse.json().catch(() => ({}));
    const tagId = tagData?.tag?.id;
    if (!tagResponse.ok || !tagId) {
      await recordFailure(
        env,
        payment.client,
        "kit_onboarding",
        `tag_${tagResponse.status}: ${summarizeObject(tagData)}`,
      );
      return { ok: false, status: "tag_error" };
    }

    const attach = await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers/${subscriberId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      body: "{}",
    });
    if (!attach.ok) {
      await recordFailure(
        env,
        payment.client,
        "kit_onboarding",
        `tag_subscriber_${attach.status}: ${(await attach.text().catch(() => "")).slice(0, 240)}`,
      );
      return { ok: false, status: "tag_subscriber_error" };
    }

    const sendAt = new Date(Date.now() + 60 * 1000).toISOString();
    const broadcastResponse = await fetch("https://api.kit.com/v4/broadcasts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      body: JSON.stringify({
        content: draft.html,
        description: `Pulsify onboarding for ${draft.client_name}`,
        public: false,
        published_at: nowIso(),
        preview_text: draft.preview_text,
        subject: draft.subject,
        send_at: sendAt,
        email_template_id: operatorKit?.config?.email_template_id
          ? Number(operatorKit.config.email_template_id)
          : undefined,
        email_address: operatorKit?.config?.onboarding_sender_email || null,
        subscriber_filter: [
          {
            all: [
              {
                type: "tag",
                ids: [tagId],
              },
            ],
            any: null,
            none: null,
          },
        ],
      }),
    });
    const broadcastData = await broadcastResponse.json().catch(() => ({}));
    if (!broadcastResponse.ok || !broadcastData?.broadcast?.id) {
      await recordFailure(
        env,
        payment.client,
        "kit_onboarding",
        `broadcast_${broadcastResponse.status}: ${summarizeObject(broadcastData)}`,
      );
      return { ok: false, status: "broadcast_error" };
    }

    await recordIntegrationEvent(env, {
      provider: "kit",
      kind: "onboarding_email",
      client: payment.client,
      externalId: String(broadcastData.broadcast.id),
      payloadSummary: {
        reference: payment.reference,
        recipient: recipient.email,
        subject: draft.subject,
        send_at: sendAt,
      },
    });

    return {
      ok: true,
      status: "sent",
      recipient: recipient.email,
      broadcast_id: broadcastData.broadcast.id,
      send_at: sendAt,
    };
  } catch (error) {
    await recordFailure(
      env,
      payment.client,
      "kit_onboarding",
      `network_error: ${error?.message || error}`,
    );
    return { ok: false, status: "network_error" };
  }
}

function summarizeObject(value) {
  try {
    return JSON.stringify(value).slice(0, 240);
  } catch {
    return String(value || "");
  }
}

function normalizeAmountCents(amountCents, amount) {
  if (amountCents != null) {
    const parsed = Number(amountCents);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  }
  return amountToCents(amount);
}

export function normalizedPaymentFromManual(body, origin) {
  return {
    client: cleanId(body.client),
    amount: body.amount,
    currency: body.currency,
    rail: body.rail || "manual",
    reference: body.reference,
    note: body.note,
    recordedBy: "operator",
    occurredAt: nowIso(),
    origin,
  };
}
