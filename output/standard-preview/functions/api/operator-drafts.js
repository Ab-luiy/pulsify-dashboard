// Drafts for operator screens (pulsify-saas #67, founder 2026-10-15: what is typed is never lost,
// "across the entire app", operator console included). Same table as the client drafts
// (form_drafts), keyed by the signed-in operator instead of a client: client_id is "operator:<email>",
// which no client id can be. Drafts are never answers and nothing here feeds a generator.
//   GET    /api/operator-drafts?form=email-compose
//   PUT    /api/operator-drafts {form, draft, position}
//   DELETE /api/operator-drafts?form=email-compose
import { withOperator } from "../_shared/access.js";
import { json, nowIso, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { MAX_DRAFT_CHARS } from "./form-drafts.js";

const FORM_KEY = /^[a-z0-9-]{1,40}$/;

function owner(request, env) {
  const operator = resolveOperator(request, env);
  if (operator.error) return { error: operator.error };
  return { id: `operator:${String(operator.operatorEmail || "operator").toLowerCase()}` };
}

async function handleGet({ request, env }) {
  const who = owner(request, env);
  if (who.error) return who.error;
  const form = str(new URL(request.url).searchParams.get("form"));
  if (!FORM_KEY.test(form)) return json({ ok: false, error: "valid form key required" }, 422);
  const row = await env.DB.prepare("SELECT draft_json, position, updated_at FROM form_drafts WHERE client_id=? AND form_key=?")
    .bind(who.id, form).first();
  let draft = null;
  try {
    draft = row ? JSON.parse(row.draft_json) : null;
  } catch {
    draft = null;
  }
  return json({ ok: true, form, draft, position: row?.position || null, updated_at: row?.updated_at || null });
}

async function handlePut({ request, env }) {
  const who = owner(request, env);
  if (who.error) return who.error;
  const body = await request.json().catch(() => ({}));
  const form = str(body.form);
  if (!FORM_KEY.test(form)) return json({ ok: false, error: "valid form key required" }, 422);
  const draftJson = JSON.stringify(body.draft ?? null);
  if (draftJson.length > MAX_DRAFT_CHARS) return json({ ok: false, error: "draft is too large" }, 422);
  const position = str(body.position).slice(0, 80) || null;
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO form_drafts (client_id, form_key, draft_json, position, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(client_id, form_key) DO UPDATE SET
       draft_json=excluded.draft_json, position=excluded.position, updated_at=excluded.updated_at`,
  ).bind(who.id, form, draftJson, position, now).run();
  return json({ ok: true, form, updated_at: now });
}

async function handleDelete({ request, env }) {
  const who = owner(request, env);
  if (who.error) return who.error;
  const form = str(new URL(request.url).searchParams.get("form"));
  if (!FORM_KEY.test(form)) return json({ ok: false, error: "valid form key required" }, 422);
  await env.DB.prepare("DELETE FROM form_drafts WHERE client_id=? AND form_key=?").bind(who.id, form).run();
  return json({ ok: true, form });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPut = withOperator(handlePut);
export const onRequestDelete = withOperator(handleDelete);
