// Contacts as people, not events.
//   GET /api/pipeline?client=&q=                one row per contact with stage and counts
//   GET /api/pipeline?client=&email=            full timeline for one contact
//   POST /api/pipeline {client, action:"backfill"}   operator only, one-time import from integration_events
import { withOperator } from "../_shared/access.js";
import { json, str } from "../_shared/common.js";
import { backfillFromIntegrationEvents, listContacts, listContactsAll, timeline } from "../_shared/pipeline-touches.js";
import { resolveSpineRead } from "../_shared/spine-auth.js";

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const access = await resolveSpineRead(request, env, "client", str(url.searchParams.get("client")));
  if (access.error) return access.error;
  // Operator with no client: every client's contacts, for the Leads view.
  if (!access.client && access.role === "operator") {
    return json({ ok: true, client: null, contacts: await listContactsAll(env, { q: url.searchParams.get("q") || "" }) });
  }
  if (!access.client) return json({ ok: false, error: "client required" }, 422);
  const email = str(url.searchParams.get("email"));
  if (email) return json({ ok: true, client: access.client, email, touches: await timeline(env, access.client, email) });
  return json({ ok: true, client: access.client, contacts: await listContacts(env, access.client, { q: url.searchParams.get("q") || "" }) });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  let body = {};
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveSpineRead(request, env, "client", str(body.client));
  if (access.error) return access.error;
  if (access.role !== "operator") return json({ ok: false, error: "operator only" }, 403);
  if (str(body.action) !== "backfill") return json({ ok: false, error: "action must be backfill" }, 422);
  const inserted = await backfillFromIntegrationEvents(env, access.client || null);
  return json({ ok: true, inserted });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
