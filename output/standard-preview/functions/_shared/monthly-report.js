// Monthly report (InfoOS build, 2026-09-30): one month for one client, ready to send.
// Cash is confirmed payment matches net of refunds (the Payments page rule); deals and
// show and close rates come from post-call forms; applications, bookings and visitors from
// the funnel; sources and videos from each buyer's first touch. Months run on UTC. The
// month's forecast is the operator's (workspace_preferences "forecast:YYYY-MM").

import { cleanId, parseJson } from "./common.js";
import { loadPipeline } from "./lead-people.js";

export function monthBounds(month, now = Date.now()) {
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(month || "");
  const d = new Date(now);
  const [y, m] = valid ? month.split("-").map(Number) : [d.getUTCFullYear(), d.getUTCMonth() + 1];
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const prevStart = new Date(Date.UTC(y, m - 2, 1));
  return {
    key: `${y}-${String(m).padStart(2, "0")}`,
    label: start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    start: start.toISOString(),
    end: end.toISOString(),
    prevStart: prevStart.toISOString(),
  };
}

async function counts(env, client, from, to) {
  const [cash, touches, visitors, outcomes] = await Promise.all([
    env.DB.prepare(
      `SELECT COALESCE(SUM(MAX(p.amount_cents - p.refunded_cents, 0)), 0) AS cash, COALESCE(SUM(p.refunded_cents), 0) AS refunds,
              COUNT(DISTINCT m.target_id) AS buyers, MAX(p.currency) AS currency
         FROM payment_matches m JOIN payments p ON p.id = m.payment_id
        WHERE m.client_id=? AND m.status='confirmed' AND p.kind='charge' AND p.occurred_at >= ? AND p.occurred_at < ?`,
    ).bind(client, from, to).first(),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT CASE WHEN kind='optin' THEN lower(contact_email) END) AS optins,
              COUNT(DISTINCT CASE WHEN kind='application' THEN lower(contact_email) END) AS applications,
              COUNT(DISTINCT CASE WHEN kind='booking' AND external_id NOT LIKE '%#canceled'
                                   AND COALESCE(json_extract(payload_json,'$.booked_at'), ts) >= ?1 AND COALESCE(json_extract(payload_json,'$.booked_at'), ts) < ?2
                                  THEN lower(contact_email) END) AS booked
         FROM pipeline_touches WHERE client_id=?3 AND (kind='booking' OR (ts >= ?1 AND ts < ?2))`,
    ).bind(from, to, client).first(),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT visitor_id) AS n FROM page_events WHERE client=? AND event='page_view' AND at >= ? AND at < ?`,
    ).bind(client, from, to).first(),
    env.DB.prepare(
      `SELECT SUM(attended='showed') AS held, SUM(attended='no_show') AS no_shows,
              SUM(result='closed') AS deals, COALESCE(SUM(CASE WHEN result='closed' THEN deal_cents END), 0) AS sold
         FROM lead_outcomes WHERE client_id=? AND COALESCE(call_at, created_at) >= ? AND COALESCE(call_at, created_at) < ?`,
    ).bind(client, from, to).first().catch(() => null),
  ]);
  return { cash, touches, visitors, outcomes };
}

export async function monthlyReport(env, clientId, { month = null, now = Date.now() } = {}) {
  const client = cleanId(clientId, "");
  const b = monthBounds(month, now);
  const [current, previous, cfg, forecastRow, pipeline] = await Promise.all([
    counts(env, client, b.start, b.end),
    counts(env, client, b.prevStart, b.start),
    env.DB.prepare("SELECT client_name FROM client_config WHERE client=?").bind(client).first(),
    env.DB.prepare("SELECT value_json FROM workspace_preferences WHERE client_id=? AND key=?").bind(client, `forecast:${b.key}`).first().catch(() => null),
    loadPipeline(env, client, { now }),
  ]);
  const inMonth = (iso) => Boolean(iso) && iso >= b.start && iso < b.end;
  const sources = new Map();
  const videos = new Map();
  for (const person of pipeline.raw) {
    const channel = person.source?.channel || "direct";
    const s = sources.get(channel) || { source: channel, applications: 0, buyers: 0, cash_cents: 0 };
    if (inMonth(person.stages.applied)) s.applications += 1;
    if (inMonth(person.stages.bought)) {
      s.buyers += 1;
      s.cash_cents += person.money.collected_cents;
      if (person.source?.video) {
        const v = videos.get(person.source.video.video_id) || { video_id: person.source.video.video_id, title: person.source.video.title, buyers: 0, cash_cents: 0 };
        v.buyers += 1;
        v.cash_cents += person.money.collected_cents;
        videos.set(v.video_id, v);
      }
    }
    sources.set(channel, s);
  }
  const held = Number(current.outcomes?.held || 0);
  const noShows = Number(current.outcomes?.no_shows || 0);
  const deals = Number(current.outcomes?.deals || 0);
  const buyers = Number(current.cash?.buyers || 0);
  const cash = Number(current.cash?.cash || 0);
  const forecast = parseJson(forecastRow?.value_json, null);
  return {
    ok: true,
    client,
    client_name: cfg?.client_name || client,
    month: b.key,
    label: b.label,
    generated_at: new Date(now).toISOString(),
    currency: String(current.cash?.currency || previous.cash?.currency || "USD").toUpperCase(),
    sales: {
      cash_cents: cash,
      refunds_cents: Number(current.cash?.refunds || 0),
      buyers,
      deals,
      sold_cents: Number(current.outcomes?.sold || 0),
      aov_cents: buyers ? Math.round(cash / buyers) : null,
    },
    funnel: {
      visitors: Number(current.visitors?.n || 0),
      optins: Number(current.touches?.optins || 0),
      applications: Number(current.touches?.applications || 0),
      booked: Number(current.touches?.booked || 0),
      held,
      no_shows: noShows,
      show_rate: held + noShows ? held / (held + noShows) : null,
      close_rate: held ? deals / held : null,
    },
    previous: {
      cash_cents: Number(previous.cash?.cash || 0),
      applications: Number(previous.touches?.applications || 0),
      booked: Number(previous.touches?.booked || 0),
      buyers: Number(previous.cash?.buyers || 0),
    },
    sources: [...sources.values()].sort((a, b2) => b2.cash_cents - a.cash_cents || b2.applications - a.applications),
    videos: [...videos.values()].sort((a, b2) => b2.cash_cents - a.cash_cents),
    forecast: forecast && typeof forecast === "object" ? { cash_cents: forecast.cash_cents ?? null, calls: forecast.calls ?? null, deals: forecast.deals ?? null } : null,
  };
}
