// The client's ICP avatar (pulsify-saas #105, founder 2026-10-31). It is stored as one workspace record of kind
// 'icp'; validateIcp guards what the portal saves, and icpContext is the one text shape Jane will read about the
// avatar once her writer is wired to it (the brief says: define the shape now, leave the writer alone).

const FORMATS = new Set(['long', 'reel', 'story', 'carousel']);
const SOURCES = new Set(['doc', 'calls', 'dms']);
const PRONOUNS = { he: ['he', 'him', 'his'], she: ['she', 'her', 'her'], they: ['they', 'them', 'their'] };

const isText = (value, max = 4000) => typeof value === 'string' && value.length <= max;
const isList = (value, min = 0, max = 200) => Array.isArray(value) && value.length >= min && value.length <= max;
const isPoint = (n) => Number.isInteger(n) && n >= 1 && n <= 28;

/** Every problem with an avatar, in plain words; an empty list means it can be saved. */
export function validateIcp(data) {
  const problems = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['The ICP is missing.'];
  if (data.version !== 1) problems.push('Unknown ICP version.');
  if (!isText(data.name, 60) || !data.name.trim()) problems.push('The avatar needs a name.');
  if (!PRONOUNS[data.pronoun]) problems.push('Pronoun must be he, she or they.');
  for (const key of ['label', 'headline', 'summary', 'brief']) if (!isText(data[key])) problems.push(`${key} must be text.`);
  const points = isList(data.points, 28, 28) ? data.points : null;
  if (!points) problems.push('The ICP has exactly 28 points.');
  else points.forEach((point, index) => {
    if (point?.n !== index + 1 || !isText(point.name, 60) || !isText(point.sum) || !isList(point.lines, 0, 40) || !point.lines.every((line) => isText(line))) problems.push(`Point ${index + 1} is malformed.`);
  });
  const lines = (n) => (points?.[n - 1]?.lines?.length ?? 0);
  if (!isList(data.pains, 1, 6)) problems.push('The ICP has one to six pains (three a side on the map).');
  else data.pains.forEach((pain, index) => {
    if (!isText(pain?.tag, 40) || !isText(pain.title, 200) || !isText(pain.more) || !isList(pain.evidence, 1, 40)) return problems.push(`Pain ${index + 1} is malformed.`);
    for (const ref of pain.evidence) if (!Array.isArray(ref) || !isPoint(ref[0]) || !Number.isInteger(ref[1]) || ref[1] < 0 || ref[1] >= lines(ref[0])) problems.push(`Pain ${index + 1} points at a line that doesn't exist.`);
  });
  if (!isList(data.feelings, 0, 16)) problems.push('Feelings must be a list.');
  else data.feelings.forEach((feeling, index) => {
    if (!isText(feeling?.name, 40) || !Number.isInteger(feeling.count) || feeling.count < 0 || !isList(feeling.points, 0, 28) || !feeling.points.every(isPoint) || !isText(feeling.meaning)) problems.push(`Feeling ${index + 1} is malformed.`);
  });
  if (!isList(data.wants, 0, 12) || !data.wants.every((want) => isText(want, 120))) problems.push('Wants must be short lines.');
  if (!isList(data.needs, 0, 12)) problems.push('Needs must be a list.');
  else data.needs.forEach((need, index) => {
    if (!['struggle', 'from', 'need', 'hear', 'see'].every((key) => isText(need?.[key])) || !isList(need.make, 0, 12)) return problems.push(`Need ${index + 1} is malformed.`);
    for (const item of need.make) {
      // A long-form video is a title; a reel or story is an idea. Exactly one of the two.
      const hasTitle = isText(item?.title, 200) && item.title.trim() !== '';
      const hasIdea = isText(item?.idea) && item.idea.trim() !== '';
      if (!FORMATS.has(item?.format) || hasTitle === hasIdea) problems.push(`Need ${index + 1} has a video without a format, or with both or neither of a title and an idea.`);
    }
  });
  if (!isList(data.sources, 0, 20) || !data.sources.every((source) => SOURCES.has(source?.kind) && isText(source.label, 120) && (source.count === undefined || Number.isInteger(source.count)))) problems.push('Sources are malformed.');
  return problems;
}

/** The avatar as plain text for Jane: who, what eats at them, how they feel, what they want and need, then the points. */
export function icpContext(data) {
  const [subject, object] = PRONOUNS[data.pronoun] || PRONOUNS.they;
  const line = (n, k) => data.points[n - 1]?.lines?.[k];
  const out = [`Ideal client: ${data.name}, ${data.label.charAt(0).toLowerCase()}${data.label.slice(1)}`, data.summary, ''];
  out.push(`What eats at ${object}:`);
  for (const pain of data.pains) {
    out.push(`- ${pain.title}. ${pain.more}`);
    const quotes = pain.evidence.map(([n, k]) => line(n, k)).filter(Boolean).slice(0, 4);
    if (quotes.length) out.push(`  In the ICP: ${quotes.map((quote) => `"${quote}"`).join(' ')}`);
  }
  const feelings = [...data.feelings].sort((a, b) => b.count - a.count).filter((feeling) => feeling.count > 0);
  if (feelings.length) out.push('', `What ${subject} feels most: ${feelings.map((feeling) => `${feeling.name} (${feeling.count})`).join(', ')}`);
  if (data.wants.length) out.push(`What ${subject} wants: ${data.wants.join('; ')}`);
  if (data.needs.length) {
    out.push('', `What ${subject} needs:`, data.brief);
    for (const need of data.needs) out.push(`- ${need.need} (because: ${need.struggle}). Needs to hear: "${need.hear}" Needs to see: ${need.see}`);
  }
  out.push('', 'The 28 points:');
  for (const point of data.points) if (point.sum || point.lines.length) out.push(`${point.n}. ${point.name}: ${point.sum || point.lines.join('; ')}`);
  return out.join('\n');
}
