import assert from "node:assert/strict";
import test from "node:test";
import { onRequestGet, HOMEPAGE_CSP } from "../functions/index.js";
import { pulsifyMiddleware } from "../functions/_middleware.js";

// pulsify-saas #38, live 2026-10-18: the apex serves the Next homepage export, and only the
// homepage's own listed files under /app are open to visitors.

const LISTED = ["/app/_next/static/chunks/abc123.js", "/app/_next/static/media/Font.woff2", "/app/homepage", "/app/og-homepage.png"];
function assetsStub() {
  return {
    async fetch(u) {
      const path = new URL(String(u)).pathname;
      if (path === "/app/homepage") return new Response("<h1>Pulsify.</h1>", { headers: { "content-type": "text/html" } });
      if (path === "/app/homepage-assets.json") return new Response(JSON.stringify(LISTED), { headers: { "content-type": "application/json" } });
      return new Response("nf", { status: 404 });
    },
  };
}

test("the apex serves the homepage export with its own CSP", async () => {
  const res = await onRequestGet({
    request: new Request("https://pulsify-ai.com/"),
    env: { ASSETS: assetsStub() },
    next: async () => new Response("gateway"),
  });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "<h1>Pulsify.</h1>");
  assert.equal(res.headers.get("content-security-policy"), HOMEPAGE_CSP);
  assert.match(HOMEPAGE_CSP, /frame-src https:\/\/cal\.com/);
  assert.match(HOMEPAGE_CSP, /frame-ancestors 'none'/);
  assert.doesNotMatch(HOMEPAGE_CSP, /\*/);
});

test("listed homepage files are open to visitors; the page itself redirects to the apex", async () => {
  const env = { ASSETS: assetsStub() };
  let passed = 0;
  const next = async () => { passed += 1; return new Response("asset"); };
  for (const path of ["/app/_next/static/chunks/abc123.js", "/app/_next/static/media/font.woff2", "/app/og-homepage.png"]) {
    const res = await pulsifyMiddleware({ request: new Request("https://pulsify-ai.com" + path), env, next, data: {} });
    assert.equal(await res.text(), "asset", path);
  }
  assert.equal(passed, 3);
  const page = await pulsifyMiddleware({ request: new Request("https://pulsify-ai.com/app/homepage"), env, next, data: {} });
  assert.equal(page.status, 302);
  assert.equal(page.headers.get("location"), "https://pulsify-ai.com/");
});

test("_headers gives the apex the same CSP the homepage function sets", async () => {
  const { readFile } = await import("node:fs/promises");
  const headers = await readFile(new URL("../_headers", import.meta.url), "utf8");
  const apex = headers.split(/\r?\n/).findIndex((l) => l.trim() === "/");
  assert.ok(apex >= 0, "the apex has a _headers block");
  assert.equal(headers.split(/\r?\n/)[apex + 1].trim(), `Content-Security-Policy: ${HOMEPAGE_CSP}`);
});
