// Tickets #78 and #79: the workflow layer and the lead magnet recipe. Real SQLite. Zernio, Resend and Workers AI are
// mocked, so nothing here can reach a live service, buy anything or email anyone.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { sha256Hex } from "../functions/_shared/common.js";
import { defineRecipe, decideApproval, getRun, listRuns, publicRun, resumeRun, retryRun, saveRecipe, startRun, sweepOutbox } from "../functions/_shared/workflows.js";
import "../functions/_shared/recipes/index.js";
import { onRequestGet as workflowsGet, onRequestPost as workflowsPost } from "../functions/api/workflows.js";
import { onRequestGet as getPage, onRequestPost as postPage } from "../functions/get/[[path]].js";
import { emitEvent } from "../functions/_shared/outbound-webhooks.js";

const sql = new DatabaseSync(":memory:");
const mig = (n) => readFileSync(new URL("../migrations/" + n, import.meta.url), "utf8");
sql.exec("CREATE TABLE client_config(client TEXT PRIMARY KEY,client_name TEXT,status TEXT,updated_at TEXT,portal_token_hash TEXT)");
sql.exec("CREATE TABLE leads(id INTEGER PRIMARY KEY AUTOINCREMENT,client TEXT,email TEXT,name TEXT,phone TEXT,revenue TEXT,situation TEXT,applied_at TEXT,updated_at TEXT,status TEXT,source TEXT,visitor_id TEXT,session_id TEXT,page_id TEXT,response_id TEXT,answers_json TEXT,utm_json TEXT,kit_status TEXT)");
sql.exec("CREATE TABLE watch_events(id INTEGER PRIMARY KEY AUTOINCREMENT,client TEXT,email TEXT,visitor_id TEXT,event TEXT,at TEXT)");
for (const n of ["0007_delivery_failures.sql", "0008_integrations_hub.sql", "0014_client_brain.sql", "0027_revenue_automation.sql", "0031_notifications.sql", "0036_automation_runs.sql", "0059_usage_counters.sql", "0081_workflows.sql", "0082_lead_magnet.sql"]) {
  for (const st of mig(n).replace(/--[^\n]*/g, "").split(";")) if (st.trim()) try { sql.exec(st); } catch { /* later migrations alter tables this test does not have */ }
}
sql.exec("CREATE TABLE IF NOT EXISTS page_events(id INTEGER PRIMARY KEY AUTOINCREMENT,client TEXT,visitor_id TEXT,session_id TEXT,page_id TEXT,event TEXT,email TEXT,path TEXT,referrer TEXT,utm_json TEXT,metadata_json TEXT,at TEXT)");
sql.prepare("INSERT INTO client_config VALUES('acme','Acme Coaching','client','x',?)").run(await sha256Hex("tok-acme"));
sql.prepare("INSERT INTO client_config VALUES('other','Other','client','x',?)").run(await sha256Hex("tok-other"));
sql.prepare("INSERT INTO client_brain(client_id,section,field,value_json,source,updated_at) VALUES('acme','proof','results','\"Members average 12k followers after 90 days\"','operator','x')").run();

const emailDraft = JSON.stringify({ subject: "Your guide is here", body: "Hi {{first_name}},\n\nHere is the guide.\n\n{{link}}\n\nIt took 340 hours to write." });
let aiReply = emailDraft;
let aiCalls = 0;
const AI = { run: async () => { aiCalls += 1; return { response: aiReply, choices: [{ message: { content: aiReply } }] }; } };
const DB = { prepare(q) { let a = []; const p = { bind(...v) { a = v; return p; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } }; return p; }, async batch(l) { const o = []; for (const s of l) o.push(await s.run()); return o; } };
const objects = new Map();
const MEDIA = { put: async (k, v) => void objects.set(k, v), get: async (k) => (objects.has(k) ? { body: objects.get(k) } : null), delete: async (k) => void objects.delete(k) };
const env = { DB, AI, MEDIA, ADMIN_KEY: "k", RESEND_API_KEY: "re_test", EMAIL_FROM: "Pulsify <hello@example.test>", ZERNIO_API_KEY: "zk_test", AI_DAILY_CAP: "20", PUBLIC_ORIGIN: "https://pulsify-ai.com" };

