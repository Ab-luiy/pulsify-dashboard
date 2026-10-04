// The founder's review gate for guided content other than story sequences (pulsify-saas #18), YouTube
// packages first. Review state is server-side (content_reviews, migration 0044), never in the client-writable
// workspace record.
//   GET  client                     -> {ok, rows:[latest review per record: id, record_id, status, review_note, ...]}
//   GET  operator ?status=review    -> {ok, rows:[every client's packages waiting, with the snapshot]}
//   POST client  {action:"submit", record_id}           snapshot the video project and send it for review
//   POST operator {action:"approve"|"reject", id, note, apply_to_all}
//        a reject needs a note; the note becomes a studio_feedback rule for that client or every client.
// Approved snapshots become examples for the YouTube generators (functions/_shared/content-learning.js).
import { withOperator, hasOperator } from "../_shared/access.js";
import { checkAdmin, cleanId, json, parseJson } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { clientLabel, notify } from "../_shared/notifications.js";
import { eligibleOutcome, outcomeSignature } from '../_shared/sales-followup.js';

const SNAPSHOT_FIELDS = ["stage", "headline", "thumbnail", "thumbnail_text", "thumbnail_frame", "layout", "hook", "outline", "evidence", "type", "format", "ideation", "packaging", "build"];

function serialize(row, withSnapshot) {
  return {
    id: Number(row.id),
    client_id: row.client_id,
    record_id: row.record_id,
    format: row.format,
    title: row.title,
    status: row.status,
    review_note: row.review_note || "",
    submitted_at: row.submitted_at,
    decided_at: row.decided_at || "",
    ...(withSnapshot ? { snapshot: parseJson(row.snapshot_json, {}) } : {}),
  };
}

