// The client's niche: known ids, the client's own words, and the brain context that carries it to every generator.
import test from "node:test";
import assert from "node:assert/strict";
import { NICHES, nicheLine, readNiche } from "../functions/_shared/niches.js";
import { buildGeneratorBrainContext } from "../functions/_shared/client-brain-context.js";
import { FIELD_DEFINITIONS } from "../functions/api/client-brain.js";

test("a niche is a known id or the client's own words", () => {
  assert.deepEqual(readNiche("tiktok-shop"), { id: "tiktok-shop", label: "TikTok Shop" });
  assert.deepEqual(readNiche(" Amazon-FBA "), { id: "amazon-fba", label: "Amazon FBA" });
  assert.deepEqual(readNiche("Real estate wholesaling"), { id: "other", label: "Real estate wholesaling" });
  assert.equal(readNiche(""), null);
  assert.equal(readNiche(null), null);
  assert.equal(nicheLine("trading"), "The client works in Trading.");
  assert.equal(nicheLine(""), "");
  assert.equal(readNiche("x".repeat(200)).label.length, 80);
});

test("every founder-picked niche has searches for the packaging library", () => {
  assert.deepEqual(NICHES.map((niche) => niche.id), ["trading", "ecommerce", "tiktok-shop", "amazon-fba", "ht-sales", "airbnb", "make-money-online"]);
  for (const niche of NICHES) assert.ok(niche.queries.length >= 3, niche.id);
});

test("the brain carries the niche to the generators, and clients may write it", () => {
  assert.ok(FIELD_DEFINITIONS.identity.some((field) => field.key === "niche" || field.field === "niche" || JSON.stringify(field).includes("niche")));
  const context = buildGeneratorBrainContext({ rows: [{ section: "identity", field: "niche", value_json: '"trading"', updated_at: "2026-10-15T00:00:00Z" }], proof_items: [] });
  assert.deepEqual(context.niche, { id: "trading", label: "Trading" });
  assert.match(context.prompt_text, /Niche: trading/);
  assert.equal(buildGeneratorBrainContext({ rows: [], proof_items: [] }).niche, null);
});
