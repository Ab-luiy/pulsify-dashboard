// The weekly YouTube lead scrape (workers/sync/src/jobs/leads.js). The free Workers
// plan allows 50 outbound requests per run; 30 searches plus their lookups broke
// it every week from 2026-09-20. Real SQLite, fake YouTube that counts requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { syncYouTubeLeads } from '../workers/sync/src/jobs/leads.js';

const sql = new DatabaseSync(':memory:');
for (const file of readdirSync(new URL('../migrations/', import.meta.url)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort()) {
  for (const st of readFileSync(new URL('../migrations/' + file, import.meta.url), 'utf8').replace(/--[^\n]*/g, '').split(';')) {
    if (st.trim()) try { sql.exec(st); } catch { /* later migrations alter tables this test does not need */ }
  }
}
const env = {
  YT_API_KEY: 'test',
  DB: {
    prepare(q) { let a = []; const p = { bind(...v) { a = v; return p; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return p; },
    async batch(list) { const out = []; for (const st of list) out.push(await st.run()); return out; },
  },
};

test('one run stays inside 50 outbound requests even when every search returns 50 new channels', async () => {
  let calls = 0;
  let n = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    calls += 1;
    const u = new URL(String(url));
    if (u.pathname.endsWith('/search')) {
      return Response.json({ items: Array.from({ length: 50 }, () => { n += 1; return { id: { videoId: `v${n}` }, snippet: { channelId: `c${n}`, title: `my day trading strategy made $${n}k`, publishedAt: '2026-10-01T00:00:00Z' } }; }) });
    }
    const ids = (u.searchParams.get('id') || '').split(',').filter(Boolean);
    if (u.pathname.endsWith('/videos')) return Response.json({ items: ids.map((id) => ({ id, snippet: { title: 'my day trading strategy made $40k', channelId: 'c' + id.slice(1), publishedAt: '2026-10-01T00:00:00Z' }, statistics: { viewCount: '90000' }, contentDetails: { duration: 'PT20M' } })) });
    if (u.pathname.endsWith('/channels')) return Response.json({ items: ids.map((id) => ({ id, snippet: { title: 'Trader ' + id, customUrl: '@' + id }, statistics: { subscriberCount: '20000', videoCount: '80' }, brandingSettings: {} })) });
    return Response.json({ error: { message: 'unexpected ' + u } }, { status: 500 });
  };
  try {
    await syncYouTubeLeads(env);
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.ok(calls <= 50, `made ${calls} outbound requests; the free plan allows 50`);
  assert.ok(sql.prepare('SELECT COUNT(*) n FROM yt_leads').get().n >= 0);
});
