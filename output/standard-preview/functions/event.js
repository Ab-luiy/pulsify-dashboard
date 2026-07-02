/**
 * Shared funnel event receiver.
 *
 * POST /event?client=<client-id>
 *
 * Accepts:
 * - Typeform webhooks
 * - native opt-in submissions
 * - Wistia Aurora player events
 * - page/funnel events
 *
 * Every browser gets a persistent visitor_id and a per-tab session_id. Typeform
 * receives both as URL parameters, so a submission can attach the email to all
 * video activity that happened before the form was submitted.
 */

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad json" }, 400);
  }

  const url = new URL(request.url);
  const formResponse = body.form_response || {};
  const hidden = formResponse.hidden || {};
  const client = cleanId(url.searchParams.get("client") || body.client || hidden.client || "unknown");
  const cfg = await getConfig(env, client);

  if (!cfg && env.DB) return json({ ok: false, error: "unknown client" }, 404);

  if (body.event_type === "form_response" || body.form_response) {
    if (cfg?.typeform_webhook_secret) {
      const valid = await verifyTypeformSignature(
        request.headers.get("Typeform-Signature"),
        raw,
        cfg.typeform_webhook_secret,
      );
      if (!valid) {
        await recordFailure(env, client, "typeform_signature", "invalid Typeform signature");
        return json({ ok: false, error: "invalid Typeform signature" }, 401);
      }
    }

    const answers = parseTypeformAnswers(formResponse.answers || []);
    const email = firstValue(answers, ["email", "email_address"]) || hidden.email || null;
    const name = firstValue(answers, ["first_name", "name", "full_name"]) || null;
    const phone = firstValue(answers, ["phone", "phone_number"]) || null;
    const visitorId = hidden.visitor_id || body.visitor_id || null;
    const sessionId = hidden.session_id || body.session_id || null;
    const pageId = hidden.page_id || body.page_id || "main";

    if (!email) {
      await recordFailure(env, client, "typeform_parse", "Typeform response has no email field");
      return json({ ok: false, error: "Typeform response has no email field" }, 422);
    }

    const lead = {
      client,
      email,
      name,
      phone,
      revenue: firstValue(answers, ["revenue", "current_revenue"]) || null,
      situation: firstValue(answers, ["situation", "current_situation"]) || null,
      status: "new",
      source: "typeform",
      visitor_id: visitorId,
      session_id: sessionId,
      page_id: pageId,
      response_id: formResponse.response_id || formResponse.token || null,
      answers_json: JSON.stringify(answers),
      utm_json: JSON.stringify(extractUtm(hidden)),
      applied_at: formResponse.submitted_at || new Date().toISOString(),
    };

    const leadId = await saveLead(env, lead);
    await attachIdentityToEvents(env, client, visitorId, email);
    const kit = await addToKit(env, client, cfg, { email, first_name: name || "" });
    await setKitStatus(env, leadId, kit.status);
    await savePageEvent(env, {
      client,
      visitor_id: visitorId,
      session_id: sessionId,
      page_id: pageId,
      event: "form_submit",
      email,
      path: null,
      referrer: hidden.referrer || null,
      utm_json: JSON.stringify(extractUtm(hidden)),
      metadata_json: JSON.stringify({ source: "typeform", response_id: lead.response_id }),
    });
    return json({ ok: true, kind: "application", kit: kit.status });
  }

  if (body.kind === "optin" || body.event_type === "optin") {
    const email = normalizeEmail(body.email);
    if (!email) return json({ ok: false, error: "valid email required" }, 422);

    const lead = {
      client,
      email,
      name: body.name || body.first_name || null,
      phone: body.phone || null,
      revenue: null,
      situation: null,
      status: "opted_in",
      source: "optin",
      visitor_id: body.visitor_id || null,
      session_id: body.session_id || null,
      page_id: body.page_id || "optin",
      response_id: null,
      answers_json: null,
      utm_json: JSON.stringify(body.utm || {}),
      applied_at: new Date().toISOString(),
    };

    const leadId = await saveLead(env, lead);
    await attachIdentityToEvents(env, client, lead.visitor_id, email);
    const kit = await addToKit(env, client, cfg, { email, first_name: lead.name || "" });
    await setKitStatus(env, leadId, kit.status);
    await savePageEvent(env, {
      client,
      visitor_id: lead.visitor_id,
      session_id: lead.session_id,
      page_id: lead.page_id,
      event: "optin",
      email,
      path: body.path || null,
      referrer: body.referrer || null,
      utm_json: lead.utm_json,
      metadata_json: null,
    });
    return json({ ok: true, kind: "optin", kit: kit.status });
  }

  if (body.source === "wistia" || body.kind === "wistia") {
    await saveWatch(env, {
      client,
      email: normalizeEmail(body.email),
      visitor_id: body.visitor_id || null,
      session_id: body.session_id || null,
      page_id: body.page_id || "main",
      media_id: body.media_id || cfg?.wistia_media_id || null,
      wistia_visitor_key: body.wistia_visitor_key || null,
      event: body.event || "snapshot",
      percent: finite(body.percent),
      position_seconds: finite(body.position_seconds),
      duration_seconds: finite(body.duration_seconds),
      watch_seconds: Math.max(0, finite(body.watch_seconds) || 0),
      unique_seconds: finite(body.unique_seconds),
      playback_rate: finite(body.playback_rate),
      muted: body.muted == null ? null : (body.muted ? 1 : 0),
      metadata_json: body.metadata ? JSON.stringify(body.metadata) : null,
    });
    return json({ ok: true, kind: "watch" });
  }

  if (body.kind === "page" || body.event_type === "page_event") {
    await savePageEvent(env, {
      client,
      visitor_id: body.visitor_id || null,
      session_id: body.session_id || null,
      page_id: body.page_id || "main",
      event: body.event || "page_view",
      email: normalizeEmail(body.email),
      path: body.path || null,
      referrer: body.referrer || null,
      utm_json: JSON.stringify(body.utm || {}),
      metadata_json: body.metadata ? JSON.stringify(body.metadata) : null,
    });
    return json({ ok: true, kind: "page" });
  }

  return json({ ok: false, error: "unknown event" }, 400);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, typeform-signature",
      "access-control-max-age": "86400",
    },
  });
}

