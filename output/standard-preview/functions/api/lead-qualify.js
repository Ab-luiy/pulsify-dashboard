// GET /api/lead-qualify[?client=]   the answers that mark an applicant as not a fit
// PUT /api/lead-qualify {client?, questions: {<answer key>: {disqualify: [answer, ...]}}}
// (InfoOS build, the Applications tab). The lead score and the pipeline read these rules:
// an applicant who gives any disqualifying answer is "Not a fit". Reads: client, preview
// or operator (?client=). Writes: client or operator, never a preview.

import { json, str } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient, resolveReportWriter } from "../_shared/client-read.js";

const KEY = "lead-qualify";

export function cleanRules(input) {
  const questions = {};
  const source = input && typeof input === "object" ? input.questions : null;
  if (!source || typeof source !== "object") return { questions };
  for (const [key, rule] of Object.entries(source).slice(0, 40)) {
    const name = str(key).slice(0, 120);
    const values = Array.isArray(rule?.disqualify) ? rule.disqualify.map((v) => str(v).slice(0, 200)).filter(Boolean).slice(0, 40) : [];
    if (name && values.length) questions[name] = { disqualify: [...new Set(values)] };
  }
  return { questions };
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const row = await env.DB.prepare("SELECT value_json, updated_at FROM workspace_preferences WHERE client_id=? AND key=?").bind(access.client, KEY).first();
  let value = { questions: {} };
  try { value = cleanRules(JSON.parse(row?.value_json || "{}")); } catch { /* empty rules */ }
  return json({ ok: true, client: access.client, rules: value, updated_at: row?.updated_at || null });
}

async function handlePut({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const raw = await request.text();
  if (raw.length > 32000) return json({ ok: false, error: "Too many rules." }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  const rules = cleanRules(body);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO workspace_preferences (client_id, key, value_json, updated_at) VALUES (?,?,?,?)
     ON CONFLICT(client_id, key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at`,
  ).bind(access.client, KEY, JSON.stringify(rules), now).run();
  return json({ ok: true, rules, updated_at: now });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPut = withOperator(handlePut);
