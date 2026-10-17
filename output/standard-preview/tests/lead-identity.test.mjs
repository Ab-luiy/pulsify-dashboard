// Match a person by email, phone or Instagram handle; a name alone only suggests (pulsify-saas #74).
// Pure rules first, then real SQLite with the real migrations.
import assert from "node:assert/strict";
import { contactDetailsIn, nameSuggestions, normalizeHandle, normalizeName, normalizePhone, weakMerges } from "../functions/_shared/lead-identity.js";
import { loadPerson, loadPipeline } from "../functions/_shared/lead-people.js";
import { onRequestPost as mergePost } from "../functions/api/lead-merge.js";
import { onRequestPost as eventPost } from "../functions/event.js";
import { makeLeadDb } from "./lead-test-db.mjs";

// ---------- phone numbers ----------
const phoneForms = ["(415) 555-2671", "415-555-2671", "415.555.2671", "+1 415 555 2671", "1 (415) 555-2671", "+14155552671", "415 555 2671 ext. 12", "001 415 555 2671", "415 555 2671 x9"];
for (const form of phoneForms) assert.equal(normalizePhone(form), "+14155552671", `${form} is one number`);
assert.equal(normalizePhone("07911 123456", "GB"), "+447911123456", "UK number typed locally, country known");
assert.equal(normalizePhone("+44 7911 123456"), "+447911123456", "UK number with the code");
assert.equal(normalizePhone("0044 7911 123456"), "+447911123456", "00 means the same as +");
assert.equal(normalizePhone("0151 234 5678", "DE"), "+491512345678", "German trunk zero dropped");
assert.equal(normalizePhone("+49 151 2345678"), "+491512345678");
assert.equal(normalizePhone("07911 123456"), null, "no code and no country: too ambiguous to match on");
for (const junk of ["", "n/a", "none", "0000000000", "1111111111", "123456789", "1234567890", "5555555555", "000-000-0000", "12345", "+1 415 555 01", "415-555-0142", "(011) 555-2671", "(115) 555-2671", "abc", null, undefined]) {
  assert.equal(normalizePhone(junk), null, `${junk} is not a usable number`);
}
assert.equal(normalizePhone("+1 (212) 456-7890"), "+12124567890", "a real-looking number ending in 7890 is fine");

// ---------- Instagram handles ----------
for (const form of ["@jane.doe", "jane.doe", "JANE.DOE", "https://www.instagram.com/jane.doe/", "instagram.com/jane.doe?igsh=abc", " @@jane.doe ", "https://instagram.com/_u/jane.doe"]) {
  assert.equal(normalizeHandle(form), "jane.doe", `${form} is one handle`);
}
for (const junk of ["", "n/a", "none", "no", "instagram", "@", "my handle is jane", "jane doe", "jane@gmail.com", ".jane", "jane.", "ja..ne", "a".repeat(31), "https://instagram.com/p/Cxyz/", null]) {
  assert.equal(normalizeHandle(junk), null, `${junk} is not a handle`);
}

// ---------- names are hints ----------
assert.equal(normalizeName("Ánn  LEE"), "ann lee");
assert.equal(normalizeName("Ann Marie Lee"), "ann lee", "first and last");
assert.equal(normalizeName("Ann"), null, "one name is never enough");
assert.equal(normalizeName("John Doe"), null, "a stock name is never enough");
assert.equal(normalizeName("Test User"), null);

// ---------- details typed into a DM ----------
assert.deepEqual(contactDetailsIn("hey it's ann, ann@Example.com or call 415 555 2671 thanks"), { email: "ann@example.com", phone: "+14155552671" });
assert.deepEqual(contactDetailsIn("my order number is 20261017123456789"), { email: null, phone: null }, "a long number that is not a phone");
assert.deepEqual(contactDetailsIn("hello"), { email: null, phone: null });

