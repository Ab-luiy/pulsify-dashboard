// Every script a public page loads must stay downloadable when signed out.
// Guards the code lock in functions/_middleware.js (privateAsset) against
// breaking live landing pages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { privateAsset } from "../functions/_middleware.js";

function publicPages() {
  const pages = ["index.html", "privacy.html", "terms.html", "login/operator/index.html", "login/client/index.html", "portal/login/index.html"];
  for (const name of readdirSync("templates")) {
    const file = join("templates", name, "index.html");
    try { if (statSync(file).isFile()) pages.push(file); } catch { /* not a template */ }
  }
  return pages;
}

test("scripts loaded by public pages are not locked", () => {
  const checked = [];
  for (const page of publicPages()) {
    let html;
    try { html = readFileSync(page, "utf8"); } catch { continue; }
    for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
      const url = new URL(src, "https://pulsify-ai.com/" + page);
      if (!/pulsify-ai\.com$|pulsify-funnels\.pages\.dev$/.test(url.hostname)) continue;
      checked.push(url.pathname);
      assert.equal(privateAsset(url.pathname), false, `${page} loads ${url.pathname}, which the code lock would hide`);
    }
  }
  assert.ok(checked.includes("/js/funnel-integrations.js"), "landing templates still load funnel-integrations.js");
});

test("console and portal code stays locked", () => {
  for (const path of ["/app/_next/static/chunks/a.js", "/admin/console.js", "/js/provision-prompt.js", "/portal/legacy.js", "/shared/shell.js"]) {
    assert.equal(privateAsset(path), true, path);
  }
});
