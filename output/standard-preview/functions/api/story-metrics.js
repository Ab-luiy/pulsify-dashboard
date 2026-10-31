// Story sequence metrics for the client portal (pulsify-saas Instagram > Metrics, founder 2026-10-30).
//   GET   /api/story-metrics[?client=]                                  every sequence with its slides and totals, newest first
//   PATCH /api/story-metrics[?client=] {id, title}                       the client's own name for a sequence ("" puts back the look's)
//   POST  /api/story-metrics[?client=] {action:"register", look, title, frames:[{role, elements, tags, has_link}], cta:{kind, label, word}}
//                                                                        the story board says what it is about to post
//   POST  /api/story-metrics[?client=] {action:"label", contact_id, sequence_id, label}
//                                                                        the setter's label for a conversation (replaces the AI's)
// The numbers are collected by the sync worker (workers/sync/src/jobs/story-capture.js) and the DM
// store (_shared/client-dms.js); see _shared/story-metrics.js for how each one is counted.
// Reads: client, preview or operator (?client=). Writes: client or operator, never a preview.

import { json, str } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient, resolveReportWriter } from "../_shared/client-read.js";
import { LABELS, loadStoryMetrics, registerSequence, renameSequence, setLabel } from "../_shared/story-metrics.js";

async function readBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const sequences = await loadStoryMetrics(env, access.client);
  return json({ ok: true, client: access.client, sequences });
}

async function handlePatch({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const body = await readBody(request);
  const access = await resolveReportWriter(request, env, body.client);
  if (access.error) return access.error;
  if (!str(body.id)) return json({ ok: false, error: "Which sequence?" }, 422);
  const changed = await renameSequence(env, access.client, body.id, body.title);
  if (!changed) return json({ ok: false, error: "That sequence is not here any more." }, 404);
  return json({ ok: true });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const body = await readBody(request);
  const access = await resolveReportWriter(request, env, body.client);
  if (access.error) return access.error;
  if (body.action === "register") {
    const id = await registerSequence(env, access.client, body);
    if (!id) return json({ ok: false, error: "A sequence needs at least one slide." }, 422);
    return json({ ok: true, id });
  }
  if (body.action === "label") {
    if (!LABELS.includes(body.label)) return json({ ok: false, error: `The label is one of ${LABELS.join(", ")}.` }, 422);
    const saved = await setLabel(env, access.client, { contactId: body.contact_id, sequenceId: body.sequence_id, label: body.label });
    if (!saved) return json({ ok: false, error: "Which conversation?" }, 422);
    return json({ ok: true });
  }
  return json({ ok: false, error: "Unknown action" }, 400);
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPatch = withOperator(handlePatch);
export const onRequestPost = withOperator(handlePost);
