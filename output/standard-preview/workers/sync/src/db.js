import { emitEvent } from "../../../functions/_shared/outbound-webhooks.js";

export async function runJob(env, job, task) {
  const startedAt = new Date().toISOString();
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
    await alertFailure(env, job, message);
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

async function alertFailure(env, job, error) {
  if (!env.DISCORD_WEBHOOK_URL) return;
  await fetch(env.DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: `Pulsify sync failed: ${job}\n${error}`.slice(0, 1900) }),
  }).catch(() => null);
}
