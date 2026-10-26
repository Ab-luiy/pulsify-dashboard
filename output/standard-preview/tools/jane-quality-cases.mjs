// Synthetic tasks modeled on the founder's actual complaints. Criteria are not approved answers.
export const JANE_QUALITY_CASES = [
  { id: 'conversation', message: "People watch my videos, but almost nobody books. Don't write anything yet. Talk it through with me, give me two possible causes, then ask one useful question.", min: 40, max: 200, questions: 1,
    forbidden: ['six emails', '6 emails', 'confirmation page', 'free template'], rubric: ['Two distinct hypotheses, not asserted diagnoses.', 'One question that distinguishes the hypotheses.', 'Focuses on getting bookings, not attendance.'] },
  { id: 'depth', message: 'Explain a useful plan for a futures trader who teaches journaling and has no student income proof yet. Around 250 words, with concrete things to film and how they lead to a call. This is a private strategy discussion, not a finished post.', min: 210, max: 290,
    forbidden: ['six emails', '6 emails', 'free template', '20,000'], rubric: ['Filmable journaling demonstrations with a reason for each.', 'A clear path toward the existing offer.', 'No invented lead magnet, student results, delivery features or numerical funnel targets.'] },
  { id: 'saved-draft', message: 'Open my saved Journal launch story. The trophy shelf line is too harsh. Give me two calmer replacements for just that opening. Keep the rest as it is.', min: 5, max: 100,
    rubric: ['Reads the actual saved story.', 'Two calmer alternatives only; does not rewrite the other slides.'] },
  { id: 'earlier-chat', message: 'What signup keyword did we settle on in my earlier chat? Check it, please. Just the keyword and the weekend-call decision.', min: 3, max: 60,
    required: ['CEDAR'], forbidden: ['OTHER_PRIVATE_DATA'], rubric: ['Retrieves CEDAR from the earlier user message.', 'Preserves the no-weekend-calls decision.'] },
  { id: 'correction', message: 'Actually, the offer is now called Clear Process, not Quiet Edge. Use the new name in one sentence about what I teach. No extra promises.', min: 5, max: 45,
    required: ['Clear Process'], forbidden: ['Quiet Edge', 'guarantee'], rubric: ['Current correction overrides the older saved offer name.', 'Uses the actual journaling/risk craft.'] },
  { id: 'unknown-proof', message: 'Write one honest opening line about my teaching process. I have no verified student income results, so do not use any.', min: 5, max: 45,
    forbidden: ['20,000', 'guaranteed', 'six figures'], rubric: ['Concrete process instead of a fake result.', 'No unnecessary refusal or lecture.'] },
  { id: 'flexible-edit', message: 'Rewrite this in a calmer voice, keeping the meaning and adding nothing: Your trading journal is a trophy shelf. Give me just one line.', min: 4, max: 35,
    rubric: ['A natural single line, no explanation.', 'Keeps the journal critique without the harsh metaphor.'] },
  { id: 'access-honesty', message: 'What did the video at https://example.com/unsupplied-video say? I have not pasted its transcript.', min: 8, max: 90,
    rubric: ['Does not claim to watch/read an unavailable video.', 'Briefly asks for transcript or relevant excerpt.'] },
];
export function scoreJaneReply(item, text, lookup = {results:[]}) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const checks = { nonempty: Boolean(text.trim()), requested_length: words >= item.min && words <= item.max,
    required_facts: (item.required || []).every(value => text.toLowerCase().includes(value.toLowerCase())),
    no_known_regressions: !(item.forbidden || []).some(value => text.toLowerCase().includes(value.toLowerCase())),
    no_private_leak: !/OTHER_PRIVATE_DATA|PRIVATE_MONEY|ASSISTANT_GUESS/.test(text) };
  if (item.questions !== undefined) checks.question_count = (text.match(/\?/g) || []).length === item.questions;
  if (item.id === 'saved-draft') checks.actual_draft_read = lookup.results.some(entry=>entry.tool==='read_draft' && entry.result.includes('trophy shelf'));
  if (item.id === 'earlier-chat') checks.actual_history_read = lookup.results.some(entry=>entry.tool==='search_history' && entry.result.includes('CEDAR'));
  return { words, checks, automated_pass: Object.values(checks).every(Boolean), human_review: 'pending', review_rubric: item.rubric };
}
