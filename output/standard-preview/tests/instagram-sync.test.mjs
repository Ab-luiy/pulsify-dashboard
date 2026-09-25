// The daily Instagram sync (workers/sync/src/jobs/instagram.js). From 2026-09-19
// the posts call failed with a 404 every day, and because it threw first the
// profile, followers and insights stopped saving too, with "[object Object]" as
// the only reason. The posts call is now non-fatal. Real SQLite, fake Composio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { syncInstagram } from '../workers/sync/src/jobs/instagram.js';

const sql = new DatabaseSync(':memory:');
for (const st of readFileSync(new URL('../migrations/0025_data_spine.sql', import.meta.url), 'utf8').replace(/--[^\n]*/g, '').split(';')) {
  if (st.trim()) try { sql.exec(st); } catch { /* not needed here */ }
}
const env = {
  COMPOSIO_API_KEY: 'test',
  DB: { prepare(q) { let a = []; const p = { bind(...v) { a = v; return p; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return p; } },
};

function fakeComposio(mediaStatus) {
  return async (url) => {
    const slug = decodeURIComponent(String(url).split('/').pop());
    if (slug === 'INSTAGRAM_GET_USER_INFO') return Response.json({ data: { id: '1784', username: 'pulsify', followers_count: 1234, media_count: 40 } });
    if (slug === 'INSTAGRAM_GET_USER_INSIGHTS') return Response.json({ data: { data: [{ name: 'reach', values: [{ value: 50, end_time: '2026-09-24T07:00:00+0000' }] }] } });
    if (slug === 'INSTAGRAM_GET_IG_USER_MEDIA') {
      if (mediaStatus === 404) return Response.json({ error: { message: 'Media endpoint not found for this account', code: 404 } }, { status: 404 });
      return Response.json({ data: { data: [{ id: 'm1', caption: 'post' }] } });
    }
    if (slug === 'INSTAGRAM_GET_IG_USER_STORIES') return Response.json({ data: { data: [] } });
    return Response.json({ error: 'unexpected ' + slug }, { status: 500 });
  };
}

test('posts failing no longer stops profile, followers and insights; the real reason is logged', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeComposio(200);
  try {
    await syncInstagram(env);
    assert.deepEqual(JSON.parse(sql.prepare("SELECT payload_json FROM snapshots WHERE source='instagram' AND kind='media'").get().payload_json), [{ id: 'm1', caption: 'post' }]);

    globalThis.fetch = fakeComposio(404);
    await assert.rejects(syncInstagram(env), (error) => {
      assert.match(error.message, /Profile, followers and insights saved; posts failed/);
      assert.match(error.message, /Media endpoint not found for this account/, 'the reason, not [object Object]');
      return true;
    });
    const followers = sql.prepare("SELECT COUNT(*) AS n FROM metric_points WHERE source='instagram' AND metric='followers'").get().n;
    assert.equal(followers, 2, 'followers saved on both runs');
    assert.equal(JSON.parse(sql.prepare("SELECT payload_json FROM snapshots WHERE source='instagram' AND kind='profile'").get().payload_json).followers, 1234);
    assert.deepEqual(JSON.parse(sql.prepare("SELECT payload_json FROM snapshots WHERE source='instagram' AND kind='media'").get().payload_json), [{ id: 'm1', caption: 'post' }], 'the last good posts are kept');
  } finally {
    globalThis.fetch = realFetch;
  }
});
