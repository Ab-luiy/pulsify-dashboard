import { withOperator } from "../../_shared/access.js";
import { json, nowIso } from "../../_shared/common.js";
import { resolveOperator } from "../../_shared/spine-auth.js";

async function handleGet({ request, env }) {
  const access = resolveOperator(request, env);
  if (access.error) return access.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const key = String(new URL(request.url).searchParams.get("key") || "").trim();
  if (key) {
    const row = await env.DB.prepare(
      "SELECT key,value_json,updated_at FROM operator_state WHERE operator_email=? AND key=?",
    ).bind(access.operatorEmail, key).first();
    return json({ ok: true, state: row ? { key: row.key, value: parseValue(row.value_json), updated_at: row.updated_at } : null });
  }
  const result = await env.DB.prepare(
    "SELECT key,value_json,updated_at FROM operator_state WHERE operator_email=? ORDER BY key",
  ).bind(access.operatorEmail).all();
  const state = Object.fromEntries((result.results || []).map((row) => [row.key, {
    value: parseValue(row.value_json),
    updated_at: row.updated_at,
  }]));
  return json({ ok: true, state });
}

async function handlePut({ request, env }) {
  const access = resolveOperator(request, env);
  if (access.error) return access.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const raw = await request.text();
  if (raw.length > 1024 * 1024) return json({ ok: false, error: "state payload too large" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const key = String(body?.key || "").trim();
  if (!/^[a-z0-9][a-z0-9._:-]{0,99}$/i.test(key) || body?.value === undefined) {
    return json({ ok: false, error: "valid key and value are required" }, 422);
  }
  const updatedAt = nowIso();
  await env.DB.prepare(
    `INSERT INTO operator_state(operator_email,key,value_json,updated_at)
     VALUES(?,?,?,?)
     ON CONFLICT(operator_email,key) DO UPDATE SET
       value_json=excluded.value_json,updated_at=excluded.updated_at`,
  ).bind(access.operatorEmail, key, JSON.stringify(body.value), updatedAt).run();
  return json({ ok: true, key, updated_at: updatedAt });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPut = withOperator(handlePut);

function parseValue(value) {
  try { return JSON.parse(value); } catch { return null; }
}
