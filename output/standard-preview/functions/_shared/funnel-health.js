// Funnel health (pulsify-saas #37): what to fix, in order.
//
// Every number here is computed from the rows beside it, never generated.
// Each step counts a person once, on the first day they reached that step
// (first page view, first play, first opt-in, first application, first
// booking, first confirmed payment), so a window's counts and rates always
// come from the same people.
//
// Targets: a documented benchmark where the vault has one (the booking to
// purchase step, from Jeremy Haynes' call-funnel ranges), otherwise the
// client's own best 30 days in the last 180. Every target says which.
//
// The money on a fix card: the extra people this step would pass at its
// target, times the share of people past this step who went on to buy,
// times the average order. Cash follows confirmed payment matches, net of
// refunds, the same rule as the Payments page and cash by video.

import { cleanId, normalizeEmail } from "./common.js";

const DAY = 86400000;
const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 };
export const MIN_SAMPLE = 20;
const HISTORY_DAYS = 180;
const WINDOW_DAYS = 30;
const WINDOW_STEP_DAYS = 7;
const TODAY_WINDOWS = 29;

export const STEPS = [
  { key: "visit", label: "Visited the page", short: "Visits", noun: "visitors", per: "per visitor" },
  { key: "play", label: "Played the video", short: "Video plays", noun: "viewers", per: "per viewer" },
  { key: "optin", label: "Opted in", short: "Opt-ins", noun: "opt-ins", per: "per opt-in" },
  { key: "app_start", label: "Started the application", short: "Started applying", noun: "people who started", per: "per application started" },
  { key: "application", label: "Applied", short: "Applications", noun: "applications", per: "per application" },
  { key: "booking", label: "Booked a call", short: "Booked calls", noun: "booked calls", per: "per booked call" },
  { key: "buyer", label: "Bought", short: "Buyers", noun: "buyers", per: "per buyer" },
];

// Documented targets only. Everything else uses the client's own best month.
export const BENCHMARKS = {
  "booking>buyer": {
    rate: 0.12,
    text: "60% show rate x 20% close rate, the low ends of Jeremy Haynes' call-funnel ranges",
    source: "wiki/frameworks/call-funnel-framework.md",
  },
};

// The fix for a step that is under target, from our playbooks. Keyed by the
// step people fail to reach.
const FIXES = {
  play: {
    text: "Most visitors never press play. Open the video on the viewer and the result they want, before any backstory.",
    source: "wiki/frameworks/vsl-framework.md",
    action: null,
  },
  optin: {
    text: "People see the page but don't opt in. Put the proof and the result above the fold, and ask for one thing only.",
    source: "wiki/frameworks/vsl-framework.md",
    action: null,
  },
  app_start: {
    text: "They watch but don't start the application. Keep the page to the video and the application button below it, nothing else.",
    source: "wiki/playbooks/pulsify-funnel-v1.md",
    action: null,
  },
  application: {
    text: "People start the application and stop. Keep it to the questions the call needs, in the playbook order, 7 to 10 at most.",
    source: "wiki/playbooks/pulsify-funnel-v1.md",
    action: null,
  },
  booking: {
    text: "They apply but don't book. Send them from the last question straight to the calendar, and reach out while they are still warm.",
    source: "wiki/playbooks/pulsify-funnel-v1.md",
    action: null,
  },
  buyer: {
    text: "Booked calls that don't buy. Fill the 48 to 72 hours before each call: a confirmation page with short videos built from real call questions, and a result story on call days.",
    source: "wiki/concepts/hammer-them-strategy.md",
    action: { label: "Draft a result story", route: "instagram" },
  },
};

export function rangeStart(range, now = Date.now()) {
  const days = RANGE_DAYS[range];
  return days ? new Date(now - days * DAY).toISOString() : null;
}

const ms = (iso) => {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : null;
};

// Count people whose first date falls in [from, to).
function countIn(firsts, from, to) {
  let n = 0;
  for (const at of firsts) if (at !== null && (from === null || at >= from) && at < to) n += 1;
  return n;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const rank = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))];
}

export function grade(rate, target) {
  if (rate == null || !target) return null;
  const ratio = Math.min(1, rate / target);
  if (ratio >= 0.95) return "A";
  if (ratio >= 0.8) return "B";
  if (ratio >= 0.6) return "C";
  return "D";
}

