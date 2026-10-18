// GET /api/follower-places[?client=]   where a client's Instagram followers are from (#77)
//   -> {ok, connected, as_of, total, inside_regions, main_regions, regions:[{id,label,followers}], countries:[{place,followers}], cities:[...], note}
// Totals from Instagram's follower demographics (top 45 countries and cities). Never individual
// followers: Instagram cannot tag them. connected:false until the client's Instagram is connected
// through Zernio; the screen says so. Reads only the saved totals, never calls Zernio.

import { json } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient } from "../_shared/client-read.js";
import { loadFollowerPlaces } from "../_shared/follower-places.js";
import { getRegions } from "../_shared/visitor-regions.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  try {
    const regions = await getRegions(env, access.client);
    const places = await loadFollowerPlaces(env, access.client, regions);
    const note = !places.connected
      ? "Connect Instagram to see where your followers are from."
      : !places.countries.length
        ? "Instagram shows this once an account has 100 followers. It can take a day after connecting."
        : "Instagram gives totals only, for the top 45 countries and cities. It cannot say which follower is where.";
    return json({ ok: true, client: access.client, ...places, note });
  } catch (error) {
    console.error("follower-places failed", error);
    return json({ ok: false, error: "Follower places could not load. Try again shortly." }, 500);
  }
}

export const onRequestGet = withOperator(handleGet);
