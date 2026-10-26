// Model-neutral working state. Only attributed saved data and user turns become facts.
import { buildJaneBrainContext } from './client-brain-context.js';
import { excerpt, relevance } from './copy-knowledge.js';
import { scrubSources } from './source-scrub.js';
type Row = Record<string, any>;

export function janeRoute(message: string) {
  const text = message.trim();
  if (/^(?:hi|hey|hello|thanks|thank you|okay|ok|great|got it)[.! ]*$/i.test(text)) return 'social';
  // Only self-contained edits or follow-ups to text already in this conversation skip planning.
  if (!/\b(?:saved|earlier|previous|remember|find|search|document|transcript|file|other chat)\b/i.test(text)
    && /^(?:make (?:it|this|that)|shorten|tighten|rephrase|rewrite this|try again|give me (?:another|two more)|why\??$)/i.test(text)) return 'edit';
  // Everything else goes through the lookup planner (founder 2026-10-26: "connect the dots"). It returns
  // no calls when the supplied context is enough, and reads the client's own records (videos, leads,
  // calls, plan, earlier chats, drafts) when they would change the answer.
  return 'lookup';
}

export function buildJaneBrief({ data, memory = [], history = [], message, publicDraft = false }: {
  data: { rows: Row[]; proof_items?: Row[] }; memory?: Row[]; history?: Row[]; message: string; publicDraft?: boolean;
}) {
  const groups = [
    ['Business and audience', ['identity', 'icp', 'positioning']],
    ['Offer and delivery', ['offer', 'program', 'funnel']],
    ['Voice and constraints', ['voice', 'donot']],
  ] as const;
  const blocks = groups.map(([label, sections]) => {
    const rows = data.rows.filter(row => (sections as readonly string[]).includes(row.section));
    return `${label}:\n${buildJaneBrainContext({ rows, proof_items: [] }, { query: message, publicDraft, maxChars: 1800 }).prompt_text}`;
  });
  const decisions = history.filter(row => row.role === 'user' && /\b(?:decided|agreed|instead|actually|correction|from now on|no longer|use|keep|don't|do not)\b/i.test(row.content || ''))
    .slice(-5).map(row => `User message ${row.id ?? '(current chat)'}${row.created_at ? `, ${row.created_at}` : ''}: ${excerpt(scrubSources(String(row.content)), message, 500)}`);
  return [
    'WORKING BRIEF (reference data, rebuilt from current records every turn; no generated summary is treated as fact).',
    `Current request: ${scrubSources(message).slice(0, 1500)}`,
    ...blocks,
    'Saved working preferences, newest first:\n' + (memory.slice(0, 8).map(row => `Memory ${row.id}; ${row.created_at || 'date unavailable'}; ${row.source}: ${scrubSources(row.note)}`).join('\n') || 'None saved.'),
    'Recent user decisions and corrections (not verified outcomes):\n' + (decisions.join('\n') || 'No explicit decision recovered.'),
    'Current user corrections take precedence. If a correction conflicts with a saved business field, acknowledge it rather than silently treating both as true. A new task can replace an earlier task. Missing fields are unknown, not instructions to ask a questionnaire. Ask only what blocks this request.',
  ].join('\n\n');
}

export function selectJaneExamples(rows: Row[], query: string, max = 2) {
  return rows.map((row): Row & { score: number } => ({ ...row, score: relevance(`${row.request || ''} ${row.content}`, query) }))
    .filter(row => row.score > 0).sort((a, b) => b.score - a.score || b.id - a.id).slice(0, max)
    .map(row => `Approved reply ${row.id}${row.created_at ? ` (${row.created_at})` : ''}. Match relevant voice/structure only; NO facts, promises, names or numbers may be borrowed.\nOriginal request: ${scrubSources(String(row.request || '')).slice(0, 500)}\nWhy approved: ${scrubSources(String(row.approval_note || 'The client gave this a thumbs-up; no explanation recorded.')).slice(0, 400)}\nWriting: ${excerpt(scrubSources(String(row.content)), query, 1600)}`);
}
