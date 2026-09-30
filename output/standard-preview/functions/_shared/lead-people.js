// People for the lead score, the per-lead pipeline and the visitors feed (InfoOS build).
//
// A person is every browser (visitor id) and every email we can tie together: a visit
// becomes a known person the moment that browser opts in or applies, and two emails
// merge when one browser used both. Page, video and form signals are aggregated in SQL
// per browser, then summed per person here, so a client with a big funnel still loads
// in one pass (Cloudflare's free plan allows 10ms of CPU per request).
//
// Cash follows the Payments page rule: confirmed payment matches only, net of refunds.

import { cleanId, normalizeEmail, parseJson } from "./common.js";
import { DAY, LADDER, features, highestStage, nextStep, scorePerson, startingModel, withMeans, withOwnRates } from "./lead-score.js";

// Browsers tied to an email, for the pipeline of known people.
const KNOWN_VISITORS = {
  sql: `SELECT visitor_id FROM page_events WHERE client=? AND visitor_id IS NOT NULL AND email IS NOT NULL AND email<>''
        UNION SELECT visitor_id FROM leads WHERE client=? AND visitor_id IS NOT NULL
        UNION SELECT visitor_id FROM watch_events WHERE client=? AND visitor_id IS NOT NULL AND email IS NOT NULL AND email<>''`,
  params: (client) => [client, client, client],
};

// The most recent browsers, for the visitors feed.
const recentVisitors = (since, limit) => ({
  sql: `SELECT visitor_id FROM page_events WHERE client=? AND at>=? AND visitor_id IS NOT NULL
        GROUP BY visitor_id ORDER BY MAX(at) DESC LIMIT ${Math.max(1, Math.min(500, Math.floor(limit)))}`,
  params: (client) => [client, since],
});

export const listVisitors = (ids) => ({
  sql: ids.map(() => "SELECT ? AS visitor_id").join(" UNION ALL ") || "SELECT NULL AS visitor_id WHERE 0",
  params: () => ids,
});

async function all(env, sql, params) {
  const result = await env.DB.prepare(sql).bind(...params).all();
  return result.results || [];
}

/** Per-browser aggregates for one set of browsers. */
export async function visitorAggregates(env, client, set) {
  const scope = `client=? AND visitor_id IN (${set.sql})`;
  const scoped = () => [client, ...set.params(client)];
  const [stats, first, last, loads, tags, watch] = await Promise.all([
    all(env, `SELECT visitor_id, MIN(at) AS first_at, MAX(at) AS last_at,
                     GROUP_CONCAT(DISTINCT substr(at,1,10)) AS day_list,
                     COUNT(DISTINCT session_id) AS sessions,
                     SUM(event='page_view') AS views,
                     COUNT(DISTINCT CASE WHEN event='page_view' THEN COALESCE(page_id, path) END) AS pages,
                     SUM(event='cta_click') AS ctas,
                     MIN(CASE WHEN event='form_start' THEN at END) AS form_start_at,
                     MIN(CASE WHEN event='optin' THEN at END) AS optin_at,
                     MAX(CASE WHEN event='cta_click' THEN json_extract(metadata_json,'$.label') END) AS cta_label
                FROM page_events WHERE ${scope} GROUP BY visitor_id`, scoped()),
    all(env, `SELECT visitor_id, referrer, utm_source, utm_content, utm_json FROM (
                SELECT visitor_id, referrer, utm_source, utm_content, utm_json,
                       ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY at, id) AS rn
                  FROM page_events WHERE ${scope} AND event='page_view') WHERE rn=1`, scoped()),
    all(env, `SELECT visitor_id, country, city, lat, lng, user_agent, at FROM (
                SELECT visitor_id, country, city, lat, lng, user_agent, at,
                       ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY at DESC, id DESC) AS rn
                  FROM page_events WHERE ${scope} AND event='page_view') WHERE rn=1`, scoped()),
    all(env, `SELECT visitor_id,
                     MAX(CAST(json_extract(metadata_json,'$.active_seconds') AS REAL)) AS active,
                     MAX(CAST(json_extract(metadata_json,'$.max_scroll') AS REAL)) AS scroll,
                     MAX(CAST(json_extract(metadata_json,'$.full_scrolls') AS REAL)) AS passes,
                     MAX(CAST(json_extract(metadata_json,'$.proof_seconds') AS REAL)) AS proof,
                     MAX(CAST(json_extract(metadata_json,'$.rage_clicks') AS REAL)) AS rage
                FROM page_events WHERE ${scope} AND event='engagement'
               GROUP BY visitor_id, COALESCE(json_extract(metadata_json,'$.load_id'), session_id || ':' || COALESCE(page_id,''))`, scoped()),
    all(env, `SELECT DISTINCT visitor_id, utm_content FROM page_events
               WHERE ${scope} AND utm_source='youtube' AND utm_content IS NOT NULL AND utm_content<>''`, scoped()),
    all(env, `SELECT visitor_id, MAX(COALESCE(percent,0)) AS pct, SUM(event='play') AS plays,
                     MIN(CASE WHEN event='play' THEN at END) AS first_play, MAX(at) AS last_at,
                     MAX(CASE WHEN event IN ('ended','percent_100') THEN 1 ELSE 0 END) AS ended
                FROM watch_events WHERE ${scope} GROUP BY visitor_id`, scoped()),
  ]);
  const byVisitor = new Map();
  const row = (id) => {
    if (!byVisitor.has(id)) byVisitor.set(id, { visitor_id: id, days: new Set(), loads: [], tags: new Set() });
    return byVisitor.get(id);
  };
  for (const s of stats) Object.assign(row(s.visitor_id), s, { days: new Set(String(s.day_list || "").split(",").filter(Boolean)) });
  for (const f of first) row(f.visitor_id).first = f;
  for (const l of last) row(l.visitor_id).place = l;
  for (const l of loads) row(l.visitor_id).loads.push(l);
  for (const t of tags) row(t.visitor_id).tags.add(t.utm_content);
  for (const w of watch) row(w.visitor_id).watch = w;
  return byVisitor;
}

