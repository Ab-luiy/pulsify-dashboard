// Outreach queue API (operator).
//   GET  /api/outreach-queue?view=today        reconcile, then the queued list, sent-today count, cap,
//                                              plus a candidates preview (20)
//   GET  /api/outreach-queue?view=candidates   handles not yet queued or in a thread (limit, default 50)
//   GET  /api/outreach-queue?id=<item>         one item
//   POST /api/outreach-queue {action}          add {handle|items[], source, name, niche, detail, gap, link}
//                                              draft {id, seed?}   rebuild from the stored brief
//                                              sent | skip | requeue {id}
//                                              reorder {ids[]}
//                                              update {id, draft?, detail?, link?, name?, niche?, gap?}
// Status only moves through sent, skip and requeue plus reconcile; a client
// cannot write status directly.
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { addToQueue, candidates, DEFAULT_CAP, getItem, listToday, reconcile, redraft, reorder, setStatus, updateItem } from "../_shared/outreach-queue.js";
import { pushOperator } from "../_shared/realtime.js";

const TRANSITIONS = { sent: "sent", skip: "skipped", requeue: "queued" };

function capFor(env, url) {
  const requested = Number(url?.searchParams.get("cap"));
  const configured = Number(env.OUTREACH_DAILY_CAP);
  return requested > 0 ? requested : configured > 0 ? configured : DEFAULT_CAP;
}

async function handleGet({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const id = str(url.searchParams.get("id"));
  if (id) {
    const item = await getItem(env, id);
    if (!item) return json({ ok: false, error: "queue item not found" }, 404);
    return json({ ok: true, item });
  }
  const view = str(url.searchParams.get("view") || "today").toLowerCase();
  if (view === "candidates") {
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit")) || 50));
    return json({ ok: true, candidates: await candidates(env, { limit }), generated_at: new Date().toISOString() });
  }
  if (view !== "today") return json({ ok: false, error: "unknown view" }, 422);
  const reconciled = await reconcile(env);
  const today = await listToday(env, { cap: capFor(env, url) });
  const preview = await candidates(env, { limit: 20 });
  return json({ ok: true, ...today, candidates: preview, reconciled, generated_at: new Date().toISOString() });
}

function briefFrom(body) {
  return {
    handle: body.handle,
    source: str(body.source) || "manual",
    name: body.name,
    niche: body.niche,
    detail: body.detail,
    gap: body.gap,
    link: body.link,
    seed: body.seed,
  };
}

async function handlePost({ request, env }) {
  const denied = resolveOperator(request, env);
  if (denied.error) return denied.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false, error: "invalid payload" }, 422);
  const action = str(body.action);

  if (action === "add") {
    const briefs = Array.isArray(body.items) ? body.items.filter((x) => x && typeof x === "object") : [body];
    if (!briefs.length || briefs.length > 200) return json({ ok: false, error: "nothing to add" }, 422);
    const items = [];
    const rejected = [];
    for (const brief of briefs) {
      const result = await addToQueue(env, briefFrom(brief));
      if (result.error) rejected.push({ handle: str(brief.handle), error: result.error });
      else items.push({ ...result.item, existed: result.existed });
    }
    if (!items.length) return json({ ok: false, error: rejected[0]?.error || "invalid handle", rejected }, 422);
    await pushOperator(env, "queue.changed", { reason: "add", count: items.length });
    return json({ ok: true, item: items[0], items, rejected });
  }

  if (action === "reorder") {
    const result = await reorder(env, body.ids);
    if (result.error) return json({ ok: false, error: result.error }, 422);
    await pushOperator(env, "queue.changed", { reason: "reorder" });
    return json({ ok: true, updated: result.updated });
  }

  const id = str(body.id);
  if (!id) return json({ ok: false, error: "id required" }, 422);
  let result;
  if (action === "draft") result = await redraft(env, id, body.seed);
  else if (action === "update") result = await updateItem(env, id, { draft: body.draft, detail: body.detail, link: body.link, name: body.name, niche: body.niche, gap: body.gap });
  else if (TRANSITIONS[action]) result = await setStatus(env, id, TRANSITIONS[action]);
  else return json({ ok: false, error: "unknown action" }, 422);
  if (result.error === "not found") return json({ ok: false, error: "queue item not found" }, 404);
  if (result.error) return json({ ok: false, error: result.error }, 422);
  await pushOperator(env, "queue.changed", { id, reason: action });
  return json({ ok: true, item: result.item });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
