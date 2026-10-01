// Builds SQL for the Example workspace shown on sales calls (founder, 2026-10-01).
//
//   node tools/seed-demo-workspace.mjs > demo-seed.sql
//   npx wrangler d1 execute pulsify-portal --remote --file=demo-seed.sql
//
// Everything here is made up and labelled "Example" in the app. The workspace has status 'demo', which every
// cross-client total, feed, list and the pooled lead model leave out, so none of these numbers can reach the
// founder's real figures. Running it again wipes the example rows first and rebuilds them from today, so the
// last 30 days always look alive. It never touches any other client.

const CLIENT = "demo-example";
const NAME = "Example Trading Co";
const NOW = Date.now();
const DAY = 86400000;

// Deterministic, so a rerun gives the same story.
let seed = 20261001;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (list) => list[Math.floor(rnd() * list.length)];
const iso = (ms) => new Date(ms).toISOString();
const q = (value) => (value === null || value === undefined ? "NULL" : typeof value === "number" ? String(value) : `'${String(value).replace(/'/g, "''")}'`);
const insert = (table, row) => `INSERT INTO ${table} (${Object.keys(row).join(",")}) VALUES (${Object.values(row).map(q).join(",")});`;

const VIDEOS = [
  { id: "demoVid0001", title: "The 3 risk rules I never break", weight: 0.4, buyers: 2, days: 24 },
  { id: "demoVid0002", title: "Why most traders blow their first account", weight: 0.3, buyers: 1, days: 17 },
  { id: "demoVid0003", title: "My trading journal, page by page", weight: 0.2, buyers: 1, days: 9 },
  { id: "demoVid0004", title: "Reading the 4-hour chart, full breakdown", weight: 0.1, buyers: 0, days: 3 },
];
const FIRST = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Cameron", "Drew", "Quinn", "Blake", "Rowan", "Sage", "Parker", "Reese", "Skyler", "Emerson", "Hayden"];
const LAST = ["Walker", "Reyes", "Bennett", "Carter", "Nguyen", "Foster", "Brooks", "Hughes", "Price", "Ward", "Cole", "Fisher", "Bell", "Murray", "Dunn"];
const PLACES = [["US", "Austin", 30.27, -97.74], ["US", "Miami", 25.76, -80.19], ["GB", "London", 51.5, -0.12], ["CA", "Toronto", 43.65, -79.38], ["US", "Denver", 39.74, -104.99], ["AU", "Sydney", -33.87, 151.21], ["DE", "Berlin", 52.52, 13.4]];

const out = [];
const statements = [];

// 1. Wipe the example rows only.
for (const [table, column] of [["page_events", "client"], ["watch_events", "client"], ["leads", "client"], ["pipeline_touches", "client_id"], ["payment_matches", "client_id"], ["payments", "client"], ["yt_videos", "client_id"], ["asset_links", "client"], ["client_brain", "client_id"], ["lead_models", "client_id"]]) {
  statements.push(`DELETE FROM ${table} WHERE ${column}=${q(CLIENT)};`);
}
statements.push(`DELETE FROM client_config WHERE client=${q(CLIENT)};`);
statements.push(insert("client_config", { client: CLIENT, client_name: NAME, status: "demo", updated_at: iso(NOW) }));

// 2. Visitors over the last 30 days: 200 visits, 120 plays, 70 started the form, 60 applied, 24 booked, 4 bought.
const people = [];
for (let i = 0; i < 200; i++) {
  const video = (() => { const r = rnd(); let acc = 0; for (const v of VIDEOS) { acc += v.weight; if (r < acc) return v; } return VIDEOS[0]; })();
  const fromYoutube = rnd() < 0.75;
  const age = Math.floor(rnd() * 30) * DAY + Math.floor(rnd() * DAY);
  const at = NOW - age;
  const [country, city, lat, lng] = pick(PLACES);
  const person = { index: i, visitor: `demo-v${String(i + 1).padStart(3, "0")}`, at, video: fromYoutube ? video : null, country, city, lat, lng };
  people.push(person);
}
people.sort((a, b) => a.at - b.at);
const played = people.filter((_, i) => i % 5 < 3);                  // 60%
const started = played.filter((_, i) => i % 12 < 7);                // 70 of 120
const applied = started.slice(-60);                                 // 60
const booked = applied.filter((_, i) => i % 5 < 2).slice(-24);      // 24
const buyers = [];
for (const video of VIDEOS) {
  const pool = booked.filter((p) => p.video?.id === video.id && !buyers.includes(p));
  for (let n = 0; n < video.buyers && pool.length; n++) buyers.push(pool.pop());
}
while (buyers.length < 4) { const spare = booked.find((p) => !buyers.includes(p)); if (!spare) break; buyers.push(spare); }

const used = new Set();
const nameOf = (person) => {
  let name;
  do { name = `${pick(FIRST)} ${pick(LAST)}`; } while (used.has(name));
  used.add(name);
  person.name = name;
  person.email = `${name.toLowerCase().replace(/ /g, ".")}@example.com`;
};

