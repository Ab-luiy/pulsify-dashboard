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
    "Copy rules: pill-box style, 1-3 pills per slide, one reframe per sequence, pain not situation, real numbers only from supplied proof, respect divide-by-three, sentence case, no emojis, no exclamation marks.",
    "Voice guard: no em-dash spam, no 'here's the kicker', no curly quotes, no invented stats.",
    "Required output JSON shape:",
    '{"type":"","mapped_from_intent":"","slides":[{"n":1,"job":"","text_pills":[],"emphasis":"","photo":{"primary":"","alternative":""},"interactive":"none"}],"hooks":["",""],"why_order":"","posting_note":""}',
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
