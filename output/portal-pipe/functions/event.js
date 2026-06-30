/**
 * THE PIPE — Cloudflare Pages Function.
 * Route when deployed: POST /event   (file lives at functions/event.js in the Pages project)
 *
 * It receives two kinds of messages from the landing page and saves both to one
 * place (a Cloudflare D1 database), tagged by which client they belong to:
 *   1) Typeform webhook      — fires when someone submits the application form
 *   2) Wistia player event   — fires as someone watches the VSL (play / progress / end)
 *
 * The client portal/dashboard then reads from D1 (see leads.js) to show, in one screen,
 * who applied and who watched the video and how far.
 *
 * BLANKS TO FILL once the accounts exist:
 *   - In the Cloudflare Pages project: bind a D1 database as `DB`.
 *   - In Typeform: set this URL as the form's webhook (Connect → Webhooks).
 *   - On the landing page: send Wistia player events here (small snippet, see README).
 */

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("client") || body.client || "unknown";

  // ---- Typeform application ----
  if (body.event_type === "form_response" || body.form_response) {
    const fr = body.form_response || {};
    const a = {};
    (fr.answers || []).forEach((ans) => {
      const key = (ans.field && (ans.field.ref || ans.field.id)) || ans.type;
      a[key] = ans.text ?? ans.email ?? ans.choice?.label ?? ans.boolean ?? ans.number ?? null;
    });
    await saveLead(env, {
      client: clientId,
      email: a.email || (fr.hidden && fr.hidden.email) || null,
      name: a.first_name || a.name || null,
      revenue: a.revenue || null,
      situation: a.situation || null,
      applied_at: fr.submitted_at || new Date().toISOString(),
      status: "new",
    });
    return json({ ok: true, kind: "application" });
  }

  // ---- Wistia watch event ----
  if (body.source === "wistia" || body.media_id) {
    await saveWatch(env, {
      client: clientId,
      email: body.email || null,     // the page passes the Typeform email so watch ties to a person
      media_id: body.media_id || null,
      event: body.event || "play",   // play | progress | end
      percent: body.percent ?? null, // how far they watched
      at: new Date().toISOString(),
    });
    return json({ ok: true, kind: "watch" });
  }

  return json({ ok: false, error: "unknown event" }, 400);
}

// Let Typeform/Wistia preflight succeed.
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

async function saveLead(env, lead) {
  if (!env.DB) return; // DB = the D1 binding; configure it in the Pages project
  await env.DB.prepare(
    "INSERT INTO leads (client,email,name,revenue,situation,applied_at,status) VALUES (?,?,?,?,?,?,?)"
  ).bind(lead.client, lead.email, lead.name, lead.revenue, lead.situation, lead.applied_at, lead.status).run();
}

async function saveWatch(env, w) {
  if (!env.DB) return;
  await env.DB.prepare(
    "INSERT INTO watch_events (client,email,media_id,event,percent,at) VALUES (?,?,?,?,?,?)"
  ).bind(w.client, w.email, w.media_id, w.event, w.percent, w.at).run();
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
  });
}
