// Designed slides from the portal carousel builder keep their layout on save (founder 2026-10-03).
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeCarouselOutput } from "../functions/_shared/carousel-prompt.js";

test("a saved carousel keeps each slide's layout, trimmed to known fields", () => {
  const out = sanitizeCarouselOutput(
    {
      slides: [
        { headline: "How 14 students passed", layout: { kind: "cover", serif: "How", bold: "14 students passed", emphasis: "passed", theme: "paper", evil: "<script>" } },
        { headline: "Risk first", layout: { kind: "item", number: "01", chips: ["Daily", "Process", "New traders", "extra"], proof: "Student dashboard" } },
        { headline: "Comment RISK", layout: { kind: "close", trigger: "RISK", ask: "dm" } },
        { headline: "No layout" },
      ],
    },
    { structure: "methodology", topic: "x", goal: "reach", slideCount: 4 },
  );
  assert.equal(out.slides[0].layout.kind, "cover");
  assert.equal(out.slides[0].layout.theme, "paper");
  assert.equal(out.slides[0].layout.evil, undefined);
  assert.deepEqual(out.slides[1].layout.chips, ["Daily", "Process", "New traders"]);
  assert.equal(out.slides[2].layout.ask, "dm");
  assert.equal(out.slides[3].layout, undefined);
});
