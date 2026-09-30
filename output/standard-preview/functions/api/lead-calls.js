// GET /api/lead-calls?month=YYYY-MM[&client=]
// Booked calls: the month's calls coloured by how they went, the next two weeks with a
// confirmed flag, the ones waiting on a post-call form, and 30-day show and close rates
// (InfoOS build). Read access as /api/lead-pipeline.

import { json } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient } from "../_shared/client-read.js";
import { loadCalls } from "../_shared/lead-calls.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const month = new URL(request.url).searchParams.get("month");
  try {
    return json({ ok: true, generated_at: new Date().toISOString(), ...(await loadCalls(env, access.client, { month })) });
  } catch (error) {
    console.error("lead-calls failed", error);
    return json({ ok: false, error: "Your calls could not load. Try again shortly." }, 500);
  }
}

export const onRequestGet = withOperator(handleGet);
