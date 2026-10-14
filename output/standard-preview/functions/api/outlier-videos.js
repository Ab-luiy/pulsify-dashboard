// GET /api/outlier-videos -> {ok, niche, groups: [{niche, label, yours, videos: [...]}]}
// The 7-fig packaging library's Videos, Thumbnails and Titles tabs all read this: videos that beat their own channel's
// normal by 10x or more (badge at 100x), the client's niche first, then the other niches. The data is gathered by the
// sync Worker's `outliers` job (_shared/outliers.js); this only reads it.
import { json } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";
import { buildGeneratorBrainContext, loadClientBrainData } from "../_shared/client-brain-context.js";
import { outlierGroups } from "../_shared/outliers.js";

export async function onRequestGet({ request, env }) {
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true, allowQueryToken: false, allowImpersonated: true });
  if (access.error) return access.error;
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const client = String(access.client).toLowerCase();
  const brain = buildGeneratorBrainContext(await loadClientBrainData(env, client).catch(() => null));
  const niche = brain.niche?.id ?? "";
  const groups = await outlierGroups(env, niche).catch(() => []);
  return json({ ok: true, niche, groups }, 200, { "cache-control": "private, max-age=300" });
}