// ---------- weak merges: the wrong ones ----------
const g = (id, phones = [], handles = []) => ({ id, phones: new Set(phones), handles: new Set(handles) });
{
  const r = weakMerges([g(1, ["+14155552671"], ["ann"]), g(2, ["+14155552671"], [])]);
  assert.deepEqual(r.merges, [[1, 2]], "same phone, the other record has no handle: one person");
  const r2 = weakMerges([g(1, ["+14155552671"], ["ann"]), g(2, ["+14155552671"], ["ben"])]);
  assert.deepEqual(r2.merges, [], "same phone but different handles: two people sharing a phone");
  assert.equal(r2.blocked.length, 1);
  const r3 = weakMerges([g(1, ["+14155552671"], ["ann"]), g(2, ["+12125550199"], ["ann"])]);
  assert.deepEqual(r3.merges, [], "same handle but different phones: not merged");
  const r4 = weakMerges([g(1, [], ["ann"]), g(2, ["+12125550199"], ["ann"])]);
  assert.deepEqual(r4.merges, [[1, 2]], "same handle, no phone on one side: merged");
  const r5 = weakMerges([g(1, ["+14155552671"], []), g(2, ["+14155552671"], [])], { different: () => true });
  assert.deepEqual(r5.merges, [], "the operator said they are different");
  assert.equal(r5.blocked.length, 0, "and it is not offered again");
  const r6 = weakMerges([g(1, ["+14155552671"], []), g(2, ["+14155552671"], []), g(3, ["+14155552671"], [])]);
  assert.equal(r6.merges.length, 2, "three records of one person become one");
}
{
  const a = { key: "ann@x.com", name: "Ann Lee", email: "ann@x.com" };
  const b = { key: "ann.lee@y.com", name: "ann lee", email: "ann.lee@y.com" };
  const c = { key: "bob@x.com", name: "Bob Ray", email: "bob@x.com" };
  const d = { key: "ann@z.com", name: "Ann", email: "ann@z.com" };
  assert.deepEqual(nameSuggestions(a, [a, b, c, d]).map((s) => s.key), ["ann.lee@y.com"]);
  assert.deepEqual(nameSuggestions(a, [a, b], { different: () => true }), []);
  assert.deepEqual(nameSuggestions(d, [a, b, c, d]), [], "a first name alone suggests nobody");
}

// ---------- real database ----------
const { sql, env, NOW, ago, addClient, lead, touch, contact } = makeLeadDb();
const people = async (client) => (await loadPipeline(env, client, { now: NOW })).raw;

await addClient("acme", "token-acme");
await addClient("other", "token-other");

// Ann opts in with an email and a phone, later applies with another email, the same phone and her handle.
lead("acme", "ann@gmail.com", ago(5), { name: "Ann Lee", phone: "(415) 555-2671", source: "optin" });
touch("acme", "ann@gmail.com", "optin", ago(5), "optin:ann");
lead("acme", "ann.lee@work.com", ago(2), { name: "Ann L", phone: "+1 415-555-2671", handle: "@ann.lee" });
touch("acme", "ann.lee@work.com", "application", ago(2), "app:ann");
// A DM-only person with her handle, no email yet.
contact("acme", "c1", { username: "ann.lee", name: "Ann Lee" });
// Someone else who only shares her name.
lead("acme", "ann.lee@elsewhere.org", ago(3), { name: "Ann Lee", phone: "+1 212 456 7890" });
// A couple sharing one phone, with different handles.
lead("acme", "sam@home.com", ago(4), { name: "Sam Cole", phone: "206-555-2188", handle: "sam.cole" });
lead("acme", "kim@home.com", ago(4), { name: "Kim Cole", phone: "(206) 555-2188", handle: "kim.cole" });
// A placeholder phone and a placeholder handle never join anyone.
lead("acme", "p1@x.com", ago(3), { name: "Pat One", phone: "0000000000", handle: "none" });
lead("acme", "p2@x.com", ago(3), { name: "Pat Two", phone: "0000000000", handle: "none" });
// The same phone at a different client is a different person.
lead("other", "ann.other@gmail.com", ago(2), { name: "Ann Other", phone: "(415) 555-2671" });

