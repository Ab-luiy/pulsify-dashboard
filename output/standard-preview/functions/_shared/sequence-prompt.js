const TYPE_MENU = [
  "value-driven",
  "credibility",
  "q&a",
  "day-in-the-life",
  "breakdown",
  "lifestyle",
  "cta",
  "start-here",
  "story launch",
];

const ALLOWED_ANNOTATIONS = new Set([
  "red-underline",
  "green-underline",
  "green-check",
  "red-x",
  "red-box",
  "blue-arrow",
  "red-word",
  "none",
]);
const ALLOWED_IMAGE_CLASSES = new Set([
  "proof-screenshot",
  "device-mockup",
  "proof-wall",
  "real-workspace",
]);
const SLIDE_JOBS = [
  "curiosity",
  "pain",
  "statement and proof",
  "belief shift",
  "result",
  "close from abundance",
  "gap",
  "access",
  "cta",
];
const ANNOTATION_PLAN = [
  [{ type: "red-word", target: "the outcome or contrarian word in line 1" }],
  [{ type: "red-underline", target: "the pain line" }],
  [
    { type: "green-underline", target: "the new mechanism line" },
    { type: "red-box", target: "the proof number or receipt" },
  ],
  [{ type: "blue-arrow", target: "the old way to new way shift" }],
  [{ type: "green-check", target: "the result line" }],
  [{ type: "green-underline", target: "the trigger word or next step" }],
  [{ type: "red-x", target: "the broken assumption" }],
  [{ type: "blue-arrow", target: "the access point" }],
  [{ type: "green-check", target: "the action line" }],
];
const IMAGE_PLAN = [
  ["real-workspace", "real workspace with the current build or notes visible"],
  ["proof-screenshot", "student analytics or DM receipt tied to the pain"],
  ["proof-screenshot", "student Stripe dashboard or booked-call receipt"],
  ["device-mockup", "phone mockup showing the exact story sequence"],
  ["proof-wall", "wall of student wins and client screenshots"],
  ["real-workspace", "whiteboard or Loom frame showing the mechanism"],
  ["proof-screenshot", "before and after profile or funnel metric"],
  ["device-mockup", "DM trigger word or application path on phone"],
  ["proof-wall", "student-result wall behind the closing frame"],
];
const BANNED_ARTIFACT_WORDS = /\b(car|cars|watch|watches|hotel|hotels|cash|mansion|mansions|jet|jets|supercar|supercars|lifestyle|luxury|luxurious|penthouse|first class|flex)\b/i;

