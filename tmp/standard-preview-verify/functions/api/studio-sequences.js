import { checkAdmin, cleanId, json, parseJson } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const isAdmin = request.headers.get("x-admin-key") === env.ADMIN_KEY && Boolean(env.ADMIN_KEY);
  if (isAdmin && url.searchParams.get("status") === "review") {
    const rows = await env.DB.prepare(
      `SELECT id, client_id, type, intent, topic, goal, trigger_word, params_json, output_json,
              manual_prompt, status, review_note, created_at, updated_at
         FROM studio_sequences
        WHERE status='review'
        ORDER BY updated_at DESC, id DESC`,
    ).all();
    return json({ ok: true, rows: (rows.results || []).map(serializeRow) });
  }

  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;

  const client = cleanId(access.client);
  const rows = await env.DB.prepare(
    `SELECT id, client_id, type, intent, topic, goal, trigger_word, params_json, output_json,
            manual_prompt, status, review_note, created_at, updated_at
       FROM studio_sequences
      WHERE client_id=?
      ORDER BY updated_at DESC, id DESC`,
  ).bind(client).all();
  return json({ ok: true, rows: (rows.results || []).map(serializeRow) });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim().toLowerCase();
  const id = Number(body.id || 0);
  if (!id) return json({ ok: false, error: "sequence id is required" }, 422);

  if (action === "approve" || action === "reject") {
    const auth = checkAdmin(request, env);
    if (auth) return auth;
    const note = String(body.note || "").trim();
    if (action === "reject" && !note) {
      return json({ ok: false, error: "review note is required when rejecting" }, 422);
    }
    const status = action === "approve" ? "approved" : "rejected";
    const result = await env.DB.prepare(
      `UPDATE studio_sequences
          SET status=?, review_note=?, updated_at=?
        WHERE id=?`,
    ).bind(status, note || null, new Date().toISOString(), id).run();
    if (!Number(result.meta?.changes || 0)) {
      return json({ ok: false, error: "sequence not found" }, 404);
    }
    return json({ ok: true, status });
  }

  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;
  const client = cleanId(access.client);

  const row = await env.DB.prepare(
    `SELECT id, client_id, status
       FROM studio_sequences
      WHERE id=?`,
  ).bind(id).first();
  if (!row || cleanId(row.client_id) !== client) {
    return json({ ok: false, error: "sequence not found" }, 404);
  }

  if (action === "submit-for-review") {
    if (row.status !== "draft" && row.status !== "rejected") {
      return json({ ok: false, error: "only draft or rejected sequences can be sent for review" }, 422);
    }
    await env.DB.prepare(
      `UPDATE studio_sequences
          SET status='review', review_note=NULL, updated_at=?
        WHERE id=?`,
    ).bind(new Date().toISOString(), id).run();
    return json({ ok: true, status: "review" });
  }

  if (action === "delete") {
    if (row.status !== "draft") {
      return json({ ok: false, error: "only draft sequences can be deleted" }, 422);
    }
    await env.DB.prepare("DELETE FROM studio_sequences WHERE id=?").bind(id).run();
    return json({ ok: true, deleted: true });
  }

  return json({ ok: false, error: "unknown action" }, 422);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

function serializeRow(row) {
  return {
    id: Number(row.id || 0),
    client_id: row.client_id,
    type: row.type || "",
    intent: row.intent || "",
    topic: row.topic || "",
    goal: row.goal || "",
    trigger_word: row.trigger_word || "",
    params: parseJson(row.params_json, {}),
    output: parseJson(row.output_json, null),
    manual_prompt: row.manual_prompt || "",
    status: row.status || "draft",
    review_note: row.review_note || "",
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
  };
}
