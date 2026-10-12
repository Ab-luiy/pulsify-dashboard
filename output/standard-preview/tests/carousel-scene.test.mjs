// The editor's scene is stored only after every value is checked (founder 2026-10-13 editor).
import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeScene, safeSceneSrc } from "../functions/_shared/carousel-scene.js";
import { sanitizeCarouselOutput } from "../functions/_shared/carousel-prompt.js";

const scene = {
  version: 1,
  theme: { heading: "inter-tight", body: "evil-font", colors: ["#fff", "red; background:url(x)", "rgba(0,0,0,0.5)"] },
  slides: [
    {
      id: "s1",
      bg: "#0b0b0d",
      layers: [
        { id: "a", kind: "text", x: 72, y: 100, w: 900, h: 100, rotation: 0, opacity: 1, runs: [{ t: "Hello", hl: "#1fb5e8" }, { t: " world", color: "url(javascript:x)" }], font: "anton", size: 64, weight: 700, lineHeight: 1.1, tracking: -0.02, align: "center", color: "#ffffff" },
        { id: "b", kind: "image", x: 0, y: 0, w: 1080, h: 1350, rotation: 0, opacity: 1, src: "/m/rio/a.jpg", fx: 0.5, fy: 0.4, zoom: 9 },
        { id: "c", kind: "image", src: "javascript:alert(1)" },
        { id: "d", kind: "icon", icon: "brand:instagram", color: "#ff0069" },
        { id: "e", kind: "icon", icon: "<script>" },
        { id: "f", kind: "script" },
      ],
    },
  ],
};

test("values that could reach CSS or the DOM are checked, bad layers dropped", () => {
  const clean = sanitizeScene(scene);
  assert.equal(clean.theme.body, "inter-tight");
  assert.deepEqual(clean.theme.colors, ["#fff", "rgba(0,0,0,0.5)"]);
  const layers = clean.slides[0].layers;
  assert.deepEqual(layers.map((l) => l.id), ["a", "b", "d"]);
  assert.equal(layers[0].runs[1].color, undefined);
  assert.equal(layers[0].runs[0].hl, "#1fb5e8");
  assert.equal(layers[1].zoom, 6, "zoom clamped");
  assert.equal(safeSceneSrc("/m/../secret"), "");
  assert.equal(safeSceneSrc("https://cdn.example.com/a.jpg"), "https://cdn.example.com/a.jpg");
});

test("a saved carousel keeps its design next to the copy", () => {
  const output = sanitizeCarouselOutput({ slides: [{ headline: "One" }, { headline: "Two" }], scene }, { structure: "methodology", topic: "t", slideCount: 2 });
  assert.equal(output.slides.length, 2);
  assert.equal(output.scene.slides[0].layers.length, 3);
});

test("an oversized design is refused, not truncated", () => {
  const big = { slides: [{ layers: Array.from({ length: 80 }, (_, i) => ({ kind: "text", runs: [{ t: "x".repeat(6000) }], id: `l${i}` })) }] };
  assert.throws(() => sanitizeScene(big), /too large/);
});
