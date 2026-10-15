// Drafts for client forms (pulsify-saas #67, founder 2026-10-15: "if there was a field they filled
// and they had to go and come back to it it needs to be there"). One row per client and form: the
// whole draft as JSON plus where they were. Drafts are never answers: nothing here feeds a generator.
//   GET    /api/form-drafts?form=onboarding-v2
//   PUT    /api/form-drafts {form, draft, position}
//   DELETE /api/form-drafts?form=onboarding-v2
import { withOperator } from "../_shared/access.js";
import { json, nowIso, str } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

const FORM_KEY = /^[a-z0-9-]{1,40}$/;
export const MAX_DRAFT_CHARS = 200_000;

async function handleGet({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false, allowImpersonated: true });
  if (access.error) return access.error;
  const form = str(new URL(request.url).searchParams.get("form"));
  if (!FORM_KEY.test(form)) return json({ ok: false, error: "valid form key required" }, 422);
  const row = await env.DB.prepare(
    "SELECT draft_json, position, updated_at FROM form_drafts WHERE client_id=? AND form_key=?",
  ).bind(access.client, form).first();
  let draft = null;
  try {
    draft = row ? JSON.parse(row.draft_json) : null;
  } catch {
    draft = null;
  }
  return json({ ok: true, form, draft, position: row?.position || null, updated_at: row?.updated_at || null });
}

async function handlePut({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
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
  ).bind(access.client, form, draftJson, position, now).run();
  return json({ ok: true, form, updated_at: now });
}

async function handleDelete({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false });
  if (access.error) return access.error;
  const form = str(new URL(request.url).searchParams.get("form"));
  if (!FORM_KEY.test(form)) return json({ ok: false, error: "valid form key required" }, 422);
  await env.DB.prepare("DELETE FROM form_drafts WHERE client_id=? AND form_key=?").bind(access.client, form).run();
  return json({ ok: true, form });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPut = withOperator(handlePut);
export const onRequestDelete = withOperator(handleDelete);
