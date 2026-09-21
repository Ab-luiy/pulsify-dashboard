// Active work is time-bounded. History remains available by explicit lookup.
export function prospectCutoff(period = 'year', now = Date.now()) {
  const d = new Date(now);
  if (period === 'recent') {
    const day = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 2);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  } else { d.setUTCMonth(0, 1); d.setUTCHours(0, 0, 0, 0); }
  return d.toISOString();
}

export function bookingEvidence(messages) {
  for (const m of [...messages].reverse()) {
    const text = String(m.text || '');
    if (/\b(cancel(?:led|ed)?|not scheduled|haven't booked|didn't book|can't make|cannot make)\b/i.test(text)) return null;
    let kind = null;
    if (/https:\/\/meet\.google\.com\/[a-z-]+/i.test(text)) kind = 'Google Meet link';
    else if (/\b(?:call|meeting|ig call|instagram call)\s+(?:is\s+)?(?:booked|scheduled|confirmed)\b|\b(?:booked|scheduled|confirmed)\s+(?:(?:a|the|our)\s+)?(?:call|meeting)\b/i.test(text)) kind = 'Call scheduled';
    else if (/\bwhats\s?app\b/i.test(text) && /\b(number|send|share|give|what'?s)\b/i.test(text)) kind = 'WhatsApp handoff';
    if (kind) return { kind, text: text.slice(0, 500), sent_at: m.sent_at, confirmed: false, source: 'keyword' };
  }
  return null;
}
