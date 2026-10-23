// Builds SQL for the Example workspace shown on sales calls and in outreach videos (founder, 2026-10-01 and 2026-10-23).
//
//   node tools/seed-demo-workspace.mjs > demo-seed.sql
//   npx wrangler d1 execute pulsify-portal --remote --file=demo-seed.sql
//
// A demo trader (no real name or handle) with about 12k Instagram followers. The YouTube titles and view counts
// are a real public channel's, kept as a reference (section 2); every person, lead, call and payment is invented,
// every email is @example.com, and the money is an estimate. The
// workspace has status 'demo', which every cross-client total, feed, list, the pooled lead model and both
// syncs leave out, so none of these numbers reach the founder's real figures and no sync overwrites them.
//
// What it shows (founder 2026-10-23, "views vs money"): 30 videos where two mid-view videos bring in most of the
// cash and the most viewed one brings in almost none; leads whose full path runs
// Instagram bio click, YouTube video, applied, booked, paid, and a few who stalled; booked calls with a pre-call
// brief; story sequences with their numbers; the week plan; Instagram followers and reach.
//
// Running it again wipes the example rows first and rebuilds them from today, so the screens always look current.
// It only ever touches client 'demo-example'. Sign-ins (client_auth, client_sessions) are left alone.

import { summarize } from "../workers/sync/src/jobs/instagram.js";

const CLIENT = "demo-example";
const NAME = "Demo trader";
const IG = "demo.trader";
const YT = "@demotrader";
const NOW = Date.now();
const HOUR = 3600000;
const DAY = 24 * HOUR;
const OFFER = { pif: 300000, deposit: 150000 };