const sent = [];
const zernio = [];
const fetcher = async (url, init = {}) => {
  const u = String(url);
  if (u === "https://api.resend.com/emails") { sent.push(JSON.parse(init.body)); return new Response("{}", { status: 200 }); }
  if (u.startsWith("https://zernio.com/api/v1/comment-automations")) {
    zernio.push({ url: u, method: init.method, body: init.body ? JSON.parse(init.body) : null });
    return new Response(JSON.stringify(init.method === "POST" ? { success: true, automation: { id: "auto_1" } } : {}), { status: 200 });
  }
  throw new Error("unexpected network call: " + u);
};
const realFetch = globalThis.fetch;
globalThis.fetch = fetcher; // anything that forgets to take the injected fetcher is still caught and mocked
const operator = (body, query = "") => new Request("https://portal.test/api/workflows" + query, { method: "POST", headers: { "x-admin-key": "k", "content-type": "application/json" }, body: JSON.stringify({ client: "acme", ...body }) });
const asClient = (body, token = "tok-acme") => new Request("https://portal.test/api/workflows", { method: "POST", headers: { "x-portal-token": token, "content-type": "application/json" }, body: JSON.stringify(body) });
const post = async (req) => { const r = await workflowsPost({ request: req, env, data: {} }); return { status: r.status, json: await r.json() }; };
const get = async (client = "acme", headers = { "x-admin-key": "k" }) => { const r = await workflowsGet({ request: new Request(`https://portal.test/api/workflows?client=${client}`, { headers }), env, data: {} }); return { status: r.status, json: await r.json() }; };

