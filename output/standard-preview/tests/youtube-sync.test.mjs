// The YouTube channel sync (workers/sync/src/jobs/youtube.js). From 2026-09-29 the
// channel had no public videos, YouTube answered 404 for its uploads playlist, and
// the whole job failed, so subscribers and views stopped updating too.
// Real SQLite, fake YouTube.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { syncYouTube } from '../workers/sync/src/jobs/youtube.js';

const sql = new DatabaseSync(':memory:');
for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort()) {
  for (const st of readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8').replace(/--[^\n]*/g, '').split(';')) {
    if (st.trim()) try { sql.exec(st); } catch { /* later migrations alter tables this test does not need */ }
  }
}
const env = {
  YT_API_KEY: 'test',
  DB: { prepare(q) { let a = []; const p = { bind(...v) { a = v; return p; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return p; } },
};

function fakeYouTube({ videoCount, playlistStatus = 200 }) {
  return async (url) => {
    const u = String(url);
    if (u.includes('/channels?')) return Response.json({ items: [{ snippet: { title: 'AB Luiy', customUrl: '@abluiy' }, statistics: { subscriberCount: '19', videoCount: String(videoCount), viewCount: '5000' }, contentDetails: { relatedPlaylists: { uploads: 'UUx' } } }] });
    if (u.includes('/playlistItems?')) {
      if (playlistStatus !== 200) return Response.json({ error: { message: 'The playlist identified with the request\'s playlistId parameter cannot be found.' } }, { status: playlistStatus });
      return Response.json({ items: [{ contentDetails: { videoId: 'v1' } }] });
    }
    if (u.includes('/videos?')) return Response.json({ items: [{ snippet: { title: 'A video', publishedAt: '2026-10-01T00:00:00Z' }, statistics: { viewCount: '100' }, contentDetails: { duration: 'PT10M' } }] });
    return Response.json({ error: { message: 'unexpected ' + u } }, { status: 500 });
  };
}

const snap = (kind) => JSON.parse(sql.prepare("SELECT payload_json FROM snapshots WHERE source='youtube' AND kind=?").get(kind).payload_json);
const metric = (name) => sql.prepare("SELECT value FROM metric_points WHERE source='youtube' AND metric=? ORDER BY rowid DESC").get(name)?.value;

async function run(options) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeYouTube(options);
  try { return await syncYouTube(env); } finally { globalThis.fetch = realFetch; }
}

test('a channel with public videos saves the channel and its latest video', async () => {
  await run({ videoCount: 3 });
  assert.equal(snap('channel').subscribers, 19);
  assert.equal(snap('latest-video').id, 'v1');
  assert.equal(metric('latest_video_views'), 100);
});

test('a channel with no public videos still saves subscribers and views', async () => {
  await run({ videoCount: 0 });
  assert.equal(snap('channel').videos, 0);
  assert.equal(metric('subscribers'), 19);
  assert.deepEqual(snap('latest-video'), {}, 'no stale latest video is left on screen');
});

test('a 404 on the uploads playlist is treated as no public videos', async () => {
  await run({ videoCount: 2, playlistStatus: 404 });
  assert.deepEqual(snap('latest-video'), {});
});

test('other YouTube errors still fail the run', async () => {
  await assert.rejects(run({ videoCount: 2, playlistStatus: 403 }), /playlistItems failed \(403\)/);
});
