// Once a day, save where each connected client's Instagram followers are from (pulsify-saas #77).
// Only clients with a connected Instagram are asked; with none connected (today) this does nothing
// and makes no request.
import { refreshFollowerPlaces } from "../../../../functions/_shared/follower-places.js";

export async function syncFollowerPlaces(env, { fetcher = fetch } = {}) {
  if (!env.ZERNIO_API_KEY) return 0;
  const rows = (await env.DB.prepare("SELECT DISTINCT client_id FROM integrations WHERE scope='client' AND provider='instagram'").all()).results || [];
  let saved = 0;
  for (const row of rows) {
    const result = await refreshFollowerPlaces(env, row.client_id, { fetcher }).catch((error) => {
      console.error("follower-places", row.client_id, String(error?.message || error));
      return { saved: 0 };
    });
    saved += result.saved || 0;
  }
  return saved;
}