const all = await people("acme");
const ann = all.find((p) => p.emails.includes("ann@gmail.com"));
assert.ok(ann.emails.includes("ann.lee@work.com"), "the same phone joins her two emails into one record");
assert.equal(ann.handle, "ann.lee");
assert.equal(all.filter((p) => p.emails.includes("ann@gmail.com") || p.emails.includes("ann.lee@work.com")).length, 1);
assert.ok(!all.some((p) => p.key.startsWith("c:") || p.key === "h:ann.lee"), "the DM contact joined her record by handle");

const elsewhere = all.find((p) => p.emails.includes("ann.lee@elsewhere.org"));
assert.equal(elsewhere.emails.length, 1, "a name alone does not merge");
const sam = all.find((p) => p.emails.includes("sam@home.com"));
const kim = all.find((p) => p.emails.includes("kim@home.com"));
assert.notEqual(sam.key, kim.key, "a shared phone with different handles stays two people");
const pat = all.find((p) => p.emails.includes("p1@x.com"));
assert.deepEqual(pat.emails, ["p1@x.com"], "placeholder phone and handle never merge");
assert.equal(all.some((p) => p.emails.includes("ann.other@gmail.com")), false, "no other client's people in this list");
assert.equal((await people("other")).find((p) => p.emails.includes("ann.other@gmail.com")).emails.length, 1, "the same phone at another client is another person");

let detail = await loadPerson(env, "acme", "ann@gmail.com", { now: NOW });
assert.deepEqual(detail.identities.handles, ["ann.lee"]);
assert.deepEqual(detail.identities.phones, ["+14155552671"]);
assert.deepEqual(detail.suggestions.map((s) => s.email), ["ann.lee@elsewhere.org"], "same name is only a suggestion");
assert.equal(detail.suggestions[0].why, "same_name");
detail = await loadPerson(env, "acme", "sam@home.com", { now: NOW });
assert.equal(detail.suggestions[0].email, "kim@home.com");
assert.equal(detail.suggestions[0].why, "shared_phone", "a shared phone that disagrees on the rest is a suggestion too");
assert.equal(await loadPerson(env, "acme", "h:nobody", { now: NOW }), null);

// The operator settles it through the API.
const post = (body, headers = { "x-portal-token": "token-acme" }) => mergePost({
  request: new Request("https://pulsify-ai.com/api/lead-merge", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }),
  env,
});
assert.equal((await post({ a: "e:ann@gmail.com", b: "e:ann@gmail.com", decision: "same" })).status, 422, "not with themselves");
assert.equal((await post({ a: "ann@gmail.com", b: "e:x@y.com", decision: "same" })).status, 422, "a bad key is refused");
assert.equal((await post({ a: "e:ann@gmail.com", b: "e:ann.lee@elsewhere.org", decision: "maybe" })).status, 422);
assert.equal((await post({ a: "e:ann@gmail.com", b: "e:ann.lee@elsewhere.org", decision: "same" }, {})).status, 401, "signed in only");

