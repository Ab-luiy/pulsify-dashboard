// Voice note for onboarding: upload to R2, transcribe with Workers AI Whisper,
// return the transcript for correction, then apply it to the client brain.
//   POST /api/voice-note  multipart: file (audio/webm|audio/mp4|audio/mpeg|audio/wav), client
//   POST /api/voice-note?action=apply {client, id, transcript, offer, icp}
//   GET  /api/voice-note?client=   latest notes
import { withOperator } from "../_shared/access.js";
import { generateOpaqueToken, json, nowIso, str } from "../_shared/common.js";
import { resolveSpineRead } from "../_shared/spine-auth.js";

// The AI binding represents audio as a JavaScript number array. Keep the
// encoded request bounded well below the 128 MB Worker isolate limit. The
// browser recorder uses 64 kbps, so a ten-minute note is about 4.8 MB.
export const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
const AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-m4a", "audio/ogg", "video/webm"]);
// Verify the current model id in the Workers AI catalog before changing this.
export const WHISPER_MODEL = "@cf/openai/whisper";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const access = await resolveSpineRead(request, env, "client", str(url.searchParams.get("client")));
  if (access.error) return access.error;
  const rows = await env.DB.prepare(
    "SELECT id, mime, bytes, state, error, created_at, updated_at, substr(transcript,1,4000) AS transcript FROM voice_notes WHERE client_id=? ORDER BY created_at DESC LIMIT 20",
  ).bind(access.client).all();
  return json({ ok: true, client: access.client, notes: rows.results || [] });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "apply") return applyTranscript({ request, env });
  if (!env.MEDIA) return json({ ok: false, error: "no media bucket bound" }, 500);
  const form = await request.formData().catch(() => null);
  if (!form) return json({ ok: false, error: "multipart form required" }, 400);
  const access = await resolveSpineRead(request, env, "client", str(form.get("client")));
  if (access.error) return access.error;
  if (access.impersonated) return json({ ok: false, error: "read only while impersonating" }, 403);
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ ok: false, error: "audio file required" }, 422);
  const mime = str(file.type).toLowerCase().split(";")[0];
  if (!AUDIO_TYPES.has(mime)) return json({ ok: false, error: "unsupported audio type" }, 415);
  if (!file.size) return json({ ok: false, error: "audio file is empty" }, 422);
  if (file.size > MAX_AUDIO_BYTES) return json({ ok: false, error: "audio must be 6 MB or smaller" }, 413);
  const id = `vn_${generateOpaqueToken(10)}`;
  const key = `clients/${access.client}/voice-notes/${id}`;
  const now = nowIso();
  const bytes = await file.arrayBuffer();
  await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: mime } });
  try {
    await env.DB.prepare(
      "INSERT INTO voice_notes (id, client_id, r2_key, mime, bytes, state, created_at, updated_at) VALUES (?,?,?,?,?,'uploaded',?,?)",
    ).bind(id, access.client, key, mime, file.size, now, now).run();
  } catch (error) {
    await env.MEDIA.delete(key).catch(() => null);
    throw error;
  }

  let transcript = null;
  let error = null;
  if (env.AI) {
    try {
      const result = await env.AI.run(WHISPER_MODEL, { audio: [...new Uint8Array(bytes)] });
      transcript = str(result?.text).slice(0, 20000) || null;
    } catch (caught) {
      error = String(caught?.message || caught).slice(0, 300);
    }
  } else {
    error = "transcription not available";
  }
  await env.DB.prepare("UPDATE voice_notes SET transcript=?, state=?, error=?, updated_at=? WHERE id=?")
    .bind(transcript, transcript ? "transcribed" : "failed", error, nowIso(), id).run();
  return json({ ok: true, id, r2_key: key, state: transcript ? "transcribed" : "failed", transcript, error }, 201);
}

async function applyTranscript({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveSpineRead(request, env, "client", str(body.client));
  if (access.error) return access.error;
  if (access.impersonated) return json({ ok: false, error: "read only while impersonating" }, 403);
  const id = str(body.id);
  const note = await env.DB.prepare("SELECT id FROM voice_notes WHERE id=? AND client_id=?").bind(id, access.client).first();
  if (!note) return json({ ok: false, error: "note not found" }, 404);
  const transcript = str(body.transcript).slice(0, 20000);
  if (!transcript) return json({ ok: false, error: "transcript required" }, 422);
  const now = nowIso();
  const offer = str(body.offer).slice(0, 8000) || transcript;
  const icp = str(body.icp).slice(0, 8000);
  const statements = [
    env.DB.prepare("UPDATE voice_notes SET transcript=?, state='applied', updated_at=? WHERE id=?").bind(transcript, now, id),
    upsertBrain(env, access.client, "voice", "transcript", transcript, now),
    upsertBrain(env, access.client, "offer", "business_explainer", offer, now),
  ];
  if (icp) statements.push(upsertBrain(env, access.client, "icp", "avatar", icp, now));
  await env.DB.batch(statements);
  return json({ ok: true, id, applied: { offer: true, icp: Boolean(icp) } });
}

function upsertBrain(env, client, section, field, value, updatedAt) {
  return env.DB.prepare(
    `INSERT INTO client_brain (client_id, section, field, value_json, source, updated_at)
     VALUES (?,?,?,?,'voice-note',?)
     ON CONFLICT(client_id, section, field) DO UPDATE SET value_json=excluded.value_json, source=excluded.source, updated_at=excluded.updated_at`,
  ).bind(client, section, field, JSON.stringify(value), updatedAt);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
