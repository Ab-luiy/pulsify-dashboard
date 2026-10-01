// Lead score, per-lead pipeline, visitors feed, post-call form, hot-lead alert and the
// nightly refit (InfoOS build). Real SQLite, real migrations.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { sha256Hex } from "../functions/_shared/common.js";
import {
  BEHAVIOUR, bandFor, fitModel, logit, pointsFromLogit, scorePerson, startingModel, suspectEmail, withMeans,
} from "../functions/_shared/lead-score.js";
import { loadPerson, loadPipeline, loadVisitors, sourceFrom, deviceFrom } from "../functions/_shared/lead-people.js";
import { checkHotLead } from "../functions/_shared/lead-alerts.js";
import { refreshLeadModels } from "../functions/_shared/lead-models.js";
import { onRequestGet as pipelineGet } from "../functions/api/lead-pipeline.js";
import { onRequestGet as personGet } from "../functions/api/lead-person.js";
import { onRequestGet as visitorsGet } from "../functions/api/lead-visitors.js";
import { onRequestPost as outcomePost, onRequestDelete as outcomeDelete } from "../functions/api/lead-outcomes.js";
import { onRequestPost as flagPost } from "../functions/api/call-flags.js";
import { normalizeCalBooking, normalizeCalendlyBooking } from "../functions/_shared/hooks.js";
import { onRequestGet as callsGet } from "../functions/api/lead-calls.js";
import { onRequestGet as analyticsGet } from "../functions/api/funnel-analytics.js";
import { onRequestGet as linksGet, onRequestPost as linksPost, onRequestDelete as linksDelete } from "../functions/api/tracked-links.js";
import { onRequestGet as qualifyGet, onRequestPut as qualifyPut } from "../functions/api/lead-qualify.js";
import { onRequestGet as pagesGet, onRequestPost as pagesPost } from "../functions/api/pages.js";
import { onRequestGet as linkRedirect } from "../functions/a/[token].js";
import { onRequestGet as askGet, onRequestPost as askPostHandler } from "../functions/api/ask.js";
import { answerQuestion, intentOf } from "../functions/_shared/ask.js";
import { onRequestGet as reportGet, onRequestPut as reportPut } from "../functions/api/monthly-report.js";
import { onRequestGet as teamGet, onRequestPost as teamPost } from "../functions/api/team.js";
import { callDayNudges } from "../functions/_shared/call-day.js";
import { integrationNotes } from "../functions/_shared/integration-notes.js";

const sql = new DatabaseSync(":memory:");
const mig = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");

sql.exec(`CREATE TABLE client_config(client TEXT PRIMARY KEY, client_name TEXT, status TEXT, portal_token_hash TEXT,
  wistia_media_id TEXT, typeform_url TEXT, typeform_webhook_secret TEXT, kit_api_key TEXT, kit_tag_id TEXT,
  allowed_origin TEXT, prospect_email TEXT, acquisition_token TEXT, updated_at TEXT)`);
sql.exec("CREATE TABLE client_sessions(token_hash TEXT, client_id TEXT, expires_at TEXT, created_at TEXT)");
sql.exec(`CREATE TABLE leads(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, email TEXT, name TEXT, revenue TEXT,
  situation TEXT, applied_at TEXT, status TEXT DEFAULT 'new', visitor_id TEXT, session_id TEXT, page_id TEXT,
  source TEXT DEFAULT 'typeform', response_id TEXT, phone TEXT, answers_json TEXT, kit_status TEXT, utm_json TEXT, updated_at TEXT)`);
sql.exec(`CREATE TABLE watch_events(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, email TEXT, media_id TEXT,
  event TEXT, percent INTEGER, at TEXT, visitor_id TEXT, session_id TEXT, page_id TEXT, wistia_visitor_key TEXT,
  position_seconds REAL, duration_seconds REAL, watch_seconds REAL DEFAULT 0, unique_seconds REAL)`);
sql.exec(`CREATE TABLE page_events(id INTEGER PRIMARY KEY AUTOINCREMENT, client TEXT NOT NULL, visitor_id TEXT, session_id TEXT,
  page_id TEXT, event TEXT NOT NULL, email TEXT, path TEXT, referrer TEXT, utm_json TEXT, metadata_json TEXT, at TEXT NOT NULL)`);
sql.exec(mig("0008_integrations_hub.sql").replace(/ALTER TABLE client_config ADD COLUMN status[^;]*;/, ""));
sql.exec(mig("0010_view_tracking.sql"));
sql.exec(mig("0021_workspace_records.sql"));
sql.exec(mig("0025_data_spine.sql"));
sql.exec(mig("0026_workspace_preferences.sql"));
sql.exec(mig("0027_revenue_automation.sql"));
sql.exec(mig("0028_onboarding.sql"));
sql.exec(mig("0031_notifications.sql"));
sql.exec(mig("0043_cash_by_video.sql"));
sql.exec(mig("0045_lead_score.sql"));
sql.exec("ALTER TABLE client_config ADD COLUMN template_variant TEXT DEFAULT 'canonical'; ALTER TABLE client_config ADD COLUMN page_content_json TEXT; ALTER TABLE client_config ADD COLUMN page_active INTEGER DEFAULT 1; ALTER TABLE client_config ADD COLUMN proof_images_json TEXT;");
sql.exec(mig("0046_links_team.sql"));
sql.exec(mig("0007_delivery_failures.sql"));

const env = {
  DB: {
    prepare(query) {
      let args = [];
      const p = {
        bind(...values) { args = values; return p; },
        async first() { return sql.prepare(query).get(...args) || null; },
        async all() { return { results: sql.prepare(query).all(...args) }; },
        async run() { const r = sql.prepare(query).run(...args); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; },
      };
      return p;
    },
    async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; },
  },
};

