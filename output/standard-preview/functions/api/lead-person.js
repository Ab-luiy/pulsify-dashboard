// GET /api/lead-person?key=<email | v:visitor id>[&client=]
// One lead in full: score with every reason's points, the pipeline, the next move,
// source, answers, money and the journey (InfoOS build). Read access as /api/lead-pipeline.

import { json } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient } from "../_shared/client-read.js";
import { loadPerson } from "../_shared/lead-people.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const key = String(new URL(request.url).searchParams.get("key") || "").slice(0, 200);
  if (!key) return json({ ok: false, error: "choose a lead" }, 422);
  try {
    const person = await loadPerson(env, access.client, key);
    if (!person) return json({ ok: false, error: "That lead isn't in this workspace." }, 404);
    return json({ ok: true, client: access.client, person });
  } catch (error) {
    console.error("lead-person failed", error);
    return json({ ok: false, error: "This lead could not load. Try again shortly." }, 500);
  }
}

export const onRequestGet = withOperator(handleGet);
