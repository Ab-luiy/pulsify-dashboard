import { test } from "node:test";
import assert from "node:assert/strict";
import { findTells, humanize, humanizeDeep, HUMANIZER } from "../functions/_shared/humanizer.js";

test("humanize fixes the mechanical tells and keeps the words", () => {
  assert.equal(humanize("\u201CSmart\u201D quotes \u2014 and it\u2019s fine"), '"Smart" quotes, and it\'s fine');
  assert.equal(humanize("Input \u2192 output"), "Input -> output");
  assert.equal(humanize("5\u20137 stories a week"), "5-7 stories a week");
  assert.equal(humanize("We utilize this to streamline entries!"), "We use this to simplify entries.");
  assert.equal(humanize("It's worth noting that risk matters. Importantly, size down."), "Risk matters. Size down.");
  assert.equal(humanize("This serves as your plan \uD83D\uDE80"), "This is your plan");
  assert.equal(humanize("Line one\n\nLine two"), "Line one\n\nLine two");
});

test("humanizeDeep cleans every string in generated JSON", () => {
  assert.deepEqual(humanizeDeep({ titles: ["Win \u2014 lose", { t: "Go!" }], n: 3 }), { titles: ["Win, lose", { t: "Go." }], n: 3 });
});

test("findTells names the structural tells", () => {
  assert.deepEqual(findTells("It's not about the setup. It's about patience."), ["negative parallelism"]);
  assert.deepEqual(findTells("The result? A funded account."), ["self-answered question"]);
  assert.deepEqual(findTells("Not luck. Not talent. Just reps."), ["countdown"]);
  assert.deepEqual(findTells("Mark your level before the open."), []);
  assert.match(HUMANIZER, /Never invent a number/);
});