const DAY = 86400000;
const NOW = Date.now();
const ago = (days, hours = 0) => new Date(NOW - days * DAY - hours * 3600000).toISOString();
const ahead = (days) => new Date(NOW + days * DAY).toISOString();

const addClient = async (id, token, media = "abc123") => sql.prepare("INSERT INTO client_config(client,client_name,status,portal_token_hash,wistia_media_id) VALUES(?,?,?,?,?)")
  .run(id, id, "client", token ? await sha256Hex(token) : null, media);
const page = (client, visitor, event, at, extra = {}) => sql.prepare(
  `INSERT INTO page_events(client,visitor_id,session_id,page_id,event,email,referrer,utm_json,utm_source,utm_content,metadata_json,at,country,city,user_agent,lat,lng)
   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
).run(client, visitor, extra.session || `${visitor}-s`, "main", event, extra.email || null, extra.referrer || null, JSON.stringify(extra.utm || {}),
  extra.utm?.utm_source || null, extra.utm?.utm_content || null, extra.meta ? JSON.stringify(extra.meta) : null, at,
  extra.country || "US", extra.city || "Austin", extra.ua || "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1", extra.lat ?? null, extra.lng ?? null);
const watch = (client, visitor, event, percent, at, email = null) => sql.prepare(
  "INSERT INTO watch_events(client,visitor_id,email,event,percent,at,duration_seconds) VALUES(?,?,?,?,?,?,?)",
).run(client, visitor, email, event, percent, at, 600);
const lead = (client, email, visitor, at, extra = {}) => sql.prepare(
  "INSERT INTO leads(client,email,name,phone,visitor_id,source,answers_json,applied_at) VALUES(?,?,?,?,?,?,?,?)",
).run(client, email, extra.name || null, extra.phone || null, visitor, "typeform", JSON.stringify(extra.answers || {}), at);
const touch = (client, email, kind, at, externalId, payload = {}, name = null) => sql.prepare(
  "INSERT INTO pipeline_touches(client_id,contact_email,contact_name,kind,ts,source,external_id,payload_json) VALUES(?,?,?,?,?,?,?,?)",
).run(client, email, name, kind, at, "test", externalId, JSON.stringify(payload));
let ref = 0;
const pay = (client, email, cents, at) => {
  ref += 1;
  const r = sql.prepare(
    `INSERT INTO payments(client,amount_cents,currency,rail,reference,occurred_at,recorded_by,created_at,customer_email,kind,refunded_cents)
     VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(client, cents, "usd", "stripe", `r${ref}`, at, "test", at, email, "charge", 0);
  sql.prepare(
    "INSERT INTO payment_matches(payment_id,client_id,target_kind,target_id,confidence,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
  ).run(Number(r.lastInsertRowid), client, "contact_email", email, 1, "confirmed", at, at);
};
const engage = (client, visitor, at, meta) => page(client, visitor, "engagement", at, { meta });

// ---------- the scale ----------
assert.equal(Math.round(pointsFromLogit(logit(0.05))), 50, "50 points is a 1 in 20 chance");
const odds = (p) => p / (1 - p);
const pAt = (points) => { const o = odds(0.05) * 2 ** ((points - 50) / 10); return o / (1 + o); };
assert.equal(Math.round(pointsFromLogit(logit(pAt(60)))), 60, "every 10 points doubles the odds");
assert.equal(bandFor(70), "hot");
assert.equal(bandFor(55), "warm");
assert.equal(bandFor(40), "cool");
assert.equal(bandFor(10), "cold");

// ---------- email checks ----------
assert.equal(suspectEmail("jane@gmail.com"), false);
assert.equal(suspectEmail("jane@gmial.com"), true, "typo'd provider");
assert.equal(suspectEmail("x@mailinator.com"), true, "throwaway");
assert.equal(suspectEmail("test@acme.com"), true, "placeholder name");
assert.equal(suspectEmail("not-an-email"), true);

// ---------- sources and devices ----------
assert.equal(sourceFrom({ utm_source: "youtube" }), "youtube");
assert.equal(sourceFrom({ referrer: "https://l.instagram.com/?u=x" }), "instagram");
assert.equal(sourceFrom({}), "direct");
assert.deepEqual(deviceFrom("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Instagram 300"), { device: "iPhone", browser: "Instagram app" });

// ---------- booking webhooks: a cancellation is its own event ----------
const scheduled = { start_time: "2026-10-05T15:00:00Z", location: { join_url: "https://zoom.example/j/1" } };
const created = normalizeCalendlyBooking({ event: "invitee.created", payload: { event: "https://api.calendly.com/scheduled_events/E1", email: "a@x.com", created_at: "2026-10-01T10:00:00Z", scheduled_event: scheduled } });
const canceled = normalizeCalendlyBooking({ event: "invitee.canceled", payload: { event: "https://api.calendly.com/scheduled_events/E1", email: "a@x.com", status: "canceled", updated_at: "2026-10-02T10:00:00Z", scheduled_event: scheduled } });
assert.equal(created.event_id, "https://api.calendly.com/scheduled_events/E1");
assert.equal(canceled.event_id, "https://api.calendly.com/scheduled_events/E1#canceled", "a cancellation is never dropped as a duplicate");
assert.equal(created.join_url, "https://zoom.example/j/1");
assert.equal(created.booked_at, "2026-10-01T10:00:00Z");
const calCanceled = normalizeCalBooking({ triggerEvent: "BOOKING_CANCELLED", payload: { uid: "u1", startTime: "2026-10-05T15:00:00Z", attendees: [{ email: "b@x.com" }] } });
assert.equal(calCanceled.event_id, "u1#canceled");
assert.equal(calCanceled.email, "b@x.com");

// ---------- a funnel ----------
await addClient("acme", "token-acme");
await addClient("other", "token-other");