// Not the same person: the suggestion goes away and stays away.
assert.equal((await post({ a: "e:ann@gmail.com", b: "e:ann.lee@elsewhere.org", decision: "different" })).status, 200);
detail = await loadPerson(env, "acme", "ann@gmail.com", { now: NOW });
assert.deepEqual(detail.suggestions, [], "dismissed");
// Same person: now one record, found under either email.
assert.equal((await post({ a: "e:ann@gmail.com", b: "e:ann.lee@elsewhere.org", decision: "clear" })).status, 200);
detail = await loadPerson(env, "acme", "ann@gmail.com", { now: NOW });
assert.equal(detail.suggestions.length, 1, "taking the decision back brings the suggestion back");
assert.equal((await post({ b: "e:ann@gmail.com", a: "e:ann.lee@elsewhere.org", decision: "same" })).status, 200, "either order");
detail = await loadPerson(env, "acme", "ann.lee@elsewhere.org", { now: NOW });
assert.ok(detail.emails.includes("ann@gmail.com") && detail.emails.includes("ann.lee@elsewhere.org"), "confirmed: one person");
assert.equal(detail.suggestions.length, 0);
// A client cannot decide for another client.
assert.equal((await post({ client: "acme", a: "e:x@y.com", b: "e:z@y.com", decision: "same" }, { "x-portal-token": "token-other" })).status, 403, "not for another client");
assert.equal((await post({ a: "e:x@y.com", b: "e:z@y.com", decision: "same" }, { "x-portal-token": "token-other" })).status, 200);
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM lead_merge_decisions WHERE client_id='other'").get().n, 1, "written to its own workspace only");
assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM lead_merge_decisions WHERE client_id='acme'").get().n, 1);

// A confirmed "different" also stops a phone from joining two records.
lead("acme", "dee@home.com", ago(1), { name: "Dee Fox", phone: "(512) 555-2299" });
lead("acme", "dee.fox@work.com", ago(1), { name: "D Fox", phone: "512-555-2299" });
assert.equal((await post({ a: "e:dee@home.com", b: "e:dee.fox@work.com", decision: "different" })).status, 200);
const afterApart = await people("acme");
assert.notEqual(afterApart.find((p) => p.emails.includes("dee@home.com")).key, afterApart.find((p) => p.emails.includes("dee.fox@work.com")).key, "the operator said two people");

// ---------- capture: the application form and the capture page ----------
const event = (body, query = "?client=acme") => eventPost({
  request: new Request(`https://pulsify-ai.com/event${query}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  env,
});
let res = await event({
  event_type: "form_response",
  form_response: {
    submitted_at: ago(0), token: "tf-1", hidden: { visitor_id: "v-new" },
    answers: [
      { type: "email", email: "Eve@Example.com", field: { ref: "email" } },
      { type: "text", text: "Eve Stone", field: { ref: "full_name" } },
      { type: "phone_number", phone_number: "+1 (303) 555-2400", field: { ref: "phone" } },
      { type: "text", text: "https://www.instagram.com/eve.stone/", field: { ref: "instagram" } },
    ],
  },
});
assert.equal(res.status, 200);
let row = sql.prepare("SELECT phone, ig_handle FROM leads WHERE client='acme' AND email='eve@example.com'").get();
assert.equal(row.phone, "+1 (303) 555-2400", "phone kept as typed");
assert.equal(row.ig_handle, "eve.stone", "the handle is stored without the link around it");
res = await event({ kind: "optin", email: "frank@example.com", name: "Frank Moss", phone: "(303) 555-2400", instagram: "@Frank.Moss", visitor_id: "v-frank", page_id: "optin" });
assert.equal(res.status, 200);
row = sql.prepare("SELECT phone, ig_handle FROM leads WHERE client='acme' AND email='frank@example.com'").get();
assert.equal(row.ig_handle, "frank.moss", "the capture page sends a handle too");
res = await event({ kind: "optin", email: "gus@example.com", instagram: "none", phone: "n/a" });
assert.equal(res.status, 200);
assert.equal(sql.prepare("SELECT ig_handle FROM leads WHERE email='gus@example.com'").get().ig_handle, null, "a placeholder handle is not stored");

// Eve then Frank share a phone but have different handles: not one person.
const captured = await people("acme");
assert.notEqual(captured.find((p) => p.emails.includes("eve@example.com")).key, captured.find((p) => p.emails.includes("frank@example.com")).key);
const eve = await loadPerson(env, "acme", "eve@example.com", { now: NOW });
assert.equal(eve.suggestions[0].email, "frank@example.com");
assert.equal(eve.suggestions[0].why, "shared_phone");

console.log("lead-identity: all checks passed");