// Keeps the client's Content screen in step with the review gate: one content_items row per
// video (matched on client + YouTube + title). The stage is never moved backwards, so a video
// the team has scheduled or published stays that way. Best-effort: a review never fails on this.
async function syncContentItem(env, client, title, note) {
  const name = String(title || "").trim().slice(0, 200);
  if (!name) return;
  const now = new Date().toISOString();
  try {
    const existing = await env.DB.prepare("SELECT id FROM content_items WHERE client=? AND platform='youtube' AND title=?").bind(client, name).first();
    if (existing) {
      await env.DB.prepare("UPDATE content_items SET notes=?, updated_at=? WHERE id=?").bind(note, now, existing.id).run();
    } else {
      await env.DB.prepare("INSERT INTO content_items (client, title, stage, platform, notes, updated_at) VALUES (?,?,'production','youtube',?,?)").bind(client, name, note, now).run();
    }
  } catch {
    // content_items is a view of the review for the client; the review itself stands.
  }
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  if (hasOperator(request, env) && url.searchParams.get("status") === "review") {
    const rows = await env.DB.prepare(
      `SELECT * FROM content_reviews WHERE status='review' ORDER BY submitted_at DESC, id DESC LIMIT 200`,
    ).all();
    return json({ ok: true, rows: (rows.results || []).map((row) => serialize(row, true)) });
  }
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowImpersonated: true });
  if (access.error) return access.error;
  const rows = await env.DB.prepare(
    `SELECT * FROM content_reviews
      WHERE client_id=? AND id IN (SELECT MAX(id) FROM content_reviews WHERE client_id=? GROUP BY record_id)
      ORDER BY id DESC`,
  ).bind(cleanId(access.client), cleanId(access.client)).all();
  return json({ ok: true, rows: (rows.results || []).map((row) => serialize(row, false)) });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim().toLowerCase();

  if (action === "approve" || action === "reject") {
    const auth = checkAdmin(request, env);
    if (auth) return auth;
    const id = Number(body.id || 0);
    const note = String(body.note || "").trim().slice(0, 600);
    if (!id) return json({ ok: false, error: "review id is required" }, 422);
    if (action === "reject" && !note) return json({ ok: false, error: "review note is required when rejecting" }, 422);
    const review = await env.DB.prepare("SELECT id, client_id, title, status, format, snapshot_json FROM content_reviews WHERE id=?").bind(id).first();
    if (!review) return json({ ok: false, error: "review not found" }, 404);
    if (review.status !== "review") return json({ ok: false, error: "this package was already decided" }, 409);
    if(review.format === 'sales_followup') {
      const snapshot=parseJson(review.snapshot_json,{});
      const o=await env.DB.prepare('SELECT * FROM lead_outcomes WHERE id=? AND client_id=?').bind(snapshot.outcome_id,review.client_id).first();
      if(!eligibleOutcome(o) || await outcomeSignature(o) !== snapshot.signature) return json({ok:false,error:'This call changed. Review its latest draft.'},409);
    }
    const now = new Date().toISOString();
    const status = action === "approve" ? "approved" : "rejected";
    const statements = [
      env.DB.prepare("UPDATE content_reviews SET status=?, review_note=?, decided_at=? WHERE id=? AND status='review'").bind(status, note || null, now, id),
    ];
    if (status === "rejected" && review.format !== 'sales_followup') {
      statements.push(
        env.DB.prepare(
          `INSERT INTO studio_feedback (client_id, sequence_id, rule, scope, active, created_at, updated_at) VALUES (?, NULL, ?, ?, 1, ?, ?)`,
        ).bind(review.client_id, note, body.apply_to_all ? "all" : "client", now, now),
      );
    }
    await env.DB.batch(statements);
    if(review.format !== 'sales_followup') await syncContentItem(env, cleanId(review.client_id), review.title, status === "approved" ? "Approved by Pulsify. Next: shoot and edit." : `Changes requested: ${note}`);
    return json({ ok: true, status });
  }

  if (action !== "submit") return json({ ok: false, error: "unknown action" }, 422);
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;
  const client = cleanId(access.client);
  const recordId = String(body.record_id || "").trim();
  if (!recordId) return json({ ok: false, error: "record_id is required" }, 422);
  const record = await env.DB.prepare("SELECT id, client_id, kind, title, data_json FROM workspace_records WHERE id=?").bind(recordId).first();
  if (!record || cleanId(record.client_id) !== client || record.kind !== "youtube") return json({ ok: false, error: "video project not found" }, 404);
  const data = parseJson(record.data_json, {}) || {};
  if (!String(data.headline || "").trim() || !String(data.hook || "").trim()) {
    return json({ ok: false, error: "Pick a title and write the opening before sending it for review." }, 422);
  }
  const snapshot = Object.fromEntries(SNAPSHOT_FIELDS.filter((key) => key in data).map((key) => [key, data[key]]));
  const now = new Date().toISOString();
  const open = await env.DB.prepare("SELECT id FROM content_reviews WHERE client_id=? AND record_id=? AND status='review'").bind(client, recordId).first();
  let id;
  if (open) {
    await env.DB.prepare("UPDATE content_reviews SET title=?, snapshot_json=?, submitted_at=? WHERE id=?").bind(record.title, JSON.stringify(snapshot), now, open.id).run();
    id = Number(open.id);
  } else {
    const result = await env.DB.prepare(
      `INSERT INTO content_reviews (client_id, record_id, format, title, snapshot_json, status, submitted_at) VALUES (?, ?, 'youtube', ?, ?, 'review', ?)`,
    ).bind(client, recordId, record.title, JSON.stringify(snapshot), now).run();
    id = Number(result.meta?.last_row_id || 0);
  }
  await syncContentItem(env, client, record.title, "Sent for review. We read it before anything is made.");
  await notify(env, {
    scope: "operator",
    clientId: client,
    kind: "content.review",
    severity: "info",
    title: `${await clientLabel(env, client)} sent a YouTube video for review`,
    body: String(data.headline || record.title).slice(0, 160),
    link: "reviews",
    entity: { client, review_id: id },
    dedupeKey: `review:youtube:${id}:${now}`,
  }).catch(() => null);
  return json({ ok: true, id, status: "review" });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