// Ann: came from a YouTube video, watched 95%, came back two days later, applied, booked a call next week.
page("acme", "ann-1", "page_view", ago(3), { utm: { utm_source: "youtube", utm_content: "vid111" }, lat: 30.27, lng: -97.74 });
engage("acme", "ann-1", ago(3), { active_seconds: 420, max_scroll: 90, full_scrolls: 1, proof_seconds: 40, load_id: "a1" });
watch("acme", "ann-1", "play", 1, ago(3));
watch("acme", "ann-1", "percent_90", 95, ago(3));
page("acme", "ann-2", "page_view", ago(1), { session: "ann-2-s", email: "ann@example.com" }); // her laptop, same email
engage("acme", "ann-2", ago(1), { active_seconds: 120, max_scroll: 60, load_id: "a2" });
lead("acme", "ann@example.com", "ann-1", ago(1), { name: "Ann Lee", phone: "+15125550100", answers: { budget: "Over $5k" } });
touch("acme", "ann@example.com", "application", ago(1), "app-ann");
touch("acme", "ann@example.com", "booking", ahead(4), "book-ann", { starts_at: ahead(4), booked_at: ago(1), join_url: "https://meet.example/ann" });
sql.prepare("INSERT INTO yt_videos(client_id,video_id,title,synced_at) VALUES(?,?,?,?)").run("acme", "vid111", "How I find trades", ago(10));

// Ben: applied yesterday, barely looked at the page, hasn't booked.
page("acme", "ben-1", "page_view", ago(1));
engage("acme", "ben-1", ago(1), { active_seconds: 20, max_scroll: 10, load_id: "b1" });
lead("acme", "ben@example.com", "ben-1", ago(1), { name: "Ben", answers: { budget: "Under $1k" } });
touch("acme", "ben@example.com", "application", ago(1), "app-ben");

// Cara: booked, then cancelled.
page("acme", "cara-1", "page_view", ago(8));
lead("acme", "cara@example.com", "cara-1", ago(8));
touch("acme", "cara@example.com", "application", ago(8), "app-cara");
touch("acme", "cara@example.com", "booking", ago(2), "book-cara", { starts_at: ago(2), booked_at: ago(7) });
touch("acme", "cara@example.com", "booking", ago(2), "book-cara#canceled", { starts_at: ago(2), status: "canceled", cancelled_at: ago(3) });

// Dan: bought, paying in instalments on a $6,000 deal.
page("acme", "dan-1", "page_view", ago(20));
lead("acme", "dan@example.com", "dan-1", ago(20));
touch("acme", "dan@example.com", "application", ago(20), "app-dan");
touch("acme", "dan@example.com", "booking", ago(15), "book-dan", { starts_at: ago(15), booked_at: ago(19) });
pay("acme", "dan@example.com", 200000, ago(14));

// Eve: opted in 40 days ago and went quiet.
page("acme", "eve-1", "page_view", ago(40));
touch("acme", "eve@example.com", "optin", ago(40), "optin-eve");
page("acme", "eve-1", "optin", ago(40), { email: "eve@example.com" });

// Anonymous visitors, plus one in the other workspace.
for (let i = 0; i < 5; i += 1) page("acme", `anon-${i}`, "page_view", ago(i < 2 ? 0 : 2, 2), { country: "GB", city: "London" });
page("acme", "anon-live", "page_view", new Date(NOW - 60000).toISOString());
page("other", "o-1", "page_view", ago(1), { email: "ann@example.com" });

// ---------- the pipeline ----------
const pipeline = await loadPipeline(env, "acme", { now: NOW });
const by = (email) => pipeline.people.find((p) => p.email === email);
assert.deepEqual(pipeline.present, ["visit", "optin", "applied", "booked"], "this funnel's steps");
assert.equal(pipeline.people.length, 5, "five known people, anonymous visitors stay out of the pipeline");

const ann = by("ann@example.com");
assert.equal(ann.status, "booked");
assert.equal(ann.name, "Ann Lee");
assert.equal(ann.source.video.title, "How I find trades", "first touch is her YouTube video");
assert.equal(ann.signals.days, 2, "two browsers, two different days");
assert.equal(ann.signals.active_seconds, 540, "time adds up across page loads and browsers");
assert.equal(ann.call.state, "upcoming");
assert.equal(ann.call.join_url, "https://meet.example/ann");
assert.equal(ann.band, "hot", `a pre-sold booked lead is hot (score ${ann.score})`);
assert.ok(ann.next.text.includes("Call on") || ann.next.text.includes("24 hours"));
const annSteps = Object.fromEntries(ann.steps.map((s) => [s.key, s]));
assert.ok(annSteps.visit.at && annSteps.watched.at && annSteps.applied.at && annSteps.booked.at);
assert.equal(annSteps.showed.upcoming, ann.call.call_at, "the call is the next step");
assert.equal(annSteps.bought.at, null);

