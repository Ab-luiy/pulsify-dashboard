// GET /api/client-dms[?client=]   Instagram DMs on the client's leads (#76)
//   -> {ok, connected, people, linked, with_ref, last_dm_at, note}
// connected:false until the client's Instagram is connected through Zernio; the Leads screen
// says so. Reads only what the inbox job has stored, never calls Zernio.

import { json } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient } from "../_shared/client-read.js";
import { dmStatus } from "../_shared/client-dms.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  try {
    const status = await dmStatus(env, access.client);
    const note = !status.connected
      ? "Connect Instagram to see who messages you and match them to your leads."
      : !status.people
        ? "No one has messaged you yet. People who do show here and on your leads."
        : "People who message you are matched to your leads by Instagram handle, email or phone number.";
    return json({ ok: true, client: access.client, ...status, note });
  } catch (error) {
    console.error("client-dms failed", error);
    return json({ ok: false, error: "Instagram messages could not load. Try again shortly." }, 500);
  }
}

export const onRequestGet = withOperator(handleGet);
