// Booked calls for the Calls tab (InfoOS build): every booking in a month with how it
// went, the upcoming ones with a confirmed flag and the call link, and show and close
// rates from the post-call forms. One call per booking; a cancellation row cancels the
// booking it names; a post-call form for the booking says what happened.

import { normalizeEmail, parseJson } from "./common.js";
import { loadPipeline } from "./lead-people.js";

const DAY = 86400000;

export async function loadCalls(env, clientId, { month = null, now = Date.now() } = {}) {
  const pipeline = await loadPipeline(env, clientId, { now });
  const { rows } = pipeline;
  const personOf = new Map();
  for (const person of pipeline.raw) for (const email of person.emails) personOf.set(email, person);
  const scoreOf = new Map(pipeline.people.map((p) => [p.key, p]));
  const outcomes = new Map(rows.outcomes.filter((o) => o.booking_ref).map((o) => [o.booking_ref, o]));
  const confirmed = new Set(rows.flags.map((f) => f.booking_ref));

  const byRef = new Map();
  for (const t of rows.touches) {
    if (t.kind !== "booking") continue;
    const payload = parseJson(t.payload_json, {});
    const cancelRow = /#canceled$/.test(String(t.external_id || "")) || /cancel/i.test(String(payload.status || ""));
    const ref = String(t.external_id || "").replace(/#canceled$/, "");
    const call = byRef.get(ref) || { booking_ref: ref, email: t.email, name: t.name, call_at: payload.starts_at || t.ts, booked_at: null, join_url: null, cancelled: false };
    if (cancelRow) call.cancelled = true;
    else {
      call.booked_at = payload.booked_at || call.booked_at;
      call.join_url = payload.join_url || call.join_url;
      call.call_at = payload.starts_at || t.ts || call.call_at;
      call.name = t.name || call.name;
    }
    byRef.set(ref, call);
  }
  // Calls logged by hand on the post-call form, with no booking behind them.
  for (const o of rows.outcomes) {
    if (o.booking_ref && byRef.has(o.booking_ref)) continue;
    const ref = o.booking_ref || `manual:${o.id}`;
    byRef.set(ref, { booking_ref: ref, email: normalizeEmail(o.email), name: null, call_at: o.call_at || o.created_at, booked_at: null, join_url: null, cancelled: false, manual: true });
  }

  const calls = [];
  for (const call of byRef.values()) {
    const outcome = outcomes.get(call.booking_ref) || (call.manual ? rows.outcomes.find((o) => `manual:${o.id}` === call.booking_ref) : null);
    const start = Date.parse(call.call_at || "");
    let state;
    if (outcome?.attended === "no_show") state = "no_show";
    else if (outcome?.attended === "cancelled" || (call.cancelled && !outcome)) state = "cancelled";
    else if (outcome?.attended === "rescheduled") state = "rescheduled";
    else if (outcome?.result === "closed") state = "closed";
    else if (outcome?.result === "not_closed") state = "not_closed";
    else if (outcome?.result === "follow_up") state = "follow_up";
    else if (outcome?.result === "unqualified") state = "unqualified";
    else if (outcome?.attended === "showed") state = "showed";
    else if (Number.isFinite(start) && start > now) state = "upcoming";
    else state = "awaiting";
    const person = personOf.get(call.email);
    const summary = person ? scoreOf.get(person.key) : null;
    calls.push({
      booking_ref: call.booking_ref,
      key: person?.key || call.email,
      email: call.email,
      name: person?.name || call.name || null,
      call_at: call.call_at,
      booked_at: call.booked_at,
      join_url: call.join_url,
      state,
      confirmed: confirmed.has(call.booking_ref),
      score: summary?.score ?? null,
      band: summary?.band ?? null,
      deal_cents: outcome?.deal_cents ?? null,
      pre_sold: outcome?.pre_sold ?? null,
      outcome_id: outcome?.id ?? null,
    });
  }
  calls.sort((a, b) => String(a.call_at).localeCompare(String(b.call_at)));

  const monthKey = /^\d{4}-\d{2}$/.test(month || "") ? month : new Date(now).toISOString().slice(0, 7);
  const inMonth = calls.filter((c) => String(c.call_at || "").startsWith(monthKey));
  const upcoming = calls.filter((c) => c.state === "upcoming" && Date.parse(c.call_at) <= now + 14 * DAY);
  const needsForm = calls.filter((c) => c.state === "awaiting");
  const recent = calls.filter((c) => Date.parse(c.call_at) > now - 30 * DAY && Date.parse(c.call_at) <= now);
  const held = recent.filter((c) => ["showed", "closed", "not_closed", "follow_up", "unqualified"].includes(c.state)).length;
  const missed = recent.filter((c) => c.state === "no_show").length;
  const closed = recent.filter((c) => c.state === "closed").length;
  return {
    client: pipeline.client,
    month: monthKey,
    calls: inMonth,
    upcoming,
    needs_form: needsForm,
    stats: {
      upcoming: upcoming.length,
      confirmed: upcoming.filter((c) => c.confirmed).length,
      needs_form: needsForm.length,
      show_rate: held + missed >= 1 ? held / (held + missed) : null,
      close_rate: held >= 1 ? closed / held : null,
      held_30d: held,
    },
  };
}