const ben = by("ben@example.com");
assert.equal(ben.status, "applied");
assert.ok(ben.score < ann.score, "barely engaged applicant scores under a pre-sold booked lead");
assert.match(ben.next.text, /hasn't booked/);

const cara = by("cara@example.com");
assert.equal(cara.status, "cancelled", "a cancellation row cancels the booking it names");
assert.match(cara.next.text, /Rebook/);

const dan = by("dan@example.com");
assert.equal(dan.status, "customer");
assert.equal(dan.score, null, "buyers are customers, not scored");
assert.equal(dan.money.collected_cents, 200000);

const eve = by("eve@example.com");
assert.equal(eve.status, "opted_in");
assert.ok(["cold", "cool"].includes(eve.band), "quiet for 40 days reads cold");
assert.ok(eve.reasons.some((r) => r.key === "idle"), "going quiet costs points");

// Reasons add up exactly to the score.
const annFull = await loadPerson(env, "acme", "ann@example.com", { now: NOW });
const total = annFull.base.points + annFull.reasons.reduce((sum, r) => sum + r.points, 0);
assert.equal(annFull.clamped ? Math.min(99, Math.max(1, total)) : total, annFull.score, "the points add up to the score");
assert.equal(annFull.base.basis, "benchmark", "booked step rate starts at the documented benchmark");
assert.ok(annFull.journey.some((e) => e.kind === "page_view" && e.video === "How I find trades"));
assert.ok(annFull.journey.some((e) => e.kind === "booking" && e.call_at));
assert.ok(annFull.journey.some((e) => e.kind === "watch" && e.percent === 95));
assert.deepEqual(annFull.answers, { budget: "Over $5k" });
assert.equal(annFull.place.device, "iPhone");

// Same person by browser id.
const annByBrowser = await loadPerson(env, "acme", "v:ann-1", { now: NOW });
assert.equal(annByBrowser.email, "ann@example.com");
assert.equal(await loadPerson(env, "other", "ann@example.com", { now: NOW }).then((p) => p?.status), "visitor", "the other workspace sees only its own visit");

// ---------- qualifying answers ----------
sql.prepare("INSERT INTO workspace_preferences(client_id,key,value_json,updated_at) VALUES(?,?,?,?)")
  .run("acme", "lead-qualify", JSON.stringify({ questions: { budget: { disqualify: ["Under $1k"] } } }), ago(0));
const qualified = await loadPipeline(env, "acme", { now: NOW });
assert.equal(qualified.people.find((p) => p.email === "ben@example.com").status, "unqualified");
assert.ok(qualified.people.find((p) => p.email === "ann@example.com").reasons.length >= 1);
const benQ = await loadPerson(env, "acme", "ben@example.com", { now: NOW });
assert.ok(benQ.reasons.some((r) => r.key === "unqualified" && r.points < 0), "failing answers cost points");
assert.match(benQ.next.text, /don't qualify/);

// ---------- visitors ----------
const visitors = await loadVisitors(env, "acme", { since: ago(7), now: NOW });
assert.ok(visitors.people.some((p) => p.anonymous && p.place?.city === "London"));
assert.ok(visitors.people.some((p) => p.email === "ann@example.com"), "known visitors show with their name");
assert.ok(!visitors.people.some((p) => p.email === "eve@example.com"), "outside the window");
const annInFeed = visitors.people.find((p) => p.email === "ann@example.com");
assert.equal(annInFeed.score, qualified.people.find((p) => p.email === "ann@example.com").score, "same score on every screen");

// ---------- the API ----------
const get = (handler, path, headers = {}) => handler({ request: new Request(`https://pulsify-ai.com${path}`, { headers }), env });
let res = await get(pipelineGet, "/api/lead-pipeline");
assert.equal(res.status, 401);
res = await get(pipelineGet, "/api/lead-pipeline?client=acme", { "x-portal-token": "token-other" });
assert.equal(res.status, 403, "one client's token cannot read another's leads");
res = await get(pipelineGet, "/api/lead-pipeline", { "x-portal-token": "token-acme" });
assert.equal(res.status, 200);
let body = await res.json();
assert.equal(body.client, "acme");
assert.equal(body.counts.booked, 1);
assert.equal(body.counts.customer, 1);
assert.ok(body.bands.hot >= 1);
assert.equal(body.has_video, true);
res = await get(personGet, "/api/lead-person?key=ann%40example.com", { "x-portal-token": "token-acme" });
assert.equal(res.status, 200);
res = await get(personGet, "/api/lead-person?key=nobody%40example.com", { "x-portal-token": "token-acme" });
assert.equal(res.status, 404);
res = await get(visitorsGet, "/api/lead-visitors?range=live", { "x-portal-token": "token-acme" });
body = await res.json();
assert.equal(body.totals.live, 1, "one visitor in the last five minutes");
assert.ok(body.people.find((p) => p.key === "v:anon-live").live);
env.ADMIN_KEY = "admin-test-key";
res = await get(pipelineGet, "/api/lead-pipeline?client=acme", { "x-admin-key": "admin-test-key" });
assert.equal(res.status, 200, "operators read any client");
assert.equal((await get(pipelineGet, "/api/lead-pipeline", { "x-admin-key": "admin-test-key" })).status, 422);

// ---------- the post-call form ----------
const post = (handler, payload, headers = { "x-portal-token": "token-acme" }) => handler({
  request: new Request("https://pulsify-ai.com/api/x", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(payload) }),
  env,
});
res = await post(outcomePost, { email: "ann@example.com", attended: "showed" });
assert.equal(res.status, 422, "a call that happened needs a result");
res = await post(outcomePost, { email: "ann@example.com", attended: "showed", result: "closed" });
assert.equal(res.status, 422, "a closed deal needs its value");
res = await post(outcomePost, { email: "ann@example.com", booking_ref: "book-ann", call_at: ahead(4), attended: "showed", result: "closed", deal_cents: 600000, payment_type: "plan", pre_sold: "yes" });
assert.equal(res.status, 200);
const outcomeId = (await res.json()).id;
let after = await loadPipeline(env, "acme", { now: NOW });
assert.equal(after.people.find((p) => p.email === "ann@example.com").status, "closed", "said yes, not paid yet");
assert.ok(sql.prepare("SELECT 1 FROM notifications WHERE kind='deal.closed'").get(), "the operator hears about the close");
// Same call filed again updates, never duplicates.
res = await post(outcomePost, { email: "ann@example.com", booking_ref: "book-ann", attended: "showed", result: "closed", deal_cents: 500000, payment_type: "pif", pre_sold: "yes" });
assert.equal((await res.json()).id, outcomeId);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM lead_outcomes").get().n, 1);
pay("acme", "ann@example.com", 250000, ago(0));
after = await loadPipeline(env, "acme", { now: NOW });
assert.equal(after.people.find((p) => p.email === "ann@example.com").status, "paying", "half of the deal collected");
res = await post(outcomePost, { email: "cara@example.com", booking_ref: "book-cara", attended: "no_show" }, { "x-portal-token": "token-other" });
assert.equal(res.status, 200, "a token writes only to its own workspace");
assert.equal(sql.prepare("SELECT client_id FROM lead_outcomes WHERE email='cara@example.com'").get().client_id, "other");
res = await outcomeDelete({ request: new Request(`https://pulsify-ai.com/api/lead-outcomes?id=${outcomeId}`, { method: "DELETE", headers: { "x-portal-token": "token-other" } }), env });
assert.equal(res.status, 404, "cannot delete another workspace's form");

// A call logged by hand with no date reads as the day it was filed, never 1 January.
res = await post(outcomePost, { email: "eve@example.com", attended: "showed", result: "not_closed" });
assert.equal(res.status, 200);
const eveAfter = (await loadPipeline(env, "acme", { now: NOW })).people.find((p) => p.email === "eve@example.com");
assert.equal(eveAfter.status, "not_closed");
assert.doesNotMatch(eveAfter.next.text, /Jan 1/);
const eveJourney = (await loadPerson(env, "acme", "eve@example.com", { now: NOW })).journey;
assert.equal(eveJourney.filter((e) => e.kind === "optin").length, 1, "an opt-in shows once in the journey");
sql.prepare("DELETE FROM lead_outcomes WHERE email='eve@example.com'").run();

// ---------- confirmed calls ----------
res = await post(flagPost, { booking_ref: "book-ann", confirmed: true });
assert.equal(res.status, 200);
res = await post(flagPost, { booking_ref: "book-nope", confirmed: true });
assert.equal(res.status, 404);
res = await post(flagPost, { booking_ref: "book-ann", confirmed: true }, { "x-portal-token": "token-other" });
assert.equal(res.status, 404, "cannot confirm another workspace's call");

// ---------- calls ----------
res = await get(callsGet, `/api/lead-calls?month=${ahead(4).slice(0, 7)}`, { "x-portal-token": "token-acme" });
assert.equal(res.status, 200);
body = await res.json();
const annCall = [...body.calls, ...body.upcoming].find((c) => c.booking_ref === "book-ann");
assert.equal(annCall.state, "closed", "the post-call form says how the call went");
assert.equal(annCall.confirmed, true);
assert.equal(annCall.join_url, "https://meet.example/ann");
res = await get(callsGet, `/api/lead-calls?month=${ago(2).slice(0, 7)}`, { "x-portal-token": "token-acme" });
body = await res.json();
assert.equal(body.calls.find((c) => c.booking_ref === "book-cara").state, "cancelled");
assert.ok(body.stats.held_30d >= 0);
assert.equal((await get(callsGet, "/api/lead-calls", { "x-portal-token": "token-other" }).then((r) => r.json())).calls.some((c) => c.booking_ref === "book-ann"), false, "calls stay in their workspace");

// ---------- the hot-lead alert ----------
// Fay: applied an hour ago after watching the whole video from YouTube and coming back. Nobody has called.
page("acme", "fay-1", "page_view", ago(2), { utm: { utm_source: "youtube", utm_content: "vid111" } });
engage("acme", "fay-1", ago(2), { active_seconds: 600, max_scroll: 95, proof_seconds: 60, load_id: "f1" });
page("acme", "fay-1", "page_view", ago(0, 1));
watch("acme", "fay-1", "percent_100", 100, ago(2));
lead("acme", "fay@example.com", "fay-1", ago(0, 1), { name: "Fay", phone: "+15125550111", answers: { budget: "Over $5k" } });
touch("acme", "fay@example.com", "application", ago(0, 1), "app-fay");
page("acme", "fay-1", "cta_click", ago(0, 1), { meta: { label: "APPLY NOW" } });
const fay = (await loadPipeline(env, "acme", { now: NOW })).people.find((p) => p.email === "fay@example.com");
assert.equal(fay.status, "applied");
const alert = await checkHotLead(env, "acme", { visitorId: "fay-1" }, NOW);
if (fay.band === "hot") {
  assert.equal(alert.key, "fay@example.com");
  const rows = sql.prepare("SELECT scope, title FROM notifications WHERE kind='lead.hot'").all();
  assert.equal(rows.length, 2, "client bell and operator bell");
  assert.ok(rows.every((r) => r.title.includes("Fay")));
  await checkHotLead(env, "acme", { email: "fay@example.com" }, NOW);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM notifications WHERE kind='lead.hot'").get().n, 2, "one alert per person per week");
} else {
  assert.equal(alert, null);
}
assert.equal(await checkHotLead(env, "acme", { visitorId: "anon-1" }, NOW), null, "anonymous visitors never alert");
assert.equal(await checkHotLead(env, "acme", { email: "ann@example.com" }, NOW), null, "leads with a deal never alert");

// ---------- the refit ----------
// Not enough outcomes: keeps the starting weights and says so.
const run = await refreshLeadModels(env, NOW);
assert.equal(run.client.client, "acme");
assert.equal(run.client.fitted, false);
const stored = JSON.parse(sql.prepare("SELECT model_json FROM lead_models WHERE client_id='acme'").get().model_json);
assert.ok(stored.computed_at && stored.counts.visit, "model and step counts stored");
assert.ok(sql.prepare("SELECT COUNT(*) AS n FROM lead_score_snapshots WHERE client_id='acme'").get().n >= 3, "scores recorded");
assert.ok(sql.prepare("SELECT 1 FROM lead_models WHERE client_id=''").get(), "pooled model built");
assert.ok(sql.prepare("SELECT 1 FROM metric_points WHERE client_id='acme' AND source='funnel' AND metric='score'").get(), "the day's funnel score is stored for the operator overview");
const runAgain = await refreshLeadModels(env, NOW + 60000);
assert.equal(runAgain.client?.client, "other", "next run takes the next client, not the same one");
// Stored model is used by the screens and scores match.
const afterFit = await loadPipeline(env, "acme", { now: NOW });
assert.equal(afterFit.model.basis, stored.basis);

// With enough outcomes the fit learns: here only people who watched most of the video bought.
const synthetic = [];
const base = withMeans(startingModel(["visit", "optin", "applied", "booked"]), []);
for (let i = 0; i < 400; i += 1) {
  const watched = i % 2 === 0;
  synthetic.push({
    person: { stages: { visit: ago(60), optin: ago(60), applied: i % 4 === 0 ? ago(60) : null }, signals: { vsl_frac: watched ? 0.9 : 0.1, days: 1 }, email: `p${i}@example.com`, phone: null, qualified: null, call: null },
    y: watched && i % 5 === 0 ? 1 : 0,
    weight: 1,
  });
}
const fitted = fitModel(base, synthetic, NOW);
assert.equal(fitted.fitted.applied, true);
assert.ok(fitted.weights.vsl > BEHAVIOUR.find((b) => b.key === "vsl").w, `the video weight rises with the evidence (${fitted.weights.vsl.toFixed(2)})`);
const watcher = scorePerson(synthetic[0].person, fitted, NOW);
const skipper = scorePerson(synthetic[1].person, fitted, NOW);
assert.ok(watcher.score > skipper.score);
const few = fitModel(base, synthetic.slice(0, 10), NOW);
assert.equal(few.fitted.applied, false, "too few outcomes keeps the starting weights");

// ---------- performance: funnel analytics ----------
env.ADMIN_KEY = "admin-test-key";
res = await get(analyticsGet, "/api/funnel-analytics?range=30d", { "x-portal-token": "token-acme" });
assert.equal(res.status, 200);
body = await res.json();
assert.ok(body.tiles.visitors >= 10);
assert.ok(body.tiles.applications >= 3);
assert.equal(body.tiles.application_rate, body.tiles.applications / body.tiles.visitors);
const yt = body.sources.find((s) => s.source === "youtube");
assert.ok(yt && yt.visitors >= 2 && yt.applications >= 1, "YouTube visitors and what they turned into");
assert.ok(body.globe.some((p) => Math.round(p.lat) === 30), "Austin on the globe");
assert.ok(body.video.viewers >= 2);
assert.equal(body.video.retention[0].share, 1, "everyone who played is at the start");
assert.ok(body.video.retention.at(-1).share > 0, "somebody finished");
const budget = body.questions.find((q) => q.key === "budget");
assert.ok(budget.answers.some((a) => a.value === "Under $1k" && a.disqualify), "the rule shows on its answer");
assert.equal(body.qualification.rules_set, true);
assert.equal((await get(analyticsGet, "/api/funnel-analytics", { "x-portal-token": "token-other" }).then((r) => r.json())).tiles.applications, 0, "numbers stay in their workspace");

// ---------- applications: qualifying answers ----------
const put = (handler, payload, headers = { "x-portal-token": "token-acme" }) => handler({
  request: new Request("https://pulsify-ai.com/api/x", { method: "PUT", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(payload) }),
  env,
});
res = await put(qualifyPut, { questions: { budget: { disqualify: ["Under $1k", "Under $1k", ""] }, empty: { disqualify: [] } } });
assert.equal(res.status, 200);
assert.deepEqual((await res.json()).rules, { questions: { budget: { disqualify: ["Under $1k"] } } }, "duplicates and empty rules dropped");
res = await get(qualifyGet, "/api/lead-qualify?client=acme", { "x-admin-key": "admin-test-key" });
assert.deepEqual((await res.json()).rules.questions.budget.disqualify, ["Under $1k"]);

// ---------- links ----------
res = await post(linksPost, { label: "" });
assert.equal(res.status, 422, "a link needs a name");
res = await post(linksPost, { label: "Instagram bio", source: "instagram", placement: "bio" });
assert.equal(res.status, 201);
const link = await res.json();
assert.match(link.url, /\/a\/[a-z0-9]+$/);
const hop = await linkRedirect({ request: new Request(link.url), env, params: { token: link.token } });
const landed = new URL(hop.headers.get("location"));
assert.equal(landed.pathname, "/acme");
assert.equal(landed.searchParams.get("utm_source"), "instagram");
assert.equal(landed.searchParams.get("utm_medium"), "bio");
assert.equal(landed.searchParams.get("utm_content"), `l-${link.token}`);
// A person who came through the link and bought counts toward it.
page("acme", "gil-1", "page_view", ago(1), { utm: { utm_source: "instagram", utm_medium: "bio", utm_content: `l-${link.token}` } });
lead("acme", "gil@example.com", "gil-1", ago(1));
touch("acme", "gil@example.com", "application", ago(1), "app-gil");
pay("acme", "gil@example.com", 100000, ago(0));
res = await get(linksGet, "/api/lead-pipeline", { "x-portal-token": "token-acme" });
body = await res.json();
const row = body.links.find((l) => l.token === link.token);
assert.equal(row.clicks, 1);
assert.equal(row.visitors, 1);
assert.equal(row.applications, 1);
assert.equal(row.cash_cents, 100000);
assert.equal((await get(linksGet, "/api/tracked-links", { "x-portal-token": "token-other" }).then((r) => r.json())).links.length, 0);
res = await linksDelete({ request: new Request(`https://pulsify-ai.com/api/tracked-links?token=${link.token}`, { method: "DELETE", headers: { "x-portal-token": "token-other" } }), env });
assert.equal(res.status, 404, "cannot remove another workspace's link");
res = await linksDelete({ request: new Request(`https://pulsify-ai.com/api/tracked-links?token=${link.token}`, { method: "DELETE", headers: { "x-portal-token": "token-acme" } }), env });
assert.equal(res.status, 200);

// ---------- pages and the builder ----------
res = await get(pagesGet, "/api/pages?range=30d", { "x-portal-token": "token-acme" });
body = await res.json();
assert.equal(body.page.url.endsWith("/acme"), true);
assert.ok(body.page.tokens.includes("HEADLINE_LINE_ONE"));
assert.ok(body.pages[0].visitors >= 5);
assert.equal(body.flow[0].key, "visit");
res = await post(pagesPost, { page_content: { HEADLINE_LINE_ONE: "Trade calmer,", NOT_A_TOKEN: "x", HERO_CTA: "" }, wistia_media_id: "abc123xyz0" });
assert.equal(res.status, 200);
const saved = JSON.parse(sql.prepare("SELECT page_content_json FROM client_config WHERE client='acme'").get().page_content_json);
assert.deepEqual(saved, { HEADLINE_LINE_ONE: "Trade calmer," }, "only template words save; an empty field goes back to the default");
res = await post(pagesPost, { typeform_url: "https://evil.example/form" });
assert.equal(res.status, 422, "only Typeform links");
res = await post(pagesPost, { wistia_media_id: "<script>" });
assert.equal(res.status, 422);

// ---------- ask ----------
assert.equal(intentOf("Who should I call first?"), "call");
assert.equal(intentOf("How much cash came in this month?"), "cash");
assert.equal(intentOf("Which video brought the most cash?"), "video");
assert.equal(intentOf("Where do my best leads come from?"), "source");
assert.equal(intentOf("What should I fix first?"), "fix");
assert.equal(intentOf("What's broken in my funnel?"), "fix");
assert.equal(intentOf("How are my show rates?"), "calls");
res = await get(askGet, "/api/ask", { "x-portal-token": "token-acme" });
assert.ok((await res.json()).suggestions.length >= 4);
const askPost = (question, headers = { "x-portal-token": "token-acme" }, extra = {}) => askPostHandler({
  request: new Request("https://pulsify-ai.com/api/ask", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ question, ...extra }) }),
  env,
});
res = await askPost("How much cash came in this month?");
body = await res.json();
assert.equal(body.source, "computed", "no model key: the computed answer");
assert.match(body.answer, /\$3,500 collected this month|collected this month/);
assert.ok(body.facts.some((f) => f.label === "This month"));
res = await askPost("Who should I call first?");
body = await res.json();
assert.match(body.answer, /Fay/, "the hot applicant is named first");
assert.ok(body.links.some((l) => l.route === "leads"));
res = await askPost("Where do my best leads come from?");
assert.match((await res.json()).answer, /YouTube|Instagram/);
res = await askPost("");
assert.equal(res.status, 422);
res = await askPost("Who should I call first?", { "x-portal-token": "token-other" });
assert.doesNotMatch((await res.json()).answer, /Fay/, "answers stay in their workspace");
res = await askPost("Who should I call first?", { "x-admin-key": "admin-test-key" }, { client: "acme" });
assert.equal(res.status, 200, "operators ask about a named client");
// With a model key, Claude only rewords; a failure falls back to the computed answer.
const reworded = await answerQuestion({ ...env, ANTHROPIC_API_KEY: "test" }, "acme", "How much cash came in this month?", {
  fetcher: async () => new Response(JSON.stringify({ content: [{ type: "text", text: "Reworded answer." }] }), { status: 200 }),
});
assert.equal(reworded.source, "ai");
assert.equal(reworded.answer, "Reworded answer.");
const fallback = await answerQuestion({ ...env, ANTHROPIC_API_KEY: "test" }, "acme", "How much cash came in this month?", {
  fetcher: async () => new Response("{}", { status: 500 }),
});
assert.equal(fallback.source, "computed");

