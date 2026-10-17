// Delivery automations runner.
//   POST /api/automations {job: "precall-briefs" | "fathom" | "weekly-reports" | "crypto-watch" | "workflows"}
// Called by the pulsify-sync Worker's cron with X-Automation-Secret, or by an
// operator ("Run now"). Runs here so it uses the Pages secrets (Fathom, and the
// Claude key once set) and the AI binding.
import { withOperator } from "../_shared/access.js";
import { constantTimeEqual, json, str } from "../_shared/common.js";
import { resolveOperator } from "../_shared/spine-auth.js";
import { watchWallets } from "../_shared/crypto-watch.js";
import "../_shared/recipes/index.js";
import { sweepOutbox } from "../_shared/workflows.js";
import { briefPendingBookings, draftWeeklyReports, importFathomCalls } from "../_shared/delivery-automation.js";

const JOBS = { "precall-briefs": briefPendingBookings, fathom: importFathomCalls, "weekly-reports": draftWeeklyReports, "crypto-watch": watchWallets, workflows: sweepOutbox };

async function handlePost({ request, env }) {
  const secret = str(request.headers.get("x-automation-secret"));
  const trusted = Boolean(env.AUTOMATION_SECRET && secret && constantTimeEqual(secret, env.AUTOMATION_SECRET));
  if (!trusted) {
    const operator = resolveOperator(request, env);
    if (operator.error) return operator.error;
  }
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const job = str(body.job);
  if (!JOBS[job]) return json({ ok: false, error: "unknown job" }, 422);
  try {
    const count = await JOBS[job](env);
    return json({ ok: true, job, count });
  } catch (error) {
    return json({ ok: false, job, error: str(error?.message || error).slice(0, 300) }, 502);
  }
}

export const onRequestPost = withOperator(handlePost);
