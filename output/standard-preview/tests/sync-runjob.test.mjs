// runJob (workers/sync/src/db.js): a run Cloudflare cut off used to stay "running"
// forever (hundreds of rows by 2026-10-12). The next run of the same job closes it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { runJob } from '../workers/sync/src/db.js';

const sql = new DatabaseSync(':memory:');
sql.exec("CREATE TABLE sync_runs(id INTEGER PRIMARY KEY AUTOINCREMENT, job TEXT, started_at TEXT, finished_at TEXT, status TEXT, items INTEGER, error TEXT)");
const env = { DB: { prepare(q) { let a = []; const p = { bind(...v) { a = v; return p; }, async first() { return sql.prepare(q).get(...a) || null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; } }; return p; } } };

test('the next run closes runs of the same job that were cut off', async () => {
  const old = new Date(Date.now() - 3600000).toISOString();
  const recent = new Date(Date.now() - 60000).toISOString();
  sql.prepare("INSERT INTO sync_runs(job,started_at,status,items) VALUES('search-index',?,'running',0)").run(old);
  sql.prepare("INSERT INTO sync_runs(job,started_at,status,items) VALUES('search-index',?,'running',0)").run(recent);
  sql.prepare("INSERT INTO sync_runs(job,started_at,status,items) VALUES('youtube',?,'running',0)").run(old);
  const result = await runJob(env, 'search-index', async () => 2);
  assert.equal(result.ok, true);
  const rows = sql.prepare("SELECT job, started_at, status, error FROM sync_runs ORDER BY id").all();
  assert.equal(rows[0].status, 'error');
  assert.match(rows[0].error, /Stopped before finishing/);
  assert.equal(rows[1].status, 'running', 'a run that may still be going is left alone');
  assert.equal(rows[2].status, 'running', 'other jobs are not touched');
  assert.equal(rows[3].status, 'success');
});
