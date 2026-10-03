// Clients are told the method is Pulsify's. They never see where a framework came from: no creator names,
// no vault file names, no hint of the prompt. Two layers keep that true (the model is also told so in
// copy-brain.js, but a model can slip):
//   neutralize(text)       removes the names from the method text BEFORE the model reads it
//   scrubSources(text)     removes them from anything the model says
//   createStreamScrubber() the same for a stream, holding back a short tail so a name split across two
//                          chunks is still caught
// To protect another name, add it to SOURCE_NAMES. Longest names first so "Jeremy Haynes" wins over "Haynes".

export const SOURCE_NAMES = [
  "Jeremy Haynes",
  "Mason Bowstead",
  "Dustin Varano",
  "Iman Gadzhi",
  "Joel Kaplan",
  "Ayman Arab",
  "Niksetting",
  "Soo Wei",
  "SooWei",
  "Haynes",
  "Bowstead",
  "Varano",
  "Gadzhi",
  "Alexei",
  "Ayman",
  "InfoOS",
];

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NAME = new RegExp(`(?<![A-Za-z])(?:${SOURCE_NAMES.map(escape).join("|")})(?:['’]s)?(?![A-Za-z])`, "gi");
const FILES = /\b(?:wiki|raw-sources)\/[\w\-./]+|\b[\w-]+\.md\b|\bSKILL\.md\b|\bvault\b/gi;
const HOLD = 32;

const swap = (match) => (/['’]s$/i.test(match) ? "Pulsify's" : "Pulsify");

/** For the method text the model reads: names and file paths out, content kept. */
export function neutralize(text) {
  return String(text ?? "")
    .replace(NAME, swap)
    .replace(/niksetting[\w-]*/gi, "pulsify")
    .replace(FILES, "the Pulsify method");
}

/** For anything the model says. */
export function scrubSources(text) {
  return String(text ?? "").replace(NAME, swap).replace(FILES, "the Pulsify method");
}

export function createStreamScrubber() {
  let buffer = "";
  return {
    push(chunk) {
      buffer += chunk;
      let cut = buffer.length - HOLD;
      if (cut <= 0) return "";
      for (const match of buffer.matchAll(new RegExp(NAME.source + "|" + FILES.source, "gi"))) {
        const end = match.index + match[0].length;
        if (match.index < cut && cut < end) cut = match.index;
      }
      // Never cut inside a word either, so "Hay|nes" cannot slip out in two halves.
      while (cut > 0 && /[A-Za-z]/.test(buffer[cut - 1]) && /[A-Za-z]/.test(buffer[cut] ?? "")) cut -= 1;
      if (cut <= 0) return "";
      const safe = buffer.slice(0, cut);
      buffer = buffer.slice(cut);
      return scrubSources(safe);
    },
    flush() {
      const rest = scrubSources(buffer);
      buffer = "";
      return rest;
    },
  };
}
