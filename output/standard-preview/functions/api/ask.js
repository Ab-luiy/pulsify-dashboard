// GET  /api/ask[?client=]           suggested questions
// POST /api/ask {question, client?}  an answer computed from the workspace (functions/_shared/ask.js)
// (InfoOS build.) Client session, preview or operator (client named). Read-only.

import { json, str } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient } from "../_shared/client-read.js";
import { SUGGESTIONS, answerQuestion } from "../_shared/ask.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  return json({ ok: true, client: access.client, suggestions: SUGGESTIONS });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  // Reads use the same access as the reports; the client can come from the body for operators.
  const url = new URL(request.url);
  if (body?.client && !url.searchParams.get("client")) url.searchParams.set("client", String(body.client));
  const access = await resolveReportClient(new Request(url, request), env);
  if (access.error) return access.error;
  const question = str(body?.question).slice(0, 300);
  if (!question) return json({ ok: false, error: "Ask a question." }, 422);
  try {
    const result = await answerQuestion(env, access.client, question);
    return json({ ok: true, question, ...result });
  } catch (error) {
    console.error("ask failed", error);
    return json({ ok: false, error: "That question couldn't be answered right now. Try again shortly." }, 500);
  }
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