// ---------- monthly report ----------
// The month most of the test funnel sits in (yesterday's), so the test holds on the 1st too.
const thisMonth = ago(1).slice(0, 7);
res = await get(reportGet, `/api/monthly-report?month=${thisMonth}`, { "x-portal-token": "token-acme" });
assert.equal(res.status, 200);
body = await res.json();
assert.equal(body.month, thisMonth);
const monthCash = sql.prepare(
  `SELECT COALESCE(SUM(p.amount_cents - p.refunded_cents), 0) AS c FROM payment_matches m JOIN payments p ON p.id = m.payment_id
    WHERE m.client_id='acme' AND m.status='confirmed' AND substr(p.occurred_at, 1, 7) = ?`,
).get(thisMonth).c;
assert.equal(body.sales.cash_cents, monthCash, "cash is the month's confirmed payments");
assert.ok(body.funnel.applications >= 1);
assert.ok(body.label.length > 3);
res = await reportPut({ request: new Request("https://pulsify-ai.com/api/monthly-report", { method: "PUT", headers: { "content-type": "application/json", "x-portal-token": "token-acme" }, body: JSON.stringify({ month: thisMonth, forecast: { cash_cents: 1 } }) }), env });
assert.equal(res.status, 403, "clients don't set their own forecast");
res = await reportPut({ request: new Request("https://pulsify-ai.com/api/monthly-report", { method: "PUT", headers: { "content-type": "application/json", "x-admin-key": "admin-test-key" }, body: JSON.stringify({ client: "acme", month: thisMonth, forecast: { cash_cents: 1000000, calls: 20, deals: 3 } }) }), env });
assert.equal(res.status, 200);
body = await (await get(reportGet, `/api/monthly-report?month=${thisMonth}`, { "x-portal-token": "token-acme" })).json();
assert.deepEqual(body.forecast, { cash_cents: 1000000, calls: 20, deals: 3 });
res = await reportPut({ request: new Request("https://pulsify-ai.com/api/monthly-report", { method: "PUT", headers: { "content-type": "application/json", "x-admin-key": "admin-test-key" }, body: JSON.stringify({ client: "acme", month: "2026-13", forecast: {} }) }), env });
assert.equal(res.status, 422);

