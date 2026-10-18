// Client Instagram DMs linked to lead records (pulsify-saas #76). Zernio is mocked with fixtures:
// no client Instagram is connected and nothing here makes a live call.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handleZernioEvent, syncZernioInbox } from "../workers/sync/src/jobs/zernio-inbox.js";
import { igMeLink, linkContactsForLead, referralOf } from "../functions/_shared/client-dms.js";
import { onRequestPost as eventPost } from "../functions/event.js";
import { clientForAccount } from "../functions/_shared/follower-places.js";
import { loadPerson, loadPipeline } from "../functions/_shared/lead-people.js";
import { onRequestGet as statusGet } from "../functions/api/client-dms.js";
import { makeLeadDb } from "./lead-test-db.mjs";

const { sql, env, NOW, ago, addClient, lead } = makeLeadDb();
sql.exec(readFileSync(new URL("../migrations/0030_zernio.sql", import.meta.url), "utf8"));
await addClient("acme", "token-acme");
await addClient("other", "token-other");
sql.prepare("INSERT INTO asset_links(token,client,label,target_url,created_at,kind,source,placement) VALUES(?,?,?,?,?,?,?,?)")
  .run("bio1", "acme", "Bio link", "https://pulsify-ai.com/acme", ago(30), "link", "instagram", "bio");

const get = (path, headers) => statusGet({ request: new Request(`https://pulsify-ai.com${path}`, { headers }), env });
const people = async () => (await loadPipeline(env, "acme", { now: NOW })).raw;
const contacts = () => sql.prepare("SELECT * FROM ig_contacts WHERE client_id='acme' ORDER BY id").all();
const dmEvents = () => sql.prepare("SELECT * FROM ig_dm_events ORDER BY at").all();
let n = 0;
const dm = (who, text, { direction = "incoming", ref = null, at = new Date(NOW - 60000 + (n += 1) * 1000).toISOString(), account = "acc-acme" } = {}) => ({
  id: `evt-${n}`,
  event: direction === "incoming" ? "message.received" : "message.sent",
  account: { accountId: account },
  conversation: { id: `conv-${who.id}`, participantId: who.id, participantUsername: who.username, participantName: who.name, accountId: account, updatedTime: at },
  message: { id: `m-${n}`, platformMessageId: `mid.${n}`, direction, text, sentAt: at, ...(ref ? { referral: { ref } } : {}) },
});
const send = (payload) => handleZernioEvent(env, payload, payload.id);

// ---------- helpers ----------
assert.equal(igMeLink("@Acme.Coach", "bio1"), "https://ig.me/m/acme.coach?ref=l-bio1");
assert.equal(igMeLink("n/a", "bio1"), null);
assert.equal(referralOf({ referral: { ref: "l-bio1" } }), "l-bio1");
assert.equal(referralOf({ ref: " x " }), "x");
assert.equal(referralOf({}, {}), null, "no ref is normal");

// ---------- not connected: a clear state, nothing stored ----------
let res = await get("/api/client-dms", { "x-portal-token": "token-acme" });
let body = await res.json();
assert.equal(body.connected, false);
assert.equal(body.people, 0);
assert.match(body.note, /Connect Instagram/);
assert.equal((await get("/api/client-dms", {})).status, 401);
assert.equal(await clientForAccount(env, "acc-acme"), null);

// ---------- connected (a mocked account) ----------
sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,created_at,updated_at) VALUES('client','acme','instagram',?,?,?)").run(JSON.stringify({ account_id: "acc-acme", username: "acme.coach" }), ago(2), ago(2));
assert.equal(await clientForAccount(env, "acc-acme"), "acme");
body = await (await get("/api/client-dms", { "x-portal-token": "token-acme" })).json();
assert.equal(body.connected, true);
assert.match(body.note, /No one has messaged you yet/);

// A stranger messages from the bio link: a person is created, with Instagram's id, username and name.
const ann = { id: "ig-100", username: "ann.lee", name: "Ann Lee" };
const hello = dm(ann, "hey, saw your bio", { ref: "l-bio1" });
let out = await send(hello);
assert.equal(out.stored, true);
assert.equal(out.created, true);
assert.equal(out.ref, "l-bio1");
let c = contacts();
assert.equal(c.length, 1);
assert.deepEqual([c[0].ig_user_id, c[0].ig_username, c[0].ig_name, c[0].first_ref, c[0].first_ref_label], ["igsid-ig-100".replace("igsid-", ""), "ann.lee", "Ann Lee", "l-bio1", "Bio link"]);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM ig_conversations").get().n, 0, "never mixed into the operator's inbox");
let all = await people();
let annPerson = all.find((p) => p.key === "h:ann.lee");
assert.ok(annPerson, "a DM creates a person on the client's leads");
assert.equal(annPerson.name, "Ann Lee");
assert.equal(annPerson.email, null);
let pipe = (await loadPipeline(env, "acme", { now: NOW })).people.find((p) => p.key === "h:ann.lee");
assert.equal(pipe.status, "messaged");
assert.equal(pipe.anonymous, false);
assert.deepEqual(pipe.steps.map((s) => s.key), ["messaged", "bought"], "starts at the message, not a page visit");
assert.match(pipe.next.text, /Reply, and ask for an email or phone/);

