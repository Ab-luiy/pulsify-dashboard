// metrics-weekly returns follower history for the portal chart (pulsify-saas #17),
// oldest first, capped at 26 snapshots, while latest/prior and the report keep
// their old meaning. Real SQLite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onRequestGet} from '../functions/api/metrics-weekly.js';
import {rememberOperator} from '../functions/_shared/access.js';

const sql = new DatabaseSync(':memory:');
const mig = (n) => readFileSync(new URL('../migrations/' + n, import.meta.url), 'utf8');
for (const n of ['0008_integrations_hub.sql', '0013_client_dashboard_metrics.sql']) {
  for (const st of mig(n).replace(/--[^\n]*/g, '').split(';')) { if (st.trim()) try { sql.exec(st); } catch { /* table exists in another migration */ } }
}
const env = {ADMIN_KEY: 'k', DB: {prepare(q) { let a = []; const p = {bind(...v) { a = v; return p; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return {results: sql.prepare(q).all(...a)}; }, async run() { const r = sql.prepare(q).run(...a); return {meta: {changes: r.changes, last_row_id: r.lastInsertRowid}}; }}; return p; }}};
const op = (url) => { const r = new Request(url); rememberOperator(r, {email: 'abod.louai@gmail.com', via: 'access'}); return r; };

test('history: oldest first, 26 at most, latest and prior unchanged', async () => {
  const insert = sql.prepare('INSERT INTO account_snapshots (client_id, taken_on, followers, created_at) VALUES (?,?,?,?)');
  for (let week = 0; week < 30; week++) {
    const day = new Date(Date.UTC(2026, 2, 2) + week * 7 * 86400000).toISOString().slice(0, 10);
    insert.run('demo-rio', day, 1000 + week * 10, day);
  }
  insert.run('other', '2026-09-20', 5, '2026-09-20');
  const res = await onRequestGet({request: op('https://x/api/metrics-weekly?client=demo-rio'), env, data: {}});
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.history.length, 26);
  assert.deepEqual(body.history.map((row) => row.followers), [...body.history.map((row) => row.followers)].sort((a, b) => a - b), 'ascending');
  assert.equal(body.history.at(-1).followers, 1290);
  assert.equal(body.latest.followers, 1290);
  assert.equal(body.prior.followers, 1280);
  assert.equal(body.report.followers.delta, 10);
  assert.ok(body.history.every((row) => row.followers >= 1000), 'only this client');
});