// Deterministic, so a rerun gives the same story.
let seed = 20261023;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (list) => list[Math.floor(rnd() * list.length)];
const between = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
const iso = (ms) => new Date(ms).toISOString();
const q = (value) => (value === null || value === undefined ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replace(/'/g, "''")}'`);
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(",")}) VALUES (${Object.values(row).map(q).join(",")});`;
const json = (value) => JSON.stringify(value);
/** A moment `days` before now at a given UTC hour; never in the future unless asked for. */
// Hours are UTC. Keep them between 13 and 20 for the named people, so the weekday is the same in Istanbul and the US.
const ago = (days, hour = 12, minute = 0) => {
  const d = new Date(NOW - days * DAY);
  d.setUTCHours(hour, minute, 0, 0);
  return d.getTime();
};
const past = (ms) => Math.min(ms, NOW - 10 * 60000);
/** Calls start on the half hour. */
const onTheHalfHour = (ms) => Math.round(ms / (30 * 60000)) * 30 * 60000;
const statements = [];
const push = (sql) => statements.push(sql);

// ---------- 1. Wipe the example rows only ----------
for (const [table, column] of [
  ["page_events", "client"], ["watch_events", "client"], ["leads", "client"], ["pipeline_touches", "client_id"],
  ["payment_matches", "client_id"], ["payments", "client"], ["yt_videos", "client_id"], ["asset_links", "client"],
  ["asset_events", "client"], ["lead_models", "client_id"], ["lead_score_snapshots", "client_id"], ["lead_outcomes", "client_id"],
  ["call_flags", "client_id"], ["call_notes", "client"], ["team_members", "client_id"], ["ig_contacts", "client_id"],
  ["ig_dm_events", "client_id"], ["sequence_log", "client_id"], ["studio_sequences", "client_id"], ["sequence_variants", "client_id"],
  ["account_snapshots", "client_id"], ["follower_places", "client_id"], ["content_items", "client"],
  ["client_dashboard_content", "client_id"], ["lead_merge_decisions", "client_id"], ["client_brain", "client_id"],
]) {
  push(`DELETE FROM ${table} WHERE ${column}=${q(CLIENT)};`);
}
push(`DELETE FROM snapshots WHERE scope='client' AND client_id=${q(CLIENT)};`);
push(`DELETE FROM metric_points WHERE scope='client' AND client_id=${q(CLIENT)};`);
push(`DELETE FROM stories WHERE scope='client' AND client_id=${q(CLIENT)};`);
push(`DELETE FROM integrations WHERE scope='client' AND client_id=${q(CLIENT)} AND provider IN ('youtube','instagram');`);
push(`DELETE FROM workspace_preferences WHERE client_id=${q(CLIENT)} AND key IN ('content-plan');`);
// Update in place: the row also holds the demo login's page settings, which a delete would lose.
push(`INSERT INTO client_config (client, client_name, status, updated_at) VALUES (${q(CLIENT)}, ${q(NAME)}, 'demo', ${q(iso(NOW))})
  ON CONFLICT(client) DO UPDATE SET client_name=excluded.client_name, status='demo', updated_at=excluded.updated_at;`);

// ---------- 2. The channel: 30 videos, newest first ----------
// Titles, view counts and lengths are a real public trading channel's last 30 uploads (pulled 2026-10-23), used as a
// reference with the founder's go. Its name, handle, video ids and thumbnails are never stored: ids are neutral and
// thumbnails are plain placeholders. visits = people who clicked through; apply/book/buy = how far they got. These,
// and all the money, are estimates (the header says so). A student-result video and a strategy breakdown, both
// mid-view, carry the cash; the most viewed video brings in almost none.
const VIDEOS = [
  { id: "dvVid30", hook: "1-MIN SCALP", title: "My Simple 1-Minute Scalping Strategy (Backtested Results)", days: 2, views: 12000, duration: 1164, visits: 16, apply: 1, book: 0, buy: 0 },
  { id: "dvVid29", hook: "-$3,234 LIVE", title: "Trading Live Losing $3,234 (NEVER MOVE YOUR SL)", days: 6, views: 6900, duration: 3664, visits: 11, apply: 0, book: 0, buy: 0 },
  { id: "dvVid28", hook: "EASY PAYOUTS", title: "Once You Master This, Getting Payouts Becomes Insanely Easy", days: 10, views: 11000, duration: 884, visits: 15, apply: 1, book: 0, buy: 0 },
  { id: "dvVid27", hook: "WICK THEORY", title: "The Wick Theory Strategy I Will Use For Life (FULL TRADE BREAKDOWN)", days: 14, views: 15000, duration: 911, visits: 20, apply: 1, book: 0, buy: 0 },
  { id: "dvVid26", hook: "7 FUNDED", title: "My Student Went From Blowing Accounts to 7 Funded Accounts", days: 18, views: 8100, duration: 831, visits: 62, apply: 13, book: 9, buy: 4 },
  { id: "dvVid25", hook: "$29,162", title: "I made $29,162 Trading This One Setup", days: 22, views: 15000, duration: 612, visits: 20, apply: 3, book: 2, buy: 1 },
  { id: "dvVid24", hook: "+$14,668 LIVE", title: "Trading Live Making $14,668 (THE BEST TRADING STRATEGY)", days: 26, views: 10000, duration: 3309, visits: 14, apply: 0, book: 0, buy: 0 },
  { id: "dvVid23", hook: "$7,962 FUNDED", title: "i made $7,962 on my funded with this simple strategy", days: 30, views: 16000, duration: 702, visits: 21, apply: 1, book: 0, buy: 0 },
  { id: "dvVid22", hook: "1 ACCOUNT?", title: "1 funded account will not make you full time", days: 34, views: 7800, duration: 775, visits: 12, apply: 0, book: 0, buy: 0 },
  { id: "dvVid21", hook: "ORDER FLOW", title: "i passed 2 funding challenges using order flow", days: 38, views: 9900, duration: 970, visits: 14, apply: 1, book: 0, buy: 0 },
  { id: "dvVid20", hook: "$124,550", title: "breakdown of the strategy that made me $124,550 last month", days: 42, views: 12000, duration: 960, visits: 50, apply: 10, book: 7, buy: 3 },
  { id: "dvVid19", hook: "+$10,770 LIVE", title: "Trading Live Making $10,770 (TOGETHER WITH MY STUDENT)", days: 46, views: 8400, duration: 5695, visits: 12, apply: 0, book: 0, buy: 0 },
  { id: "dvVid18", hook: "+$16,951 LIVE", title: "Trading Live Making $16,951 (I DON'T NEED A STRATEGY)", days: 50, views: 5000, duration: 2614, visits: 9, apply: 0, book: 0, buy: 0 },
  { id: "dvVid17", hook: "VOLUME TRICK", title: "I Made $11,220 Using This Simple Volume Trick", days: 54, views: 6700, duration: 495, visits: 10, apply: 0, book: 0, buy: 0 },
  { id: "dvVid16", hook: "VOLUME PRINTS", title: "this volume based trading strategy prints money", days: 58, views: 8400, duration: 572, visits: 12, apply: 2, book: 1, buy: 1 },
  { id: "dvVid15", hook: "+$7,338 LIVE", title: "Trading Live Making $7,338 (I LOVE THIS STRATEGY)", days: 62, views: 8500, duration: 2441, visits: 12, apply: 0, book: 0, buy: 0 },
  { id: "dvVid14", hook: "EASY FOR ME", title: "why trading is easy for me and hard for you", days: 66, views: 55000, duration: 900, visits: 66, apply: 2, book: 1, buy: 0 },
  { id: "dvVid13", hook: "+$17,014 LIVE", title: "Trading Live Making $17,014 (IM INCREASING MY RISK)", days: 70, views: 4300, duration: 1907, visits: 8, apply: 0, book: 0, buy: 0 },
  { id: "dvVid12", hook: "$17,014", title: "my $17,014 trade breakdown (hybrid trading)", days: 74, views: 6500, duration: 646, visits: 10, apply: 0, book: 0, buy: 0 },
  { id: "dvVid11", hook: "$51,454", title: "i made $51,454 with Hybrid Trading (full breakdown)", days: 78, views: 8500, duration: 594, visits: 14, apply: 3, book: 2, buy: 1 },
  { id: "dvVid10", hook: "+$7,320 LIVE", title: "Trading Live Making $7,320 (MARKETS ARE LOOKING BETTER)", days: 82, views: 4400, duration: 2851, visits: 8, apply: 0, book: 0, buy: 0 },
  { id: "dvVid09", hook: "WHY YOU FAIL", title: "Prop firm challenge? Here's why you're likely to fail", days: 86, views: 10000, duration: 985, visits: 14, apply: 1, book: 0, buy: 0 },
  { id: "dvVid08", hook: "$40,392", title: "my $40,392 profit trade breakdown", days: 90, views: 6000, duration: 438, visits: 10, apply: 0, book: 0, buy: 0 },
  { id: "dvVid07", hook: "NASDAQ SETUP", title: "this stupid simple Nasdaq setup made me $22,410", days: 94, views: 6500, duration: 475, visits: 10, apply: 2, book: 1, buy: 1 },
  { id: "dvVid06", hook: "FIX 90%", title: "this will fix 90% of your trading problems (and it's not a strategy)", days: 98, views: 6100, duration: 906, visits: 10, apply: 2, book: 1, buy: 1 },
  { id: "dvVid05", hook: "NOT BROKEN", title: "your trading is not broken. markets are...", days: 102, views: 3200, duration: 680, visits: 7, apply: 0, book: 0, buy: 0 },
  { id: "dvVid04", hook: "2 YEARS", title: "i tried every trading strategy for 2 years. here's what finally worked", days: 106, views: 10000, duration: 830, visits: 14, apply: 1, book: 0, buy: 0 },
  { id: "dvVid03", hook: "FUNDED IN 6 WKS", title: "my student went from losing trader to funded in 6 weeks", days: 110, views: 3300, duration: 2894, visits: 18, apply: 4, book: 3, buy: 1 },
  { id: "dvVid02", hook: "+$20,118 LIVE", title: "Trading Live Making $20,118 (BACK IN PROFIT FOR THE MONTH)", days: 114, views: 5200, duration: 3741, visits: 9, apply: 0, book: 0, buy: 0 },
  { id: "dvVid01", hook: "+$24,264 LIVE", title: "Trading Live Making $24,264 (I AM THE BANK)", days: 118, views: 5700, duration: 5577, visits: 9, apply: 0, book: 0, buy: 0 },
];
const video = (id) => VIDEOS.find((v) => v.id === id);
// A plain made-up thumbnail per video (dark, one hook, a few candles), inline so nothing loads from outside.
const thumbnail = (v, n) => {
  const accent = ["#ff6a1a", "#f5b13d", "#3ddc97", "#ff6a1a", "#e9e4dc"][n % 5];
  let candles = "";
  let y = 470;
  for (let k = 0; k < 9; k++) {
    const up = (k * 7 + n) % 3 !== 0;
    const h = 40 + ((k * 37 + n * 11) % 70);
    y += up ? -22 : 16;
    candles += `<rect x="${760 + k * 54}" y="${y - h}" width="30" height="${h}" rx="3" fill="${up ? "#3ddc97" : "#ff5a4e"}" opacity="0.85"/><rect x="${773 + k * 54}" y="${y - h - 18}" width="4" height="${h + 36}" fill="${up ? "#3ddc97" : "#ff5a4e"}" opacity="0.6"/>`;
  }
  const size = v.hook.length > 11 ? 88 : 112;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16120f"/><stop offset="1" stop-color="#050505"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><rect x="0" y="0" width="1280" height="720" fill="${accent}" opacity="0.06"/>${candles}<text x="70" y="330" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" fill="#ffffff">${v.hook.replace(/&/g, "&amp;")}</text><rect x="74" y="370" width="160" height="12" rx="6" fill="${accent}"/><text x="72" y="640" font-family="Arial, sans-serif" font-weight="700" font-size="34" fill="#ffffff" opacity="0.7">DEMO TRADER</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
VIDEOS.forEach((v, n) => {
  push(insert("yt_videos", {
    client_id: CLIENT, video_id: v.id, channel_id: "demo-channel", title: v.title, published_at: iso(ago(v.days, 15)),
    thumbnail_url: thumbnail(v, n), duration_seconds: v.duration, views: v.views, likes: Math.round(v.views * 0.042), comments: Math.round(v.views * 0.007),
    synced_at: iso(NOW - 2 * HOUR),
  }));
  // Tracked links in the description and the pinned comment, clicked in proportion to the visits they sent.
  for (const [placement, share] of [["description", 0.7], ["pinned-comment", 0.3]]) {
    const token = `tm${v.id.slice(-2)}${placement === "description" ? "d" : "c"}`;
    push(insert("asset_links", { token, client: CLIENT, label: `${v.title} (${placement.replace("-", " ")})`, target_url: "https://pulsify-ai.com/demo-example", created_at: iso(ago(v.days, 14)), archived: 0, kind: "video", video_id: v.id, placement, source: "youtube" }));
    const clicks = Math.max(1, Math.round(v.visits * share * 1.3));
    for (let c = 0; c < clicks; c++) push(insert("asset_events", { token, client: CLIENT, at: iso(past(ago(v.days, 15) + rnd() * Math.min(v.days, 21) * DAY)) }));
  }
});
// The Instagram bio link: the tracked link most leads start from.
const BIO = "tmigbio";
push(insert("asset_links", { token: BIO, client: CLIENT, label: "Bio link", target_url: "https://pulsify-ai.com/demo-example", created_at: iso(ago(120)), archived: 0, kind: "link", placement: "bio", source: "instagram" }));
push(insert("asset_links", { token: "tmigstory", client: CLIENT, label: "Story link", target_url: "https://pulsify-ai.com/demo-example", created_at: iso(ago(90)), archived: 0, kind: "link", placement: "story", source: "instagram" }));
// Saved handles, so the screens treat both accounts as connected. No account_id, so the Instagram sync never runs;
// the YouTube sync skips status 'demo'.
push(insert("integrations", { scope: "client", client_id: CLIENT, provider: "youtube", config_json: json({ handle: YT, channel_note: YT }), created_at: iso(NOW), updated_at: iso(NOW) }));
push(insert("integrations", { scope: "client", client_id: CLIENT, provider: "instagram", config_json: json({ handle: IG, channel_note: `@${IG}`, username: IG }), created_at: iso(NOW), updated_at: iso(NOW) }));

// ---------- 3. People ----------
const FIRST = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Cameron", "Drew", "Quinn", "Blake", "Rowan", "Parker", "Reese", "Skyler", "Emerson", "Hayden", "Noah", "Eli", "Marcus", "Omar", "Ivan", "Leo", "Nina", "Priya", "Tariq", "Ben", "Kai", "Zane", "Ethan", "Mila", "Aaron", "Jonah", "Felix"];
const LAST = ["Walker", "Reyes", "Bennett", "Carter", "Nguyen", "Foster", "Brooks", "Hughes", "Price", "Ward", "Fisher", "Bell", "Murray", "Dunn", "Shaw", "Ellis", "Grant", "Hayes", "Lowe", "Park", "Stone", "Vance", "Wolfe", "Yates", "Quinlan", "Mercer"];
const PLACES = [["US", "Austin", 30.27, -97.74], ["US", "Miami", 25.76, -80.19], ["GB", "London", 51.5, -0.12], ["CA", "Toronto", 43.65, -79.38], ["US", "Denver", 39.74, -104.99], ["US", "Chicago", 41.88, -87.63], ["DE", "Berlin", 52.52, 13.4], ["US", "New York", 40.71, -74.0], ["NL", "Amsterdam", 52.37, 4.9], ["US", "Phoenix", 33.45, -112.07]];
const DEVICES = [["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"], ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"], ["Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36"]];
const used = new Set(["Maya Okafor", "Luis Ferreira", "Hannah Cole", "Dev Patel", "Sofia Lindqvist", "Grace Kim", "Marco Bianchi"]);
const newName = () => {
  let name;
  do { name = `${pick(FIRST)} ${pick(LAST)}`; } while (used.has(name));
  used.add(name);
  return name;
};
const emailOf = (name) => `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
let visitorN = 0;
const newVisitor = () => `demo-tm-${String(++visitorN).padStart(4, "0")}`;
const ANSWERS = {
  revenue: ["Under $1k a month", "$1k to $5k a month", "$5k to $10k a month"],
  situation: ["Blew an account and want a system", "Profitable some months, not consistent", "New to trading, serious about learning", "Trading around a full-time job"],
  budget: ["Under $1,000", "$1,000 to $3,000", "Over $3,000"],
};

const page = (p, at, extra = {}) => push(insert("page_events", {
  client: CLIENT, visitor_id: p.visitor, session_id: `${p.visitor}-${Math.floor(at / DAY)}`, page_id: "main", event: "page_view", path: "/",
  utm_json: json(extra.utm || {}), utm_source: extra.utm?.utm_source ?? null, utm_content: extra.utm?.utm_content ?? null,
  referrer: extra.referrer ?? null, country: p.place[0], city: p.place[1], lat: p.place[2], lng: p.place[3], user_agent: p.device, at: iso(past(at)),
}));
const event = (p, at, name, metadata = null) => push(insert("page_events", {
  client: CLIENT, visitor_id: p.visitor, session_id: `${p.visitor}-${Math.floor(at / DAY)}`, page_id: "main", event: name, path: name === "form_start" ? "/apply" : "/",
  email: p.email && name === "optin" ? p.email : null, metadata_json: metadata ? json(metadata) : null, country: p.place[0], city: p.place[1], at: iso(past(at)),
}));
const engaged = (p, at, active, scroll, proof = 0) => event(p, at, "engagement", { active_seconds: active, max_scroll: scroll, proof_seconds: proof, rage_clicks: 0 });
const watched = (p, at, percent) => {
  push(insert("watch_events", { client: CLIENT, visitor_id: p.visitor, session_id: `${p.visitor}-${Math.floor(at / DAY)}`, media_id: "demo-vsl", event: "play", percent: 0, at: iso(past(at)), watch_seconds: 0, email: p.email }));
  push(insert("watch_events", { client: CLIENT, visitor_id: p.visitor, session_id: `${p.visitor}-${Math.floor(at / DAY)}`, media_id: "demo-vsl", event: "progress", percent, at: iso(past(at + 6 * 60000)), watch_seconds: Math.round(percent * 9.6), duration_seconds: 960, email: p.email }));
};
const touch = (p, kind, at, extra = {}) => push(insert("pipeline_touches", {
  client_id: CLIENT, contact_email: p.email, contact_name: p.name, kind, ts: iso(kind === "booking" ? at : past(at)), source: kind === "booking" ? "calendly" : kind === "payment" ? "stripe" : "typeform",
  external_id: extra.external_id || `demo-${kind}-${p.visitor}`, amount_cents: extra.amount_cents ?? null, payload_json: json(extra.payload || {}),
}));
const applyLead = (p, at) => {
  touch(p, "application", at);
  push(insert("leads", {
    client: CLIENT, email: p.email, name: p.name, phone: p.phone || null, revenue: p.revenue || pick(ANSWERS.revenue), situation: p.situation || pick(ANSWERS.situation),
    applied_at: iso(past(at)), status: "new", visitor_id: p.visitor, source: "typeform", ig_handle: p.handle || null,
    answers_json: json({ budget: p.budget || pick(ANSWERS.budget), goal: p.goal || pick(["Trade full time within a year", "Stop blowing accounts", "Build a process I can repeat", "Replace my salary"]), experience: pick(["Under a year", "1 to 2 years", "3 years or more"]) }),
    updated_at: iso(NOW),
  }));
};
let bookingN = 0;
const book = (p, bookedAt, callAt) => {
  const ref = `demo-book-${String(++bookingN).padStart(3, "0")}`;
  touch(p, "booking", past(bookedAt), { external_id: ref, payload: { starts_at: iso(callAt), booked_at: iso(past(bookedAt)), join_url: `https://meet.example.com/call-${ref.slice(-3)}`, status: "active" } });
  p.booking = { ref, callAt };
  return ref;
};
const outcome = (p, fields) => push(insert("lead_outcomes", {
  client_id: CLIENT, email: p.email, booking_ref: p.booking.ref, call_at: iso(p.booking.callAt), closer: "Demo trader", closer_id: "demo-tm-closer", setter_id: "demo-tm-setter",
  created_by: "demo", created_at: iso(past(p.booking.callAt + 50 * 60000)), updated_at: iso(past(p.booking.callAt + 50 * 60000)), ...fields,
}));
let paymentN = 0;
const pay = (p, at, cents, note) => {
  const reference = `demo-tm-pay-${String(++paymentN).padStart(3, "0")}`;
  const when = iso(past(at));
  push(insert("payments", { client: CLIENT, amount_cents: cents, currency: "USD", rail: "stripe", reference, occurred_at: when, recorded_by: "demo", note, created_at: when, customer_email: p.email, customer_name: p.name, kind: "charge", refunded_cents: 0 }));
  push(`INSERT INTO payment_matches (payment_id, client_id, target_kind, target_id, target_label, confidence, reasons_json, status, decided_by, decided_at, created_at, updated_at) SELECT id, ${q(CLIENT)}, 'contact_email', ${q(p.email)}, ${q(p.name)}, 1, '["example"]', 'confirmed', 'demo', ${q(when)}, ${q(when)}, ${q(when)} FROM payments WHERE reference=${q(reference)};`);
  touch(p, "payment", at, { external_id: reference, amount_cents: cents });
};
const fromVideo = (v) => ({ utm: { utm_source: "youtube", utm_medium: "video", utm_content: v.id } });
const fromBio = { utm: { utm_source: "instagram", utm_medium: "bio", utm_content: `l-${BIO}` } };
const person = (name, extra = {}) => ({ name, email: emailOf(name), visitor: newVisitor(), place: pick(PLACES), device: pick(DEVICES)[0], ...extra });

// 3a. The named paths for the video (founder 2026-10-17 and 2026-10-23): full journeys and a few who stalled.
const contacts = [];
const dm = (p, startAt, messages, ref) => {
  const id = `demo-tm-ig-${contacts.length + 1}`;
  contacts.push({ id, p, startAt, messages, ref });
};
{
  // Maya: Tuesday bio click, Friday YouTube, Sunday applied, Monday booked, Tuesday call, Wednesday paid in full.
  // Her days are counted back from the latest Wednesday at least a day ago, so the weekdays hold on any rerun.
  const wed = (() => { let d = 1; while (new Date(ago(d)).getUTCDay() !== 3) d += 1; return d; })();
  const maya = person("Maya Okafor", { phone: "+1 512 555 0141", handle: "maya.trades", place: PLACES[0], budget: "Over $3,000", goal: "Trade full time within a year" });
  const tue = ago(wed + 8, 19, 40);
  page(maya, tue, fromBio); engaged(maya, tue + 4 * 60000, 190, 40);
  const fri = ago(wed + 5, 17, 10);
  page(maya, fri, fromVideo(video("dvVid26"))); watched(maya, fri + 3 * 60000, 92); engaged(maya, fri + 20 * 60000, 520, 96, 70);
  const sun = ago(wed + 3, 15, 1);
  page(maya, sun - 60000, fromVideo(video("dvVid26"))); event(maya, sun, "cta_click", { label: "APPLY NOW" }); event(maya, sun + 60000, "form_start");
  applyLead(maya, sun + 4 * 60000);
  book(maya, ago(wed + 2, 14, 30), ago(wed + 1, 15));
  outcome(maya, { attended: "showed", result: "closed", deal_cents: OFFER.pif, payment_type: "pif", pre_sold: "yes", notes: "Watched the student video twice. Wanted the same path to funded. Paid in full." });
  pay(maya, ago(wed, 16, 20), OFFER.pif, "The Process, paid in full");

  // Luis: messaged first on Instagram, then the strategy breakdown video, applied, booked, deposit, then the second half.
  const luis = person("Luis Ferreira", { phone: "+44 20 7946 0321", handle: "luis.fx", place: PLACES[2], budget: "$1,000 to $3,000" });
  dm(luis, ago(24, 18, 5), [["inbound", 0], ["outbound", 12], ["inbound", 40], ["outbound", 55], ["inbound", 90]], "Bio link");
  const lv = ago(21, 20, 30);
  page(luis, lv, fromVideo(video("dvVid20"))); watched(luis, lv + 2 * 60000, 78); engaged(luis, lv + 15 * 60000, 410, 88, 35);
  page(luis, ago(19, 8, 15), fromBio);
  const la = ago(19, 8, 20);
  event(luis, la, "cta_click", { label: "APPLY NOW" }); event(luis, la + 60000, "form_start"); applyLead(luis, la + 5 * 60000);
  book(luis, ago(18, 12), ago(16, 17));
  outcome(luis, { attended: "showed", result: "closed", deal_cents: OFFER.pif, payment_type: "deposit", pre_sold: "somewhat", objection: "Wanted to split the payment", notes: "Deposit today, the rest in two weeks." });
  pay(luis, ago(16, 18, 10), OFFER.deposit, "The Process, deposit");
  pay(luis, ago(2, 9, 40), OFFER.deposit, "The Process, second half");

  // Hannah: the student-result video, then the bio link, applied, call in two days. Has a pre-call brief.
  const hannah = person("Hannah Cole", { phone: "+1 416 555 0187", handle: "hannahcole.charts", place: PLACES[3], budget: "Over $3,000", goal: "Stop blowing accounts", situation: "Blew an account and want a system" });
  const hv = ago(8, 18, 5);
  page(hannah, hv, fromVideo(video("dvVid03"))); watched(hannah, hv + 2 * 60000, 100); engaged(hannah, hv + 18 * 60000, 640, 100, 95);
  page(hannah, ago(5, 13, 0), fromBio);
  const ha = ago(5, 13, 6);
  event(hannah, ha, "cta_click", { label: "APPLY NOW" }); event(hannah, ha + 60000, "form_start"); applyLead(hannah, ha + 4 * 60000);
  book(hannah, ago(4, 18), ago(-2, 16));
  push(insert("call_flags", { client_id: CLIENT, booking_ref: hannah.booking.ref, confirmed_at: iso(ago(1, 10)), confirmed_by: "demo" }));
  push(insert("call_notes", {
    client: CLIENT, booking_ref: hannah.booking.ref, lead_email: hannah.email, source_kind: "precall", call_date: iso(hannah.booking.callAt), created_at: iso(ago(1, 9)),
    title: "Pre-call brief: Hannah Cole",
    summary: "WANT: a repeatable process so she stops blowing accounts. Lost two prop-firm challenges this year.\nCAME FROM: the funded-in-6-weeks student video (watched to the end), then the Instagram bio link three days later.\nSPENT: 11 minutes on the page, most of it on the student results.\nBUDGET: over $3,000. Trades around a 9 to 5 in Toronto, the New York open.\nON THE CALL: open with her last blown challenge, show the student results from that video. Expect: can I do this with a full-time job?",
    decisions: "Budget: over $3,000. Trades around a 9 to 5 in Toronto. Best time to trade: the New York open.",
    actions: "Open with her last blown challenge. Show the student results from that video. Expect the question: can I do this with a full-time job?",
  }));

  // Marco: booked for tomorrow from the strategy breakdown video, not confirmed yet.
  const marco = person("Marco Bianchi", { place: PLACES[6], handle: "marco.b.trades", budget: "$1,000 to $3,000" });
  const mv = ago(3, 19, 45);
  page(marco, mv, fromVideo(video("dvVid20"))); watched(marco, mv + 60000, 64); engaged(marco, mv + 12 * 60000, 300, 80, 20);
  event(marco, mv + 14 * 60000, "cta_click", { label: "APPLY NOW" }); applyLead(marco, mv + 18 * 60000);
  book(marco, mv + 30 * 60000, ago(-1, 17, 30));
  push(insert("call_notes", {
    client: CLIENT, booking_ref: marco.booking.ref, lead_email: marco.email, source_kind: "precall", call_date: iso(marco.booking.callAt), created_at: iso(ago(0, 8)),
    title: "Pre-call brief: Marco Bianchi",
    summary: "WANT: one setup he can repeat. Came from the strategy breakdown video, watched two thirds, applied the same evening.\nSITUATION: profitable some months, not consistent.\nBUDGET: $1,000 to $3,000, likely the deposit plan.\nON THE CALL: walk through one of his losing trades on screen.",
    decisions: "Budget: $1,000 to $3,000. Likely the deposit plan.",
    actions: "Confirm the call today. Walk through one of his losing trades on screen.",
  }));

  // Dev: bio click, then the most viewed video, watched 40%, started the application and left.
  const dev = person("Dev Patel", { place: PLACES[7] });
  page(dev, ago(12, 17, 20), fromBio); engaged(dev, ago(12, 17, 24), 75, 30);
  const dv = ago(10, 18, 5);
  page(dev, dv, fromVideo(video("dvVid14"))); watched(dev, dv + 60000, 40); engaged(dev, dv + 8 * 60000, 210, 62); event(dev, dv + 9 * 60000, "form_start");

  // Sofia: the student-result video, applied, booked, did not show.
  const sofia = person("Sofia Lindqvist", { place: PLACES[8], phone: "+31 20 555 0172" });
  const sv = ago(15, 16, 40);
  page(sofia, sv, fromVideo(video("dvVid26"))); watched(sofia, sv + 60000, 71); engaged(sofia, sv + 10 * 60000, 360, 90, 30);
  event(sofia, sv + 11 * 60000, "cta_click", { label: "APPLY NOW" }); applyLead(sofia, sv + 15 * 60000);
  book(sofia, sv + 40 * 60000, ago(12, 16));
  outcome(sofia, { attended: "no_show", notes: "No reply to the reminder texts. Sent the rebook link." });

  // Grace: applied an hour ago from the strategy breakdown video and has not booked. The hottest lead on the board.
  const grace = person("Grace Kim", { place: PLACES[1], phone: "+1 305 555 0119", handle: "gracekim.trades", budget: "Over $3,000" });
  page(grace, ago(2, 14, 10), fromBio);
  const gv = NOW - 5 * HOUR;
  page(grace, gv, fromVideo(video("dvVid20"))); watched(grace, gv + 60000, 100); engaged(grace, gv + 17 * 60000, 700, 100, 120);
  event(grace, NOW - 70 * 60000, "cta_click", { label: "APPLY NOW" }); event(grace, NOW - 69 * 60000, "form_start"); applyLead(grace, NOW - 64 * 60000);
}
const NAMED_CREDIT = { dvVid26: { apply: 2, book: 2, buy: 1 }, dvVid20: { apply: 3, book: 2, buy: 1 }, dvVid03: { apply: 1, book: 1, buy: 0 } };

// 3b. Everyone else, video by video, so cash by video adds up to the story above.
const CALL_RESULTS = [["showed", "not_closed", "Needs to talk to their partner"], ["showed", "follow_up", "Wants to wait for the next paycheck"], ["no_show", null, null], ["showed", "unqualified", "Looking for signals, not a process"], ["showed", "not_closed", "Price"]];
let resultN = 0;
const awaitingForm = [];
for (const v of VIDEOS) {
  const named = NAMED_CREDIT[v.id] || { apply: 0, book: 0, buy: 0 };
  const visitors = Math.max(0, v.visits - (named.apply ? named.apply + 1 : 0));
  const crowd = [];
  for (let i = 0; i < visitors; i++) {
    // Most clicks come in the first two weeks after the video goes out.
    const age = Math.min(v.days - 0.2, Math.pow(rnd(), 2.2) * Math.min(v.days, 40));
    const at = ago(v.days - age, between(12, 23), between(0, 59));
    const p = { visitor: newVisitor(), place: pick(PLACES), device: pick(DEVICES)[0], at };
    crowd.push(p);
    page(p, at, fromVideo(v));
    if (rnd() < 0.62) watched(p, at + 90000, pick([12, 25, 40, 55, 70, 85, 100]));
    if (rnd() < 0.7) engaged(p, at + 5 * 60000, between(20, 420), between(15, 100));
  }
  crowd.sort((a, b) => a.at - b.at);
  const wanted = Math.max(0, v.apply - named.apply);
  const applicants = wanted ? crowd.slice(-wanted) : []; // slice(-0) would be everyone
  const bookers = applicants.slice(0, Math.max(0, v.book - named.book));
  const buyers = bookers.slice(0, Math.max(0, v.buy - named.buy));
  for (const p of applicants) {
    Object.assign(p, person(newName(), { visitor: p.visitor, place: p.place, device: p.device }));
    event(p, p.at + 8 * 60000, "form_start");
    applyLead(p, p.at + 12 * 60000);
  }
  for (const p of bookers) {
    const callAt = onTheHalfHour(Math.min(p.at + between(1, 4) * DAY, NOW + between(3, 12) * DAY));
    book(p, p.at + 30 * 60000, callAt);
    if (callAt > NOW) continue;
    if (buyers.includes(p)) {
      const full = rnd() < 0.6;
      outcome(p, { attended: "showed", result: "closed", deal_cents: OFFER.pif, payment_type: full ? "pif" : "deposit", pre_sold: pick(["yes", "somewhat"]), notes: "Closed on the call." });
      pay(p, callAt + 2 * HOUR, full ? OFFER.pif : OFFER.deposit, full ? "The Process, paid in full" : "The Process, deposit");
      if (!full && callAt + 14 * DAY < NOW) pay(p, callAt + 14 * DAY, OFFER.deposit, "The Process, second half");
    } else if (NOW - callAt < 2 * DAY && awaitingForm.length < 2) {
      awaitingForm.push(p); // A call that happened with no post-call form yet: the Calls tab asks for one.
    } else {
      const [attended, result, objection] = CALL_RESULTS[resultN++ % CALL_RESULTS.length];
      outcome(p, { attended, result, objection, pre_sold: attended === "showed" ? pick(["somewhat", "no"]) : null, notes: objection ? `Objection: ${objection.toLowerCase()}.` : "Did not join the call." });
    }
  }
}

// 3c. People who came from the Instagram bio and story links (credited to Instagram, not to a video).
{
  const crowd = [];
  for (let i = 0; i < 52; i++) {
    const at = ago(between(0, 60), between(13, 22), between(0, 59));
    const p = { visitor: newVisitor(), place: pick(PLACES), device: pick(DEVICES)[0], at };
    crowd.push(p);
    page(p, at, i % 4 ? fromBio : { utm: { utm_source: "instagram", utm_medium: "story", utm_content: "l-tmigstory" } });
    if (rnd() < 0.55) watched(p, at + 90000, pick([20, 35, 50, 70, 90]));
    if (rnd() < 0.7) engaged(p, at + 5 * 60000, between(20, 380), between(15, 100));
  }
  crowd.sort((a, b) => a.at - b.at);
  const applicants = crowd.filter((p) => p.at < NOW - 3 * DAY).slice(-5);
  applicants.forEach((p, n) => {
    Object.assign(p, person(newName(), { visitor: p.visitor, place: p.place, device: p.device }));
    event(p, p.at + 8 * 60000, "form_start");
    applyLead(p, p.at + 12 * 60000);
    if (n >= 2) return;
    book(p, p.at + 40 * 60000, onTheHalfHour(p.at + 2 * DAY));
    if (n === 0) {
      outcome(p, { attended: "showed", result: "closed", deal_cents: OFFER.pif, payment_type: "pif", pre_sold: "yes", notes: "Found the channel through a story. Paid in full." });
      pay(p, p.booking.callAt + 2 * HOUR, OFFER.pif, "The Process, paid in full");
    } else outcome(p, { attended: "showed", result: "follow_up", pre_sold: "somewhat", objection: "Wants to start next month", notes: "Follow up on the 1st." });
  });
}

// 3d. Instagram DMs (ig_contacts and ig_dm_events): Luis, plus a few people who messaged without applying.
for (const [name, ref] of [["Ethan Shaw", "Story link"], ["Nina Park", "Bio link"], ["Omar Ellis", null]]) dm(person(name), ago(between(2, 20), between(9, 22)), [["inbound", 0], ["outbound", between(5, 40)], ["inbound", between(45, 200)]], ref);
for (const c of contacts) {
  const handle = c.p.handle || c.p.name.toLowerCase().replace(/[^a-z]+/g, ".");
  push(insert("ig_contacts", {
    id: c.id, client_id: CLIENT, ig_user_id: `demo-ig-${c.id.slice(-1)}`, ig_username: handle, ig_name: c.p.name, lead_email: c.p.email && c.p.booking ? c.p.email : null, lead_phone: null,
    link_source: c.ref ? "instagram" : null, first_dm_at: iso(c.startAt), last_dm_at: iso(c.startAt + c.messages.at(-1)[1] * 60000), first_ref: c.ref ? BIO : null, first_ref_label: c.ref,
    created_at: iso(c.startAt), updated_at: iso(NOW),
  }));
  c.messages.forEach(([direction, minutes], n) => push(insert("ig_dm_events", { message_id: `${c.id}-m${n + 1}`, client_id: CLIENT, contact_id: c.id, direction, at: iso(c.startAt + minutes * 60000), ref: n === 0 && c.ref ? BIO : null, ref_label: n === 0 ? c.ref : null })));
}
// Bio and story link clicks for the Links screen (the named people above already made their own visits).
for (let n = 0; n < 214; n++) push(insert("asset_events", { token: BIO, client: CLIENT, at: iso(past(ago(between(0, 90), between(8, 23), between(0, 59)))) }));
for (let n = 0; n < 61; n++) push(insert("asset_events", { token: "tmigstory", client: CLIENT, at: iso(past(ago(between(0, 60), between(8, 23), between(0, 59)))) }));

// ---------- 4. Team ----------
push(insert("team_members", { id: "demo-tm-closer", client_id: CLIENT, name: "Demo trader", role: "closer", email: "coach@example.com", commission_pct: null, active: 1, created_at: iso(ago(120)), updated_at: iso(NOW) }));
push(insert("team_members", { id: "demo-tm-setter", client_id: CLIENT, name: "Ava Reed", role: "setter", email: "ava@example.com", setter_pct: 5, active: 1, created_at: iso(ago(60)), updated_at: iso(NOW) }));

// ---------- 5. Instagram: profile, reels, posts, stories, followers ----------
const FOLLOWERS = 11840;
const REELS = ["The 1% rule in 30 seconds", "What I check before every trade", "Stop doing this with your stop-loss", "My desk at 6am", "How I journal a losing day", "Risk this, not that", "3 signs you are revenge trading", "The setup I trade every week", "Why I sit on my hands at the open", "Pre-market in 45 seconds", "One trade, start to finish", "A rule I learned the hard way", "Your first $1,000 account", "The week I almost quit", "Scaling out vs all out"];
const POSTS = ["5 rules for sizing a trade (save this)", "My weekly review template", "The pre-market checklist I use", "Losing streaks: what to do next", "A student's first funded account"];
const feed = [];
REELS.forEach((caption, n) => {
  const reach = between(3200, 9800) + (n === 2 ? 21000 : 0);
  const views = Math.round(reach * (1.35 + rnd() * 0.3));
  feed.push({
    id: `demo-tm-reel-${n + 1}`, caption, media_type: "VIDEO", media_product_type: "REELS", permalink: "", thumbnail_url: "", timestamp: iso(ago(2 + n * 5.5, 17)),
    metrics: {}, insights: { reach, views, likes: Math.round(reach * 0.05), comments: Math.round(reach * 0.004), shares: Math.round(reach * (0.004 + rnd() * 0.01)), saved: Math.round(reach * (0.008 + rnd() * 0.02)), totalInteractions: 0, avgWatchTimeMs: between(5200, 11800), profileVisits: Math.round(reach * 0.012), follows: Math.round(reach * 0.003) },
  });
});
POSTS.forEach((caption, n) => {
  const reach = between(2400, 6200);
  feed.push({
    id: `demo-tm-post-${n + 1}`, caption, media_type: "CAROUSEL_ALBUM", media_product_type: "FEED", permalink: "", thumbnail_url: "", timestamp: iso(ago(4 + n * 14, 13)),
    metrics: {}, insights: { reach, views: Math.round(reach * 1.6), likes: Math.round(reach * 0.06), comments: Math.round(reach * 0.006), shares: Math.round(reach * 0.012), saved: Math.round(reach * 0.035), totalInteractions: 0, avgWatchTimeMs: 0, profileVisits: Math.round(reach * 0.01), follows: Math.round(reach * 0.002) },
  });
});
for (const item of feed) {
  const i = item.insights;
  i.totalInteractions = i.likes + i.comments + i.shares + i.saved;
  item.metrics = { views: i.views, reach: i.reach, likes: i.likes, comments: i.comments, shares: i.shares, saves: i.saved, follows: i.follows, engagementRate: i.reach ? i.totalInteractions / i.reach : 0 };
}
// Story sequences: a burst of 4 to 6 stories most days; views fall off slide by slide, replies are DMs.
const SEQUENCES = [
  { days: 0, type: "credibility", topic: "Maya's first week in The Process", slides: 4, reach: 1090, dms: 17 },
  { days: 1, type: "value-driven", topic: "The 1% rule, slide by slide", slides: 5, reach: 1180, dms: 14 },
  { days: 3, type: "q&a", topic: "Your questions about trading with a job", slides: 6, reach: 1040, dms: 21 },
  { days: 5, type: "credibility", topic: "A student's first funded account", slides: 4, reach: 1320, dms: 18 },
  { days: 8, type: "breakdown", topic: "Breaking down Tuesday's trade", slides: 5, reach: 990, dms: 9 },
  { days: 10, type: "cta", topic: "Three spots open for The Process", slides: 4, reach: 1210, dms: 26 },
  { days: 12, type: "day-in-the-life", topic: "A trading morning before work", slides: 6, reach: 930, dms: 7 },
  { days: 15, type: "value-driven", topic: "Where I put my stop, and why", slides: 5, reach: 1060, dms: 11 },
  { days: 17, type: "q&a", topic: "How much do you need to start", slides: 5, reach: 1110, dms: 16 },
  { days: 19, type: "credibility", topic: "What three months in the program looks like", slides: 4, reach: 1150, dms: 19 },
  { days: 22, type: "breakdown", topic: "My losing week, honestly", slides: 6, reach: 970, dms: 12 },
  { days: 24, type: "cta", topic: "Applications open this week", slides: 4, reach: 1240, dms: 24 },
  { days: 26, type: "value-driven", topic: "Journaling a trade in 10 minutes", slides: 5, reach: 1010, dms: 10 },
];
const stories = [];
SEQUENCES.forEach((s, n) => {
  const start = postedAt(s);
  s.views = [];
  for (let k = 0; k < s.slides; k++) {
    const views = Math.round(s.reach * (k ? 0.93 * Math.pow(0.9, k - 1) : 1) * (0.98 + rnd() * 0.04));
    s.views.push(views);
    stories.push({
      id: `demo-tm-story-${n + 1}-${k + 1}`, caption: "", media_type: "IMAGE", media_product_type: "STORY", permalink: "", thumbnail_url: "", timestamp: iso(start + k * 6 * 60000),
      metrics: {}, insights: { reach: views, views, replies: k === s.slides - 1 ? s.dms : 0, navigation: Math.round(views * 0.9), profileVisits: Math.round(views * 0.02), follows: Math.round(views * 0.003) },
      capturedAt: iso(start + k * 6 * 60000),
    });
  }
});
const capturedAt = iso(NOW - 3 * HOUR);
const views = summarize(feed, stories, NOW);
const reachPoints = [];
for (let d = 29; d >= 0; d--) reachPoints.push({ end_time: iso(ago(d, 7)), value: Math.round(4200 + 1600 * Math.sin(d / 3) + rnd() * 1800 + (d === 22 ? 9000 : 0)) });
const insights = {
  reach: { points: reachPoints, total: reachPoints.reduce((n, p) => n + p.value, 0) },
  views: { points: [], total: 412000 }, accounts_engaged: { points: [], total: 9800 }, total_interactions: { points: [], total: 23600 }, profile_links_taps: { points: [], total: 1480 },
};
const profile = { id: "demo-ig-trader", username: IG, name: "Demo trader", biography: "Funded trader. I teach the process that gets you paid out.", website: "", accountType: "", followers: FOLLOWERS, following: 312, mediaCount: feed.length, profilePicture: "" };
const audience = { countries: [["US", 4870], ["GB", 1410], ["CA", 1020], ["DE", 640], ["NL", 480], ["AU", 430], ["IN", 390]].map(([name, value]) => ({ name, value })), age: [["18-24", 2900], ["25-34", 5600], ["35-44", 2300], ["45-54", 760]].map(([name, value]) => ({ name, value })) };
const snapshot = (kind, payload) => push(insert("snapshots", { scope: "client", client_id: CLIENT, source: "instagram", kind, captured_at: capturedAt, payload_json: json(payload) }));
snapshot("profile", profile);
snapshot("account", insights);
snapshot("media", feed);
for (const [kind, payload] of [["reels", views.reels], ["posts", views.posts], ["stories", views.stories], ["content", views.content], ["reels-summary", views.reelsSummary], ["posts-summary", views.postsSummary], ["stories-summary", views.storiesSummary], ["cadence", views.cadence], ["audience", audience]]) snapshot(kind, payload);
for (const story of stories) push(insert("stories", { scope: "client", client_id: CLIENT, media_id: story.id, captured_at: story.capturedAt, payload_json: json(story) }));
const metric = (name, ts, value) => push(insert("metric_points", { scope: "client", client_id: CLIENT, source: "instagram", metric: name, ts, value, dims_json: "{}" }));
for (let d = 89; d >= 0; d--) metric("followers", iso(ago(d, 6)), d ? Math.round(FOLLOWERS - d * 21 - (d > 22 ? 260 : 0) + rnd() * 25 - 12) : FOLLOWERS);
for (const point of reachPoints) metric("reach", point.end_time, point.value);
metric("media_count", capturedAt, feed.length);
for (const [name, key] of [["reach", "reach_30d"], ["views", "views_30d"], ["accounts_engaged", "accounts_engaged_30d"], ["total_interactions", "interactions_30d"]]) metric(key, capturedAt, insights[name].total);
// Where the followers are (follower_places, #77).
for (const [place, followers] of audience.countries.map((c) => [c.name, c.value])) push(insert("follower_places", { client_id: CLIENT, kind: "country", place, followers, fetched_at: capturedAt }));
for (const [place, followers] of [["New York", 690], ["London", 610], ["Toronto", 470], ["Los Angeles", 420], ["Chicago", 310], ["Austin", 260], ["Berlin", 230]]) push(insert("follower_places", { client_id: CLIENT, kind: "city", place, followers, fetched_at: capturedAt }));
// Weekly follower snapshots, oldest first, for the follower chart and the weekly report.
for (let w = 25; w >= 0; w--) {
  push(insert("account_snapshots", { client_id: CLIENT, taken_on: iso(ago(w * 7)).slice(0, 10), followers: w ? Math.round(FOLLOWERS - w * 152 - (w > 3 ? 240 : 0) + rnd() * 30) : FOLLOWERS, icp_leads: between(4, 14), avg_views: between(2100, 3400), notes: null, created_at: iso(ago(w * 7)) }));
}

// ---------- 6. Story sequences: made in the app, posted, and their numbers ----------
// Sequences go out at 18:30 UTC; today's went out in the morning, so nothing is dated in the future.
function postedAt(s) { return s.days ? ago(s.days, 18, 30) : ago(0, 8, 30); }
const SLIDE_COPY = {
  "value-driven": ["Most traders size by feel.", "Here is the rule I use instead.", "Risk 1% of the account. Every trade.", "Work back from the stop to the size.", "Reply SIZE and I'll send the sheet."],
  "q&a": ["You asked: can I trade with a 9 to 5?", "Short answer: yes, if you pick your hours.", "I trade the first 2 hours of New York.", "Everything else is review.", "The routine is in my latest video.", "Questions? Reply here."],
  credibility: ["Three months ago she blew her second account.", "Last week she passed her first challenge.", "Same market. A different process.", "Applications are open. Link in bio."],
  breakdown: ["Tuesday's trade, start to finish.", "The setup: a retest of the open.", "Entry, stop, target.", "What I did when it went against me.", "The result, and the lesson."],
  cta: ["I'm taking three people this month.", "12 weeks, 1:1, built around your schedule.", "For traders who want a process.", "Apply with the link in my bio."],
  "day-in-the-life": ["5:45. Coffee, no charts yet.", "6:30. Pre-market levels.", "8:30. One trade or none.", "9:15. Journal.", "9:30. Off to work.", "That's the whole plan."],
};
SEQUENCES.forEach((s, n) => {
  const made = ago(s.days + 1, 10);
  const copy = SLIDE_COPY[s.type];
  const slides = copy.slice(0, s.slides).map((headline, k) => ({ n: k + 1, job: k === 0 ? "hook" : k === s.slides - 1 ? "cta" : "build", headline, body: "" }));
  push(insert("studio_sequences", {
    client_id: CLIENT, type: s.type, intent: s.type === "cta" ? "sell" : "nurture", topic: s.topic, goal: s.type === "cta" ? "Applications" : "Replies", trigger_word: s.type === "value-driven" ? "SIZE" : null,
    params_json: json({ instagram: { status: "posted", posted_at: iso(postedAt(s)) } }), output_json: json({ slides }), manual_prompt: null, status: "approved", review_note: null,
    created_at: iso(made), updated_at: iso(postedAt(s)),
  }));
  push(insert("sequence_log", {
    client_id: CLIENT, posted_on: iso(ago(s.days)).slice(0, 10), type: s.type, topic: s.topic, slide_count: s.slides, slide_views_json: json(s.views), dms: s.dms,
    profile_visits: Math.round(s.reach * 0.06), notes: `Logged from Instagram (auto:demo-tm-story-${n + 1}-1)`, created_at: iso(past(postedAt(s) + DAY)), updated_at: iso(past(postedAt(s) + DAY)),
  }));
});
// Two ready for this week, one waiting for review.
for (const [type, topic, status] of [["value-driven", "The checklist before every trade", "approved"], ["cta", "Last two spots this month", "review"], ["q&a", "Is it too late to start trading?", "draft"]]) {
  push(insert("studio_sequences", {
    client_id: CLIENT, type, intent: type === "cta" ? "sell" : "nurture", topic, goal: type === "cta" ? "Applications" : "Replies", params_json: "{}",
    output_json: json({ slides: SLIDE_COPY[type].map((headline, k) => ({ n: k + 1, headline, body: "" })) }), status, created_at: iso(ago(0, 9)), updated_at: iso(ago(0, 9)),
  }));
}

// ---------- 7. The week: content plan, pipeline, to-dos, plans ----------
const monday = (() => { const d = new Date(NOW); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.getTime(); })();
const dayOf = (offset) => iso(monday + offset * DAY).slice(0, 10);
const slots = [
  { id: "tm-yt", date: dayOf(1), time: "15:00", format: "long-form", title: "Weekly YouTube video", repeat: "weekly", remind: true },
  { id: "tm-short-mon", date: dayOf(0), time: "12:00", format: "short", title: "Short from the video", repeat: "weekly", remind: true },
  { id: "tm-short-thu", date: dayOf(3), time: "12:00", format: "short", title: "Short from the video", repeat: "weekly", remind: true },
  { id: "tm-reel-wed", date: dayOf(2), time: "17:00", format: "reel", title: "Reel: one rule, one example", repeat: "weekly", remind: true },
  { id: "tm-reel-sat", date: dayOf(5), time: "11:00", format: "reel", title: "Reel: desk and routine", repeat: "weekly", remind: true },
  { id: "tm-story-mon", date: dayOf(0), time: "18:30", format: "story", title: "Story sequence: value", repeat: "weekly", remind: true },
  { id: "tm-story-wed", date: dayOf(2), time: "18:30", format: "story", title: "Story sequence: Q&A", repeat: "weekly", remind: true },
  { id: "tm-story-fri", date: dayOf(4), time: "18:30", format: "story", title: "Story sequence: proof and CTA", repeat: "weekly", remind: true },
  { id: "tm-carousel", date: dayOf(3), time: "13:00", format: "carousel", title: "Carousel: 5 rules (save this)", repeat: "biweekly", remind: true },
];
push(`INSERT INTO workspace_preferences (client_id, key, value_json, updated_at) VALUES (${q(CLIENT)}, 'content-plan', ${q(json({ slots }))}, ${q(iso(NOW))})
  ON CONFLICT(client_id, key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at;`);
const ITEMS = [
  ["My Simple 1-Minute Scalping Strategy (Backtested Results)", "published", "YouTube", 1], ["Pre-market in 45 seconds", "published", "Instagram", 0], ["The 1% rule, slide by slide", "published", "Instagram", 0],
  ["Why I sit on my hands at the open", "scheduled", "Instagram", 3], ["Is it too late to start trading?", "production", "YouTube", 8], ["Carousel: 5 rules for sizing", "scheduled", "Instagram", 4],
  ["Trading Live Losing $3,234 (NEVER MOVE YOUR SL)", "published", "YouTube", -7], ["Short: the 1% rule", "published", "YouTube", -3],
];
for (const [title, stage, platform, offset] of ITEMS) push(insert("content_items", { client: CLIENT, title, stage, platform, url: null, notes: null, scheduled_for: dayOf(offset), updated_at: iso(past(monday + Math.max(0, offset) * DAY + 15 * HOUR)) }));
// The launch checklist is for a new client; the example account is past it.
push(`INSERT INTO workspace_preferences (client_id, key, value_json, updated_at) VALUES (${q(CLIENT)}, 'launch-checklist', ${q(json({ completed: [], dismissed: true }))}, ${q(iso(NOW))})
  ON CONFLICT(client_id, key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at;`);
const section = (name, value) => push(insert("client_dashboard_content", { client_id: CLIENT, section: name, json: json(value), updated_at: iso(NOW) }));
section("todos", { items: [
  { label: "Film next week's YouTube video", owner: "Coach", deadline: dayOf(4), done: false },
  { label: "Approve the CTA story sequence", owner: "Coach", deadline: dayOf(2), done: false },
  { label: "Call Grace Kim back", owner: "Ava", deadline: dayOf(0), done: false },
  { label: "Send the rebook link to no-shows", owner: "Ava", deadline: dayOf(1), done: true },
] });
section("plans", { items: [
  { title: "YouTube: one video a week", status: "Active", progress_pct: 80, detail: "30 videos out. Next: more student results and strategy breakdowns, the two kinds that sell." },
  { title: "Story sequences most days", status: "Active", progress_pct: 65, detail: "12 sequences in the last 4 weeks. CTA days bring the most DMs." },
  { title: "Fill the program: 6 new students this month", status: "Active", progress_pct: 50, detail: "3 so far this month." },
] });

// ---------- 8. Onboarding answers, so Home shows the working product ----------
const BRAIN = {
  identity: { name: "Demo trader", nickname: "Coach", age: "29", niche: "trading", niche_line: "I help traders pass prop firm challenges and get paid out.", handles: [`YouTube: ${YT}`, `Instagram: @${IG}`], relationship_status: "prefer-not" },
  offer: { direction: "The Process: a 12-week 1:1 mentorship for day traders who want a repeatable process.", history: "selling", target_price: "3-5k", target_type: "1on1", payment_platforms: ["stripe"], past_growth_help: { picks: ["none"], details: {} } },
  icp: { client_guess: "Traders with a day job who have blown at least one account.", age_range: ["25-34"], life_stage: ["job"], income: "4-8k", gender_mix: "mostly-men", engagers: "intermediate", known: "yes", best_client: "A trader with a 9 to 5 who already knows the basics and wants structure.", buying_behaviour: ["dm-questions"], client_objections: ["time", "expensive"], payment_style: "plan" },
  voice: { tone: ["direct", "calm"], persona: "mentor", persona_second: "big-brother", sliders: { calm_hype: 30, polished_raw: 55 }, curse_slang: "none", filter: "clean", flagged_level: "none", never_say: "Guaranteed profits. Get rich quick.", flagged_words: { ok: "", never: "guaranteed, signals" }, unhinged_level: "1" },
  proof: { has_proof: true, level: "some", own_best: "Students passing their first funded challenge.", own_how: "Screenshots of student results, shared with permission.", own_proof: ["screenshot"], own_enough: { pick: "yes", more: "" }, closest_thing: { pick: "students", more: "" } },
  story: { narrative: "Blew accounts for two years, then built the process that got him funded and paid out, and now teaches it." },
  positioning: { mechanism_status: "named", method_walkthrough: "The Process: size, plan, trade, review.", difference_known: "yes", content_shows_it: "yes", love_topics: "Risk, sizing, routines, reviewing trades.", hour_topic: "How to size a trade so one loss never ruins a week." },
  program: { status: "running", missing: [] },
  content: { home_platform: "youtube", cadence: { youtube: "weekly", reels: "weekly", instagram: "daily" }, schedule: "fixed", yt_format: "talking-head", daily_time: "1-2h", film_hours: "2-3", video_time: "under-3h", script_time: "1-3h", hard_parts: ["ideas", "thumbnails"], hates: ["thumbnails", "posting"], longform_awareness: "yes-do", skills: { copy: "tried", scripting: "good", titles: "tried", thumbnails: "never", stories: "tried", carousels: "tried", editing: "tried" } },
  funnel: { has_funnel: { pick: "yes", more: "" }, path: ["youtube-video", "landing-page", "application", "call"], leak: { pick: "no-show", more: "" }, owners: { dms: "setter", calls: "me", followups: "setter" }, metrics: { leads: "20-50", cycle: "under-week" }, tracks_numbers: { pick: "sheet", more: "" }, ads: { pick: "never", more: "" }, non_buyer_followup: { pick: ["dms", "setter"], more: "" }, stage_focus: { pick: ["mof", "bof"], more: "" }, terms_known: ["lead-magnet", "funnel", "vsl", "icp"], tried: { picks: ["landing-vsl"], verdicts: { "landing-vsl": { verdict: "worked" } } }, wanted: { pick: "you-pick", more: "" } },
  money: { monthly_income: "9000", content_revenue_baseline: { mode: "amount", value: 6000 }, last_3_months: [{ month: "2026-07", revenue: 6000, profit: 4800 }, { month: "2026-08", revenue: 7500, profit: 6100 }, { month: "2026-09", revenue: 10500, profit: 8700 }] },
  intent: { why_joined: ["system", "more-buyers"], win_90d: { per_month: "20000" } },
  commitment: { promised: "in", understood: "yes" },
};
for (const [sectionName, fields] of Object.entries(BRAIN)) {
  for (const [field, value] of Object.entries(fields)) push(insert("client_brain", { client_id: CLIENT, section: sectionName, field, value_json: json(value), source: "client-form", updated_at: iso(ago(150)) }));
}

console.log(`-- Example workspace seed (Demo trader; money, leads and payments are estimates), built ${iso(NOW)}. Safe to rerun: it clears the example rows first.`);
console.log(statements.join("\n"));
