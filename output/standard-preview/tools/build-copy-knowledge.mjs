// Internal build tool. Every wiki page is classified: the method pages below reach Jane, nothing else does.
// node tools/build-copy-knowledge.mjs [--check] [--stamp-cards] [--classify]
//   --check        fail when the generated collection is stale (release and CI)
//   --stamp-cards  record the current source hashes in every task card after the cards were reviewed
//   --classify     record every unlisted page as private (run only after reviewing the unclassified list)
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { clientMethodReference, SOURCE_NAMES } from "../functions/_shared/source-scrub.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
// Founder 2026-10-27: Jane reads the full vault. That means every METHOD page, whole (internal headings
// dropped below). Kept out on purpose, listed in tools/jane-vault-private.json: people, clients, prospects,
// outreach, accounts, contracts, Pulsify's own offer, pricing and sales, product specs and audits, other
// creators' case studies and asset breakdowns, prompt files. Source IDs stay stable once released.
// [id, file, sections (null = all), tags]
export const SOURCES = [
  ["repurposing", "wiki/content-engine/reel-capture-to-content-engine.md", null, ["repurpose", "idea", "formats", "reel", "story", "carousel"]],
  // The rest of the intake page is Pulsify's own delivery schedule.
  ["intake", "wiki/playbooks/brand-brain-intake.md", ["What feeds the Brand Brain (collect before the call)"], ["research", "voice", "audience", "interview", "transcript"]],
  ["mechanism", "wiki/concepts/unique-mechanism.md", null, ["offer", "positioning", "mechanism"]],
  ["offer", "wiki/playbooks/offer-creation.md", null, ["offer", "pricing", "program", "audience"]],
  ["profile-funnel", "wiki/concepts/profile-funnel.md", null, ["funnel", "instagram", "dm", "booking"]],
  ["pre-call", "wiki/concepts/hammer-them-strategy.md", null, ["email", "call", "objection", "show", "booking", "funnel"]],
  ["content-pillars", "wiki/content-engine/content-pillars.md", null, ["content", "pillar", "reel", "youtube", "idea"]],
  ["voice", "wiki/content-engine/copy-voice-guide.md", null, ["voice", "rewrite", "tone", "email", "dm"]],
  ["proof", "wiki/frameworks/proof-system.md", null, ["proof", "story", "testimonial", "result"]],
  ["stages", "wiki/concepts/content-funnel-tof-mof-bof.md", null, ["tof", "mof", "bof", "youtube", "content", "funnel"]],
  ["youtube", "wiki/concepts/micro-niche-youtube.md", null, ["youtube", "video", "niche", "idea"]],
  ["packaging", "wiki/content-engine/packaging-rules.md", null, ["youtube", "title", "thumbnail", "hook"]],
  ["thumbnails", "wiki/content-engine/thumbnail-layout-patterns.md", null, ["youtube", "thumbnail", "layout"]],
  ["stories", "wiki/frameworks/story-sequence-system.md", null, ["story", "sequence", "instagram", "slide"]],
  ["reels", "wiki/content-engine/reel-format-ladder.md", null, ["reel", "short", "format", "content"]],
  ["messaging", "wiki/frameworks/messaging-reframe-system.md", null, ["positioning", "belief", "reframe", "objection"]],
  ["carousels", "wiki/frameworks/carousel-system.md", null, ["carousel", "slide", "instagram", "cover"]],
  ["vsl", "wiki/frameworks/vsl-framework.md", null, ["vsl", "video", "sales", "landing", "funnel", "script"]],
  ["sales-calls", "wiki/frameworks/call-funnel-framework.md", null, ["call", "sales", "close", "objection", "booking", "show"]],
  ["bio", "wiki/frameworks/bio-optimization-system.md", null, ["bio", "profile", "instagram", "highlight"]],
  ["ig-assets", "wiki/frameworks/instagram-conversion-assets.md", null, ["instagram", "cta", "dm", "lead", "story", "conversion"]],
  ["webinar", "wiki/frameworks/webinar-framework.md", null, ["webinar", "launch", "event", "live"]],
  ["rhythm", "wiki/playbooks/content-operating-rhythm.md", null, ["cadence", "posting", "schedule", "week", "routine", "consistency"]],
  // Added 2026-10-27 with the full vault.
  ["vsl-agency", "wiki/frameworks/agency-scaling-vsl-architecture.md", null, ["vsl", "video", "sales", "scaling", "script"]],
  ["application", "wiki/frameworks/generic-mmo-application-questionnaire.md", null, ["application", "form", "qualify", "booking", "funnel"]],
  ["flywheel-vsl", "wiki/concepts/flywheel-vsl.md", null, ["vsl", "funnel", "content", "video"]],
  ["order", "wiki/concepts/pulsify-order-of-operations.md", null, ["order", "priority", "offer", "content", "funnel", "bottleneck"]],
  ["trust", "wiki/concepts/trust-recession.md", null, ["trust", "proof", "positioning", "belief"]],
  ["app-content", "wiki/playbooks/client-app-content-sop.md", null, ["app", "content", "process", "portal"]],
  ["scaling", "wiki/playbooks/client-scaling.md", null, ["scaling", "price", "capacity", "revenue", "offer"]],
  ["format-invention", "wiki/playbooks/format-invention-pipeline.md", null, ["format", "idea", "reel", "content", "invent"]],
  ["terms", "wiki/glossary/core-terms.md", null, ["terms", "definition", "glossary"]],
];
// Lesson extractions from teaching videos: only the restated rules and the step-by-steps reach Jane.
// Quotes, numbers and proof, names, stories, contradictions and gaps stay out. [id, file, clean title, tags]
export const LESSONS = [
  ["lesson-formats", "wiki/synthesis/niksetting-extractions/01-viral-format-invention-process.md", "Inventing a content format that spreads", ["format", "reel", "idea"]],
  ["lesson-views", "wiki/synthesis/niksetting-extractions/02-optimizing-for-views.md", "Optimizing content for views", ["views", "reel", "hook", "retention"]],
  ["lesson-brand-evolution", "wiki/synthesis/niksetting-extractions/03-5m-322-pieces-brand-evolution.md", "How a brand evolves over hundreds of posts", ["brand", "content", "consistency"]],
  ["lesson-conversion", "wiki/synthesis/niksetting-extractions/04-conversion-content-five-assets.md", "Conversion content: the five assets", ["conversion", "instagram", "story", "cta", "dm"]],
  ["lesson-selling-info", "wiki/synthesis/niksetting-extractions/05-honest-opinion-selling-information.md", "Selling information honestly", ["offer", "info", "coaching", "trust"]],
  ["lesson-story-types", "wiki/synthesis/niksetting-extractions/07-story-sequences-7-frameworks.md", "Story sequences: the seven types", ["story", "sequence", "instagram"]],
  ["lesson-onboarding", "wiki/synthesis/niksetting-extractions/08-onboarding-system-600k-february.md", "Onboarding new clients", ["onboarding", "delivery", "client", "program"]],
  ["lesson-market-math", "wiki/synthesis/niksetting-extractions/09-interest-media-market-math.md", "Interest media and market math", ["market", "niche", "audience", "views"]],
  ["lesson-eight-formats", "wiki/synthesis/niksetting-extractions/10-eight-content-formats.md", "Eight content formats", ["format", "reel", "content"]],
  ["lesson-content-system", "wiki/synthesis/niksetting-extractions/11-content-system-five-pillars.md", "The content system: five pillars", ["system", "content", "ideation", "production"]],
  ["lesson-bio", "wiki/synthesis/niksetting-extractions/12-instagram-bio-that-converts.md", "An Instagram bio that converts", ["bio", "profile", "instagram"]],
  ["lesson-youtube-ladder", "wiki/synthesis/niksetting-extractions/13-small-youtube-channel-money-ladder.md", "Making money from a small YouTube channel", ["youtube", "small", "channel", "monetize"]],
  ["lesson-lead-quality", "wiki/synthesis/niksetting-extractions/14-lead-quality-conversion-cycle.md", "Lead quality and the conversion cycle", ["lead", "quality", "dm", "conversion", "setter"]],
  ["lesson-pull-push", "wiki/synthesis/niksetting-extractions/15-marketing-ecosystem-pull-vs-push.md", "Marketing ecosystem: pull versus push", ["ecosystem", "inbound", "outbound", "funnel"]],
  ["lesson-unskippable", "wiki/synthesis/niksetting-extractions/16-content-impossible-to-skip.md", "Content people cannot skip", ["hook", "retention", "reel", "editing"]],
  ["lesson-schedule", "wiki/synthesis/niksetting-extractions/17-300k-month-posting-schedule.md", "A posting schedule that sells", ["cadence", "posting", "schedule"]],
  ["lesson-buyers", "wiki/synthesis/niksetting-extractions/18-attract-buyers-not-broke-people.md", "Attracting buyers, not browsers", ["buyer", "audience", "niche", "lead", "quality"]],
  ["lesson-36", "wiki/synthesis/niksetting-extractions/19-10m-content-knowledge-36-lessons.md", "Thirty-six content lessons", ["content", "lessons", "hook", "reel"]],
  ["lesson-magnetic", "wiki/synthesis/niksetting-extractions/20-magnetic-personal-brand.md", "A magnetic personal brand", ["brand", "personal", "positioning"]],
  ["lesson-masterclass-1", "wiki/synthesis/niksetting-extractions/21a-masterclass-part-1.md", "Content masterclass, part 1", ["content", "views", "reel"]],
  ["lesson-masterclass-2", "wiki/synthesis/niksetting-extractions/21b-masterclass-part-2.md", "Content masterclass, part 2", ["content", "views", "reel"]],
  ["lesson-masterclass-3", "wiki/synthesis/niksetting-extractions/21c-masterclass-part-3.md", "Content masterclass, part 3", ["content", "conversion", "reel"]],
  ["lesson-masterclass-4", "wiki/synthesis/niksetting-extractions/21d-masterclass-part-4.md", "Content masterclass, part 4", ["content", "conversion", "reel"]],
  ["lesson-organic", "wiki/synthesis/soowei-goh-extractions/01-3m-yr-organic-content-strategy.md", "Organic content strategy", ["organic", "content", "strategy", "youtube"]],
  ["lesson-branding", "wiki/synthesis/soowei-goh-extractions/02-personal-branding-conversation.md", "Personal branding", ["brand", "personal", "positioning"]],
  ["lesson-ai-brand", "wiki/synthesis/soowei-goh-extractions/03-408k-personal-brand-with-ai.md", "Building a personal brand with AI", ["brand", "ai", "content", "workflow"]],
  ["lesson-psychology", "wiki/synthesis/soowei-goh-extractions/04-psychology-four-stages.md", "Buyer psychology: four stages", ["psychology", "awareness", "buyer", "funnel"]],
  ["lesson-predictions", "wiki/synthesis/soowei-goh-extractions/05-industry-predictions-blueprint.md", "Owning your industry with predictions", ["authority", "predictions", "positioning", "content"]],
];
// Task cards: one short, dense playbook per kind of work Jane does, written from the sources they list.
const CARDS_DIR = "wiki/jane-cards";
// Pages a card may be written from without becoming passages: the founder's newest decisions, which beat older
// numbers in the method pages. Tracked only so a changed page flags its cards for review.
const CARD_ONLY = [["doctrine", "wiki/synthesis/content-decisions-recap-2026-10-27.md"]];
// Pages Jane already gets through their own build, so they are neither passages nor private.
const OWN_BUILD = ["wiki/content-engine/title-voice-bank.md"]; // tools/build-title-bank.mjs
const PRIVATE_FILE = path.join(root, "output/standard-preview/tools/jane-vault-private.json");