export function buildSequencePrompt({
  clientName,
  clientProfile,
  type,
  intent,
  topic,
  goal,
  triggerWord,
  proofLines,
  slideCount,
}) {
  const safeGoal = normalizeGoal(goal);
  const safeCount = clampSlideCount(slideCount);
  const proofBlock = (Array.isArray(proofLines) ? proofLines : [])
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  const system = [
    "You are Pulsify's Instagram story-sequence generator.",
    "Follow the story-sequence-generator skill contract exactly.",
    "Valid sequence types:",
    `- ${TYPE_MENU.join(", ")}`,
    "If intent is provided instead of type, map intent -> type and say so in one line via mapped_from_intent.",
    "Type structures:",
    "- value-driven: set a scene, build tension, walk through a framework or lesson; the viewer must feel they got something for free.",
    "- credibility: open with a result, stack wins across the board, close with a positioning statement; an education slide before results makes them read as proof of that claim.",
    "- q&a: answers only, 50/50 technical and personal; if questions are thin, write the ICP's own unasked questions; every answer is a free consult.",
    "- day-in-the-life: timestamped slots across a real day; every slot carries value, education, or proof - never bare documentation.",
    "- breakdown: one ICP topic across ~6 slides, old way vs new way framing; lead with what they walk away with, not what they will learn.",
    "- lifestyle: the 20% human share; humanity without flex (training, food, the desk at 2am), never possessions as the subject.",
    "- cta: the timeline conversion frame; every next slide adds value to the prior one and the ask lands only after the pain is felt.",
    "- start-here: permanent highlight, the silent sales pitch; story (3) -> client proof (3) -> framework (2) -> close (2), zero selling, each slide pairs a pain point with an insight; a warm register-drop photo belongs at the close.",
    "- story launch: a short webinar told in ~9 slides ending in a hard ask; only for accounts with proof to carry it.",
    "Every sequence must follow the universal 6-step arc: curiosity -> pain -> statement+proof -> belief shift -> result -> close from abundance.",
    "Hooks must carry outcome, specificity, and speed.",
    "The 9-slide conversion frame is mandatory for conversion-goal sequences: slides 1-3 pattern interrupt + proof/value, 4-6 pain mirror + gap, 7-9 access/offer/CTA.",
    "CTA dial: goal=reach -> soft or no CTA. goal=dms or goal=booked calls -> engineered CTA with the trigger word. Lead-magnet type -> CTA on slide 1.",
    "Photo requests per slide must be concrete, shootable, and include one alternative.",
    "Pulsify proof currency only: workspaces, screen receipts, dashboards, whiteboards, team calls, human-not-flex shots. Never cars, watches, hotels, cash.",
    "Design direction is required for every slide. The look is part of the asset, not optional notes.",
    "For each slide include design with: annotation, image_class, treatment, chips. Legacy design_direction with the same content is also accepted.",
    "annotations: one to three items, each with type and target. Valid types: red-underline, green-underline, green-check, red-x, red-box, blue-arrow, red-word, none. The target says the line or word it lands on. Never mark every word.",
    "image_class: exactly one of proof-screenshot, device-mockup, proof-wall, real-workspace. Lifestyle or flex imagery is not a valid option.",
    "artifact_slot: a specific student-proof or work artifact, such as student Stripe dashboard showing $50k or client-call frame with result notes.",
    "treatment: object with text as pill-box or drop-shadow, and alignment as left or right.",
    "chips: only for taxonomy or carousel-style slides. Use cadence/function/audience colour code when needed; otherwise an empty array.",
    "Copy rules: pill-box style, 1-3 pills per slide, one reframe per sequence, pain not situation, real numbers only from supplied proof, respect divide-by-three, sentence case, no emojis, no exclamation marks.",
    "Voice guard: no em-dash spam, no 'here's the kicker', no curly quotes, no invented stats.",
    "Required output JSON shape:",
    '{"type":"","mapped_from_intent":"","slides":[{"n":1,"job":"","text_pills":[],"emphasis":"","photo":{"primary":"","alternative":""},"interactive":"none","design":{"annotation":[{"type":"red-underline","target":"pain line"}],"image_class":{"type":"proof-screenshot","artifact":"student Stripe dashboard showing $50k"},"treatment":{"text":"pill-box","alignment":"left"},"chips":[]}}],"hooks":["",""],"why_order":"","posting_note":""}',
    "Respond with JSON only.",
  ].join("\n");

  const user = [
    `Client name: ${String(clientName || "Unknown client").trim() || "Unknown client"}`,
    `Client profile: ${String(clientProfile || "No extra client profile supplied.").trim() || "No extra client profile supplied."}`,
    `Type: ${String(type || "").trim() || "Not supplied"}`,
    `Intent: ${String(intent || "").trim() || "Not supplied"}`,
    `Topic: ${String(topic || "").trim() || "Not supplied"}`,
    `Goal: ${safeGoal}`,
    `Trigger word: ${String(triggerWord || "").trim() || "None supplied"}`,
    `Slide count target: ${safeCount}`,
    proofBlock.length
      ? `Proof lines:\n- ${proofBlock.join("\n- ")}`
      : "Proof lines: none supplied. Do not invent proof or numbers.",
    "Return the sequence in the required JSON only.",
  ].join("\n\n");

  return { system, user };
}

export function buildManualPrompt(input) {
  const prompt = buildSequencePrompt(input);
  return `${prompt.system}\n\n${prompt.user}`;
}

