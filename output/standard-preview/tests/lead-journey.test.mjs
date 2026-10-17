// The lead's journey: every step for one person across Instagram, YouTube and the funnel,
// with credit staying on the first touch (pulsify-saas #75).
import assert from "node:assert/strict";
import { loadPerson } from "../functions/_shared/lead-people.js";
import { onRequestGet as personGet } from "../functions/api/lead-person.js";
import { makeLeadDb } from "./lead-test-db.mjs";

const { sql, env, NOW, ago, ahead, addClient, page, engage, watch, lead, touch, contact, pay } = makeLeadDb();
await addClient("acme", "token-acme");
await addClient("other", "token-other");

// A tracked link in the client's Instagram bio, and a YouTube video.
sql.prepare("INSERT INTO asset_links(token,client,label,target_url,created_at,kind,source,placement) VALUES(?,?,?,?,?,?,?,?)")
  .run("bio1", "acme", "Bio link", "https://pulsify-ai.com/acme", ago(30), "link", "instagram", "bio");
sql.prepare("INSERT INTO yt_videos(client_id,video_id,title,synced_at) VALUES(?,?,?,?)").run("acme", "vid111", "How I find trades", ago(30));

// Ann: Tuesday an Instagram bio click, Friday a YouTube video, Sunday applied, Monday booked, Wednesday paid.
page("acme", "ann-1", "page_view", ago(9), { utm: { utm_source: "instagram", utm_medium: "bio", utm_content: "l-bio1" }, referrer: "https://l.instagram.com/", email: "ann@example.com" }); // her phone: the email was attached when she opted in
engage("acme", "ann-1", ago(9), { active_seconds: 45, max_scroll: 30, load_id: "a1" });
page("acme", "ann-2", "page_view", ago(6), { utm: { utm_source: "youtube", utm_content: "vid111" } });
page("acme", "ann-2", "page_view", ago(6, -1), { utm: { utm_source: "youtube", utm_content: "vid111" } });
watch("acme", "ann-2", "play", 1, ago(6));
watch("acme", "ann-2", "percent_90", 95, ago(6));
lead("acme", "ann@example.com", ago(4), { name: "Ann Lee", phone: "(415) 555-2671", handle: "ann.lee", visitor: "ann-2" });
page("acme", "ann-2", "form_submit", ago(4), { email: "ann@example.com" });
touch("acme", "ann@example.com", "application", ago(4), "app-ann");
touch("acme", "ann@example.com", "booking", ahead(1), "book-ann", { starts_at: ahead(1), booked_at: ago(3) });
pay("acme", "ann@example.com", 200000, ago(1));
// She also messaged the client on Instagram (handle matches), before any of the above.
contact("acme", "c-ann", { username: "ann.lee", name: "Ann Lee", at: ago(10) });
sql.prepare("INSERT INTO ig_dm_events(message_id,client_id,contact_id,direction,at,ref_label) VALUES(?,?,?,?,?,?)").run("m1", "acme", "c-ann", "inbound", ago(10), "Bio link");
sql.prepare("INSERT INTO ig_dm_events(message_id,client_id,contact_id,direction,at,ref_label) VALUES(?,?,?,?,?,?)").run("m2", "acme", "c-ann", "outbound", ago(10, -1), null);
sql.prepare("INSERT INTO ig_dm_events(message_id,client_id,contact_id,direction,at,ref_label) VALUES(?,?,?,?,?,?)").run("m3", "acme", "c-ann", "inbound", ago(10, -2), null);
// Another client's person with the same email never leaks in.
lead("other", "ann@example.com", ago(2), { name: "Ann Lee" });
page("other", "o-1", "page_view", ago(2), { email: "ann@example.com", utm: { utm_source: "tiktok" } });

const ann = await loadPerson(env, "acme", "ann@example.com", { now: NOW });
const kinds = ann.journey.map((e) => e.kind);
assert.ok(kinds.includes("dm") && kinds.includes("page_view") && kinds.includes("watch") && kinds.includes("application") && kinds.includes("booking") && kinds.includes("payment"), `all the steps are there: ${kinds}`);
const chronological = [...ann.journey].reverse();
assert.deepEqual(chronological.map((e) => e.at), [...chronological.map((e) => e.at)].sort(), "newest first from the backend");

const dm = ann.journey.find((e) => e.kind === "dm");
assert.equal(dm.inbound, 2, "three messages the same day are one line: two from her");
assert.equal(dm.outbound, 1);
assert.equal(dm.ref, "Bio link", "the link that started the DM");

const bio = ann.journey.find((e) => e.kind === "page_view" && e.link);
assert.deepEqual(bio.link, { label: "Bio link", source: "instagram", placement: "bio" }, "a tracked click says which link");
assert.equal(bio.source, "instagram");
const yt = ann.journey.find((e) => e.kind === "page_view" && e.video);
assert.equal(yt.video, "How I find trades");
assert.equal(yt.link, null);

const firsts = ann.journey.filter((e) => e.first_touch);
assert.equal(firsts.length, 1, "exactly one first touch");
assert.equal(firsts[0].kind, "dm", "her DM was the first way she reached us");
assert.equal(ann.journey.at(-1).first_touch, true, "and it is the oldest line");
assert.equal(ann.source.channel, "instagram", "credit stays with the first touch");
assert.ok(!ann.journey.some((e) => e.place && /tiktok/.test(e.source || "")), "nothing from another client");

// Without a DM, the first touch is the bio click.
sql.prepare("DELETE FROM ig_dm_events").run();
sql.prepare("DELETE FROM ig_contacts").run();
const noDm = await loadPerson(env, "acme", "ann@example.com", { now: NOW });
assert.equal(noDm.journey.filter((e) => e.first_touch).length, 1);
assert.equal(noDm.journey.find((e) => e.first_touch).link.label, "Bio link");

// A person who exists only as an Instagram contact has a journey too.
contact("acme", "c-bo", { username: "bo.rivers", name: "Bo Rivers", at: ago(2) });
sql.prepare("INSERT INTO ig_dm_events(message_id,client_id,contact_id,direction,at,ref_label) VALUES(?,?,?,?,?,?)").run("m9", "acme", "c-bo", "inbound", ago(2), null);
const bo = await loadPerson(env, "acme", "h:bo.rivers", { now: NOW });
assert.equal(bo.name, "Bo Rivers");
assert.equal(bo.handle, "bo.rivers");
assert.equal(bo.anonymous, false);
assert.deepEqual(bo.journey.map((e) => e.kind), ["dm"]);
assert.equal(bo.journey[0].first_touch, true);
assert.equal(bo.email, null);

// Through the API, for the client and the operator.
const get = (path, headers) => personGet({ request: new Request(`https://pulsify-ai.com${path}`, { headers }), env });
let res = await get("/api/lead-person?key=ann%40example.com", { "x-portal-token": "token-acme" });
assert.equal(res.status, 200);
assert.ok((await res.json()).person.journey.length >= 6);
res = await get("/api/lead-person?key=ann%40example.com&client=acme", { "x-admin-key": "admin-test-key" });
assert.equal(res.status, 200, "the operator sees the same timeline");
res = await get("/api/lead-person?key=ann%40example.com", { "x-portal-token": "token-other" });
assert.equal((await res.json()).person.journey.some((e) => e.kind === "dm" || e.kind === "payment"), false, "another client sees only its own person");

console.log("lead-journey: all checks passed");
