// GET /api/monthly-report?month=YYYY-MM[&client=]   one month in numbers (functions/_shared/monthly-report.js)
// PUT /api/monthly-report {client, month, forecast: {cash_cents, calls, deals}}   operator only
// (InfoOS build; forecasts for signed clients approved by the founder 2026-09-29.)
// Reads: client, preview or operator (?client=).

import { json } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient, resolveReportWriter } from "../_shared/client-read.js";
import { monthBounds, monthlyReport } from "../_shared/monthly-report.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  try {
    return json(await monthlyReport(env, access.client, { month: new URL(request.url).searchParams.get("month") }));
  } catch (error) {
    console.error("monthly-report failed", error);
    return json({ ok: false, error: "The report could not load. Try again shortly." }, 500);
  }
}

async function handlePut({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  if (access.role !== "operator") return json({ ok: false, error: "Forecasts are set by Pulsify." }, 403);
  const month = monthBounds(body?.month).key;
  if (month !== body?.month) return json({ ok: false, error: "Choose a month like 2026-10." }, 422);
  const n = (v) => (v == null || v === "" ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : undefined);
  const forecast = { cash_cents: n(body.forecast?.cash_cents), calls: n(body.forecast?.calls), deals: n(body.forecast?.deals) };
  if (Object.values(forecast).some((v) => v === undefined)) return json({ ok: false, error: "Forecasts are whole numbers, zero or more." }, 422);
  await env.DB.prepare(
    `INSERT INTO workspace_preferences (client_id, key, value_json, updated_at) VALUES (?,?,?,?)
     ON CONFLICT(client_id, key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`,
  ).bind(access.client, `forecast:${month}`, JSON.stringify(forecast), new Date().toISOString()).run();
  return json({ ok: true, month, forecast });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPut = withOperator(handlePut);