export function buildManualSequenceOutput(input) {
  const type = normalizeType(input?.type) || (input?.intent ? "value-driven" : "value-driven");
  const slideCount = clampSlideCount(input?.slideCount);
  return {
    type,
    mapped_from_intent: input?.intent ? String(input.intent || "").trim() : "",
    manual_mode: true,
    slides: Array.from({ length: slideCount }, (_, index) => {
      const n = index + 1;
      const job = roleForSlide(n, slideCount);
      const designDirection = buildDesignDirection({ type, slideNumber: n, slideCount, job });
      return {
        n,
        job,
        text_pills: [],
        emphasis: "",
        photo: photoForSlide(n, type),
        interactive: interactiveForSlide(n, slideCount, input?.goal),
        design: toDesignBlock(designDirection),
        design_direction: designDirection,
      };
    }),
    hooks: [],
    why_order: "Manual mode returns the design contract now. Write the copy from the saved prompt, then keep these visual directions attached to each slide.",
    posting_note: "Use student proof, work artifacts, and real receipts only.",
  };
}

export function buildDesignDirection({ type, slideNumber, slideCount, job }) {
  const index = Math.max(0, Number(slideNumber || 1) - 1);
  const image = IMAGE_PLAN[index % IMAGE_PLAN.length];
  const direction = {
    annotations: ANNOTATION_PLAN[index % ANNOTATION_PLAN.length],
    image_class: image[0],
    artifact_slot: artifactForType(image[1], type, job),
    treatment: {
      text: index % 2 === 0 ? "pill-box" : "drop-shadow",
      alignment: index % 2 === 0 ? "left" : "right",
    },
    chips: chipsForType(type, job, slideNumber, slideCount),
  };
  return sanitizeDesignDirection(direction, { type, slideNumber, slideCount, job });
}

export function sanitizeDesignDirection(value, fallback = {}) {
  const fallbackDirection = buildFallbackDesignDirection(fallback);
  const source = value && typeof value === "object" ? value : {};
  const annotations = Array.isArray(source.annotations)
    ? source.annotations
    : Array.isArray(source.annotation)
      ? source.annotation
      : source.annotation
        ? [source.annotation]
      : fallbackDirection.annotations;
  const safeAnnotations = annotations
    .map((item) => {
      const raw = item && typeof item === "object" ? item : { type: item };
      const type = ALLOWED_ANNOTATIONS.has(String(raw.type || "").trim()) ? String(raw.type || "").trim() : "";
      return type
        ? { type, target: String(raw.target || raw.line || raw.word || "").trim() || fallbackDirection.annotations[0].target }
        : null;
    })
    .filter(Boolean)
    .slice(0, 3);
  const rawImageClass = source.image_class && typeof source.image_class === "object"
    ? source.image_class.type
    : source.image_class;
  const rawArtifactSlot = source.artifact_slot
    || (source.image_class && typeof source.image_class === "object" ? source.image_class.artifact : "");
  const imageClass = ALLOWED_IMAGE_CLASSES.has(String(rawImageClass || "").trim())
    ? String(rawImageClass || "").trim()
    : fallbackDirection.image_class;
  const artifactSlot = sanitizeArtifactSlot(rawArtifactSlot, fallbackDirection.artifact_slot);
  const treatmentSource = source.treatment && typeof source.treatment === "object" ? source.treatment : {};
  const text = String(treatmentSource.text || treatmentSource.type || source.treatment || "").trim();
  const alignment = String(treatmentSource.alignment || source.alignment || "").trim();

  return {
    annotations: safeAnnotations.length ? safeAnnotations : fallbackDirection.annotations,
    image_class: imageClass,
    artifact_slot: artifactSlot,
    treatment: {
      text: text === "drop-shadow" ? "drop-shadow" : "pill-box",
      alignment: alignment === "right" ? "right" : "left",
    },
    chips: normalizeChips(source.chips, fallbackDirection.chips),
  };
}

function toDesignBlock(direction) {
  return {
    annotation: direction.annotations,
    image_class: {
      type: direction.image_class,
      artifact: direction.artifact_slot,
    },
    treatment: direction.treatment,
    chips: direction.chips,
  };
}

function buildFallbackDesignDirection(fallback) {
  const slideNumber = Number(fallback?.slideNumber || 1);
  const slideCount = clampSlideCount(fallback?.slideCount);
  const type = normalizeType(fallback?.type) || "value-driven";
  const job = fallback?.job || roleForSlide(slideNumber, slideCount);
  const index = Math.max(0, slideNumber - 1);
  const image = IMAGE_PLAN[index % IMAGE_PLAN.length];
  return {
    annotations: ANNOTATION_PLAN[index % ANNOTATION_PLAN.length],
    image_class: image[0],
    artifact_slot: artifactForType(image[1], type, job),
    treatment: {
      text: index % 2 === 0 ? "pill-box" : "drop-shadow",
      alignment: index % 2 === 0 ? "left" : "right",
    },
    chips: chipsForType(type, job, slideNumber, slideCount),
  };
}

