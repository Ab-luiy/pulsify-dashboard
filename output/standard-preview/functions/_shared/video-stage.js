// A video's funnel stage (founder 2026-10-23): TOF reaches new people, MOF teaches the method, BOF shows proof or the
// offer and pushes to apply. The app guesses from what the video does first (a buyer, or two or more booked calls,
// make it BOF whatever the title says; one stray call from a big video does not), then from its title. The creator
// taps OK or picks another stage, and that choice wins.
// Confirmed stages live in the workspace preference `video-stages` as {stages: {video_id: "TOF"|"MOF"|"BOF"}}.

export const STAGES = ["TOF", "MOF", "BOF"];

const BOF = /\b(students?|clients?|testimonials?|case stud(y|ies)|went from|apply|application|mentorship|coaching|program|join (me|us|my)|book a call|spots? (left|open))\b/i;
const MOF = /\b(strateg(y|ies)|setups?|breakdown|how (i|to)|step by step|system|method|indicators?|order flow|volume|scalping|backtest(ed|ing)?|checklist|rules?|trick|routine|full trade)\b/i;

export const cleanStage = (value) => (STAGES.includes(String(value || "").toUpperCase()) ? String(value).toUpperCase() : null);

/** {stage, why}: behaviour first (a buyer or two booked calls make it BOF), then the title. */
export function guessStage({ title = "", calls = 0, buyers = 0 } = {}) {
  if (Number(buyers) > 0) return { stage: "BOF", why: "Its viewers paid" };
  if (Number(calls) >= 2) return { stage: "BOF", why: "Its viewers booked calls" };
  if (BOF.test(title)) return { stage: "BOF", why: "The title shows proof or the offer" };
  if (MOF.test(title)) return { stage: "MOF", why: "The title teaches the method" };
  return { stage: "TOF", why: "The title speaks to new people" };
}

/** The stage a video shows: the creator's choice when they made one, otherwise the guess. */
export function videoStage(video, confirmed) {
  const guess = guessStage(video);
  const chosen = cleanStage(confirmed?.[video.video_id]);
  return { value: chosen || guess.stage, guess: guess.stage, why: guess.why, confirmed: Boolean(chosen) };
}
