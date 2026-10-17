// GET /api/visitor-regions[?client=]   the regions that count for the main tracker
// PUT /api/visitor-regions {client?, regions: ["na","eu",...]}
// (pulsify-saas #77). Default is North America and Europe. Reads: client, preview or operator
// (?client=). Writes: client or operator, never a preview.

import { json, nowIso } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient, resolveReportWriter } from "../_shared/client-read.js";
import { DEFAULT_REGIONS, REGION_GROUPS, getRegions, setRegions } from "../_shared/visitor-regions.js";

const groups = REGION_GROUPS.map(({ id, label }) => ({ id, label }));

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  return json({ ok: true, client: access.client, regions: await getRegions(env, access.client), default: DEFAULT_REGIONS, groups });
}

async function handlePut({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  if (!Array.isArray(body?.regions) || !body.regions.length) return json({ ok: false, error: "Choose at least one region." }, 422);
  const regions = await setRegions(env, access.client, body.regions, nowIso());
  return json({ ok: true, regions });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPut = withOperator(handlePut);