function roleForSlide(slideNumber, slideCount) {
  if (slideCount <= 6) return SLIDE_JOBS[Math.min(slideNumber - 1, SLIDE_JOBS.length - 1)];
  if (slideNumber <= 3) return SLIDE_JOBS[slideNumber - 1];
  if (slideNumber <= Math.max(4, slideCount - 3)) return slideNumber % 2 ? "belief shift" : "gap";
  return SLIDE_JOBS[Math.min(slideNumber - 1, SLIDE_JOBS.length - 1)] || "close from abundance";
}

function photoForSlide(slideNumber, type) {
  const direction = buildDesignDirection({ type, slideNumber, slideCount: 8, job: roleForSlide(slideNumber, 8) });
  return {
    primary: direction.artifact_slot,
    alternative: "screen receipt, whiteboard, or client-call frame with the same proof job",
  };
}

function interactiveForSlide(slideNumber, slideCount, goal) {
  const normalizedGoal = normalizeGoal(goal);
  if (slideNumber === slideCount && (normalizedGoal === "dms" || normalizedGoal === "booked calls")) return "dm trigger word";
  if (slideNumber === Math.ceil(slideCount / 2)) return "poll or question sticker";
  return "none";
}

function artifactForType(base, type, job) {
  const normalizedType = normalizeType(type) || "value-driven";
  if (normalizedType === "credibility") return base.replace("student analytics", "student result dashboard");
  if (normalizedType === "q&a") return "question sticker with the answer backed by a student receipt";
  if (normalizedType === "day-in-the-life") return "real workspace or client-call frame that proves the lesson";
  if (normalizedType === "breakdown") return "whiteboard or screen recording frame showing the breakdown";
  if (normalizedType === "cta") return "DM inbox or application path with student-result proof nearby";
  if (normalizedType === "start-here") return "proof wall, profile screenshot, or workspace frame for the start-here highlight";
  if (normalizedType === "story launch") return "student proof receipt tied to the campaign promise";
  if (normalizedType === "lifestyle") return "human-not-flex workspace, training, or food frame tied to the lesson";
  return String(base || job || "student-proof artifact");
}

function chipsForType(type, job, slideNumber, slideCount) {
  const normalizedType = normalizeType(type);
  const isTaxonomy = normalizedType === "breakdown" || String(job || "").toLowerCase().includes("taxonomy");
  if (!isTaxonomy) return [];
  return [
    { axis: "cadence", label: slideNumber <= Math.ceil(slideCount / 2) ? "daily" : "weekly", color: "purple" },
    { axis: "function", label: normalizedType === "breakdown" ? "teach" : "sort", color: "gray" },
    { axis: "audience", label: slideNumber <= 2 ? "cold" : "warm", color: "green" },
  ];
}

function normalizeChips(value, fallback) {
  if (!Array.isArray(value)) return fallback || [];
  return value
    .map((chip) => {
      if (!chip || typeof chip !== "object") return null;
      const axis = String(chip.axis || "").trim();
      const label = String(chip.label || "").trim();
      const color = String(chip.color || "").trim();
      return axis && label ? { axis, label, color: color || "gray" } : null;
    })
    .filter(Boolean)
    .slice(0, 6);
}

function sanitizeArtifactSlot(value, fallback) {
  const text = String(value || "").trim();
  if (!text || BANNED_ARTIFACT_WORDS.test(text)) return fallback;
  return text.slice(0, 180);
}

function normalizeType(value) {
  const type = String(value || "").trim().toLowerCase();
  return TYPE_MENU.includes(type) ? type : "";
}

function normalizeGoal(value) {
  const goal = String(value || "").trim().toLowerCase();
  if (goal === "booked calls" || goal === "calls") return "booked calls";
  if (goal === "dms" || goal === "dm") return "dms";
  return "reach";
}

function clampSlideCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 8;
  return Math.max(3, Math.min(12, Math.round(number)));
}
