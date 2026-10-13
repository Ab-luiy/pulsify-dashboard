// Story sequences log themselves (founder 2026-10-13: "every 24 hours, you get one story sequence that we've
// been working on. If you see it posted within 24 hours on the stories, then you just mark it as the story
// sequence that's been worked on. Something pretty smart.").
//
// After each client Instagram sync: stories posted close together (no gap over BURST_GAP) are one sequence.
// Once its stories have run their 24 hours (so the numbers are final) a sequence of MIN_STORIES or more is
// written to sequence_log, the table the Metrics pages read: views per story in posting order, replies as
// DMs, profile visits. It is matched to the newest story sequence the client made in the app before
// posting (studio_sequences), whose topic and type it takes and which is marked posted. Each burst is
// logged once, keyed by its first story id in `notes`.

const HOUR = 3600_000;
export const BURST_GAP = 2 * HOUR;
export const MIN_STORIES = 3;
const FINAL_AFTER = 24 * HOUR;
const LOOK_BACK = 4 * 24 * HOUR;
const MATCH_WITHIN = 14 * 24 * HOUR;

const at = (story) => Date.parse(story.timestamp || story.capturedAt || "") || 0;
const count = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

/** Stories in posting order, split where the gap between two is over BURST_GAP. */
export function bursts(stories) {
  const sorted = stories.filter((story) => story?.id && at(story)).sort((a, b) => at(a) - at(b));
  const out = [];
  for (const story of sorted) {
    const last = out.at(-1);
    if (last && at(story) - at(last.at(-1)) <= BURST_GAP) last.push(story);
    else out.push([story]);
  }
  return out;
}

const marker = (burst) => `auto:${burst[0].id}`;

export async function logStorySequences(env, clientId, stories, now = Date.now()) {
  if (!clientId || !env.DB) return 0;
  const ready = bursts(stories).filter((burst) => burst.length >= MIN_STORIES && now - at(burst.at(-1)) >= FINAL_AFTER && now - at(burst[0]) <= LOOK_BACK);
  if (!ready.length) return 0;

  const known = await env.DB.prepare("SELECT notes FROM sequence_log WHERE client_id=? AND notes LIKE 'Logged from Instagram%'").bind(clientId).all();
  const done = new Set((known.results || []).map((row) => /auto:([^)\s]+)/.exec(String(row.notes || ""))?.[1]).filter(Boolean));
  const made = await env.DB.prepare(
    "SELECT id, type, topic, params_json, created_at FROM studio_sequences WHERE client_id=? AND status IN ('draft','review','approved') ORDER BY created_at DESC LIMIT 10",
  ).bind(clientId).all();
  const candidates = (made.results || []).map((row) => {
    let params = {};
    try { params = JSON.parse(row.params_json || "{}"); } catch { params = {}; }
    return { ...row, params };
  });

  const statements = [];
  const stamp = new Date(now).toISOString();
  for (const burst of ready) {
    if (done.has(burst[0].id)) continue;
    const started = at(burst[0]);
    const match = candidates.find((row) => !row.params?.instagram?.posted_at && Date.parse(row.created_at) <= started && started - Date.parse(row.created_at) <= MATCH_WITHIN);
    const views = burst.map((story) => count(story.insights?.views ?? story.insights?.reach));
    const dms = burst.reduce((sum, story) => sum + count(story.insights?.replies), 0);
    const visits = burst.reduce((sum, story) => sum + count(story.insights?.profileVisits), 0);
    const day = new Date(started).toISOString().slice(0, 10);
    statements.push(env.DB.prepare(
      `INSERT INTO sequence_log (client_id, posted_on, type, topic, slide_count, slide_views_json, dms, profile_visits, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      clientId,
      day,
      String(match?.type || "story").slice(0, 40),
      String(match?.topic || `Stories on ${day}`).slice(0, 200),
      burst.length,
      JSON.stringify(views),
      dms,
      visits,
      `Logged from Instagram (${marker(burst)})${match ? `, matched to sequence ${match.id}` : ""}`,
      stamp,
      stamp,
    ));
    if (match) {
      match.params.instagram = { ...(match.params.instagram || {}), status: "posted", posted_at: new Date(started).toISOString(), story_ids: burst.map((story) => story.id) };
      statements.push(env.DB.prepare("UPDATE studio_sequences SET params_json=?, updated_at=? WHERE id=? AND client_id=?").bind(JSON.stringify(match.params), stamp, match.id, clientId));
    }
  }
  if (statements.length) await env.DB.batch(statements);
  return statements.length;
}
