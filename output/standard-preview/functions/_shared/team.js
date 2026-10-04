// The client's own sales team (InfoOS build, 2026-09-30): setters and closers, what each
// did in the last 30 days, their booking links, the forms they file, whether post-call
// forms are being filed, and commissions per pay period with Mark paid.
//
// Who closed: the post-call form's closer (team member id, or the typed name for teams
// without a roster). Who set: the setter's own tracked link (first touch utm_content =
// l-<link token>) or a post-set form naming the lead. Commission counts cash actually
// collected in the period (confirmed payment matches net of refunds) on those people.
// Pay periods are calendar months, UTC.

import { cleanId, normalizeEmail, parseJson, str } from "./common.js";
import { loadPipeline } from "./lead-people.js";
import { periodMetrics, salesPeriod, targetProgress } from "./sales-targets.js";

const DAY = 86400000;
export const ROLES = ["setter", "closer", "both"];

function monthPeriod(now, offset = 0) {
  const d = new Date(now);
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset + 1, 1));
  return { start: start.toISOString(), end: end.toISOString(), label: start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }) };
}

const pct = (value) => (value == null || !Number.isFinite(Number(value)) ? null : Math.min(100, Math.max(0, Number(value))));

export async function loadTeam(env, clientId, { now = Date.now() } = {}) {
  const client = cleanId(clientId, "");
  const [membersRes, formsRes, outcomesRes, payoutsRes, pipeline, targetsRes] = await Promise.all([
    env.DB.prepare("SELECT * FROM team_members WHERE client_id=? ORDER BY created_at").bind(client).all(),
    env.DB.prepare("SELECT * FROM team_forms WHERE client_id=? AND day>=? ORDER BY created_at DESC").bind(client, new Date(now - 62 * DAY).toISOString().slice(0,10)).all(),
    env.DB.prepare("SELECT * FROM lead_outcomes WHERE client_id=?").bind(client).all(),
    env.DB.prepare("SELECT * FROM commission_payouts WHERE client_id=?").bind(client).all(),
    loadPipeline(env, client, { now }),
    env.DB.prepare("SELECT * FROM sales_targets WHERE client_id=? ORDER BY member_id,metric,period").bind(client).all(),
  ]);
  const members = membersRes.results || [];
  const forms = formsRes.results || [];
  const outcomes = outcomesRes.results || [];
  const payouts = payoutsRes.results || [];
  const targets = targetsRes.results || [];
  const { rows } = pipeline;
  const origin = env.PAGES_ORIGIN || "https://pulsify-ai.com";

  // Payments per person (email), with dates, so commission counts cash in a period.
  const personByEmail = new Map();
  for (const p of pipeline.raw) for (const e of p.emails) personByEmail.set(e, p);
  const paymentsByPerson = new Map();
  for (const row of rows.payments) {
    const email = normalizeEmail(row.target_kind === "contact_email" ? row.target_id : row.target_kind === "workspace_record" ? row.record_email || row.customer_email : row.customer_email);
    const person = email ? personByEmail.get(email) : null;
    const key = person?.key || email;
    if (!key) continue;
    const net = Math.max(0, Number(row.amount_cents || 0) - Number(row.refunded_cents || 0));
    if (!net) continue;
    if (!paymentsByPerson.has(key)) paymentsByPerson.set(key, []);
    paymentsByPerson.get(key).push({ at: row.occurred_at, cents: net });
  }
  const keyOf = (email) => personByEmail.get(normalizeEmail(email))?.key || normalizeEmail(email);
  const cashIn = (key, from, to) => (paymentsByPerson.get(key) || []).filter((p) => p.at >= from && p.at < to).reduce((n, p) => n + p.cents, 0);

  const byName = (m) => String(m.name || "").trim().toLowerCase();
  const closedBy = new Map(); // member id -> Set(person key)
  const callsBy = new Map(); // member id -> outcomes in the last 30 days
  const since30 = new Date(now - 30 * DAY).toISOString();
  for (const o of outcomes) {
    const member = members.find((m) => (o.closer_id && o.closer_id === m.id) || (!o.closer_id && o.closer && byName(m) === String(o.closer).trim().toLowerCase()));
    if (!member) continue;
    if (o.result === "closed") {
      if (!closedBy.has(member.id)) closedBy.set(member.id, new Set());
      closedBy.get(member.id).add(keyOf(o.email));
    }
    if (String(o.call_at || o.created_at) >= since30) {
      if (!callsBy.has(member.id)) callsBy.set(member.id, []);
      callsBy.get(member.id).push(o);
    }
  }
  const setBy = new Map(); // member id -> Set(person key)
  for (const m of members) {
    const set = new Set();
    if (m.link_token) {
      for (const p of pipeline.raw) if (String(p.source?.utm?.utm_content || "") === `l-${m.link_token}`) set.add(p.key);
    }
    for (const f of forms) if (f.member_id === m.id && f.kind === "set" && f.lead_email) set.add(keyOf(f.lead_email));
    setBy.set(m.id, set);
  }

  const people = new Map(pipeline.raw.map((p) => [p.key, p]));
  const since7 = new Date(now - 7 * DAY).toISOString().slice(0, 10);
  const memberRows = members.map((m) => {
    const calls = callsBy.get(m.id) || [];
    const showed = calls.filter((o) => o.attended === "showed").length;
    const closed = calls.filter((o) => o.result === "closed").length;
    const sets = [...(setBy.get(m.id) || [])];
    const setRecent = sets.map((k) => people.get(k)).filter((p) => p && String(p.stages.booked || p.first_at || "") >= since30);
    const cash = [...(closedBy.get(m.id) || new Set())].reduce((n, k) => n + cashIn(k, since30, "9999"), 0);
    return {
      id: m.id,
      name: m.name,
      role: m.role,
      email: m.email,
      commission_pct: m.commission_pct,
      setter_pct: m.setter_pct,
      active: Boolean(m.active),
      link: m.link_token ? { token: m.link_token, url: `${origin}/a/${m.link_token}` } : null,
      stats: {
        calls: calls.length,
        showed,
        closed,
        close_rate: showed ? closed / showed : null,
        sets: setRecent.length,
        set_showed: setRecent.filter((p) => p.stages.showed || ["closed", "not_closed", "follow_up", "showed"].includes(p.call?.state)).length,
        cash_cents: cash,
        eod_days_7: new Set(forms.filter((f) => f.member_id === m.id && f.kind === "eod" && f.day >= since7).map((f) => f.day)).size,
      },
    };
  });

  const commissionsFor = (period) =>
    members
      .filter((m) => m.active && (m.commission_pct != null || m.setter_pct != null))
      .map((m) => {
        let owed = 0;
        let deals = 0;
        if (m.commission_pct != null) {
          for (const k of closedBy.get(m.id) || []) {
            const cash = cashIn(k, period.start, period.end);
            if (cash) { owed += (cash * m.commission_pct) / 100; deals += 1; }
          }
        }
        if (m.setter_pct != null) {
          for (const k of setBy.get(m.id) || []) {
            const cash = cashIn(k, period.start, period.end);
            if (cash) { owed += (cash * m.setter_pct) / 100; deals += 1; }
          }
        }
        const paid = payouts.filter((p) => p.member_id === m.id && p.period_start === period.start);
        return {
          member_id: m.id,
          name: m.name,
          owed_cents: Math.round(owed),
          paid_cents: paid.reduce((n, p) => n + Number(p.amount_cents || 0), 0),
          deals,
          period_start: period.start,
          period_end: period.end,
          paid_at: paid[0]?.paid_at || null,
        };
      });
  const current = monthPeriod(now);
  const previous = monthPeriod(now, -1);

  // Post-call forms owed: booked calls more than a day past with no form.
  const filed = new Set(outcomes.map((o) => o.booking_ref).filter(Boolean));
  const dayAgo = new Date(now - DAY).toISOString();
  const missing = [];
  const seen = new Set();
  for (const t of rows.touches) {
    if (t.kind !== "booking") continue;
    const ref = String(t.external_id || "").replace(/#canceled$/, "");
    if (/#canceled$/.test(String(t.external_id || "")) || seen.has(ref)) continue;
    seen.add(ref);
    const payload = parseJson(t.payload_json, {});
    const at = payload.starts_at || t.ts;
    const cancelled = rows.touches.some((x) => x.kind === "booking" && x.external_id === `${ref}#canceled`);
    if (!cancelled && at && at < dayAgo && !filed.has(ref)) missing.push(at);
  }
  missing.sort();

  // Flags: a sale logged on a call with no payment after a week; a payment with no closer.
  const flags = [];
  const weekAgo = new Date(now - 7 * DAY).toISOString();
  for (const o of outcomes) {
    if (o.result !== "closed") continue;
    const at = o.call_at || o.created_at;
    if (at > weekAgo) continue;
    if (!(paymentsByPerson.get(keyOf(o.email)) || []).length) flags.push({ kind: "no_payment", email: o.email, name: personByEmail.get(normalizeEmail(o.email))?.name || null, deal_cents: o.deal_cents, at });
  }
  if (members.some((m) => m.active)) {
    const closedPeople = new Set(outcomes.filter((o) => o.result === "closed").map((o) => keyOf(o.email)));
    const since60 = new Date(now - 60 * DAY).toISOString();
    for (const [key, list] of paymentsByPerson) {
      const recent = list.filter((p) => p.at >= since60);
      if (!recent.length || closedPeople.has(key)) continue;
      const person = people.get(key);
      flags.push({ kind: "no_closer", email: person?.email || key, name: person?.name || null, cash_cents: recent.reduce((n, p) => n + p.cents, 0), at: recent[0].at });
    }
  }

  const inPeriod = (at, p) => at >= p.start && at < p.end && at <= new Date(now).toISOString();
  const metricsFor = (memberId, period) => {
    const p = salesPeriod(period, now);
    const member = members.find(m => m.id === memberId);
    const own = outcomes.filter(o => !memberId || o.closer_id === memberId || (!o.closer_id && String(o.closer || '').trim().toLowerCase() === byName(member)));
    const calls = own.filter(o => inPeriod(o.call_at || o.created_at, p));
    const eods = forms.filter(f => (!memberId || f.member_id === memberId) && f.day >= p.start.slice(0,10) && f.day < p.end.slice(0,10) && f.day <= new Date(now).toISOString().slice(0,10));
    const keys = memberId ? closedBy.get(memberId) || new Set() : new Set(paymentsByPerson.keys());
    const cash = [...keys].reduce((n,k) => n + cashIn(k,p.start,new Date(Math.min(now + 1,Date.parse(p.end))).toISOString()),0);
    return periodMetrics(calls,eods,cash);
  };
  for (const row of memberRows) {
    row.period_stats = { week: metricsFor(row.id,'week'), month: metricsFor(row.id,'month') };
    row.progress = targets.filter(t => t.member_id === row.id).map(t => targetProgress(t,row.period_stats[t.period][t.metric],now));
  }
  const teamMetrics = { week: metricsFor(null,'week'), month: metricsFor(null,'month') };
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  return {
    ok: true,
    client,
    currency: String(rows.payments.find((p) => p.currency)?.currency || "USD").toUpperCase(),
    period: current,
    members: memberRows,
    targets,
    target_progress: targets.filter(t => !t.member_id).map(t => targetProgress(t,teamMetrics[t.period][t.metric],now)),
    period_stats: teamMetrics,
    forms: forms.slice(0, 60).map((f) => ({ id: f.id, member_id: f.member_id, member_name: nameOf.get(f.member_id) || "Removed rep", kind: f.kind, lead_email: f.lead_email, data: parseJson(f.data_json, {}), day: f.day, created_at: f.created_at })),
    compliance: { calls_without_form: missing.length, oldest_at: missing[0] || null },
    commissions: commissionsFor(current),
    previous_commissions: commissionsFor(previous).filter((c) => c.owed_cents || c.paid_cents),
    flags: flags.slice(0, 20),
  };
}

function newId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function upsertMember(env, client, input, origin, now = Date.now()) {
  const name = str(input?.name).slice(0, 80);
  if (!name) return { error: "Add their name." };
  const role = ROLES.includes(input?.role) ? input.role : null;
  if (!role) return { error: "Choose setter, closer or both." };
  const email = input?.email ? normalizeEmail(input.email) : null;
  if (input?.email && !email) return { error: "That email doesn't look right." };
  const at = new Date(now).toISOString();
  const active = input?.active === false ? 0 : 1;
  const closePct = role === "setter" ? null : pct(input?.commission_pct);
  const setPct = role === "closer" ? null : pct(input?.setter_pct);
  if (input?.id) {
    const existing = await env.DB.prepare("SELECT * FROM team_members WHERE id=? AND client_id=?").bind(str(input.id), client).first();
    if (!existing) return { error: "That rep isn't in this workspace.", status: 404 };
    let token = existing.link_token;
    if (!token && role !== "closer" && active) token = await makeLink(env, client, name, origin, at);
    await env.DB.prepare(
      "UPDATE team_members SET name=?, role=?, email=?, commission_pct=?, setter_pct=?, link_token=?, active=?, updated_at=? WHERE id=? AND client_id=?",
    ).bind(name, role, email, closePct, setPct, token, active, at, existing.id, client).run();
    return { id: existing.id };
  }
  const id = newId("rep");
  const token = role !== "closer" ? await makeLink(env, client, name, origin, at) : null;
  await env.DB.prepare(
    `INSERT INTO team_members (id, client_id, name, role, email, commission_pct, setter_pct, link_token, active, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,1,?,?)`,
  ).bind(id, client, name, role, email, closePct, setPct, token, at, at).run();
  return { id };
}

// A setter's own booking link: a tracked link to the client's page, so every lead it brings is theirs.
async function makeLink(env, client, name, origin, at) {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const token = [...bytes].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);
  await env.DB.prepare(
    `INSERT INTO asset_links (token, client, label, target_url, created_at, archived, kind, source, placement)
     VALUES (?,?,?,?,?,0,'link','other','dm')`,
  ).bind(token, client, `${name}'s booking link`, `${origin}/${client}`, at).run();
  return token;
}

export async function fileForm(env, client, input, now = Date.now()) {
  const member = await env.DB.prepare("SELECT id FROM team_members WHERE id=? AND client_id=?").bind(str(input?.member_id), client).first();
  if (!member) return { error: "That rep isn't in this workspace.", status: 404 };
  const kind = input?.kind === "eod" || input?.kind === "set" ? input.kind : null;
  if (!kind) return { error: "Choose the form." };
  const lead = kind === "set" ? normalizeEmail(input?.lead_email) : null;
  if (kind === "set" && !lead) return { error: "Add the lead's email." };
  const raw = input?.data && typeof input.data === "object" ? input.data : {};
  const data = {};
  for (const key of ["dials", "conversations", "sets"]) {
    if (raw[key] == null || raw[key] === "") continue;
    const n = Math.round(Number(raw[key]));
    if (!Number.isFinite(n) || n < 0 || n > 100000) return { error: "Numbers must be zero or more." };
    data[key] = n;
  }
  if (raw.notes) data.notes = str(raw.notes).slice(0, 2000);
  const at = new Date(now).toISOString();
  await env.DB.prepare(
    "INSERT INTO team_forms (client_id, member_id, kind, lead_email, data_json, day, created_at) VALUES (?,?,?,?,?,?,?)",
  ).bind(client, member.id, kind, lead, JSON.stringify(data), at.slice(0, 10), at).run();
  return { ok: true };
}

export async function markPaid(env, client, input, actor, now = Date.now()) {
  const member = await env.DB.prepare("SELECT id FROM team_members WHERE id=? AND client_id=?").bind(str(input?.member_id), client).first();
  if (!member) return { error: "That rep isn't in this workspace.", status: 404 };
  const start = str(input?.period_start);
  const end = str(input?.period_end);
  if (!Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || end <= start) return { error: "Choose a pay period." };
  const cents = Math.round(Number(input?.amount_cents));
  if (!Number.isFinite(cents) || cents < 0) return { error: "Enter the amount paid." };
  await env.DB.prepare(
    `INSERT INTO commission_payouts (client_id, member_id, period_start, period_end, amount_cents, paid_at, paid_by) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(client_id, member_id, period_start) DO UPDATE SET amount_cents=excluded.amount_cents, paid_at=excluded.paid_at, paid_by=excluded.paid_by`,
  ).bind(client, member.id, start, end, cents, new Date(now).toISOString(), actor || "client").run();
  return { ok: true };
}