for (const p of people) {
  const utm = p.video ? { utm_source: "youtube", utm_content: p.video.id } : {};
  statements.push(insert("page_events", { client: CLIENT, visitor_id: p.visitor, session_id: `${p.visitor}-s`, page_id: "main", event: "page_view", path: "/", utm_json: JSON.stringify(utm), utm_source: utm.utm_source ?? null, utm_content: utm.utm_content ?? null, country: p.country, city: p.city, lat: p.lat, lng: p.lng, at: iso(p.at) }));
}
for (const p of played) {
  statements.push(insert("watch_events", { client: CLIENT, visitor_id: p.visitor, session_id: `${p.visitor}-s`, media_id: "demo-vsl", event: "play", percent: 0, at: iso(p.at + 20000), watch_seconds: 0 }));
}
for (const p of started) {
  statements.push(insert("page_events", { client: CLIENT, visitor_id: p.visitor, session_id: `${p.visitor}-s`, page_id: "main", event: "form_start", path: "/apply", at: iso(p.at + 180000) }));
}

// 3. The people who opted in (85 of the viewers), applied, booked and bought.
const optedIn = [...new Set([...played.slice(-85), ...applied, ...booked, ...buyers])];
for (const p of optedIn) nameOf(p);
const touch = (p, kind, offsetMs, extra = {}) => statements.push(insert("pipeline_touches", { client_id: CLIENT, contact_email: p.email, contact_name: p.name, kind, ts: iso(Math.min(NOW - 600000, p.at + offsetMs)), source: "demo", external_id: `demo-${kind}-${p.visitor}`, payload_json: "{}", ...extra }));
for (const p of optedIn) touch(p, "optin", 60000);
for (const p of applied) {
  touch(p, "application", 240000);
  statements.push(insert("leads", { client: CLIENT, email: p.email, name: p.name, revenue: pick(["Under $1k a month", "$1k to $5k a month", "$5k to $10k a month"]), situation: pick(["Blew an account and want a system", "Profitable some months, not consistent", "New to trading, serious about learning"]), applied_at: iso(Math.min(NOW - 600000, p.at + 240000)), status: "new", visitor_id: p.visitor, source: "demo", updated_at: iso(NOW) }));
}
for (const p of booked) touch(p, "booking", 3 * 3600000);

// 4. Four buyers, $1,875 each = $7,500 collected, matched to the people who paid.
buyers.forEach((p, index) => {
  const when = Math.min(NOW - 3600000, p.at + (2 + index) * DAY);
  const reference = `demo-pay-${index + 1}`;
  statements.push(insert("payments", { client: CLIENT, amount_cents: 187500, currency: "USD", rail: "stripe", reference, occurred_at: iso(when), recorded_by: "demo", note: "Example payment", created_at: iso(when), customer_email: p.email, customer_name: p.name, kind: "charge", refunded_cents: 0 }));
  statements.push(`INSERT INTO payment_matches (payment_id, client_id, target_kind, target_id, target_label, confidence, reasons_json, status, decided_by, decided_at, created_at, updated_at) SELECT id, ${q(CLIENT)}, 'contact_email', ${q(p.email)}, ${q(p.name)}, 1, '["example"]', 'confirmed', 'demo', ${q(iso(when))}, ${q(iso(when))}, ${q(iso(when))} FROM payments WHERE reference=${q(reference)};`);
  touch(p, "payment", (2 + index) * DAY, { amount_cents: 187500 });
});

// 5. Videos with their tracked links.
for (const video of VIDEOS) {
  const views = Math.round(2000 + rnd() * 9000);
  statements.push(insert("yt_videos", { client_id: CLIENT, video_id: video.id, channel_id: "demo-channel", title: video.title, published_at: iso(NOW - video.days * DAY), thumbnail_url: null, duration_seconds: 600 + Math.round(rnd() * 600), views, likes: Math.round(views * 0.04), comments: Math.round(views * 0.006), synced_at: iso(NOW) }));
  for (const placement of ["description", "pinned_comment"]) {
    statements.push(insert("asset_links", { token: `demo${video.id.slice(-4)}${placement === "description" ? "d" : "c"}`, client: CLIENT, label: `${video.title} (${placement.replace("_", " ")})`, target_url: "https://pulsify-ai.com/demo-example", created_at: iso(NOW - video.days * DAY), archived: 0, kind: "video", video_id: video.id, placement }));
  }
}

// 6. A finished onboarding, so Home shows the working product instead of the first-run card.
const brain = [
  ["identity", "name", "Example Trading Co", "client-form"],
  ["offer", "direction", "A 12-week 1:1 mentorship for day traders who want a repeatable process.", "client-form"],
  ["icp", "client_guess", "Traders with a day job who have blown at least one account.", "client-form"],
  ["voice", "tone", ["direct", "calm"], "client-form"],
  ["proof", "has_proof", true, "client-form"],
];
for (const [section, field, value, source] of brain) {
  statements.push(insert("client_brain", { client_id: CLIENT, section, field, value_json: JSON.stringify(value), source, updated_at: iso(NOW) }));
}

console.log(`-- Example workspace seed, built ${iso(NOW)}. Safe to rerun: it clears the example rows first.`);
console.log(statements.join("\n"));
void out;
