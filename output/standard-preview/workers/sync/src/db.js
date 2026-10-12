import { emitEvent } from "../../../functions/_shared/outbound-webhooks.js";

// A run Cloudflare stops (CPU or time limit) never reaches its own UPDATE, so it stayed
// "running" forever. The next run of the same job closes it as an error.
const STALE_RUN_MS = 30 * 60000;

export async function runJob(env, job, task) {
  const startedAt = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE sync_runs SET status='error',finished_at=?,error='Stopped before finishing (Cloudflare ended the run)' WHERE job=? AND status='running' AND started_at < ?",
  ).bind(startedAt, job, new Date(Date.parse(startedAt) - STALE_RUN_MS).toISOString()).run().catch(() => null);
  const result = await env.DB.prepare(
    "INSERT INTO sync_runs(job,started_at,status,items) VALUES(?,?,'running',0)",
  ).bind(job, startedAt).run();
  const id = result.meta?.last_row_id;
  try {
    const items = Number(await task()) || 0;
    await env.DB.prepare(
      "UPDATE sync_runs SET finished_at=?,status='success',items=?,error=NULL WHERE id=?",
    ).bind(new Date().toISOString(), items, id).run();
    return { ok: true, job, items, runId: id };
  } catch (error) {
    const message = String(error?.message || error).slice(0, 2000);
    await env.DB.prepare(
      "UPDATE sync_runs SET finished_at=?,status='error',error=? WHERE id=?",
    ).bind(new Date().toISOString(), message, id).run().catch(() => null);
    // Diagnostics stay in sync_runs; technical failures never ping the founder.
    await emitEvent(env, { scope: "operator", event: "integration.sync_failed", data: { job, error: message } }).catch(() => null);
    throw error;
  }
}

export async function upsertSnapshot(env, { scope = "operator", clientId = "", source, kind, capturedAt, payload }) {
  await env.DB.prepare(
    `INSERT INTO snapshots(scope,client_id,source,kind,captured_at,payload_json)
     VALUES(?,?,?,?,?,?)
     ON CONFLICT(scope,client_id,source,kind) DO UPDATE SET
       captured_at=excluded.captured_at,payload_json=excluded.payload_json`,
  ).bind(scope, clientId, source, kind, capturedAt, JSON.stringify(payload)).run();
}

export async function insertMetric(env, { scope = "operator", clientId = "", source, metric, ts, value = null, valueText = null, dims = {} }) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO metric_points
      (scope,client_id,source,metric,ts,value,value_text,dims_json)
     VALUES(?,?,?,?,?,?,?,?)`,
  ).bind(scope, clientId, source, metric, ts, value, valueText, JSON.stringify(dims || {})).run();
}

// Statement forms of the two writes above, for env.DB.batch (one database call).
export function upsertSnapshotStatement(env, { scope = "operator", clientId = "", source, kind, capturedAt, payload }) {
  return env.DB.prepare(
    `INSERT INTO snapshots(scope,client_id,source,kind,captured_at,payload_json)
     VALUES(?,?,?,?,?,?)
     ON CONFLICT(scope,client_id,source,kind) DO UPDATE SET
       captured_at=excluded.captured_at,payload_json=excluded.payload_json`,
  ).bind(scope, clientId, source, kind, capturedAt, JSON.stringify(payload));
}

export function insertMetricStatement(env, { scope = "operator", clientId = "", source, metric, ts, value = null, valueText = null, dims = {} }) {
  return env.DB.prepare(
    `INSERT OR IGNORE INTO metric_points
      (scope,client_id,source,metric,ts,value,value_text,dims_json)
     VALUES(?,?,?,?,?,?,?,?)`,
  ).bind(scope, clientId, source, metric, ts, value, valueText, JSON.stringify(dims || {}));
}
