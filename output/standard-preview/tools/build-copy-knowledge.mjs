// Internal build tool. Deliberate source/section allowlist, never a recursive vault dump.
// node tools/build-copy-knowledge.mjs [--check]
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { clientMethodReference, SOURCE_NAMES } from "../functions/_shared/source-scrub.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
// Sections intentionally exclude internal notes, source trails, case studies and commercial terms.
// Source IDs stay stable. Paths and hashes stay here/in the private documentation, not in prompts.
export const SOURCES = [
  ["repurposing", "wiki/content-engine/reel-capture-to-content-engine.md", ["The translation layer", "The reframe rotator (repeat without repeating)"], ["repurpose", "idea", "formats", "reel", "story", "carousel"]],
  ["intake", "wiki/playbooks/brand-brain-intake.md", ["What feeds the Brand Brain (collect before the call)"], ["research", "voice", "audience", "interview", "transcript"]],
  ["mechanism", "wiki/concepts/unique-mechanism.md", ["Core mechanics", "How to create one", "What happens without it"], ["offer", "positioning", "mechanism"]],
  ["offer", "wiki/playbooks/offer-creation.md", ["Core mechanics"], ["offer", "pricing", "program", "audience"]],
  ["profile-funnel", "wiki/concepts/profile-funnel.md", ["The funnel flow", "What gets built (in order)", "The DM layer (conversion-cycle rules)", "When to escalate beyond the profile funnel"], ["funnel", "instagram", "dm", "booking"]],
  ["pre-call", "wiki/concepts/hammer-them-strategy.md", ["Core mechanics"], ["email", "call", "objection", "show", "booking", "funnel"]],
  ["content-pillars", "wiki/content-engine/content-pillars.md", ["Core mechanics"], ["content", "pillar", "reel", "youtube", "idea"]],
  ["voice", "wiki/content-engine/copy-voice-guide.md", ["Word choice", "Sentence structure", "Paragraph and format", "Tone", "Pre-send checklist (scan every asset for the top tells)"], ["voice", "rewrite", "tone", "email", "dm"]],
  ["proof", "wiki/frameworks/proof-system.md", ["The proof hierarchy (what counts, in order of power)", "Packaging structures", "Collection rituals (the system part)", "Deployment surfaces"], ["proof", "story", "testimonial", "result"]],
  ["stages", "wiki/concepts/content-funnel-tof-mof-bof.md", null, ["tof", "mof", "bof", "youtube", "content", "funnel"]],
  ["youtube", "wiki/concepts/micro-niche-youtube.md", null, ["youtube", "video", "niche", "idea"]],
  ["packaging", "wiki/content-engine/packaging-rules.md", null, ["youtube", "title", "thumbnail", "hook"]],
  ["thumbnails", "wiki/content-engine/thumbnail-layout-patterns.md", null, ["youtube", "thumbnail", "layout"]],
  ["stories", "wiki/frameworks/story-sequence-system.md", null, ["story", "sequence", "instagram", "slide"]],
  ["reels", "wiki/content-engine/reel-format-ladder.md", ["The governing rules", "The ladder (stage -> format)", "Format taxonomy (cross-cutting axes)"], ["reel", "short", "format", "content"]],
  ["messaging", "wiki/frameworks/messaging-reframe-system.md", ["2. The reframe formula (one reframe, driven so deep they can't unhear it)", "3. Direct vs indirect (the mechanism dial)", "6. The objection-to-content loop (corroborated three ways)"], ["positioning", "belief", "reframe", "objection"]],
  ["carousels", "wiki/frameworks/carousel-system.md", ["The three proven structures (from the captures)", "Design system (the replicable craft)", "The CTA"], ["carousel", "slide", "instagram", "cover"]],
];
const OMIT = /^(?:Why this matters|How Pulsify uses|Connections|Open questions|Source trail|Proven results|Examples|Case stud)/i;
const sensitive = /https?:\/\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}|[A-Z]:\\|\b(?:Nick|Amer|Marcus|Carlos|Frank|Siggy|Evan|Forbes)\b/i;
const passages = [];
const versions = [];
for (const [id, file, allowed, tags] of SOURCES) {
  const raw = fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  versions.push([id, createHash("sha256").update(raw).digest("hex")]);
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
  const title = /^# (.+)$/m.exec(body)?.[1] || id;
  for (const section of body.split(/^## /m).slice(1)) {
    const heading = section.split("\n")[0].trim();
    if (OMIT.test(heading) || (allowed && !allowed.includes(heading)) || SOURCE_NAMES.some((name) => heading.toLowerCase().includes(name.toLowerCase()))) continue;
    // Drop attributed paragraphs, don't relabel someone else's results as Pulsify's.
    const cleaned = clientMethodReference(section.slice(heading.length).trim().replace(/\n(?=(?:\d+\.|- )\s)/g, "\n\n"))
      .split(/\n\s*\n/).filter((paragraph) => !sensitive.test(paragraph) && !/source case:|his numbers:|\$4M in client revenue|no dedicated BOF videos/i.test(paragraph))
      .map((paragraph) => paragraph.replace(/\[\[([^\]]+)\]\]/g, (_, link) => link.split("/").at(-1).replaceAll("-", " ")))
      .join("\n\n");
    let chunk = "";
    const flush = () => { if (chunk.trim()) passages.push({ id: `${id}-${passages.filter((p) => p.source_id === id).length + 1}`, source_id: id, title: `${title}: ${heading.replace("three proven structures", "three observed structures")}`, tags, text: chunk.trim() }); chunk = ""; };
    for (const paragraph of cleaned.split(/\n\s*\n/)) {
      if (chunk.length + paragraph.length > 1800) flush();
      // Split oversized paragraphs without dropping their tail.
      for (let at = 0; at < paragraph.length;) {
        let end = Math.min(paragraph.length, at + 1800);
        if (end < paragraph.length) {
          const boundary = paragraph.lastIndexOf(". ", end);
          end = boundary > at + 700 ? boundary + 1 : paragraph.lastIndexOf(" ", end);
          if (end <= at) end = at + 1800;
        }
        const part = paragraph.slice(at, end).trim();
        at = end;
        if (chunk.length + part.length > 1800) flush();
        chunk += `${chunk ? "\n\n" : ""}${part}`;
      }
    }
    flush();
  }
  if (!passages.some((part) => part.source_id === id)) throw new Error(`Empty source: ${id}`);
}
const version = createHash("sha256").update(JSON.stringify({ versions, passages })).digest("hex").slice(0, 16);
const data = { version, sources: versions.map(([id, hash]) => ({ id, hash, client_visible: true })), passages };
for (const name of SOURCE_NAMES) if (JSON.stringify(passages).toLowerCase().includes(name.toLowerCase())) throw new Error(`Source name in collection: ${name}`);
const output = `// GENERATED by tools/build-copy-knowledge.mjs. Rebuild after a source or policy change.\nexport const COPY_KNOWLEDGE = ${JSON.stringify(data, null, 2)};\n`;
const target = path.join(root, "output/standard-preview/functions/_shared/copy-knowledge-data.js");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== output) throw new Error("Jane knowledge is stale. Rebuild it before release.");
} else fs.writeFileSync(target, output);
console.log(`Jane knowledge ${version}: ${versions.length} sources, ${passages.length} passages (${process.argv.includes("--check") ? "current" : "built"}).`);
