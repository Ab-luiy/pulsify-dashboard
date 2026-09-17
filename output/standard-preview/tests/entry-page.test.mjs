import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { onRequestGet } from "../functions/index.js";

test("apex serves the product gateway while explicit client previews still render", async () => {
  let nextCalls = 0;
  const env = {
    DB: {
      prepare() {
        return {
          bind() {
            return { first: async () => ({ template_variant: "canonical", page_content_json: "{}", page_active: 1 }) };
          },
        };
      },
    },
    ASSETS: {
      async fetch() {
        return new Response("<title>{{PAGE_TITLE}}</title><link href=\"css/style.css\"><h1>{{BRAND_MARK}}</h1>", {
          headers: { "content-type": "text/html" },
        });
      },
    },
  };
  let response = await onRequestGet({
    request: new Request("https://pulsify-ai.com/"),
    env,
    next: async () => { nextCalls += 1; return new Response("gateway"); },
  });
  assert.equal(await response.text(), "gateway");
  assert.equal(nextCalls, 1);

  response = await onRequestGet({
    request: new Request("https://pulsify-ai.com/?client=pulsify"),
    env,
    next: async () => new Response("fallback"),
  });
  assert.match(await response.text(), /Pulsify — Private Application/);

  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /Operator workspace/);
  assert.match(html, /Client portal/);
  assert.doesNotMatch(html, /VSL|private breakdown|training-frame/i);
});