const OMIT = /^(?:Why this matters|How Pulsify uses|Pulsify'?s? (?:use|own|application)|For Pulsify|Applied to Pulsify|Connections|Related|See also|Open questions|Source trail|Sources?\b|Source inventory|Proven results|Examples?\b|Examples and names|Case stud|Stories\b|Numbers and proof|Contradictions|Gaps\b|Vocabulary|Status\b|Change ?log|History\b|Next steps|To ?do\b)/i;
const LESSON_KEEP = /^(?:Core claims|Frameworks and step-by-steps|Content mechanics|Beliefs and contrarian takes|Niches|The six-step ladder|The 36 lessons)/i;
// People and businesses named in the vault, beyond the protected source names: a paragraph naming one is dropped,
// never relabelled, so nobody else's results are presented as Pulsify's.
const PEOPLE = ["Nick", "Amer", "Ammer", "Marco", "Marcus", "Carlos", "Frank", "Siggy", "Evan", "Forbes", "Jeremy", "Hormozi", "Kobey", "Cardinal", "Grant Garcia", "Jonas", "Rorwick", "Lapotko", "Charlie Morgan", "Daniel Fazio", "Fazio", "Serge Gatari", "Gatari", "Jordan Platten", "Platten", "FITFO", "Goh",
  "Nik", "Iman", "Herman", "Jade", "Brian", "Phil", "Lee", "Gadi", "Musk", "Daniel", "Maya", "Welch", "Mino", "Marba", "Grant", "Alex", "Dustin"];
const sensitive = new RegExp(String.raw`https?:\/\/|[\w.+-]+@[\w.-]+\.[a-z]{2,}|[A-Z]:\\|\b(?:output|functions|src|tools)\/[\w./-]+|\.(?:js|ts|tsx|mjs|py|json)\b|\b(?:${PEOPLE.join("|")})\b`, "i");
const lessonNoise = /\$\s?\d|\btranscript\s*\d|\bcorpus\b|\bvault\b|\bPulse System\b/i;
// The founder's own rulings, dates and asks are how a rule was decided, not the rule. Jane gets the rule.
const provenance = /\bthe founder\b|\bfounder[- ](?:ruling|ratified|direction|ask|round|asked|rejected|noted|supplied|approved|locked)\b|\bscope update\b/i;
function withoutProvenance(paragraph) {
  // Odd entries are the spaces and line breaks between sentences, kept so lists stay lists.
  const parts = paragraph.replace(/\s*\((?:[^()]*\b(?:founder|ratified|ruling)\b[^()]*)\)/gi, "").split(/(?<=[.!?])(\s+)(?=[A-Z"“*\-])/);
  let kept = "";
  for (let at = 0; at < parts.length; at += 2) if (!provenance.test(parts[at])) kept += (kept ? parts[at - 1] ?? " " : "") + parts[at];
  return kept.trim();
}

const read = (file) => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const wikilinks = (text) => text.replace(/\[\[([^\]]+)\]\]/g, (_, link) => link.split("|").at(-1).split("/").at(-1).replaceAll("-", " "));
const sentenceCase = (heading) => {
  const plain = heading.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return plain === plain.toUpperCase() ? plain.charAt(0) + plain.slice(1).toLowerCase() : plain;
};

// A lesson keeps what the speaker teaches, in our words: claim titles and restatements, not their quotes.
function lessonText(text) {
  return text.split("\n").map((line) => {
    const claim = /^\*\*Claim\s+\d+\s*[—–-]+\s*(.+?)\*\*\s*$/.exec(line.trim());
    if (claim) return claim[1];
    const label = /^\s*(?:[-*]\s*)?(?:\*\*)?[A-Za-z][^:\n]{0,70}?(?:\*\*)?:\s*(.*)$/.exec(line);
    const rest = label ? label[1] : line.trim().replace(/^[-*]\s*/, "");
    // Quotes are the speaker's words, and "Recurrence" lines are notes about the video, not the lesson.
    if (/^["“]/.test(rest) || /^\s*Recurrence:/i.test(line)) return "";
    // Long quoted spans inside a line are the speaker's words too; the bold lesson title stays.
    return line.replace(/^\s*Restated:\s*/, "").replace(/\s*[“"][^"”\n]{40,}[”"]/g, "");
  }).filter((line) => !/^\s*(?:\d+\.|[-*])\s*$/.test(line)).join("\n").replace(/\s*\[[^\[\]]{2,600}\]/g, "").replace(/\n{3,}/g, "\n\n");
}

const passages = [];
const versions = [];
function addPassages(id, title, tags, heading, text) {
  let chunk = "";
  const flush = () => {
    if (chunk.trim()) passages.push({ id: `${id}-${passages.filter((p) => p.source_id === id).length + 1}`, source_id: id, title: `${title}: ${heading.replace("three proven structures", "three observed structures")}`, tags, text: chunk.trim() });
    chunk = "";
  };
  for (const paragraph of text.split(/\n\s*\n/)) {
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

function addPage(id, file, { sections = null, tags, title: fixedTitle, lesson = false }) {
  const raw = read(file);
  versions.push([id, hash(raw)]);
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");
  const title = fixedTitle || /^# (.+)$/m.exec(body)?.[1] || id;
  // Lessons use "# SECTION" headings under the title; method pages use "## Section".
  const parts = body.split(lesson ? /^#{1,2} /m : /^## /m).slice(1);
  if (!lesson && !sections) {
    // The opening summary under the title is often the clearest statement of the method.
    const intro = /^# .+\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(body)?.[1]?.trim();
    if (intro) parts.unshift(`Overview\n${intro}`);
  } else parts.shift();
  for (const section of parts) {
    const heading = section.split("\n")[0].trim();
    if (OMIT.test(heading) || (lesson && !LESSON_KEEP.test(heading)) || (sections && !sections.includes(heading))
      || SOURCE_NAMES.some((name) => heading.toLowerCase().includes(name.toLowerCase()))) continue;
    // Pulsify's own offer mechanism is sold to clients, never taught through them. Subsections about
    // Pulsify's own channels or internal notes go the same way as whole sections.
    let text = wikilinks(section.slice(heading.length).trim()).split("\n").filter((line) => !/\bPulse System\b/i.test(line)).join("\n")
      .split(/^(?=### )/m).filter((part) => !/^### /.test(part) || !(OMIT.test(part.slice(4)) || /^### [^\n]*\bPulsify'?s?\b[^\n]*\bown\b/i.test(part))).join("");
    if (lesson) text = lessonText(text);
    // Drop attributed paragraphs, don't relabel someone else's results as Pulsify's.
    const cleaned = clientMethodReference(text.replace(/\n(?=(?:\d+\.|- )\s)/g, "\n\n"))
      .split(/\n\s*\n/).map((paragraph) => paragraph.startsWith(">") ? "" : withoutProvenance(paragraph))
      .filter((paragraph) => paragraph && !/^-{3,}$|^#{3,6}\s*$/.test(paragraph) && !sensitive.test(paragraph) && !(lesson && lessonNoise.test(paragraph))
        && !/source case:|his numbers:|\$4M in client revenue|no dedicated BOF videos/i.test(paragraph))
      .join("\n\n");
    if (cleaned.trim()) addPassages(id, title, tags, sentenceCase(heading), cleaned);
  }
  if (!passages.some((part) => part.source_id === id)) throw new Error(`Empty source: ${id}`);
}

for (const [id, file, sections, tags] of SOURCES) addPage(id, file, { sections, tags });
for (const [id, file, title, tags] of LESSONS) addPage(id, file, { tags, title, lesson: true });

// Cards: "---" front matter (task, title, formats, triggers, sources, source_hashes) then the card text.
const sourceHash = new Map([...versions, ...CARD_ONLY.map(([id, file]) => [id, hash(read(file))])]);
const field = (front, name) => new RegExp(`^${name}:\\s*(.*)$`, "m").exec(front)?.[1]?.trim() ?? "";
const list = (value) => value.replace(/^\[|\]$/g, "").split(",").map((item) => item.trim()).filter(Boolean);
const cards = [];
const stale = [];
const cardDir = path.join(root, CARDS_DIR);
for (const name of fs.existsSync(cardDir) ? fs.readdirSync(cardDir).filter((file) => file.endsWith(".md")).sort() : []) {
  const file = `${CARDS_DIR}/${name}`;
  const raw = read(file);
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`Card without front matter: ${file}`);
  const [, front, text] = match;
  const sources = list(field(front, "sources"));
  for (const id of sources) if (!sourceHash.has(id)) throw new Error(`${file} lists unknown source ${id}`);
  const recorded = Object.fromEntries(list(field(front, "source_hashes")).map((pair) => pair.split("=")));
  const changed = sources.filter((id) => recorded[id] !== sourceHash.get(id).slice(0, 12));
  if (process.argv.includes("--stamp-cards")) {
    const stamp = `source_hashes: [${sources.map((id) => `${id}=${sourceHash.get(id).slice(0, 12)}`).join(", ")}]`;
    const updated = /^source_hashes:/m.test(front) ? front.replace(/^source_hashes:.*$/m, stamp) : `${front}\n${stamp}`;
    fs.writeFileSync(path.join(root, file), `---\n${updated}\n---\n${text}`);
  } else if (changed.length) stale.push(`${name} (${changed.join(", ")})`);
  const body = wikilinks(text).trim();
  if (sensitive.test(body) || SOURCE_NAMES.some((source) => body.toLowerCase().includes(source.toLowerCase()))) throw new Error(`${file} names a person or a private path`);
  cards.push({ id: field(front, "task"), title: field(front, "title"), formats: list(field(front, "formats")), triggers: list(field(front, "triggers")), sources, text: body });
  versions.push([`card:${field(front, "task")}`, hash(body)]);
}

const version = hash(JSON.stringify({ versions, passages, cards })).slice(0, 16);
const data = { version, sources: versions.filter(([id]) => !id.startsWith("card:")).map(([id, sha]) => ({ id, hash: sha, client_visible: true })), cards, passages };
for (const name of SOURCE_NAMES) if (JSON.stringify(passages).toLowerCase().includes(name.toLowerCase())) throw new Error(`Source name in collection: ${name}`);
const output = `// GENERATED by tools/build-copy-knowledge.mjs. Rebuild after a source or policy change.\nexport const COPY_KNOWLEDGE = ${JSON.stringify(data, null, 2)};\n`;
const target = path.join(root, "output/standard-preview/functions/_shared/copy-knowledge-data.js");

// Every wiki page is either a source, a card or reviewed as private. New pages are reported until classified.
const listed = new Set([...SOURCES.map(([, file]) => file), ...LESSONS.map(([, file]) => file), ...CARD_ONLY.map(([, file]) => file), ...OWN_BUILD]);
const wikiPages = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? wikiPages(`${dir}/${entry.name}`) : entry.name.endsWith(".md") ? [`${dir}/${entry.name}`] : []);
const reviewed = new Set(fs.existsSync(PRIVATE_FILE) ? JSON.parse(fs.readFileSync(PRIVATE_FILE, "utf8")).private : []);
const unclassified = wikiPages("wiki").filter((file) => !listed.has(file) && !file.startsWith(`${CARDS_DIR}/`) && !reviewed.has(file));
if (process.argv.includes("--classify")) {
  fs.writeFileSync(PRIVATE_FILE, `${JSON.stringify({ note: "Wiki pages reviewed and kept away from Jane. Add a page to SOURCES or LESSONS in build-copy-knowledge.mjs to give it to her.", private: [...reviewed, ...unclassified].sort() }, null, 2)}\n`);
}

if (process.argv.includes("--check")) {
  if (fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== output) throw new Error("Jane knowledge is stale. Rebuild it before release.");
} else fs.writeFileSync(target, output);
const chars = passages.reduce((sum, part) => sum + part.text.length, 0);
console.log(`Jane knowledge ${version}: ${SOURCES.length + LESSONS.length} sources, ${passages.length} passages (${Math.round(chars / 1000)}k characters), ${cards.length} task cards (${process.argv.includes("--check") ? "current" : "built"}).`);
if (stale.length) console.log(`Task cards to review, their sources changed: ${stale.join("; ")}. Rerun with --stamp-cards after updating them.`);
if (unclassified.length && !process.argv.includes("--classify")) console.log(`New vault pages not yet classified for Jane (${unclassified.length}): ${unclassified.join(", ")}`);