try {
  // ---------- the generic layer: trigger, AI step, approval, wait, action ----------
  const trail = [];
  defineRecipe({
    kind: "test-recipe", title: "Test recipe", summary: "", defaultConfig: {},
    flows: {
      main: {
        label: "Main", outbox: "lead.created",
        steps: [
          { id: "write", type: "ai", label: "Write", async run(ctx) { const out = await ctx.ai({ system: "s", user: "Write about 340 hours" }, { sources: [] }); ctx.state.text = out.text; ctx.state.flagged = out.flagged; return { note: "written" }; } },
          { id: "ok", type: "approval", label: "Approve", propose: (ctx) => ({ fields: { text: ctx.state.text }, flagged: ctx.state.flagged }) },
          { id: "hold", type: "wait", label: "Wait for the call", event: "call.done" },
          { id: "go", type: "action", label: "Act", async run(ctx) { trail.push(ctx.state.approved.fields.text); if (ctx.deps.fail?.once) { ctx.deps.fail.once = false; throw new Error("The outside service was down."); } return { note: "done" }; } },
        ],
      },
    },
  });
  aiReply = "Plain words with 340 hours and 500 members.";
  const first = await startRun(env, { client: "acme", kind: "test-recipe", flow: "main", ref: "r1" });
  assert.equal(first.run.status, "awaiting_approval");
  assert.deepEqual(publicRun(first.run).approval.flagged, ["500"], "the invented 500 is flagged; 340 came from the request");
  assert.equal((await startRun(env, { client: "acme", kind: "test-recipe", flow: "main", ref: "r1" })).duplicate, true, "same trigger, same run");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM workflow_runs WHERE trigger_ref='r1'").get().n, 1);
  assert.equal(sql.prepare("SELECT status FROM automation_runs WHERE kind='workflow:test-recipe'").get().status, "running", "mirrored into automation_runs");

  assert.equal((await resumeRun(env, first.run.id, "call.done")).status, 409, "cannot skip the approval");
  const edited = await decideApproval(env, first.run.id, { approve: true, by: "client:acme", fields: { text: "Edited words", sneaky: "ignored" } });
  assert.equal(edited.run.status, "waiting");
  assert.equal((await resumeRun(env, first.run.id, "other.event")).status, 409);
  const deps = { fail: { once: true } };
  const failed = await resumeRun(env, first.run.id, "call.done", {}, deps);
  assert.equal(failed.run.status, "failed");
  assert.match(failed.run.error, /service was down/);
  const retried = await retryRun(env, first.run.id, deps);
  assert.equal(retried.run.status, "done");
  assert.deepEqual(trail, ["Edited words", "Edited words"], "only the approved text, and it ran again after the retry");
  assert.deepEqual(retried.run.steps.map((s) => s.status), ["done", "waiting", "done", "waiting", "done", "failed", "done"]);
  assert.equal(sql.prepare("SELECT status FROM automation_runs WHERE kind='workflow:test-recipe'").get().status, "done");

  const rejectRun = (await startRun(env, { client: "acme", kind: "test-recipe", flow: "main", ref: "r2" })).run;
  const rejected = await decideApproval(env, rejectRun.id, { approve: false, by: "operator:x" });
  assert.equal(rejected.run.status, "rejected");
  assert.equal((await decideApproval(env, rejectRun.id, { approve: true, by: "x" })).status, 409, "a decided run stays decided");

  // Outbox events start runs for enabled recipes only, once.
  await saveRecipe(env, "acme", "test-recipe", { config: {}, enabled: true });
  await emitEvent(env, { scope: "client", clientId: "acme", event: "lead.created", data: { name: "A" } });
  await emitEvent(env, { scope: "client", clientId: "other", event: "lead.created", data: { name: "B" } });
  assert.equal(await sweepOutbox(env), 1, "only the client with the recipe on");
  assert.equal(await sweepOutbox(env), 0, "a second sweep starts nothing new");

  // The AI allowance applies inside recipes: the run fails with the plain message.
  const tight = { ...env, AI_DAILY_CAP: "1" };
  sql.prepare("DELETE FROM usage_counters").run();
  const a = await startRun(tight, { client: "other", kind: "test-recipe", flow: "main", ref: "c1" });
  assert.equal(a.run.status, "awaiting_approval");
  const b = await startRun(tight, { client: "other", kind: "test-recipe", flow: "main", ref: "c2" });
  assert.equal(b.run.status, "failed");
  assert.match(b.run.error, /allowance/);
  sql.prepare("DELETE FROM workflow_runs WHERE client_id='other'").run();
  sql.prepare("DELETE FROM usage_counters").run();

  // ---------- lead magnet ----------
  aiReply = emailDraft;
  // Nothing configured yet: the screen data says exactly what is missing.
  let view = (await get()).json.recipes[0];
  assert.equal(view.kind, "lead-magnet");
  assert.equal(view.enabled, false);
  assert.deepEqual(view.missing, ["Pick the word people comment.", "Add the guide.", "Approve the email wording.", "The page address is not made yet. Save the recipe first."]);
  assert.equal(view.instagram.connected, false, "clear not-connected state");

  assert.equal((await post(operator({ action: "save", keyword: "ab" }))).status, 422);
  assert.equal((await post(operator({ action: "save", guide_url: "http://x.test/guide" }))).status, 422, "https only");
  assert.equal((await post(operator({ action: "draft" }))).status, 422, "the email needs the guide first");
  const saved = await post(operator({ action: "save", keyword: "GUIDE", guide_url: "https://example.test/guide.pdf", guide_name: "The Content Guide", post_id: "" }));
  assert.equal(saved.status, 200);
  view = saved.json.recipe;
  assert.ok(view.capture_url.startsWith("https://pulsify-ai.com/get/lm"));
  const slug = view.capture_url.split("/get/")[1];

  // Not connected: activation says why and calls nothing.
  const refused = await post(operator({ action: "activate" }));
  assert.deepEqual([refused.status, refused.json.not_connected], [422, undefined], "email wording is not approved yet");
  assert.match(refused.json.error, /Approve the email wording/);

  // AI draft -> approval with the invented figure flagged.
  const drafted = await post(operator({ action: "draft" }));
  assert.equal(drafted.json.run.status, "awaiting_approval", JSON.stringify(drafted.json.run));
  assert.equal(drafted.json.run.approval.fields.subject, "Your guide is here");
  assert.deepEqual(drafted.json.run.approval.flagged, ["340"], "an invented figure is flagged before the client sees it");
  assert.equal((await get()).json.recipes[0].email.approved, false, "nothing is approved by drafting");
  // Another client cannot approve it.
  assert.equal((await post(asClient({ action: "decide", run_id: drafted.json.run.id, decision: "approve" }, "tok-other"))).status, 404);
  const approvedByClient = await post(asClient({ action: "decide", run_id: drafted.json.run.id, decision: "approve", fields: { body: "Hi {{first_name}},\n\nYour guide:\n\n{{link}}\n\nTalk soon." } }));
  assert.equal(approvedByClient.json.run.status, "done");
  view = approvedByClient.json.recipe;
  assert.equal(view.email.approved, true);
  assert.equal(view.email.approved_by, "client:acme");
  assert.match(view.email.body, /Talk soon/);
  assert.deepEqual(view.missing, []);

  // Typing your own wording works too, and it must carry the link line and no other link.
  assert.equal((await post(operator({ action: "save", email_subject: "Hi", email_body: "No link here" }))).status, 422);
  assert.equal((await post(operator({ action: "save", email_subject: "Hi", email_body: "{{link}} and https://evil.test" }))).status, 422);

  // Instagram not connected: refused with a clear message, and no call to Zernio.
  const notConnected = await post(operator({ action: "activate" }));
  assert.equal(notConnected.status, 409);
  assert.equal(notConnected.json.not_connected, true);
  assert.match(notConnected.json.error, /Connect your Instagram/);
  assert.equal(zernio.length, 0);

  // Mocked connection, then activation creates the Zernio comment-to-DM automation.
  sql.prepare("INSERT INTO integrations(scope,client_id,provider,config_json,created_at,updated_at) VALUES('client','acme','instagram',?,?,?)").run(JSON.stringify({ account_id: "acc_1", profile_id: "prof_1", username: "acmecoach" }), "x", "x");
  const activated = await post(operator({ action: "activate" }));
  assert.equal(activated.status, 200);
  assert.equal(activated.json.recipe.enabled, true);
  assert.equal(zernio.length, 1);
  assert.deepEqual([zernio[0].method, zernio[0].url], ["POST", "https://zernio.com/api/v1/comment-automations"]);
  assert.deepEqual(zernio[0].body.keywords, ["GUIDE"]);
  assert.equal(zernio[0].body.accountId, "acc_1");
  assert.equal(zernio[0].body.buttons[0].url, `https://pulsify-ai.com/get/${slug}`);

  // Changing the word turns it off until re-applied; turning it on again updates the same automation.
  const changed = await post(operator({ action: "save", keyword: "SEND" }));
  assert.match(changed.json.note, /Turn the comment reply on again/);
  assert.equal(changed.json.recipe.enabled, false);
  await post(operator({ action: "activate" }));
  assert.deepEqual([zernio[1].method, zernio[1].url], ["PATCH", "https://zernio.com/api/v1/comment-automations/auto_1"]);
  assert.deepEqual(zernio[1].body.keywords, ["SEND"]);

  // The capture page.
  const pageReq = (path, init) => new Request("https://pulsify-ai.com" + path, init);
  const html = await (await getPage({ request: pageReq(`/get/${slug}`), env, params: { path: [slug] } })).text();
  assert.match(html, /The Content Guide/);
  assert.match(html, /Tell Acme Coaching where to send it/);
  assert.doesNotMatch(html, /<script>/, "no inline script");
  assert.match(await (await getPage({ request: pageReq("/get/capture.js"), env, params: { path: ["capture.js"] } })).text(), /pulsify_visitor_id/);
  assert.equal((await getPage({ request: pageReq("/get/nope"), env, params: { path: ["nope"] } })).status, 404);

  const submit = (data, headers = {}) => postPage({ request: pageReq(`/get/${slug}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(data) }), env, params: { path: [slug] } });
  assert.equal((await submit({ name: "", email: "a@b.test" })).status, 422);
  assert.equal((await submit({ name: "Pat", email: "nope" })).status, 422);
  assert.equal((await (await submit({ name: "Bot", email: "bot@x.test", website: "spam" })).json()).ok, true);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM lead_magnet_captures WHERE email='bot@x.test'").get().n, 0, "honeypot does nothing");

  sql.prepare("INSERT INTO watch_events(client,email,visitor_id,event,at) VALUES('acme',NULL,'vid-123','play','x')").run();
  const ok = await submit({ name: "Sam Rivera", email: "Sam@Example.test", phone: "+1 (555) 010-0100", visitor_id: "vid-123" }, { "cf-connecting-ip": "203.0.113.5" });
  assert.equal(ok.status, 200);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["sam@example.test"]);
  assert.equal(sent[0].subject, "Your guide is here");
  assert.match(sent[0].text, /^Hi Sam,/);
  const link = sent[0].text.match(/https:\/\/pulsify-ai\.com\/get\/\S+/)[0];
  assert.match(link, new RegExp(`/get/${slug}/guide\\?t=`));
  const lead = sql.prepare("SELECT * FROM leads WHERE email='sam@example.test'").get();
  assert.deepEqual([lead.client, lead.name, lead.source, lead.visitor_id, lead.status], ["acme", "Sam Rivera", "lead-magnet", "vid-123", "opted_in"], "the visitor id travels with the lead");
  assert.equal(sql.prepare("SELECT email FROM watch_events WHERE visitor_id='vid-123'").get().email, "sam@example.test", "tracking continues: earlier activity now carries the email");
  assert.equal(sql.prepare("SELECT event FROM page_events WHERE visitor_id='vid-123'").get().event, "optin");
  assert.equal(sql.prepare("SELECT title FROM notifications WHERE client_id='acme' AND scope='client'").get().title, "New lead: Sam Rivera", "the client is told");
  assert.ok(sql.prepare("SELECT 1 FROM webhook_outbox WHERE event='lead.created' AND client_id='acme' ORDER BY created_at DESC").get());
  const history = (await get("acme", { "x-portal-token": "tok-acme" })).json.runs;
  assert.equal(history[0].recipe, "Lead magnet delivery");
  assert.equal(history[0].status, "done");
  assert.deepEqual(history[0].steps.map((s) => s.label), ["Check the email wording is approved", "Add them to Leads", "Email the guide", "Tell the client"]);
  assert.ok([401, 403].includes((await get("acme", { "x-portal-token": "tok-other" })).status), "another client cannot read this history");
  assert.equal((await get("other", { "x-portal-token": "tok-other" })).json.runs.length, 0, "and sees only their own");

  // The emailed link serves the guide (here: a link redirect); a wrong or expired token does not.
  const dl = await getPage({ request: pageReq(new URL(link).pathname + new URL(link).search), env, params: { path: [slug, "guide"] } });
  assert.deepEqual([dl.status, dl.headers.get("location")], [302, "https://example.test/guide.pdf"]);
  assert.equal((await getPage({ request: pageReq(`/get/${slug}/guide?t=wrong`), env, params: { path: [slug, "guide"] } })).status, 404);

  // A failed email shows in the history and can be retried; the person still sees "check your email" and is already a lead.
  const downFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => (String(url).includes("resend") ? new Response("{}", { status: 503 }) : fetcher(url, init));
  await submit({ name: "Lee Park", email: "lee@example.test" });
  globalThis.fetch = downFetch;
  const leeRun = (await get()).json.runs.find((r) => r.status === "failed");
  assert.match(leeRun.error, /email service answered 503/);
  assert.ok(sql.prepare("SELECT 1 FROM leads WHERE email='lee@example.test'").get());
  const retry = await post(operator({ action: "retry", run_id: leeRun.id }));
  assert.equal(retry.json.run.status, "done");
  assert.equal(sent.at(-1).to[0], "lee@example.test");

  // Unapproved wording means nothing is sent.
  sql.prepare("UPDATE workflow_recipes SET config_json=json_set(config_json,'$.email.approved_at',NULL) WHERE client_id='acme' AND kind='lead-magnet'").run();
  const before = sent.length;
  await submit({ name: "No Mail", email: "nomail@example.test" });
  assert.equal(sent.length, before);
  assert.equal((await get()).json.runs[0].status, "skipped");
  sql.prepare("UPDATE workflow_recipes SET config_json=json_set(config_json,'$.email.approved_at','2026-10-17') WHERE client_id='acme' AND kind='lead-magnet'").run();

  // A test run: a made-up person, the guide goes only to the address given, and it is all removed afterwards.
  const noEmail = await post(operator({ action: "test" }));
  assert.equal(noEmail.status, 422);
  const leadsBefore = sql.prepare("SELECT COUNT(*) n FROM leads WHERE client='acme'").get().n;
  const test = await post(operator({ action: "test", email: "founder@example.test" }));
  assert.equal(test.json.run.status, "done");
  assert.equal(test.json.run.is_test, true);
  assert.equal(sent.at(-1).to[0], "founder@example.test");
  assert.equal(sql.prepare("SELECT source FROM leads WHERE email='founder@example.test'").get().source, "lead-magnet-test");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM notifications WHERE title LIKE '%Test Person%'").get().n, 0, "no bell for a test");
  const removed = await post(operator({ action: "remove_test" }));
  assert.equal(removed.json.removed.leads, 1);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM leads WHERE client='acme'").get().n, leadsBefore, "the made-up lead is gone");
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM workflow_runs WHERE is_test=1").get().n, 0);
  assert.equal(sql.prepare("SELECT COUNT(*) n FROM automation_runs WHERE ref LIKE 'acme:lmc_%' AND detail LIKE '%Test Person%'").get().n, 0);

  // Uploading the guide: a PDF only, kept private under guides/, replaces the link, and downloads through the emailed link.
  const pdf = new TextEncoder().encode("%PDF-1.4 test");
  const upload = (bytes, name = "My Guide") => workflowsPost({ request: new Request(`https://portal.test/api/workflows?action=guide&client=acme&name=${encodeURIComponent(name)}`, { method: "POST", headers: { "x-admin-key": "k" }, body: bytes }), env, data: {} });
  assert.equal((await upload(new TextEncoder().encode("not a pdf"))).status, 415);
  assert.equal((await upload(pdf)).status, 200);
  const key = [...objects.keys()][0];
  assert.match(key, /^guides\/acme\/[0-9a-f-]{36}\.pdf$/);
  const t = sql.prepare("SELECT download_token t FROM lead_magnet_captures WHERE email='sam@example.test'").get().t;
  const file = await getPage({ request: pageReq(`/get/${slug}/guide?t=${t}`), env, params: { path: [slug, "guide"] } });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("content-type"), "application/pdf");
  assert.match(file.headers.get("content-disposition"), /My Guide\.pdf/);

  // Pause switches the automation off at Zernio and closes the page.
  const paused = await post(operator({ action: "pause" }));
  assert.equal(paused.json.recipe.enabled, false);
  assert.deepEqual(zernio.at(-1).body, { isActive: false });
  assert.equal((await getPage({ request: pageReq(`/get/${slug}`), env, params: { path: [slug] } })).status, 404);
  assert.equal((await submit({ name: "Late", email: "late@example.test" })).status, 404);

  // Access: previews are read-only and signed-out calls are refused.
  assert.equal((await workflowsGet({ request: new Request("https://portal.test/api/workflows?client=acme"), env, data: {} })).status, 401);
  assert.ok(listRuns && getRun, "exports used by the screens");
  assert.ok(!sent.some((m) => /evil|zk_test|re_test/.test(JSON.stringify(m))), "no secret in any email");
  console.log("PASS workflows: runner (AI step, approval, wait, retry, idempotency, outbox sweep, allowance), lead magnet (draft with flagged figure, approval, not-connected state, mocked Zernio automation, capture page, email, lead with visitor id, client notice, retry, test run cleanup, PDF guide, pause). All services mocked.");
} finally {
  globalThis.fetch = realFetch;
}