/** Everything per client that is keyed by email rather than browser. */
export async function clientRows(env, client, now = Date.now()) {
  const [edges, touches, leads, payments, outcomes, flags, videos, prefs, models, anon, video] = await Promise.all([
    all(env, `SELECT visitor_id, lower(email) AS email FROM page_events WHERE client=? AND visitor_id IS NOT NULL AND email IS NOT NULL AND email<>'' GROUP BY visitor_id, lower(email)
              UNION SELECT visitor_id, lower(email) FROM leads WHERE client=? AND visitor_id IS NOT NULL AND email IS NOT NULL AND email<>''
              UNION SELECT visitor_id, lower(email) FROM watch_events WHERE client=? AND visitor_id IS NOT NULL AND email IS NOT NULL AND email<>'' GROUP BY visitor_id, lower(email)`,
      [client, client, client]),
    all(env, `SELECT lower(contact_email) AS email, contact_name AS name, kind, ts, source, external_id, amount_cents, payload_json
                FROM pipeline_touches WHERE client_id=? ORDER BY ts`, [client]),
    all(env, `SELECT lower(email) AS email, name, phone, answers_json, utm_json, applied_at, source, visitor_id
                FROM leads WHERE client=? AND email IS NOT NULL AND email<>'' ORDER BY id`, [client]),
    all(env, `SELECT p.id, p.amount_cents, p.refunded_cents, p.currency, p.occurred_at, p.customer_email, p.customer_name,
                     m.target_kind, m.target_id, json_extract(w.data_json, '$.email') AS record_email
                FROM payment_matches m
                JOIN payments p ON p.id = m.payment_id
                LEFT JOIN workspace_records w ON m.target_kind = 'workspace_record' AND w.id = m.target_id
               WHERE m.client_id=? AND m.status='confirmed' AND p.kind='charge'`, [client]),
    all(env, `SELECT * FROM lead_outcomes WHERE client_id=? ORDER BY COALESCE(call_at, created_at)`, [client]).catch(() => []),
    all(env, `SELECT booking_ref, confirmed_at FROM call_flags WHERE client_id=? AND confirmed_at IS NOT NULL`, [client]).catch(() => []),
    all(env, `SELECT video_id, title, thumbnail_url FROM yt_videos WHERE client_id=?`, [client]).catch(() => []),
    all(env, `SELECT key, value_json FROM workspace_preferences WHERE client_id=? AND key IN ('lead-qualify','regional')`, [client]).catch(() => []),
    all(env, `SELECT client_id, model_json FROM lead_models WHERE client_id IN (?, '')`, [client]).catch(() => []),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT visitor_id) AS matured FROM page_events
        WHERE client=? AND event='page_view' AND visitor_id IS NOT NULL AND at < ? AND at >= ?
          AND (email IS NULL OR email='')`,
    ).bind(client, new Date(now - 30 * DAY).toISOString(), new Date(now - 365 * DAY).toISOString()).first().catch(() => null),
    env.DB.prepare(
      `SELECT (SELECT wistia_media_id FROM client_config WHERE client=?) AS media,
              (SELECT 1 FROM watch_events WHERE client=? LIMIT 1) AS watched`,
    ).bind(client, client).first().catch(() => null),
  ]);
  const pref = (key) => parseJson(prefs.find((p) => p.key === key)?.value_json, null);
  const model = (id) => parseJson(models.find((m) => m.client_id === id)?.model_json, null);
  return {
    edges, touches, leads, payments, outcomes, flags, videos,
    qualify: pref("lead-qualify"),
    regional: pref("regional"),
    clientModel: model(client),
    pooledModel: model(""),
    anonMatured: Number(anon?.matured || 0),
    hasVideo: Boolean(video?.media || video?.watched),
  };
}

// ---------- identity ----------

function unionFind() {
  const parent = new Map();
  const find = (x) => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(x) !== root) { const next = parent.get(x); parent.set(x, root); x = next; }
    return root;
  };
  const union = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  return { find, union, nodes: () => [...parent.keys()] };
}

const paymentEmail = (row) => normalizeEmail(
  row.target_kind === "contact_email" ? row.target_id
    : row.target_kind === "workspace_record" ? row.record_email || row.customer_email
      : row.customer_email,
);

// ---------- readable labels ----------

export function deviceFrom(ua) {
  const s = String(ua || "");
  const device = /iPad/.test(s) ? "iPad" : /iPhone/.test(s) ? "iPhone" : /Android/.test(s) ? "Android" : /Macintosh|Mac OS/.test(s) ? "Mac" : /Windows/.test(s) ? "Windows" : /Linux/.test(s) ? "Linux" : null;
  const browser = /Edg\//.test(s) ? "Edge" : /OPR\//.test(s) ? "Opera" : /Firefox\//.test(s) ? "Firefox" : /CriOS|Chrome\//.test(s) ? "Chrome" : /Safari\//.test(s) ? "Safari" : null;
  if (/Instagram/.test(s)) return { device, browser: "Instagram app" };
  if (/FBAN|FBAV/.test(s)) return { device, browser: "Facebook app" };
  return { device, browser };
}

export function sourceFrom({ utm_source, referrer, utm_json } = {}) {
  const utm = parseJson(utm_json, {});
  const tag = String(utm_source || utm.utm_source || "").toLowerCase();
  const medium = String(utm.utm_medium || "").toLowerCase();
  let host = "";
  try { host = new URL(referrer).hostname.replace(/^www\./, ""); } catch { /* no referrer */ }
  const known = [
    ["youtube", /youtube|youtu\.be/], ["instagram", /instagram/], ["tiktok", /tiktok/], ["facebook", /facebook|fb\b|meta/],
    ["google", /google/], ["x", /^x$|twitter|t\.co/], ["linkedin", /linkedin|lnkd/], ["email", /email|newsletter|kit|convertkit/],
  ];
  for (const [key, pattern] of known) if (pattern.test(tag)) return key;
  if (medium === "email") return "email";
  if (tag) return tag.slice(0, 24);
  for (const [key, pattern] of known) if (pattern.test(host)) return key;
  return host ? host.slice(0, 40) : "direct";
}

// ---------- building people ----------

function evaluateQualified(answers, rules) {
  const questions = rules?.questions;
  if (!questions || !answers || typeof answers !== "object") return null;
  let checked = false;
  for (const [key, rule] of Object.entries(questions)) {
    const bad = new Set((rule?.disqualify || []).map((v) => String(v).trim().toLowerCase()));
    if (!bad.size || !(key in answers)) continue;
    checked = true;
    const given = Array.isArray(answers[key]) ? answers[key] : [answers[key]];
    if (given.some((v) => bad.has(String(v ?? "").trim().toLowerCase()))) return false;
  }
  return checked ? true : null;
}

function callState(bookings, outcomes, now) {
  // The latest booking, unless an outcome says what happened to it.
  const active = bookings.filter((b) => !b.cancelled);
  const latestBooking = [...bookings].sort((a, b) => String(b.starts_at || "").localeCompare(String(a.starts_at || "")))[0] || null;
  const latestActive = [...active].sort((a, b) => String(b.starts_at || "").localeCompare(String(a.starts_at || "")))[0] || null;
  const outcome = [...outcomes].sort((a, b) => String(b.call_at || b.created_at).localeCompare(String(a.call_at || a.created_at)))[0] || null;
  const booking = latestActive || latestBooking;
  if (outcome && (!booking || !booking.starts_at || String(outcome.call_at || "") >= String(booking.starts_at) || outcome.booking_ref === booking.ref)) {
    const base = { call_at: outcome.call_at || booking?.starts_at || null, booking_ref: outcome.booking_ref, outcome_id: outcome.id, join_url: booking?.join_url || null };
    if (outcome.attended === "no_show") return { ...base, state: "no_show" };
    if (outcome.attended === "cancelled") return { ...base, state: "cancelled" };
    if (outcome.attended === "rescheduled") {
      if (latestActive && latestActive.ref !== outcome.booking_ref && Date.parse(latestActive.starts_at) > now) return { state: "upcoming", call_at: latestActive.starts_at, booking_ref: latestActive.ref, join_url: latestActive.join_url };
      return { ...base, state: "awaiting" };
    }
    if (outcome.result === "closed") return { ...base, state: "closed" };
    if (outcome.result === "not_closed") return { ...base, state: "not_closed" };
    if (outcome.result === "follow_up") return { ...base, state: "follow_up" };
    if (outcome.result === "unqualified") return { ...base, state: "unqualified" };
    return { ...base, state: "showed" };
  }
  if (!booking) return null;
  const base = { call_at: booking.starts_at, booking_ref: booking.ref, join_url: booking.join_url || null, booked_at: booking.booked_at || null };
  if (!latestActive) return { ...base, state: "cancelled" };
  const start = Date.parse(booking.starts_at || "");
  if (Number.isFinite(start) && start > now) return { ...base, state: "upcoming" };
  return { ...base, state: "awaiting" };
}

/**
 * Build people from per-browser aggregates plus the client's email-keyed rows.
 * `onlyKnown` drops browsers with no email; `visitorScope` keeps components that
 * contain one of these browsers.
 */
export function assemble(client, byVisitor, rows, now, { onlyKnown = false, visitorScope = null } = {}) {
  const uf = unionFind();
  for (const id of byVisitor.keys()) uf.find(`v:${id}`);
  for (const edge of rows.edges) if (edge.visitor_id && edge.email) uf.union(`v:${edge.visitor_id}`, `e:${edge.email}`);
  const emailKeys = new Set();
  for (const t of rows.touches) if (t.email) emailKeys.add(t.email);
  for (const l of rows.leads) if (l.email) emailKeys.add(l.email);
  for (const o of rows.outcomes) if (o.email) emailKeys.add(normalizeEmail(o.email));
  for (const p of rows.payments) { const e = paymentEmail(p); if (e) emailKeys.add(e); }
  for (const e of emailKeys) uf.find(`e:${e}`);

  const groups = new Map();
  for (const node of uf.nodes()) {
    const root = uf.find(node);
    if (!groups.has(root)) groups.set(root, { visitors: [], emails: [] });
    const g = groups.get(root);
    if (node.startsWith("v:")) g.visitors.push(node.slice(2));
    else g.emails.push(node.slice(2));
  }

  const touchesBy = groupBy(rows.touches, (t) => t.email);
  const leadsBy = groupBy(rows.leads, (l) => l.email);
  const outcomesBy = groupBy(rows.outcomes, (o) => normalizeEmail(o.email));
  const paymentsBy = groupBy(rows.payments, paymentEmail);
  const confirmed = new Set(rows.flags.map((f) => f.booking_ref));
  const titles = new Map(rows.videos.map((v) => [v.video_id, v]));

  const people = [];
  for (const group of groups.values()) {
    if (onlyKnown && !group.emails.length) continue;
    if (visitorScope && !group.visitors.some((id) => visitorScope.has(id))) continue;
    const visitors = group.visitors.map((id) => byVisitor.get(id)).filter(Boolean);
    if (!visitors.length && !group.emails.length) continue;
    const touches = group.emails.flatMap((e) => touchesBy.get(e) || []);
    const leads = group.emails.flatMap((e) => leadsBy.get(e) || []);
    const outcomes = group.emails.flatMap((e) => outcomesBy.get(e) || []);
    const payments = group.emails.flatMap((e) => paymentsBy.get(e) || []);
    if (!visitors.length && !touches.length && !leads.length && !outcomes.length && !payments.length) continue;

    // Primary email: the one they applied with, else the one seen first.
    const applied = leads.filter((l) => l.source === "typeform").sort((a, b) => String(b.applied_at).localeCompare(String(a.applied_at)))[0];
    const email = applied?.email || touches[0]?.email || leads[0]?.email || [...group.emails].sort()[0] || null;
    const name = [...leads].reverse().find((l) => l.name)?.name || [...touches].reverse().find((t) => t.name)?.name
      || payments.find((p) => p.customer_name)?.customer_name || null;
    const phone = [...leads].reverse().find((l) => l.phone)?.phone || null;
    const answers = parseJson(applied?.answers_json || [...leads].reverse().find((l) => l.answers_json)?.answers_json, null);

    // Page and video signals across every browser this person used.
    const days = new Set();
    let firstAt = null;
    let lastAt = null;
    let views = 0;
    let pages = 0;
    let ctas = 0;
    let ctaLabel = null;
    let formStart = null;
    let optinEvent = null;
    let active = 0;
    let proof = 0;
    let passes = 0;
    let rage = 0;
    let scroll = 0;
    let vsl = 0;
    let plays = 0;
    let firstPlay = null;
    let firstTouch = null;
    let place = null;
    const tags = new Set();
    for (const v of visitors) {
      for (const d of v.days) days.add(d);
      firstAt = minIso(firstAt, v.first_at);
      lastAt = maxIso(lastAt, v.last_at);
      views += Number(v.views || 0);
      pages = Math.max(pages, Number(v.pages || 0));
      ctas += Number(v.ctas || 0);
      ctaLabel = v.cta_label || ctaLabel;
      formStart = minIso(formStart, v.form_start_at);
      optinEvent = minIso(optinEvent, v.optin_at);
      for (const load of v.loads) {
        active += Number(load.active || 0);
        proof += Number(load.proof || 0);
        passes += Number(load.passes || 0);
        rage += Number(load.rage || 0);
        scroll = Math.max(scroll, Number(load.scroll || 0));
      }
      if (v.watch) {
        vsl = Math.max(vsl, Number(v.watch.pct || 0) / 100);
        plays += Number(v.watch.plays || 0);
        firstPlay = minIso(firstPlay, v.watch.first_play);
        lastAt = maxIso(lastAt, v.watch.last_at);
      }
      for (const t of v.tags) tags.add(t);
      if (v.first && (!firstTouch || String(v.first_at) < String(firstTouch.at))) firstTouch = { ...v.first, at: v.first_at };
      if (v.place && (!place || String(v.place.at) > String(place.at))) place = v.place;
    }

    // Steps.
    const firstOf = (kind) => touches.filter((t) => t.kind === kind).reduce((m, t) => minIso(m, t.ts), null);
    const bookings = touches.filter((t) => t.kind === "booking").map((t) => {
      const payload = parseJson(t.payload_json, {});
      return {
        ref: String(t.external_id || "").replace(/#canceled$/, ""),
        starts_at: payload.starts_at || t.ts,
        booked_at: payload.booked_at || null,
        join_url: payload.join_url || null,
        cancelled: /cancel/i.test(String(payload.status || "")) || /#canceled$/.test(String(t.external_id || "")),
      };
    });
    // A cancellation arrives as its own row; it cancels the booking it names.
    const cancelledRefs = new Set(bookings.filter((b) => b.cancelled).map((b) => b.ref));
    const liveBookings = bookings.filter((b) => !b.cancelled).map((b) => ({ ...b, cancelled: cancelledRefs.has(b.ref) }));
    const allBookings = liveBookings.length ? liveBookings : bookings;
    const call = callState(allBookings, outcomes, now);
    if (call && confirmed.has(call.booking_ref)) call.confirmed = true;

    let collected = 0;
    let firstPaid = null;
    let currency = null;
    for (const p of payments) {
      const net = Math.max(0, Number(p.amount_cents || 0) - Number(p.refunded_cents || 0));
      if (net <= 0) continue;
      collected += net;
      firstPaid = minIso(firstPaid, p.occurred_at);
      currency = currency || String(p.currency || "USD").toUpperCase();
    }
    const dealOutcome = [...outcomes].reverse().find((o) => o.deal_cents);
    const showedAt = outcomes.filter((o) => o.attended === "showed").reduce((m, o) => minIso(m, o.call_at || o.created_at), null);

    const optin = minIso(firstOf("optin"), optinEvent);
    const appliedAt = minIso(firstOf("application"), applied?.applied_at || null);
    const bookedAt = bookings.length ? bookings.reduce((m, b) => minIso(m, b.booked_at || b.starts_at), null) : null;
    const stages = {
      visit: firstAt,
      optin,
      app_start: minIso(formStart, appliedAt),
      applied: appliedAt,
      booked: bookedAt,
      showed: showedAt || (call?.state === "closed" || call?.state === "not_closed" || call?.state === "follow_up" ? call.call_at : null),
      bought: firstPaid,
    };
    if (!firstAt) firstAt = [optin, appliedAt, bookedAt, firstPaid].reduce(minIso, null);
    const touchTimes = touches.filter((t) => t.kind !== "booking").map((t) => t.ts);
    for (const ts of [...touchTimes, ...bookings.map((b) => b.booked_at).filter(Boolean), ...outcomes.map((o) => o.created_at)]) {
      if (ts && Date.parse(ts) <= now) lastAt = maxIso(lastAt, ts);
    }

    let qualified = evaluateQualified(answers, rows.qualify);
    if (call?.state === "unqualified") qualified = false;

    const utm = firstTouch?.utm_content && firstTouch?.utm_source === "youtube" ? firstTouch.utm_content : null;
    const sourceVideoId = utm || [...tags][0] || null;
    const sourceVideo = sourceVideoId
      ? { video_id: sourceVideoId, title: titles.get(sourceVideoId)?.title || null, thumbnail_url: titles.get(sourceVideoId)?.thumbnail_url || null }
      : null;
    const { device, browser } = deviceFrom(place?.user_agent);

    people.push({
      key: email || `v:${[...group.visitors].sort()[0]}`,
      email,
      emails: group.emails,
      visitor_ids: group.visitors,
      name,
      phone,
      answers,
      first_at: firstAt,
      last_at: lastAt,
      stages,
      qualified,
      call,
      money: { collected_cents: collected, deal_cents: dealOutcome?.deal_cents || null, payment_type: dealOutcome?.payment_type || null, currency },
      signals: {
        vsl_frac: Math.round(vsl * 100) / 100,
        plays,
        first_play: firstPlay,
        active_seconds: Math.round(active),
        proof_seconds: Math.round(proof),
        full_scrolls: passes,
        rage_clicks: rage,
        max_scroll: Math.round(scroll),
        days: days.size || (visitors.length ? 1 : 0),
        views,
        pages,
        ctas,
        cta_label: ctaLabel,
        youtube: tags.size > 0 || firstTouch?.utm_source === "youtube",
        video_ids: [...tags],
      },
      source: {
        channel: firstTouch ? sourceFrom(firstTouch) : touches[0]?.source || null,
        video: sourceVideo,
        referrer: firstTouch?.referrer || null,
        utm: parseJson(firstTouch?.utm_json, {}),
      },
      place: place ? { country: place.country || null, city: place.city || null, lat: place.lat ?? null, lng: place.lng ?? null, device, browser } : null,
    });
  }
  return people;
}

function groupBy(list, key) {
  const map = new Map();
  for (const item of list) {
    const k = key(item);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}
const minIso = (a, b) => (!a ? b || null : !b ? a : String(a) < String(b) ? a : b);
const maxIso = (a, b) => (!a ? b || null : !b ? a : String(a) > String(b) ? a : b);

// ---------- the funnel's steps and the model ----------

export function presentSteps(rows, people) {
  const has = { visit: true };
  for (const t of rows.touches) {
    if (t.kind === "optin") has.optin = true;
    if (t.kind === "application") has.applied = true;
    if (t.kind === "booking") has.booked = true;
  }
  for (const p of people) {
    if (p.stages.optin) has.optin = true;
    if (p.stages.app_start && !p.stages.applied) has.app_start = true;
    if (p.stages.applied) has.applied = true;
    if (p.stages.booked) has.booked = true;
    if (p.stages.showed) has.showed = true;
  }
  if (has.applied) has.app_start = has.app_start || people.some((p) => p.stages.app_start && p.stages.app_start !== p.stages.applied);
  if (rows.outcomes.some((o) => o.attended === "showed" || o.result)) has.showed = true;
  return LADDER.map((s) => s.key).filter((key) => has[key]);
}

/** The model the nightly run stored, if it is fresh and fits this funnel's steps. */
export function storedModel(rows, present, now) {
  const model = rows.clientModel;
  if (!model || JSON.stringify(model.present) !== JSON.stringify(present)) return null;
  const at = Date.parse(model.computed_at || model.fitted?.at || "");
  if (!Number.isFinite(at) || now - at > 36 * 3600000) return null;
  return model;
}

/** Starting weights, the client's own step rates and its people's typical behaviour. */
export function liveModel(rows, people, present, now) {
  const stored = rows.clientModel;
  const samePresent = stored && JSON.stringify(stored.present) === JSON.stringify(present);
  let model = startingModel(present, rows.pooledModel);
  if (stored?.means && samePresent) model.means = stored.means;
  model = withOwnRates(model, people, now, { anonymousVisitors: { matured: rows.anonMatured } });
  model = withMeans(model, people);
  if (stored?.fitted) model.fitted = stored.fitted;
  return model;
}

// ---------- public loaders ----------

export const PIPELINE_STATUSES = [
  "customer", "paying", "closed", "not_closed", "follow_up", "no_show", "cancelled", "booked", "call_done",
  "unqualified", "applied", "started", "opted_in", "visitor",
];

export function pipelineStatus(person) {
  const call = person.call || {};
  if (person.stages.bought) {
    return person.money.deal_cents && person.money.collected_cents < person.money.deal_cents ? "paying" : "customer";
  }
  if (call.state === "closed") return "closed";
  if (call.state === "not_closed") return "not_closed";
  if (call.state === "follow_up") return "follow_up";
  if (call.state === "no_show") return "no_show";
  if (call.state === "cancelled") return "cancelled";
  if (call.state === "upcoming") return "booked";
  if (call.state === "awaiting" || call.state === "showed") return "call_done";
  if (person.qualified === false || call.state === "unqualified") return "unqualified";
  if (person.stages.applied) return "applied";
  if (person.stages.app_start && person.email) return "started";
  if (person.stages.optin) return "opted_in";
  return "visitor";
}

/** The per-lead pipeline: each step with when it happened, or how it failed. */
export function pipelineSteps(person, present, hasVideo) {
  const s = person.stages;
  const call = person.call || {};
  const steps = [{ key: "visit", at: s.visit }];
  if (hasVideo) steps.push({ key: "watched", at: person.signals.first_play, detail: person.signals.vsl_frac ? Math.round(person.signals.vsl_frac * 100) : null });
  if (present.includes("optin")) steps.push({ key: "optin", at: s.optin });
  if (present.includes("applied") || present.includes("app_start")) {
    steps.push({ key: "applied", at: s.applied, failed: person.qualified === false ? "unqualified" : null, started: !s.applied && s.app_start ? s.app_start : null });
  }
  if (present.includes("booked") || s.booked) steps.push({ key: "booked", at: s.booked, detail: call.call_at || null });
  if (present.includes("booked") || s.booked) {
    const failed = call.state === "no_show" ? "no_show" : call.state === "cancelled" ? "cancelled" : null;
    steps.push({ key: "showed", at: s.showed, failed, upcoming: call.state === "upcoming" ? call.call_at : null });
  }
  steps.push({ key: "bought", at: s.bought, failed: call.state === "not_closed" ? "not_closed" : null });
  const money = person.money;
  if (money.deal_cents) steps.push({ key: "paid", at: money.collected_cents >= money.deal_cents ? s.bought : null, detail: { collected_cents: money.collected_cents, deal_cents: money.deal_cents } });
  return steps;
}

function summarize(person, model, present, hasVideo, now) {
  const scored = scorePerson(person, model, now);
  return {
    key: person.key,
    email: person.email,
    name: person.name,
    phone: person.phone,
    anonymous: !person.email,
    first_at: person.first_at,
    last_at: person.last_at,
    status: pipelineStatus(person),
    score: scored.score,
    band: scored.band,
    chance: scored.p == null ? null : Math.round(scored.p * 1000) / 1000,
    reasons: scored.reasons.slice(0, 3),
    next: nextStep(person, scored, now),
    steps: pipelineSteps(person, present, hasVideo),
    call: person.call,
    money: person.money,
    source: person.source,
    place: person.place,
    signals: {
      vsl_frac: person.signals.vsl_frac,
      active_seconds: person.signals.active_seconds,
      max_scroll: person.signals.max_scroll,
      days: person.signals.days,
      pages: person.signals.pages,
      rage_clicks: person.signals.rage_clicks,
    },
  };
}

export async function loadPipeline(env, clientId, { now = Date.now() } = {}) {
  const client = cleanId(clientId, "");
  const [rows, byVisitor] = await Promise.all([clientRows(env, client, now), visitorAggregates(env, client, KNOWN_VISITORS)]);
  const people = assemble(client, byVisitor, rows, now, { onlyKnown: true });
  const present = presentSteps(rows, people);
  const model = storedModel(rows, present, now) || liveModel(rows, people, present, now);
  const hasVideo = rows.hasVideo || people.some((p) => p.signals.plays > 0);
  const list = people.map((p) => summarize(p, model, present, hasVideo, now));
  list.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || String(b.last_at || "").localeCompare(String(a.last_at || "")));
  return { client, present, model: modelSummary(model), people: list, rows, raw: people, modelFull: model, hasVideo };
}

export async function loadVisitors(env, clientId, { since, limit = 200, now = Date.now() } = {}) {
  const client = cleanId(clientId, "");
  const set = recentVisitors(since, limit);
  const [rows, byVisitor] = await Promise.all([clientRows(env, client, now), visitorAggregates(env, client, set)]);
  // Known people among these browsers pull in their other browsers too.
  const scope = new Set(byVisitor.keys());
  const extra = new Set();
  for (const edge of rows.edges) if (scope.has(edge.visitor_id)) for (const other of rows.edges) if (other.email === edge.email && !byVisitor.has(other.visitor_id)) extra.add(other.visitor_id);
  if (extra.size) {
    const more = await visitorAggregates(env, client, listVisitors([...extra].slice(0, 90)));
    for (const [id, v] of more) byVisitor.set(id, v);
  }
  const people = assemble(client, byVisitor, rows, now, { visitorScope: scope });
  // Same steps and model as the pipeline, so a person scores the same on every screen.
  let present = presentSteps(rows, people);
  let model = storedModel(rows, present, now);
  let hasVideo = rows.hasVideo || people.some((p) => p.signals.plays > 0);
  if (!model) {
    const pipeline = await loadPipeline(env, client, { now });
    present = pipeline.present;
    model = pipeline.modelFull;
    hasVideo = hasVideo || pipeline.hasVideo;
  }
  const list = people.map((p) => summarize(p, model, present, hasVideo, now));
  list.sort((a, b) => String(b.last_at || "").localeCompare(String(a.last_at || "")));
  return { client, present, model: modelSummary(model), people: list };
}

/** One person with the full breakdown and journey. `key` is an email or v:<visitor id>. */
export async function loadPerson(env, clientId, key, { now = Date.now() } = {}) {
  const client = cleanId(clientId, "");
  const wanted = String(key || "");
  const email = wanted.startsWith("v:") ? null : normalizeEmail(wanted);
  if (!wanted.startsWith("v:") && !email) return null;
  // The known pipeline already holds every browser tied to an email.
  const pipeline = await loadPipeline(env, client, { now });
  const { rows, present, modelFull: model } = pipeline;
  let person = pipeline.raw.find((p) => (email ? p.emails.includes(email) : p.visitor_ids.includes(wanted.slice(2))));
  if (!person && wanted.startsWith("v:")) {
    const byVisitor = await visitorAggregates(env, client, listVisitors([wanted.slice(2)]));
    person = assemble(client, byVisitor, rows, now, { visitorScope: new Set([wanted.slice(2)]) })[0] || null;
  }
  if (!person) return null;
  const hasVideo = pipeline.hasVideo || person.signals.plays > 0;
  const scored = scorePerson(person, model, now);
  const journey = await loadJourney(env, client, person, rows);
  return {
    ...summarize(person, model, present, hasVideo, now),
    reasons: scored.reasons,
    base: scored.base || null,
    clamped: scored.clamped || false,
    answers: person.answers,
    visitor_ids: person.visitor_ids,
    emails: person.emails,
    signals: person.signals,
    features: features(person),
    stage: highestStage(person, present),
    journey,
    model: modelSummary(model),
  };
}

async function loadJourney(env, client, person, rows) {
  const ids = person.visitor_ids.slice(0, 90);
  const emails = person.emails.slice(0, 40);
  const idList = ids.map(() => "?").join(",") || "NULL";
  const emailList = emails.map(() => "?").join(",") || "NULL";
  const [pageRows, watchRows] = await Promise.all([
    all(env, `SELECT event, at, page_id, path, referrer, utm_source, utm_content, metadata_json, country, city FROM page_events
               WHERE client=? AND (visitor_id IN (${idList}) OR lower(email) IN (${emailList})) ORDER BY at DESC LIMIT 400`,
      [client, ...ids, ...emails]),
    all(env, `SELECT session_id, media_id, MIN(at) AS started, MAX(at) AS ended, MAX(COALESCE(percent,0)) AS pct, MAX(duration_seconds) AS duration
                FROM watch_events WHERE client=? AND (visitor_id IN (${idList}) OR lower(email) IN (${emailList}))
               GROUP BY session_id, media_id ORDER BY started DESC LIMIT 60`,
      [client, ...ids, ...emails]),
  ]);
  const titles = new Map(rows.videos.map((v) => [v.video_id, v.title]));
  const out = [];
  for (const row of pageRows) {
    const meta = parseJson(row.metadata_json, {});
    if (row.event === "page_view") {
      const video = row.utm_source === "youtube" && row.utm_content ? titles.get(row.utm_content) || row.utm_content : null;
      out.push({ kind: "page_view", at: row.at, page: row.page_id || row.path, source: sourceFrom(row), video, place: [row.city, row.country].filter(Boolean).join(", ") || null });
    } else if (row.event === "engagement") {
      out.push({ kind: "engagement", at: row.at, active_seconds: Number(meta.active_seconds || 0), max_scroll: Number(meta.max_scroll || 0), proof_seconds: Number(meta.proof_seconds || 0), rage_clicks: Number(meta.rage_clicks || 0) });
    } else if (row.event === "cta_click") {
      out.push({ kind: "cta_click", at: row.at, label: meta.label || null });
    } else if (row.event === "form_start") {
      out.push({ kind: "form_start", at: row.at });
    } else if (row.event === "form_submit") {
      out.push({ kind: "form_submit", at: row.at });
    } else if (row.event === "optin") {
      out.push({ kind: "optin", at: row.at });
    }
  }
  // Engagement is sent as running totals: keep only the last one per page load.
  const seen = new Set();
  const trimmed = out.filter((e) => {
    if (e.kind !== "engagement") return true;
    const minute = String(e.at).slice(0, 15);
    if (seen.has(minute)) return false;
    seen.add(minute);
    return true;
  });
  for (const w of watchRows) trimmed.push({ kind: "watch", at: w.started, percent: Math.round(Number(w.pct || 0)), duration_seconds: w.duration ? Math.round(w.duration) : null });
  const mine = new Set(person.emails);
  for (const t of rows.touches) {
    if (!mine.has(t.email)) continue;
    const payload = parseJson(t.payload_json, {});
    if (t.kind === "booking") {
      const cancelled = /cancel/i.test(String(payload.status || "")) || /#canceled$/.test(String(t.external_id || ""));
      trimmed.push({ kind: cancelled ? "booking_cancelled" : "booking", at: payload.booked_at || (cancelled ? payload.cancelled_at : null) || t.ts, call_at: payload.starts_at || t.ts, source: t.source });
    } else if (t.kind === "payment") {
      trimmed.push({ kind: "payment_touch", at: t.ts, amount_cents: t.amount_cents });
    } else {
      trimmed.push({ kind: t.kind, at: t.ts, source: t.source });
    }
  }
  for (const o of rows.outcomes) {
    if (!mine.has(normalizeEmail(o.email))) continue;
    trimmed.push({ kind: "outcome", at: o.created_at, call_at: o.call_at, attended: o.attended, result: o.result, deal_cents: o.deal_cents, payment_type: o.payment_type, pre_sold: o.pre_sold, objection: o.objection, notes: o.notes, closer: o.closer, id: o.id });
  }
  for (const p of rows.payments) {
    if (!mine.has(paymentEmail(p))) continue;
    trimmed.push({ kind: "payment", at: p.occurred_at, amount_cents: Math.max(0, Number(p.amount_cents || 0) - Number(p.refunded_cents || 0)), refunded_cents: Number(p.refunded_cents || 0), currency: String(p.currency || "USD").toUpperCase() });
  }
  // Payments already appear as matched payments; drop the raw touch duplicates.
  const hasPayments = trimmed.some((e) => e.kind === "payment");
  const final = hasPayments ? trimmed.filter((e) => e.kind !== "payment_touch") : trimmed.map((e) => (e.kind === "payment_touch" ? { ...e, kind: "payment" } : e));
  final.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  return final.slice(0, 300);
}

export function modelSummary(model) {
  return {
    basis: model.basis,
    fitted: model.fitted || null,
    present: model.present,
    stages: Object.fromEntries(Object.entries(model.stages).map(([key, s]) => [key, { p: Math.round(s.p * 10000) / 10000, basis: s.basis, text: s.text, people: s.people ?? null, buyers: s.buyers ?? null }])),
  };
}