// The same event twice, and the same message in a later event, are kept once.
await send({ ...hello, id: "evt-again" }); // Zernio delivers the same message again under a new event id
await send(dm(ann, "one more thing"));
assert.equal(dmEvents().length, 2, "two messages from her, the repeat dropped");
// The client answers: stored, never changes where she came from.
await send(dm(ann, "thanks for reaching out", { direction: "outgoing", ref: "l-other" }));
c = contacts();
assert.equal(c[0].first_ref, "l-bio1");
assert.equal(dmEvents().filter((e) => e.direction === "outbound").length, 1);
assert.equal(dmEvents().find((e) => e.direction === "outbound").ref, null, "a reply has no ref");

// A DM that starts without a ref (Meta can drop it) is still a person; where it came from is simply unknown.
const bo = { id: "ig-200", username: "bo.rivers", name: "Bo Rivers" };
out = await send(dm(bo, "hi"));
assert.equal(out.ref, null);
assert.equal(contacts().find((x) => x.ig_username === "bo.rivers").first_ref, null);

// Her journey shows the DM with the link that started it.
let detail = await loadPerson(env, "acme", "h:ann.lee", { now: NOW });
const line = detail.journey.find((e) => e.kind === "dm");
assert.equal(line.ref, "Bio link");
assert.equal(line.inbound, 2);
assert.equal(line.outbound, 1);
assert.equal(line.first_touch, true);
assert.equal(detail.handle, "ann.lee");

// ---------- linking to a lead ----------
// She applies later with her handle: one record, found under her email, DM and application together.
lead("acme", "ann@example.com", ago(0), { name: "Ann Lee", phone: "(415) 555-2671", handle: "ann.lee" });
sql.prepare("INSERT INTO pipeline_touches(client_id,contact_email,kind,ts,source,external_id,payload_json) VALUES(?,?,?,?,?,?,?)").run("acme", "ann@example.com", "application", ago(0), "typeform", "app-ann", "{}");
assert.equal(await linkContactsForLead(env, "acme", "ann@example.com", "@ann.lee"), 1, "her earlier DM is linked the moment the lead has her handle");
assert.equal(contacts().find((x) => x.ig_username === "ann.lee").link_source, "handle");
all = await people();
assert.equal(all.filter((p) => p.name === "Ann Lee").length, 1, "the handle joins the DM to the lead");
annPerson = all.find((p) => p.emails.includes("ann@example.com"));
assert.equal(annPerson.contacts.length, 1);
detail = await loadPerson(env, "acme", "ann@example.com", { now: NOW });
assert.ok(detail.journey.some((e) => e.kind === "dm") && detail.journey.some((e) => e.kind === "application"), "the DM is on the same timeline as the application");
assert.equal(detail.journey.find((e) => e.first_touch).kind, "dm");

// The application form does the same on its own: Bo messaged first, then applied with his handle.
res = await eventPost({
  request: new Request("https://pulsify-ai.com/event?client=acme", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "optin", email: "bo@example.com", name: "Bo Rivers", instagram: "https://instagram.com/bo.rivers", page_id: "optin" }),
  }),
  env,
});
assert.equal(res.status, 200);
assert.equal(contacts().find((x) => x.ig_username === "bo.rivers").lead_email, "bo@example.com");
assert.equal((await people()).filter((p) => p.emails.includes("bo@example.com")).length, 1);

// A new DM from someone whose handle is already on a lead links straight away, and says how.
lead("acme", "cy@example.com", ago(1), { name: "Cy Park", handle: "cy.park" });
const cy = { id: "ig-300", username: "cy.park", name: "Cy" };
out = await send(dm(cy, "hello"));
assert.equal(out.link.linked, true);
assert.equal(out.link.link_source, "handle");
assert.equal(contacts().find((x) => x.ig_username === "cy.park").lead_email, "cy@example.com");
assert.equal((await people()).filter((p) => p.emails.includes("cy@example.com")).length, 1);

