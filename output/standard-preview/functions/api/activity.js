import { withOperator } from '../_shared/access.js';
import { checkAdmin, json } from "../_shared/common.js";

async function handle_onRequestGet({ request, env }) {
  const auth = checkAdmin(request, env);
  if (auth) return auth;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const [eventResult, paymentResult, failureResult] = await Promise.all([
    env.DB.prepare(
      `SELECT provider, kind, client, payload_summary_json, ts
         FROM integration_events WHERE client IS NULL OR client NOT IN (SELECT client FROM client_config WHERE status='demo') ORDER BY ts DESC LIMIT 50`,
    ).all(),
    env.DB.prepare(
      `SELECT client, amount_cents, currency, rail, occurred_at, created_at
         FROM payments WHERE client NOT IN (SELECT client FROM client_config WHERE status='demo') ORDER BY occurred_at DESC LIMIT 20`,
    ).all(),
    env.DB.prepare(
      `SELECT client, kind, detail, at
         FROM delivery_failures WHERE client IS NULL OR client NOT IN (SELECT client FROM client_config WHERE status='demo') ORDER BY at DESC LIMIT 20`,
    ).all(),
  ]);

  const activity = [
    ...(eventResult.results || []).map(normalizeIntegrationEvent),
    ...(paymentResult.results || []).map(normalizePayment),
    ...(failureResult.results || []).map(normalizeFailure),
  ].sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")));

  return json({ ok: true, activity });
}

async function handle_onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "x-admin-key",
      "access-control-max-age": "86400",
    },
  });
}

function normalizeIntegrationEvent(row) {
  const payload = parseObject(row.payload_summary_json);
  const kind = String(row.kind || "integration");
  const provider = humanize(row.provider || "integration");
  let summary;

  switch (kind) {
    case "application":
      summary = `Application received${personSuffix(payload)}`;
      break;
    case "booking":
      summary = `Call booked${personSuffix(payload)}${payload.starts_at ? ` for ${payload.starts_at}` : ""}`;
      break;
    case "payment":
      summary = payload.amount_cents != null
        ? `${formatMoney(payload.amount_cents, payload.currency)} payment event received via ${provider}`
        : `Payment event received via ${provider}`;
      break;
    case "hot_watch":
      summary = `Visitor watched ${Number(payload.percent || 0)}% of the page video`;
      break;
    case "onboarding_email":
      summary = `Onboarding email sent${payload.recipient ? ` to ${payload.recipient}` : ""}`;
      break;
    case "ignored":
      summary = `${provider} event ignored${payload.reason ? `: ${payload.reason}` : ""}`;
      break;
    case "raw":
      summary = `${provider} event received`;
      break;
    default:
      summary = `${humanize(kind)} recorded via ${provider}`;
  }

  return {
    ts: row.ts || null,
    kind,
    client: row.client || "operator",
    summary,
  };
}

function normalizePayment(row) {
  return {
    ts: row.occurred_at || row.created_at || null,
    kind: "payment",
    client: row.client || "unknown",
    summary: `${formatMoney(row.amount_cents, row.currency)} payment recorded via ${humanize(row.rail || "manual")}`,
  };
}

function normalizeFailure(row) {
  return {
    ts: row.at || null,
    kind: "failure",
    client: row.client || "unknown",
    summary: `${humanize(row.kind || "delivery")} failed${row.detail ? `: ${row.detail}` : ""}`,
  };
}

function personSuffix(payload) {
  const person = payload.name || payload.email;
  return person ? ` from ${person}` : "";
}

function parseObject(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function humanize(value) {
  const text = String(value || "").replace(/[_-]+/g, " ").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "Integration";
}

function formatMoney(amountCents, currency) {
  const code = String(currency || "USD").toUpperCase();
  const amount = Number(amountCents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

export const onRequestGet = withOperator(handle_onRequestGet);
export const onRequestOptions = withOperator(handle_onRequestOptions);
