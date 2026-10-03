// The client never sees where a framework came from. Real text through the real scrubbers.
import assert from "node:assert/strict";
import { createStreamScrubber, neutralize, scrubSources, SOURCE_NAMES } from "../functions/_shared/source-scrub.js";
import { SEQUENCE_REFERENCE } from "../functions/_shared/sequence-reference.js";
import { YOUTUBE_REFERENCE } from "../functions/_shared/youtube-reference.js";
import { YOUTUBE_PACKAGING_REFERENCE } from "../functions/_shared/youtube-packaging-reference.js";

const leaks = (text) => SOURCE_NAMES.filter((name) => new RegExp(`(?<![A-Za-z])${name}(?![A-Za-z])`, "i").test(text));

// Names, possessives and casing are all caught; ordinary words that contain a name are left alone.
assert.equal(scrubSources("Jeremy Haynes' call funnel"), "Pulsify' call funnel".replace("'", "'"), "possessive without s keeps the apostrophe");
assert.equal(scrubSources("This is Niksetting's frame."), "This is Pulsify's frame.");
assert.equal(scrubSources("From NIKSETTING and Ayman Arab."), "From Pulsify and Pulsify.");
assert.equal(scrubSources("a Haynesworth story"), "a Haynesworth story");
assert.equal(scrubSources("see wiki/frameworks/story-sequence-system.md for more"), "see the Pulsify method for more");
assert.equal(scrubSources("nothing to hide here"), "nothing to hide here");

// The method text the model reads has no names left in it, and still has its substance.
for (const [label, text] of [["sequence", SEQUENCE_REFERENCE], ["youtube", YOUTUBE_REFERENCE], ["packaging", YOUTUBE_PACKAGING_REFERENCE]]) {
  const clean = neutralize(text);
  assert.deepEqual(leaks(clean), [], `${label} reference still names a source`);
  assert.ok(clean.length > text.length * 0.9, `${label} reference lost its substance`);
  assert.doesNotMatch(clean, /niksetting/i);
}

// A stream split anywhere, even through a name, never emits one.
const sentence = "Here is the hook. This follows Jeremy Haynes and Niksetting's method, said Ayman Arab. Done.";
for (let size = 1; size <= 9; size++) {
  const scrubber = createStreamScrubber();
  let out = "";
  for (let i = 0; i < sentence.length; i += size) out += scrubber.push(sentence.slice(i, i + size));
  out += scrubber.flush();
  assert.deepEqual(leaks(out), [], `chunk size ${size} leaked: ${out}`);
  assert.equal(out, "Here is the hook. This follows Pulsify and Pulsify's method, said Pulsify. Done.", `chunk size ${size}`);
}

// A long plain stream comes out whole and in order.
const long = "word ".repeat(400);
const scrubber = createStreamScrubber();
let rebuilt = "";
for (let i = 0; i < long.length; i += 7) rebuilt += scrubber.push(long.slice(i, i + 7));
rebuilt += scrubber.flush();
assert.equal(rebuilt, long);

console.log("PASS source scrub: names, possessives, file paths, method text neutralized, stream split through a name never leaks, plain text untouched.");