// An email they type that belongs to a lead links them; one that belongs to nobody does not.
lead("acme", "dee@example.com", ago(1), { name: "Dee Fox" });
const dee = { id: "ig-400", username: "dee.fox", name: "Dee Fox" };
out = await send(dm(dee, "I applied with dee@example.com"));
assert.equal(out.link.link_source, "email");
assert.equal(contacts().find((x) => x.ig_username === "dee.fox").lead_email, "dee@example.com");
const eve = { id: "ig-500", username: "eve.s", name: "Eve S" };
out = await send(dm(eve, "my friend is at someone@else.com"));
assert.equal(out.link.linked, false, "an email that is not a lead's is never trusted");
assert.equal(contacts().find((x) => x.ig_username === "eve.s").lead_email, null);

// A phone number typed in a DM joins a lead with that number, unless the details disagree.
lead("acme", "fay@example.com", ago(1), { name: "Fay Moreno", phone: "+1 512 555 2299" });
const fay = { id: "ig-600", username: "fay.m", name: "Fay M" };
out = await send(dm(fay, "call me on 512-555-2299"));
assert.equal(out.link.lead_phone, "+15125552299");
all = await people();
assert.equal(all.filter((p) => p.emails.includes("fay@example.com")).length, 1);
assert.ok(all.find((p) => p.emails.includes("fay@example.com")).handles.includes("fay.m"), "the phone number joined her DM to her lead");
// Two different people who give the same number are not merged: the handles disagree.
lead("acme", "gus@example.com", ago(1), { name: "Gus Hart", phone: "+1 303 555 2400", handle: "gus.hart" });
const gus2 = { id: "ig-700", username: "not.gus", name: "Not Gus" };
await send(dm(gus2, "my number is 303-555-2400"));
all = await people();
const gusLead = all.find((p) => p.emails.includes("gus@example.com"));
assert.equal(gusLead.contacts.length, 0, "not merged: a different handle");
assert.ok(all.find((p) => p.key === "h:not.gus"));
detail = await loadPerson(env, "acme", "gus@example.com", { now: NOW });
assert.equal(detail.suggestions[0].why, "shared_phone", "left for the operator to settle");

// ---------- the sweep: client conversations become DMs, never the operator's inbox ----------
sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,created_at,updated_at) VALUES('operator','','zernio',?,?,?)").run(JSON.stringify({ account_id: "acc-operator" }), ago(9), ago(9));
env.ZERNIO_API_KEY = "test-key-never-sent";
const requested = [];
const conv = { id: "conv-ig-800", accountId: "acc-acme", participantId: "ig-800", participantUsername: "hal.k", participantName: "Hal K", updatedTime: new Date(NOW - 1000).toISOString() };
const fetcher = async (url) => {
  requested.push(String(url));
  if (String(url).includes("/messages")) {
    return { ok: true, json: async () => ({ messages: [{ id: "s2", platformMessageId: "mid.s2", direction: "outgoing", text: "welcome", sentAt: new Date(NOW - 5000).toISOString() }, { id: "s1", platformMessageId: "mid.s1", direction: "incoming", text: "hello coach", sentAt: new Date(NOW - 9000).toISOString(), referral: { ref: "l-bio1" } }] }) };
  }
  return { ok: true, json: async () => ({ data: [conv], pagination: { hasMore: false } }) };
};
assert.equal(await syncZernioInbox(env, { fetcher }), 2);
assert.equal(contacts().find((x) => x.ig_username === "hal.k").first_ref_label, "Bio link");
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM ig_conversations").get().n, 0, "still nothing in the operator's inbox");
const before = requested.length;
assert.equal(await syncZernioInbox(env, { fetcher }), 0);
assert.equal(requested.length, before + 1, "an unchanged conversation is listed but its messages are not fetched again");
assert.ok(requested.every((u) => u.startsWith("https://zernio.com/api/v1/inbox/conversations")), "only the inbox is read; nothing else");
delete env.ZERNIO_API_KEY;

// ---------- the screen's numbers, and who can see them ----------
body = await (await get("/api/client-dms", { "x-portal-token": "token-acme" })).json();
assert.equal(body.connected, true);
assert.ok(body.people >= 7);
assert.ok(body.linked >= 3);
assert.ok(body.with_ref >= 2);
body = await (await get("/api/client-dms", { "x-portal-token": "token-other" })).json();
assert.deepEqual([body.connected, body.people], [false, 0], "another client sees none of it");
assert.equal((await get("/api/client-dms?client=other", { "x-portal-token": "token-acme" })).status, 403);

console.log("client-dms: all checks passed");