// ---------- sales team and commissions ----------
const team = (payload, headers = { "x-portal-token": "token-acme" }) => post(teamPost, payload, headers);
res = await team({ action: "upsert-member", member: { name: "", role: "closer" } });
assert.equal(res.status, 422);
res = await team({ action: "upsert-member", member: { name: "Sam Closer", role: "closer", commission_pct: 10 } });
assert.equal(res.status, 200);
const samId = (await res.json()).id;
res = await team({ action: "upsert-member", member: { name: "Tia Setter", role: "setter", setter_pct: 5 } });
const tiaId = (await res.json()).id;
body = await (await get(teamGet, "/api/team", { "x-portal-token": "token-acme" })).json();
const tia = body.members.find((m) => m.id === tiaId);
assert.ok(tia.link?.url.includes("/a/"), "setters get their own booking link");
assert.equal(body.members.find((m) => m.id === samId).link, null, "closers don't need one");
// Sam closed Ann on her call; Ann paid this month.
res = await post(outcomePost, { email: "ann@example.com", booking_ref: "book-ann", attended: "showed", result: "closed", deal_cents: 500000, payment_type: "pif", pre_sold: "yes", closer_id: samId });
assert.equal(res.status, 200);
res = await post(outcomePost, { email: "ann@example.com", booking_ref: "book-ann", attended: "showed", result: "closed", deal_cents: 500000, closer_id: "rep_not_ours" });
assert.equal(res.status, 422, "a rep from another team is refused");
// Tia set Fay (post-set form) and filed an end-of-day form.
res = await team({ action: "form", member_id: tiaId, kind: "set", lead_email: "fay@example.com", data: { notes: "Warm" } });
assert.equal(res.status, 200);
res = await team({ action: "form", member_id: tiaId, kind: "eod", data: { dials: 40, conversations: 9, sets: 2 } });
assert.equal(res.status, 200);
res = await team({ action: "form", member_id: tiaId, kind: "eod", data: { dials: -1 } });
assert.equal(res.status, 422);
res = await team({ action: "form", member_id: samId, kind: "set" });
assert.equal(res.status, 422, "a post-set form needs the lead");
body = await (await get(teamGet, "/api/team", { "x-portal-token": "token-acme" })).json();
const sam = body.members.find((m) => m.id === samId);
assert.ok(sam.stats.closed >= 1);
assert.equal(body.members.find((m) => m.id === tiaId).stats.eod_days_7, 1);
assert.ok(body.forms.some((f) => f.kind === "eod" && f.member_name === "Tia Setter"));
const samPay = body.commissions.find((c) => c.member_id === samId);
assert.equal(samPay.owed_cents, 25000, "10% of the $2,500 Ann paid this period");
res = await team({ action: "mark-paid", member_id: samId, period_start: samPay.period_start, period_end: samPay.period_end, amount_cents: 25000 });
assert.equal(res.status, 200);
body = await (await get(teamGet, "/api/team", { "x-portal-token": "token-acme" })).json();
assert.equal(body.commissions.find((c) => c.member_id === samId).paid_cents, 25000);
assert.ok(body.flags.some((f) => f.kind === "no_closer"), "a payment with no closer is flagged");
res = await team({ action: "mark-paid", member_id: samId, period_start: samPay.period_start, period_end: samPay.period_end, amount_cents: 1 }, { "x-portal-token": "token-other" });
assert.equal(res.status, 404, "cannot pay another workspace's rep");
assert.equal((await (await get(teamGet, "/api/team", { "x-portal-token": "token-other" })).json()).members.length, 0);

