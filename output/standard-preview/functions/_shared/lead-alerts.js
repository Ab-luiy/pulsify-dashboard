// Hot-lead alert (InfoOS brief item 3): when a known lead's score crosses into Hot and
// they still need a call, ping the client's bell and the operator's with the reasons and
// the next move. Runs after opt-ins, applications, page-leave engagement and video
// milestones, never on every video tick. One alert per person per week.
//
// Scores with the model the nightly run stored, so it matches the Leads screen; a
// workspace with no stored model yet scores with the starting weights.

import { cleanId, normalizeEmail } from "./common.js";
import { assemble, clientRows, listVisitors, pipelineStatus, presentSteps, storedModel, visitorAggregates } from "./lead-people.js";
import { nextStep, scorePerson, startingModel, withMeans } from "./lead-score.js";
import { notify } from "./notifications.js";

// Worth a call right now: nobody has booked, bought or ruled them out.
const CALLABLE = new Set(["applied", "started", "opted_in", "visitor", "no_show", "cancelled", "follow_up", "not_closed"]);

const REASON_TEXT = {
  vsl: (r) => `watched ${Math.round((r.value || 0) * 100)}% of the video`,
  vsl_done: () => "finished the video",
  active: () => "spent real time on the page",
  returned: () => "came back on different days",
  proof: () => "read the proof section",
  scroll: () => "scrolled most of the page",
  cta: () => "clicked the button",
  youtube: () => "came from your YouTube",
  multi_video: () => "came through several of your videos",
  phone: () => "left a phone number",
  qualified: () => "answers qualify",
};

export async function checkHotLead(env, clientId, { email = null, visitorId = null } = {}, now = Date.now()) {
  if (!env?.DB) return null;
  const client = cleanId(clientId, "");
  if (!client) return null;
  let who = normalizeEmail(email);
  if (!who && visitorId) {
    // Most page leaves are anonymous: one cheap lookup before loading anything else.
    const known = await env.DB.prepare(
      `SELECT lower(email) AS email FROM leads WHERE client=? AND visitor_id=? AND email IS NOT NULL AND email<>''
       UNION SELECT lower(email) FROM page_events WHERE client=? AND visitor_id=? AND email IS NOT NULL AND email<>'' LIMIT 1`,
    ).bind(client, visitorId, client, visitorId).first();
    who = known?.email || null;
  }
  if (!who) return null; // anonymous visitors can't be called
  const rows = await clientRows(env, client, now);
  const ids = [...new Set(rows.edges.filter((e) => e.email === who).map((e) => e.visitor_id))].slice(0, 90);
  const byVisitor = ids.length ? await visitorAggregates(env, client, listVisitors(ids)) : new Map();
  const person = assemble(client, byVisitor, rows, now, {}).find((p) => p.emails.includes(who));
  if (!person) return null;
  const status = pipelineStatus(person);
  if (!CALLABLE.has(status)) return null;
  const present = rows.clientModel?.present || presentSteps(rows, [person]);
  const model = storedModel(rows, present, now) || rows.clientModel || withMeans(startingModel(present, rows.pooledModel), []);
  const scored = scorePerson(person, model, now);
  if (scored.band !== "hot") return null;
  const next = nextStep(person, scored, now);
  const why = scored.reasons.filter((r) => r.points > 0 && REASON_TEXT[r.key]).slice(0, 3).map((r) => REASON_TEXT[r.key](r));
  const name = person.name || person.email;
  const week = Math.floor(now / (7 * 86400000));
  const body = [why.length ? `${capitalize(why.join(", "))}.` : "", next.text].filter(Boolean).join(" ");
  const entity = { client, email: person.email, key: person.key, score: scored.score };
  await notify(env, {
    scope: "client",
    clientId: client,
    kind: "lead.hot",
    severity: "success",
    title: `Hot lead: ${name} (${scored.score})`,
    body,
    link: `leads?lead=${encodeURIComponent(person.key)}`,
    entity,
    dedupeKey: `hot:client:${client}:${person.key}:${week}`,
  });
  await notify(env, {
    scope: "operator",
    clientId: client,
    kind: "lead.hot",
    severity: "success",
    title: `Hot lead for ${client}: ${name} (${scored.score})`,
    body,
    link: "leads",
    entity,
    dedupeKey: `hot:operator:${client}:${person.key}:${week}`,
    outside: false,
  });
  return { score: scored.score, key: person.key };
}

const capitalize = (text) => (text ? text[0].toUpperCase() + text.slice(1) : text);