async function getConfig(env, client) {
  if (!env.DB) {
    return {
      kit_api_key: env.KIT_API_KEY,
      kit_tag_id: env.KIT_TAG_ID,
      typeform_webhook_secret: env.TYPEFORM_WEBHOOK_SECRET,
    };
  }
  return env.DB.prepare(
    `SELECT client, wistia_media_id, typeform_url, typeform_webhook_secret,
            kit_api_key, kit_tag_id, allowed_origin
       FROM client_config WHERE client=?`,
  ).bind(client).first();
}

async function addToKit(env, client, cfg, person) {
  if (!cfg?.kit_api_key || !cfg?.kit_tag_id) return { status: "not_configured" };
  if (!person.email) return { status: "no_email" };

  const headers = {
    "content-type": "application/json",
    "X-Kit-Api-Key": cfg.kit_api_key,
  };

  try {
    const subscriberResponse = await fetch("https://api.kit.com/v4/subscribers", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email_address: person.email,
        first_name: person.first_name || null,
      }),
    });
    if (!subscriberResponse.ok) {
      await recordFailure(
        env,
        client,
        "kit",
        `subscriber_error_${subscriberResponse.status}: ${await safeText(subscriberResponse)}`,
      );
      return { status: `subscriber_error_${subscriberResponse.status}` };
    }

    const tagResponse = await fetch(`https://api.kit.com/v4/tags/${cfg.kit_tag_id}/subscribers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email_address: person.email }),
    });
    if (!tagResponse.ok) {
      await recordFailure(
        env,
        client,
        "kit",
        `tag_error_${tagResponse.status}: ${await safeText(tagResponse)}`,
      );
      return { status: `tag_error_${tagResponse.status}` };
    }
    return { status: "synced" };
  } catch (err) {
    await recordFailure(env, client, "kit", `network_error: ${err?.message || err}`);
    return { status: "network_error" };
  }
}

async function safeText(response) {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "";
  }
}

/**
 * Records a delivery failure (Kit API or Typeform rejection) so it's visible
 * on /api/health and the campaign board. Never throws, never blocks the
 * original event path — if the table doesn't exist yet (migration not run)
 * or D1 isn't bound, this silently no-ops.
 */
async function recordFailure(env, client, kind, detail) {
  try {
    if (!env.DB) return;
    const safeDetail = detail == null ? null : String(detail).slice(0, 500);
    await env.DB.prepare(
      "INSERT INTO delivery_failures (client,kind,detail,at) VALUES (?,?,?,?)",
    ).bind(client, kind, safeDetail, new Date().toISOString()).run();
  } catch {
    // swallow — telemetry must never break the funnel pipe
  }
}

async function saveLead(env, lead) {
  if (!env.DB) return null;
  const now = new Date().toISOString();
  const existing = await env.DB.prepare(
    `SELECT id FROM leads
      WHERE client=? AND (
        (? IS NOT NULL AND response_id=?) OR
        (? IS NOT NULL AND lower(email)=lower(?))
      )
      ORDER BY id DESC LIMIT 1`,
  ).bind(lead.client, lead.response_id, lead.response_id, lead.email, lead.email).first();

  if (existing?.id) {
    await env.DB.prepare(
      `UPDATE leads SET
        email=COALESCE(?,email), name=COALESCE(?,name), phone=COALESCE(?,phone),
        revenue=COALESCE(?,revenue), situation=COALESCE(?,situation), status=?,
        source=?, visitor_id=COALESCE(?,visitor_id), session_id=COALESCE(?,session_id),
        page_id=COALESCE(?,page_id), response_id=COALESCE(?,response_id),
        answers_json=COALESCE(?,answers_json), utm_json=COALESCE(?,utm_json),
        applied_at=COALESCE(applied_at,?), updated_at=?
       WHERE id=?`,
    ).bind(
      lead.email, lead.name, lead.phone, lead.revenue, lead.situation, lead.status,
      lead.source, lead.visitor_id, lead.session_id, lead.page_id, lead.response_id,
      lead.answers_json, lead.utm_json, lead.applied_at, now, existing.id,
    ).run();
    return existing.id;
  }

  const result = await env.DB.prepare(
    `INSERT INTO leads (
      client,email,name,phone,revenue,situation,status,source,visitor_id,session_id,
      page_id,response_id,answers_json,utm_json,applied_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    lead.client, lead.email, lead.name, lead.phone, lead.revenue, lead.situation,
    lead.status, lead.source, lead.visitor_id, lead.session_id, lead.page_id,
    lead.response_id, lead.answers_json, lead.utm_json, lead.applied_at, now,
  ).run();
  return result.meta?.last_row_id || null;
}