// ---------- call-day nudge ----------
const today = new Date(NOW).toISOString().slice(0, 10);
touch("acme", "hal@example.com", "booking", `${today}T15:00:00.000Z`, "book-hal", { starts_at: `${today}T15:00:00.000Z` });
touch("acme", "ivy@example.com", "booking", `${today}T09:00:00.000Z`, "book-ivy", { starts_at: `${today}T09:00:00.000Z` });
touch("acme", "ivy@example.com", "booking", `${today}T09:00:00.000Z`, "book-ivy#canceled", { starts_at: `${today}T09:00:00.000Z`, status: "canceled" });
const nudge = await callDayNudges(env, NOW);
assert.equal(nudge.sent, 1);
const note = sql.prepare("SELECT title, link FROM notifications WHERE kind='calls.today'").get();
assert.match(note.title, /^1 call today, first at 15:00 UTC/, "a cancelled call doesn't count");
assert.equal(note.link, "leads?tab=calls");
assert.equal((await callDayNudges(env, NOW)).sent, 0, "once a day");

// ---------- integrations: plain words and the first payment ----------
sql.prepare("INSERT INTO delivery_failures (client, kind, detail, at) VALUES (?,?,?,?)").run("acme", "stripe_signature", "invalid signature", ago(1));
sql.prepare("INSERT INTO delivery_failures (client, kind, detail, at) VALUES (?,?,?,?)").run("acme", "stripe_signature", "invalid signature", ago(30));
const notes = await integrationNotes(env, "acme", NOW);
assert.match(notes.stripe.problem.text, /signing secret/);
assert.equal(notes.stripe.problem.count, 1, "only the last 14 days count");
assert.ok(notes.stripe.first_payment_at, "the first payment through Stripe proves the connection");
assert.ok(notes.test?.first_booking_at, "first booking per calendar source");

delete env.ADMIN_KEY;
console.log("lead-score: all checks passed");
