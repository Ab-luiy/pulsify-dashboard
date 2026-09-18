import { cleanId, json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: true,
    allowImpersonated: true,
  });
  if (access.error) return access.error;
  const client = cleanId(access.client);

  const [configRow, paymentRows, contentRows, pipelineRows] = await Promise.all([
    env.DB.prepare(
      `SELECT client, COALESCE(client_name, client) AS client_name
         FROM client_config
        WHERE client=?`,
    ).bind(client).first(),
    env.DB.prepare(
      `SELECT p.id, p.amount_cents, p.currency, p.rail, p.reference, p.occurred_at, p.note, p.recorded_by, p.refunded_cents
         FROM payments p
        WHERE p.client=? AND p.kind='charge'
          AND EXISTS (SELECT 1 FROM payment_matches m WHERE m.payment_id=p.id AND m.client_id=? AND m.status='confirmed')
        ORDER BY p.occurred_at DESC, p.id DESC`,
    ).bind(client, client).all(),
    env.DB.prepare(
      `SELECT section, json, updated_at
         FROM client_dashboard_content
        WHERE client_id=?`,
    ).bind(client).all(),
    env.DB.prepare(
      `SELECT id, title, stage, platform, url, notes, scheduled_for, updated_at
         FROM content_items
        WHERE client=?
        ORDER BY
          CASE stage WHEN 'production' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'published' THEN 2 ELSE 3 END,
          COALESCE(scheduled_for, updated_at) DESC,
          id DESC`,
    ).bind(client).all(),
  ]);

  const payments = (paymentRows.results || []).map((row) => ({
    ...row,
    amount_cents: Number(row.amount_cents || 0),
    refunded_cents: Number(row.refunded_cents || 0),
    net_amount_cents: Math.max(0, Number(row.amount_cents || 0) - Number(row.refunded_cents || 0)),
  }));
  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const totalRevenueCents = payments.reduce((sum, row) => sum + row.net_amount_cents, 0);
  const currentMonthRevenueCents = payments.reduce((sum, row) => {
    const occurred = String(row.occurred_at || "").slice(0, 7);
    return occurred === currentMonthKey ? sum + row.net_amount_cents : sum;
  }, 0);

  return json({
    ok: true,
    client,
    client_name: configRow?.client_name || client,
    auth_mode: access.auth_mode,
    impersonated: access.impersonated === true,
    impersonation_expires_at: access.impersonated ? access.expires_at : null,
    revenue: {
      total_revenue_cents: totalRevenueCents,
      current_month_revenue_cents: currentMonthRevenueCents,
      payment_count: payments.length,
      average_deal_cents: payments.length ? Math.round(totalRevenueCents / payments.length) : 0,
      payments,
    },
    sections: parseSections(contentRows.results || []),
    content_items: (pipelineRows.results || []).map((row) => ({
      ...row,
      id: Number(row.id || 0),
    })),
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

function parseSections(rows) {
  const sections = { plans: null, todos: null, team: null, momentum: null };
  for (const row of rows) {
    if (!row?.section) continue;
    try {
      sections[row.section] = JSON.parse(row.json);
    } catch {
      sections[row.section] = null;
    }
  }
  return sections;
}
