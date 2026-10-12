// The daily Instagram sync (workers/sync/src/jobs/instagram.js). It ran on
// Composio and failed every day from 2026-09-19 (posts tool removed, then the
// Meta token expired, then "No connected account found"). It now reads Zernio,
// the account the inbox already uses. Real SQLite, fake Zernio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { syncInstagram } from '../workers/sync/src/jobs/instagram.js';

const sql = new DatabaseSync(':memory:');
for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort()) {
  for (const st of readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8').replace(/--[^\n]*/g, '').split(';')) {
    if (st.trim()) try { sql.exec(st); } catch { /* later migrations alter tables this test does not need */ }
  }
}
const env = {
  ZERNIO_API_KEY: 'test',
  INTEGRATION_ENCRYPTION_KEY: 'x',
  DB: { prepare(q) { let a = []; const p = { bind(...v) { a = v; return p; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return p; }, async batch(list) { const out = []; for (const st of list) out.push(await st.run()); return out; } },
};

const POSTS = [
  { postId: 'z1', platformPostId: 'm1', content: 'a reel', mediaType: 'video', mediaProductType: 'REELS', platformPostUrl: 'https://instagram.com/reel/m1', thumbnailUrl: 'https://cdn/t.jpg', publishedAt: '2026-10-01T10:00:00Z', analytics: { views: 900, reach: 700, likes: 40, comments: 3, shares: 2, saves: 5, engagementRate: 7.1, igReelsAvgWatchTime: 6400, profileViews: 4 } },
  { platformPostUrl: 'https://www.instagram.com/p/SHORT1/', content: 'no id fields', mediaType: 'image', mediaProductType: 'FEED', publishedAt: '2026-10-02T10:00:00Z', analytics: {} },
  { postId: 'z2', platformPostId: 's1', content: '', mediaType: 'image', mediaProductType: 'STORY', publishedAt: '2026-10-06T10:00:00Z', analytics: { views: 100 } },
];

function fakeZernio({ needsReconnection = false, insightsStatus = 200 } = {}) {
  return async (url) => {
    const u = String(url);
    if (u.includes('/v1/accounts?')) return Response.json({ accounts: [{ _id: 'acc1', username: 'pulsify', displayName: 'Pulsify', followersCount: 1234, needsReconnection }] });
    if (u.includes('/v1/analytics/instagram/account-insights')) {
      if (insightsStatus !== 200) return Response.json({ error: 'Analytics add-on required' }, { status: insightsStatus });
      if (u.includes('metricType=time_series')) return Response.json({ metrics: { reach: { total: 50, values: [{ date: '2026-10-05', value: 50 }] } } });
      return Response.json({ metrics: { views: { total: 800 }, accounts_engaged: { total: 60 }, total_interactions: { total: 90 } } });
    }
    if (u.includes('/v1/analytics?')) return Response.json({ posts: POSTS });
    if (u.includes('/v1/analytics/instagram/demographics')) return Response.json({ demographics: { country: [{ dimension: 'US', value: 300 }, { dimension: 'GB', value: 90 }], age: [{ dimension: '25-34', value: 200 }] } });
    if (u.endsWith('/instagram/stories')) return Response.json({ data: [{ id: 's9', mediaType: 'IMAGE', mediaProductType: 'STORY', permalink: 'https://instagram.com/stories/x/s9', timestamp: new Date().toISOString() }] });
    if (u.includes('/instagram/stories/s9/insights')) return Response.json({ data: { source: 'live', metrics: { views: 10, reach: 8, replies: 1, shares: 0, navigation: 9, tapsForward: 5, tapsBack: 1, exits: 2, swipesForward: 1, profileVisits: 0, follows: 0, reposts: 0, totalInteractions: 1 } } });
    if (u.includes('/instagram/stories/s1/insights')) return Response.json({ data: { source: 'cached', metrics: { views: 120, reach: 95, replies: 2, shares: 0, navigation: 110, tapsForward: 80, tapsBack: 10, exits: 15, swipesForward: 5, profileVisits: 3, follows: 1, reposts: 0, totalInteractions: 2 } } });
    return Response.json({ error: 'unexpected ' + u }, { status: 500 });
  };
}

test('reads profile, followers, insights and posts from Zernio and stores them in the shape the readers expect', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeZernio();
  const zernio = await import('../functions/_shared/zernio.js');
  await zernio.recordConnection(env, { accountId: 'acc1', username: 'pulsify', profileId: 'p1', webhookId: 'w1' });
  try {
    const n = await syncInstagram(env);
    assert.equal(n, 5);
    const snap = (kind) => JSON.parse(sql.prepare("SELECT payload_json FROM snapshots WHERE source='instagram' AND kind=?").get(kind).payload_json);
    assert.equal(snap('profile').followers, 1234);
    const media = snap('media');
    assert.equal(media.length, 2, 'stories are not in the feed list');
    assert.equal(media[0].id, 'm1');
    assert.equal(media[1].id, 'SHORT1', 'a post with no id field falls back to its permalink shortcode');
    assert.equal(media[0].media_type, 'VIDEO');
    assert.equal(media[0].permalink, 'https://instagram.com/reel/m1');
    assert.equal(media[0].metrics.views, 900);
    assert.equal(snap('account').reach.total, 50);
    assert.equal(snap('account').views.total, 800);
    assert.equal(sql.prepare("SELECT COUNT(*) n FROM stories WHERE media_id='s1'").get().n, 1);
    const m = (metric) => sql.prepare("SELECT value FROM metric_points WHERE source='instagram' AND metric=?").get(metric)?.value;
    assert.equal(m('followers'), 1234);
    assert.equal(m('views_30d'), 800);
    assert.equal(m('reach_30d'), 50);

    // Every block the Instagram tab reads is rebuilt, in the shape it reads.
    assert.equal(media[0].insights.reach, 700, 'feed rows carry the insights the tab reads');
    assert.equal(media[0].insights.saved, 5);
    assert.equal(media[0].insights.avgWatchTimeMs, 6400);
    const reels = snap('reels');
    assert.equal(reels.length, 1);
    assert.equal(reels[0].rank, 1);
    assert.equal(typeof reels[0].hookScore, 'number');
    assert.ok(reels[0].diagnosis);
    assert.equal(snap('posts').length, 1);
    assert.equal(snap('content').totalReach, 700);
    assert.equal(snap('content').avgWatchMs, 6400);
    assert.equal(snap('reels-summary').count, 1);
    assert.equal(snap('posts-summary').count, 1);
    const stories = snap('stories');
    assert.equal(stories.find((x) => x.id === 's1').insights.reach, 95, 'story numbers come from story insights');
    assert.equal(sql.prepare("SELECT COUNT(*) n FROM stories WHERE media_id='s9'").get().n, 1, 'active stories from the stories feed are saved');
    assert.equal(snap('stories').find((x) => x.id === 's9').insights.reach, 8);
    assert.equal(snap('stories-summary').totalReplies, 3);
    assert.deepEqual(Object.keys(snap('cadence')).sort(), ['posts7d', 'reels7d', 'stories7d']);
    assert.deepEqual(snap('audience').countries[0], { name: 'US', value: 300 });
    assert.equal(snap('audience').age[0].name, '25-34');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('an insights failure still saves profile and posts, and the real reason is logged', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeZernio({ insightsStatus: 402 });
  try {
    await assert.rejects(syncInstagram(env), (error) => {
      assert.match(error.message, /Profile, followers and posts saved; insights failed/);
      assert.match(error.message, /Analytics add-on required/);
      return true;
    });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('an account that needs reconnecting fails loudly instead of saving nothing silently', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fakeZernio({ needsReconnection: true });
  try {
    await assert.rejects(syncInstagram(env), /needs reconnecting/);
  } finally {
    globalThis.fetch = realFetch;
  }
});