// The client's best 30-day rate for prev -> step over the last 180 days.
// Windows step a week at a time; a window needs MIN_SAMPLE people at prev.
export function ownBestTarget(prevFirsts, stepFirsts, now) {
  let best = null;
  for (let end = now; end - WINDOW_DAYS * DAY >= now - HISTORY_DAYS * DAY; end -= WINDOW_STEP_DAYS * DAY) {
    const start = end - WINDOW_DAYS * DAY;
    const entering = countIn(prevFirsts, start, end);
    if (entering < MIN_SAMPLE) continue;
    const rate = Math.min(1, countIn(stepFirsts, start, end) / entering);
    if (!best || rate > best.rate) best = { rate, from: new Date(start).toISOString(), to: new Date(end).toISOString(), entering };
  }
  return best;
}

export async function funnelHealthReport(env, clientId, { range = "30d", now = Date.now() } = {}) {
  const client = cleanId(clientId, "");
  const db = env.DB;
  const rangeKey = RANGE_DAYS[range] ? range : range === "all" ? "all" : "30d";
  const fromIso = rangeStart(rangeKey, now);
  const from = fromIso ? ms(fromIso) : null;
  const recentFrom = new Date(now - (TODAY_WINDOWS + 1) * DAY).toISOString();

  const [visitRows, startRows, playRows, touchRows, paymentRows, unmatchedRow, recentVisitRows, earliestRow] = await Promise.all([
    db.prepare(
      `SELECT visitor_id AS k, MIN(at) AS first FROM page_events
        WHERE client=? AND event='page_view' AND visitor_id IS NOT NULL GROUP BY visitor_id`,
    ).bind(client).all(),
    db.prepare(
      `SELECT visitor_id AS k, MIN(at) AS first FROM page_events
        WHERE client=? AND event='form_start' AND visitor_id IS NOT NULL GROUP BY visitor_id`,
    ).bind(client).all(),
    db.prepare(
      `SELECT COALESCE(visitor_id, email, session_id, wistia_visitor_key) AS k, MIN(at) AS first FROM watch_events
        WHERE client=? AND event='play' AND COALESCE(visitor_id, email, session_id, wistia_visitor_key) IS NOT NULL
        GROUP BY COALESCE(visitor_id, email, session_id, wistia_visitor_key)`,
    ).bind(client).all(),
    db.prepare(
      `SELECT lower(contact_email) AS k, kind, MIN(ts) AS first FROM pipeline_touches
        WHERE client_id=? AND kind IN ('optin','application','booking')
        GROUP BY lower(contact_email), kind`,
    ).bind(client).all(),
    db.prepare(
      `SELECT p.id, p.amount_cents, p.refunded_cents, p.currency, p.occurred_at, p.customer_email, m.target_kind, m.target_id,
              json_extract(w.data_json, '$.email') AS record_email
         FROM payment_matches m
         JOIN payments p ON p.id = m.payment_id
         LEFT JOIN workspace_records w ON m.target_kind = 'workspace_record' AND w.id = m.target_id
        WHERE m.client_id=? AND m.status='confirmed' AND p.kind='charge'`,
    ).bind(client).all(),
    db.prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(p.amount_cents - p.refunded_cents), 0) AS cents,
              (SELECT COUNT(*) FROM payments a WHERE a.client=? AND a.kind='charge') AS all_payments
         FROM payments p
        WHERE p.client=? AND p.kind='charge' AND (? IS NULL OR p.occurred_at >= ?)
          AND NOT EXISTS (SELECT 1 FROM payment_matches m WHERE m.payment_id = p.id AND m.status='confirmed')`,
    ).bind(client, client, fromIso, fromIso).first(),
    db.prepare(
      `SELECT visitor_id, at FROM page_events
        WHERE client=? AND event='page_view' AND visitor_id IS NOT NULL AND at >= ?`,
    ).bind(client, recentFrom).all(),
    db.prepare(
      `SELECT MIN(at) AS first FROM page_events WHERE client=?`,
    ).bind(client).first(),
  ]);

  const firstsOf = (rows) => (rows.results || []).map((row) => ms(row.first)).filter((at) => at !== null);
  const firsts = {
    visit: firstsOf(visitRows),
    app_start: firstsOf(startRows),
    play: firstsOf(playRows),
    optin: [],
    application: [],
    booking: [],
    buyer: [],
  };
  for (const row of touchRows.results || []) {
    const at = ms(row.first);
    if (at !== null && firsts[row.kind]) firsts[row.kind].push(at);
  }

  // Buyers: first confirmed payment per person; cash in the range.
  const people = new Map();
  const currencies = new Set();
  let cashCents = 0;
  let cashAllTime = 0;
  const buyersInRange = new Set();
  for (const row of paymentRows.results || []) {
    const email = normalizeEmail(
      row.target_kind === "contact_email" ? row.target_id
        : row.target_kind === "workspace_record" ? row.record_email || row.customer_email
          : row.customer_email,
    ) || `payment:${row.id}`;
    const at = ms(row.occurred_at);
    const net = Math.max(0, Number(row.amount_cents || 0) - Number(row.refunded_cents || 0));
    if (row.currency) currencies.add(String(row.currency).toUpperCase());
    cashAllTime += net;
    if (net > 0 && at !== null) {
      const current = people.get(email);
      if (current === undefined || at < current) people.set(email, at);
      if (from === null || at >= from) {
        cashCents += net;
        buyersInRange.add(email);
      }
    }
  }
  firsts.buyer = [...people.values()];

  // Which steps this funnel has: any step ever seen, plus visits and buyers.
  const present = STEPS.filter((step) => step.key === "visit" || step.key === "buyer" || firsts[step.key].length > 0);
  const counts = Object.fromEntries(present.map((step) => [step.key, countIn(firsts[step.key], from, now + 1)]));
  const buyers = counts.buyer;
  const allTimeBuyers = firsts.buyer.length;
  const aovCents = buyersInRange.size > 0 ? Math.round(cashCents / buyersInRange.size)
    : allTimeBuyers > 0 ? Math.round(cashAllTime / allTimeBuyers) : null;
  const aovBasis = buyersInRange.size > 0 ? "range" : allTimeBuyers > 0 ? "all_time" : null;

  // With no payment ever recorded, "bought" can't be measured: grading it would
  // blame the calls for a missing connection.
  const noPayments = Number(unmatchedRow?.all_payments || 0) === 0 && (paymentRows.results || []).length === 0;

  // Step rows with rate, target and grade.
  const steps = present.map((step, index) => {
    const row = {
      key: step.key,
      label: step.label,
      short: step.short,
      per: step.per,
      count: counts[step.key],
      rate: null,
      entering: null,
      target: null,
      grade: null,
      needs: null,
      worth_cents: null,
    };
    if (step.key !== "buyer" && cashCents > 0 && row.count > 0) row.worth_cents = Math.round(cashCents / row.count);
    if (index === 0) return row;
    const prev = present[index - 1];
    const entering = counts[prev.key];
    row.entering = entering;
    row.rate = entering > 0 ? Math.min(1, row.count / entering) : null;
    const benchmark = BENCHMARKS[`${prev.key}>${step.key}`];
    if (benchmark) {
      row.target = { rate: benchmark.rate, kind: "benchmark", text: benchmark.text, source: benchmark.source };
    } else {
      const best = ownBestTarget(firsts[prev.key], firsts[step.key], now);
      if (best) row.target = { rate: best.rate, kind: "own_best", from: best.from, to: best.to, text: "your best 30 days in the last six months" };
    }
    if (step.key === "buyer" && noPayments) row.unmeasured = "no_payments";
    else if (entering < MIN_SAMPLE) row.needs = MIN_SAMPLE;
    else row.grade = grade(row.rate, row.target?.rate);
    return row;
  });

  // Fix cards: every graded step under its target, ranked by money, then people.
  const fixes = [];
  let weightSum = 0;
  let scoreSum = 0;
  let measured = 0;
  const moneyWeights = aovCents !== null && buyers > 0;
  for (let index = 1; index < steps.length; index += 1) {
    const step = steps[index];
    if (!step.grade || !step.target) continue;
    const downstream = step.key === "buyer" ? 1 : step.count > 0 ? buyers / step.count : 0;
    measured += 1;
    const weight = moneyWeights
      ? step.entering * step.target.rate * downstream * aovCents
      : step.entering * step.target.rate;
    weightSum += weight;
    scoreSum += weight * Math.min(1, step.rate / step.target.rate);
    if (step.rate >= step.target.rate) continue;
    const extra = Math.round(step.entering * (step.target.rate - step.rate));
    if (extra < 1) continue;
    const deals = extra * downstream;
    const fix = FIXES[step.key];
    fixes.push({
      id: `step:${steps[index - 1].key}>${step.key}`,
      kind: "opportunity",
      step: step.key,
      from_label: steps[index - 1].short,
      to_label: step.short,
      rate: step.rate,
      target: step.target,
      entering: step.entering,
      stopped: step.entering - step.count,
      extra,
      downstream_rate: step.key === "buyer" ? null : downstream,
      deals: Math.round(deals * 10) / 10,
      dollars_cents: aovCents !== null ? Math.round(deals * aovCents) : null,
      fix: fix ? { text: fix.text, source: fix.source } : null,
      action: fix?.action || null,
    });
  }

  const unmatched = { count: Number(unmatchedRow?.n || 0), cents: Number(unmatchedRow?.cents || 0) };
  if (unmatched.count > 0) {
    fixes.push({
      id: "risk:unmatched-payments",
      kind: "risk",
      step: null,
      count: unmatched.count,
      dollars_cents: unmatched.cents,
      fix: {
        text: "These payments aren't tied to a person, so your buyers, cash by video and this list can't count them. Match each one to the buyer.",
        source: "wiki/synthesis/cash-by-video-spec.md",
      },
      action: { label: "Match payments", route: "revenue" },
    });
  }
  // Setup gaps we can see from the data itself.
  const everApplied = firsts.application.length + firsts.optin.length;
  if (everApplied >= 5 && firsts.booking.length === 0) {
    fixes.push({
      id: "setup:calendar",
      kind: "setup",
      step: "booking",
      count: everApplied,
      dollars_cents: null,
      fix: { text: "People are applying but no booked call has ever reached us, so every step after the application reads zero. Connect the calendar.", source: null },
      action: { label: "Connect your calendar", route: "access" },
    });
  }
  if (firsts.booking.length >= 3 && Number(unmatchedRow?.all_payments || 0) === 0) {
    fixes.push({
      id: "setup:payments",
      kind: "setup",
      step: "buyer",
      count: firsts.booking.length,
      dollars_cents: null,
      fix: { text: "Calls are being booked but no payment has ever reached us, so buyers and cash read zero. Connect where you get paid.", source: null },
      action: { label: "Connect payments", route: "access" },
    });
  }
  const order = { setup: 0, risk: 1, opportunity: 1 };
  fixes.sort((a, b) => order[a.kind] - order[b.kind]
    || (b.dollars_cents ?? -1) - (a.dollars_cents ?? -1)
    || (b.extra ?? 0) - (a.extra ?? 0));

  const score = measured >= 2 && weightSum > 0
    ? { value: Math.round((scoreSum / weightSum) * 100), steps_measured: measured, weighting: moneyWeights ? "money" : "people" }
    : null;

  return {
    ok: true,
    client,
    range: rangeKey,
    from: fromIso,
    generated_at: new Date(now).toISOString(),
    currency: currencies.size > 1 ? "mixed" : [...currencies][0] || "USD",
    min_sample: MIN_SAMPLE,
    steps,
    cash: {
      collected_cents: cashCents,
      buyers,
      aov_cents: aovCents,
      aov_basis: aovBasis,
      unmatched,
    },
    fixes,
    score,
    today: todayVsAverage({ recentVisitRows, firsts, present, now, earliest: ms(earliestRow?.first) }),
  };
}

// Last 24 hours against the 29 days before, one 24-hour window per day.
// "Normal" is the 10th to 90th percentile of those days.
function todayVsAverage({ recentVisitRows, firsts, present, now, earliest }) {
  const hasHistory = earliest !== null && now - earliest >= 7 * DAY;
  const visitsByWindow = Array.from({ length: TODAY_WINDOWS + 1 }, () => new Set());
  for (const row of recentVisitRows.results || []) {
    const at = ms(row.at);
    if (at === null || at >= now) continue;
    const index = Math.floor((now - at) / DAY);
    if (index <= TODAY_WINDOWS) visitsByWindow[index].add(row.visitor_id);
  }
  const series = (key) => {
    if (key === "visit") return visitsByWindow.map((set) => set.size);
    const out = new Array(TODAY_WINDOWS + 1).fill(0);
    for (const at of firsts[key]) {
      if (at >= now) continue;
      const index = Math.floor((now - at) / DAY);
      if (index <= TODAY_WINDOWS) out[index] += 1;
    }
    return out;
  };
  const keys = ["visit", "optin", "application", "booking"].filter((key) => present.some((step) => step.key === key));
  const labels = Object.fromEntries(STEPS.map((step) => [step.key, step.short]));
  return {
    window_hours: 24,
    days_compared: TODAY_WINDOWS,
    has_history: hasHistory,
    metrics: keys.map((key) => {
      const values = series(key);
      const value = values[0];
      const past = values.slice(1);
      const average = past.reduce((sum, n) => sum + n, 0) / past.length;
      const sorted = [...past].sort((a, b) => a - b);
      const low = percentile(sorted, 0.1);
      const high = percentile(sorted, 0.9);
      const status = !hasHistory ? "no_history" : value > high ? "above" : value < low ? "below" : "within";
      return {
        key,
        label: labels[key],
        value,
        average: Math.round(average * 10) / 10,
        low,
        high,
        status,
        change: average > 0 ? Math.round(((value - average) / average) * 100) / 100 : null,
      };
    }),
  };
}