async function setKitStatus(env, leadId, status) {
  if (!env.DB || !leadId) return;
  await env.DB.prepare("UPDATE leads SET kit_status=?, updated_at=? WHERE id=?")
    .bind(status, new Date().toISOString(), leadId).run();
}

async function attachIdentityToEvents(env, client, visitorId, email) {
  if (!env.DB || !visitorId || !email) return;
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE watch_events SET email=? WHERE client=? AND visitor_id=? AND (email IS NULL OR email='')",
    ).bind(email, client, visitorId),
    env.DB.prepare(
      "UPDATE page_events SET email=? WHERE client=? AND visitor_id=? AND (email IS NULL OR email='')",
    ).bind(email, client, visitorId),
  ]);
}

async function saveWatch(env, w) {
  if (!env.DB) return;
  await env.DB.prepare(
    `INSERT INTO watch_events (
      client,email,visitor_id,session_id,page_id,media_id,wistia_visitor_key,event,
      percent,position_seconds,duration_seconds,watch_seconds,unique_seconds,
      playback_rate,muted,metadata_json,at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    w.client, w.email, w.visitor_id, w.session_id, w.page_id, w.media_id,
    w.wistia_visitor_key, w.event, w.percent, w.position_seconds, w.duration_seconds,
    w.watch_seconds, w.unique_seconds, w.playback_rate, w.muted, w.metadata_json,
    new Date().toISOString(),
  ).run();
}

async function savePageEvent(env, e) {
  if (!env.DB) return;
  await env.DB.prepare(
    `INSERT INTO page_events (
      client,visitor_id,session_id,page_id,event,email,path,referrer,utm_json,metadata_json,at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    e.client, e.visitor_id, e.session_id, e.page_id, e.event, e.email, e.path,
    e.referrer, e.utm_json, e.metadata_json, new Date().toISOString(),
  ).run();
}

function parseTypeformAnswers(items) {
  const result = {};
  for (const answer of items) {
    const key = answer.field?.ref || answer.field?.id || answer.type || "answer";
    result[key] =
      answer.text ??
      answer.email ??
      answer.phone_number ??
      answer.url ??
      answer.date ??
      answer.boolean ??
      answer.number ??
      answer.choice?.label ??
      answer.choices?.labels ??
      answer.file_url ??
      null;
  }
  return result;
}

function firstValue(object, names) {
  const keys = Object.keys(object);
  for (const name of names) {
    if (object[name] != null && object[name] !== "") return object[name];
    const fuzzy = keys.find((key) => key.toLowerCase().includes(name));
    if (fuzzy && object[fuzzy] != null && object[fuzzy] !== "") return object[fuzzy];
  }
  return null;
}

function extractUtm(source) {
  const out = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    if (source?.[key]) out[key] = source[key];
  }
  return out;
}

async function verifyTypeformSignature(received, payload, secret) {
  if (!received || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = `sha256=${bytesToBase64(new Uint8Array(signature))}`;
  return constantTimeEqual(expected, received);
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function cleanId(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || "unknown";
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function json(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
  });
}
