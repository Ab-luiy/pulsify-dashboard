// CRM prospect pictures (functions/api/spine/lead-image.js) and the page-view
// bell row (functions/event.js notifyPageView), pulsify-saas #34. Real SQLite,
// an in-memory R2 and a fetch stub, so nothing leaves the machine.
import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { avatarFromHtml, channelUrl, onRequestGet as leadImage, videoId } from "../functions/api/spine/lead-image.js";
import { notifyPageView } from "../functions/event.js";
import { rememberOperator } from "../functions/_shared/access.js";

const sql = new DatabaseSync(":memory:");
const mig = (name) => readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8");
for (const name of ["0025_data_spine.sql", "0031_notifications.sql"]) {
  for (const statement of mig(name).replace(/--[^\n]*/g, "").split(";")) {
    if (statement.trim()) try { sql.exec(statement); } catch { /* column already there */ }
  }
}
for (const table of ["crm_overrides", "crm_added"]) sql.exec(`CREATE TABLE ${table}(name TEXT PRIMARY KEY,data TEXT NOT NULL,ts INTEGER NOT NULL,sts INTEGER NOT NULL,updated_at TEXT NOT NULL)`);
sql.prepare("INSERT INTO yt_leads (id,payload_json,score,tier,niche,updated_at) VALUES (?,?,?,?,?,?)").run(
  "lead-1",
  JSON.stringify({ n: "The Cashflow Academy", cu: "https://www.youtube.com/@andytannertraining", vu: "https://www.youtube.com/watch?v=PM1JE3QbsjA" }),
  79, "B", "trading", "2026-09-25T00:00:00Z",
);
sql.prepare("INSERT INTO crm_added (name,data,ts,sts,updated_at) VALUES (?,?,?,?,?)").run(
  "Hand Added", JSON.stringify({ n: "Hand Added", cu: "javascript:alert(1)" }), 1, 1, "x",
);

const r2 = new Map();
const MEDIA = {
  async get(key) {
    const hit = r2.get(key);
    return hit ? { body: hit.body, httpMetadata: hit.httpMetadata, customMetadata: hit.customMetadata } : null;
  },
  async put(key, body, options = {}) {
    r2.set(key, { body, httpMetadata: options.httpMetadata, customMetadata: options.customMetadata });
  },
};
const DB = {
  prepare(query) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() { return sql.prepare(query).get(...args) || null; },
      async all() { return { results: sql.prepare(query).all(...args) }; },
      async run() { const result = sql.prepare(query).run(...args); return { meta: { changes: result.changes } }; },
    };
    return statement;
  },
};
const env = { DB, MEDIA, OPERATOR_EMAIL: "abod.louai@gmail.com" };

const fetched = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  fetched.push(String(url));
  if (String(url).startsWith("https://www.youtube.com/@andytannertraining")) {
    return new Response('<html><meta property="og:image" content="https://yt3.googleusercontent.com/abc=s900-c-k-c0x00ffffff-no-rj"></html>', { status: 200 });
  }
  if (String(url).startsWith("https://yt3.googleusercontent.com/") || String(url).startsWith("https://i.ytimg.com/")) {
    return new Response(new Uint8Array([255, 216, 255, 1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } });
  }
  return new Response("nope", { status: 404 });
};
test.after(() => { globalThis.fetch = realFetch; });

const operator = (url) => {
  const request = new Request(url);
  rememberOperator(request, { email: "abod.louai@gmail.com", via: "access" });
  return request;
};
const call = (url) => leadImage({ request: operator(url), env, data: {} });

test("parsing: only plain YouTube channel links and Google avatar hosts pass", () => {
  assert.equal(channelUrl("https://www.youtube.com/@andytannertraining?si=1"), "https://www.youtube.com/@andytannertraining");
  assert.equal(channelUrl("https://m.youtube.com/channel/UCabcdefghijklmnopqrstuv"), "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv");
  assert.equal(channelUrl("https://evil.example/@x"), "");
  assert.equal(channelUrl("javascript:alert(1)"), "");
  assert.equal(videoId("https://www.youtube.com/watch?v=PM1JE3QbsjA"), "PM1JE3QbsjA");
  assert.equal(videoId("https://youtu.be/PM1JE3QbsjA"), "PM1JE3QbsjA");
  assert.equal(avatarFromHtml('<meta property="og:image" content="https://yt3.googleusercontent.com/abc=s900-c-k-c0x00ffffff-no-rj">'), "https://yt3.googleusercontent.com/abc=s176-c-k-c0x00ffffff-no-rj");
  assert.equal(avatarFromHtml('<meta property="og:image" content="https://evil.example/pic.jpg">'), "");
});

test("avatar: fetched once from the channel page, then served from R2", async () => {
  const first = await call("https://x/api/spine/lead-image?lead=lead-1&kind=avatar");
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("content-type"), "image/jpeg");
  assert.ok(fetched.includes("https://yt3.googleusercontent.com/abc=s176-c-k-c0x00ffffff-no-rj"));
  const before = fetched.length;
  const again = await call("https://x/api/spine/lead-image?name=The%20Cashflow%20Academy&kind=avatar");
  assert.equal(again.status, 200);
  assert.equal(fetched.length, before, "the second request is served from R2");
});

test("video thumbnail by lead id; unknown or unsafe leads 404 without fetching", async () => {
  const video = await call("https://x/api/spine/lead-image?lead=lead-1&kind=video");
  assert.equal(video.status, 200);
  assert.ok(fetched.includes("https://i.ytimg.com/vi/PM1JE3QbsjA/mqdefault.jpg"));
  const before = fetched.length;
  assert.equal((await call("https://x/api/spine/lead-image?name=Hand%20Added&kind=avatar")).status, 404);
  assert.equal((await call("https://x/api/spine/lead-image?lead=nope")).status, 404);
  assert.equal(fetched.length, before, "no fetch for a lead without a usable channel");
});

test("anonymous requests are refused", async () => {
  const response = await leadImage({ request: new Request("https://x/api/spine/lead-image?lead=lead-1"), env, data: {} });
  assert.equal(response.status, 401);
});

test("page view: one bell row per visitor per page per day, with where they are", async () => {
  const cfg = { client_name: "Kyle Kirshner" };
  const first = await notifyPageView(env, { client: "kyle-kirshner", cfg, email: "", visitor: "v1", city: "Lisbon", country: "PT" });
  assert.ok(first);
  assert.equal(await notifyPageView(env, { client: "kyle-kirshner", cfg, email: "", visitor: "v1", city: "Lisbon", country: "PT" }), null, "a refresh does not ping again");
  const row = sql.prepare("SELECT kind, title, body, link FROM notifications WHERE kind='page.viewed'").get();
  assert.equal(row.title, "Someone opened Kyle Kirshner's page");
  assert.equal(row.body, "From Lisbon, PT");
  assert.equal(row.link, "campaigns");
  assert.ok(await notifyPageView(env, { client: "kyle-kirshner", cfg, email: "kyle@example.com", visitor: "v2", city: null, country: "US" }));
});
