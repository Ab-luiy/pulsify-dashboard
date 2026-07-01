var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-MljmvE/functionsWorker-0.3169404538222099.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
async function onRequestGet({ request, env }) {
  if (!env.ADMIN_KEY || request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const result = await env.DB.prepare(
    `SELECT client, COALESCE(client_name,client) AS client_name, wistia_media_id,
            typeform_url, kit_tag_id, updated_at
       FROM client_config ORDER BY client_name COLLATE NOCASE`
  ).all();
  return json({ ok: true, clients: result.results || [] });
}
__name(onRequestGet, "onRequestGet");
__name2(onRequestGet, "onRequestGet");
function json(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    }
  });
}
__name(json, "json");
__name2(json, "json");
async function onRequestGet2({ request, env }) {
  const url = new URL(request.url);
  const client = String(url.searchParams.get("client") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
  if (!client) return json2({ ok: false, error: "client required" }, 400);
  if (!env.DB) return json2({ ok: false, error: "no database bound" }, 500);
  const row = await env.DB.prepare(
    `SELECT client, COALESCE(client_name,client) AS client_name,
            wistia_media_id, typeform_url
       FROM client_config WHERE client=?`
  ).bind(client).first();
  if (!row) return json2({ ok: false, error: "unknown client" }, 404);
  return json2({ ok: true, config: row });
}
__name(onRequestGet2, "onRequestGet2");
__name2(onRequestGet2, "onRequestGet");
function json2(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=60"
    }
  });
}
__name(json2, "json2");
__name2(json2, "json");
async function onRequestGet3({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json3({ ok: false, error: "no database bound" }, 500);
  const url = new URL(request.url);
  const client = cleanId(url.searchParams.get("client") || "unknown");
  const row = await env.DB.prepare(
    `SELECT client,client_name,wistia_media_id,typeform_url,typeform_webhook_secret,
            kit_tag_id,kit_api_key,allowed_origin,updated_at
       FROM client_config WHERE client=?`
  ).bind(client).first();
  if (!row) return json3({ ok: true, client, config: null });
  row.kit_api_key_set = Boolean(row.kit_api_key);
  row.typeform_webhook_secret_set = Boolean(row.typeform_webhook_secret);
  delete row.kit_api_key;
  delete row.typeform_webhook_secret;
  return json3({ ok: true, client, config: row });
}
__name(onRequestGet3, "onRequestGet3");
__name2(onRequestGet3, "onRequestGet");
async function onRequestPost({ request, env }) {
  const auth = checkAuth(request, env);
  if (auth) return auth;
  if (!env.DB) return json3({ ok: false, error: "no database bound" }, 500);
  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client || "unknown");
  if (client === "unknown") return json3({ ok: false, error: "valid client id required" }, 422);
  const existing = await env.DB.prepare(
    "SELECT kit_api_key,typeform_webhook_secret FROM client_config WHERE client=?"
  ).bind(client).first();
  const kitKey = body.kit_api_key || existing?.kit_api_key || null;
  const webhookSecret = body.typeform_webhook_secret || existing?.typeform_webhook_secret || null;
  await env.DB.prepare(
    `INSERT INTO client_config (
      client,client_name,wistia_media_id,typeform_url,typeform_webhook_secret,
      kit_tag_id,kit_api_key,allowed_origin,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(client) DO UPDATE SET
      client_name=excluded.client_name,
      wistia_media_id=excluded.wistia_media_id,
      typeform_url=excluded.typeform_url,
      typeform_webhook_secret=excluded.typeform_webhook_secret,
      kit_tag_id=excluded.kit_tag_id,
      kit_api_key=excluded.kit_api_key,
      allowed_origin=excluded.allowed_origin,
      updated_at=excluded.updated_at`
  ).bind(
    client,
    body.client_name || client,
    body.wistia_media_id || null,
    body.typeform_url || null,
    webhookSecret,
    body.kit_tag_id || null,
    kitKey,
    body.allowed_origin || null,
    (/* @__PURE__ */ new Date()).toISOString()
  ).run();
  return json3({
    ok: true,
    saved: true,
    webhook_url: `${new URL(request.url).origin}/event?client=${encodeURIComponent(client)}`
  });
}
__name(onRequestPost, "onRequestPost");
__name2(onRequestPost, "onRequestPost");
async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key",
      "access-control-max-age": "86400"
    }
  });
}
__name(onRequestOptions, "onRequestOptions");
__name2(onRequestOptions, "onRequestOptions");
function checkAuth(request, env) {
  if (!env.ADMIN_KEY) return json3({ ok: false, error: "ADMIN_KEY not configured" }, 500);
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json3({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}
__name(checkAuth, "checkAuth");
__name2(checkAuth, "checkAuth");
function cleanId(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || "unknown";
}
__name(cleanId, "cleanId");
__name2(cleanId, "cleanId");
function json3(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    }
  });
}
__name(json3, "json3");
__name2(json3, "json");
async function onRequestPost2({ request, env }) {
  const raw = await request.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json4({ ok: false, error: "bad json" }, 400);
  }
  const url = new URL(request.url);
  const formResponse = body.form_response || {};
  const hidden = formResponse.hidden || {};
  const client = cleanId2(url.searchParams.get("client") || body.client || hidden.client || "unknown");
  const cfg = await getConfig(env, client);
  if (!cfg && env.DB) return json4({ ok: false, error: "unknown client" }, 404);
  if (body.event_type === "form_response" || body.form_response) {
    if (cfg?.typeform_webhook_secret) {
      const valid = await verifyTypeformSignature(
        request.headers.get("Typeform-Signature"),
        raw,
        cfg.typeform_webhook_secret
      );
      if (!valid) return json4({ ok: false, error: "invalid Typeform signature" }, 401);
    }
    const answers = parseTypeformAnswers(formResponse.answers || []);
    const email = firstValue(answers, ["email", "email_address"]) || hidden.email || null;
    const name = firstValue(answers, ["first_name", "name", "full_name"]) || null;
    const phone = firstValue(answers, ["phone", "phone_number"]) || null;
    const visitorId = hidden.visitor_id || body.visitor_id || null;
    const sessionId = hidden.session_id || body.session_id || null;
    const pageId = hidden.page_id || body.page_id || "main";
    if (!email) return json4({ ok: false, error: "Typeform response has no email field" }, 422);
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
      applied_at: formResponse.submitted_at || (/* @__PURE__ */ new Date()).toISOString()
    };
    const leadId = await saveLead(env, lead);
    await attachIdentityToEvents(env, client, visitorId, email);
    const kit = await addToKit(cfg, { email, first_name: name || "" });
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
      metadata_json: JSON.stringify({ source: "typeform", response_id: lead.response_id })
    });
    return json4({ ok: true, kind: "application", kit: kit.status });
  }
  if (body.kind === "optin" || body.event_type === "optin") {
    const email = normalizeEmail(body.email);
    if (!email) return json4({ ok: false, error: "valid email required" }, 422);
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
      applied_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const leadId = await saveLead(env, lead);
    await attachIdentityToEvents(env, client, lead.visitor_id, email);
    const kit = await addToKit(cfg, { email, first_name: lead.name || "" });
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
      metadata_json: null
    });
    return json4({ ok: true, kind: "optin", kit: kit.status });
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
      muted: body.muted == null ? null : body.muted ? 1 : 0,
      metadata_json: body.metadata ? JSON.stringify(body.metadata) : null
    });
    return json4({ ok: true, kind: "watch" });
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
      metadata_json: body.metadata ? JSON.stringify(body.metadata) : null
    });
    return json4({ ok: true, kind: "page" });
  }
  return json4({ ok: false, error: "unknown event" }, 400);
}
__name(onRequestPost2, "onRequestPost2");
__name2(onRequestPost2, "onRequestPost");
async function onRequestOptions2() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, typeform-signature",
      "access-control-max-age": "86400"
    }
  });
}
__name(onRequestOptions2, "onRequestOptions2");
__name2(onRequestOptions2, "onRequestOptions");
async function getConfig(env, client) {
  if (!env.DB) {
    return {
      kit_api_key: env.KIT_API_KEY,
      kit_tag_id: env.KIT_TAG_ID,
      typeform_webhook_secret: env.TYPEFORM_WEBHOOK_SECRET
    };
  }
  return env.DB.prepare(
    `SELECT client, wistia_media_id, typeform_url, typeform_webhook_secret,
            kit_api_key, kit_tag_id, allowed_origin
       FROM client_config WHERE client=?`
  ).bind(client).first();
}
__name(getConfig, "getConfig");
__name2(getConfig, "getConfig");
async function addToKit(cfg, person) {
  if (!cfg?.kit_api_key || !cfg?.kit_tag_id) return { status: "not_configured" };
  if (!person.email) return { status: "no_email" };
  const headers = {
    "content-type": "application/json",
    "X-Kit-Api-Key": cfg.kit_api_key
  };
  try {
    const subscriberResponse = await fetch("https://api.kit.com/v4/subscribers", {
      method: "POST",
      headers,
      body: JSON.stringify({
        email_address: person.email,
        first_name: person.first_name || null
      })
    });
    if (!subscriberResponse.ok) return { status: `subscriber_error_${subscriberResponse.status}` };
    const tagResponse = await fetch(`https://api.kit.com/v4/tags/${cfg.kit_tag_id}/subscribers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email_address: person.email })
    });
    if (!tagResponse.ok) return { status: `tag_error_${tagResponse.status}` };
    return { status: "synced" };
  } catch {
    return { status: "network_error" };
  }
}
__name(addToKit, "addToKit");
__name2(addToKit, "addToKit");
async function saveLead(env, lead) {
  if (!env.DB) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = await env.DB.prepare(
    `SELECT id FROM leads
      WHERE client=? AND (
        (? IS NOT NULL AND response_id=?) OR
        (? IS NOT NULL AND lower(email)=lower(?))
      )
      ORDER BY id DESC LIMIT 1`
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
       WHERE id=?`
    ).bind(
      lead.email,
      lead.name,
      lead.phone,
      lead.revenue,
      lead.situation,
      lead.status,
      lead.source,
      lead.visitor_id,
      lead.session_id,
      lead.page_id,
      lead.response_id,
      lead.answers_json,
      lead.utm_json,
      lead.applied_at,
      now,
      existing.id
    ).run();
    return existing.id;
  }
  const result = await env.DB.prepare(
    `INSERT INTO leads (
      client,email,name,phone,revenue,situation,status,source,visitor_id,session_id,
      page_id,response_id,answers_json,utm_json,applied_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    lead.client,
    lead.email,
    lead.name,
    lead.phone,
    lead.revenue,
    lead.situation,
    lead.status,
    lead.source,
    lead.visitor_id,
    lead.session_id,
    lead.page_id,
    lead.response_id,
    lead.answers_json,
    lead.utm_json,
    lead.applied_at,
    now
  ).run();
  return result.meta?.last_row_id || null;
}
__name(saveLead, "saveLead");
__name2(saveLead, "saveLead");
async function setKitStatus(env, leadId, status) {
  if (!env.DB || !leadId) return;
  await env.DB.prepare("UPDATE leads SET kit_status=?, updated_at=? WHERE id=?").bind(status, (/* @__PURE__ */ new Date()).toISOString(), leadId).run();
}
__name(setKitStatus, "setKitStatus");
__name2(setKitStatus, "setKitStatus");
async function attachIdentityToEvents(env, client, visitorId, email) {
  if (!env.DB || !visitorId || !email) return;
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE watch_events SET email=? WHERE client=? AND visitor_id=? AND (email IS NULL OR email='')"
    ).bind(email, client, visitorId),
    env.DB.prepare(
      "UPDATE page_events SET email=? WHERE client=? AND visitor_id=? AND (email IS NULL OR email='')"
    ).bind(email, client, visitorId)
  ]);
}
__name(attachIdentityToEvents, "attachIdentityToEvents");
__name2(attachIdentityToEvents, "attachIdentityToEvents");
async function saveWatch(env, w) {
  if (!env.DB) return;
  await env.DB.prepare(
    `INSERT INTO watch_events (
      client,email,visitor_id,session_id,page_id,media_id,wistia_visitor_key,event,
      percent,position_seconds,duration_seconds,watch_seconds,unique_seconds,
      playback_rate,muted,metadata_json,at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    w.client,
    w.email,
    w.visitor_id,
    w.session_id,
    w.page_id,
    w.media_id,
    w.wistia_visitor_key,
    w.event,
    w.percent,
    w.position_seconds,
    w.duration_seconds,
    w.watch_seconds,
    w.unique_seconds,
    w.playback_rate,
    w.muted,
    w.metadata_json,
    (/* @__PURE__ */ new Date()).toISOString()
  ).run();
}
__name(saveWatch, "saveWatch");
__name2(saveWatch, "saveWatch");
async function savePageEvent(env, e) {
  if (!env.DB) return;
  await env.DB.prepare(
    `INSERT INTO page_events (
      client,visitor_id,session_id,page_id,event,email,path,referrer,utm_json,metadata_json,at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    e.client,
    e.visitor_id,
    e.session_id,
    e.page_id,
    e.event,
    e.email,
    e.path,
    e.referrer,
    e.utm_json,
    e.metadata_json,
    (/* @__PURE__ */ new Date()).toISOString()
  ).run();
}
__name(savePageEvent, "savePageEvent");
__name2(savePageEvent, "savePageEvent");
function parseTypeformAnswers(items) {
  const result = {};
  for (const answer of items) {
    const key = answer.field?.ref || answer.field?.id || answer.type || "answer";
    result[key] = answer.text ?? answer.email ?? answer.phone_number ?? answer.url ?? answer.date ?? answer.boolean ?? answer.number ?? answer.choice?.label ?? answer.choices?.labels ?? answer.file_url ?? null;
  }
  return result;
}
__name(parseTypeformAnswers, "parseTypeformAnswers");
__name2(parseTypeformAnswers, "parseTypeformAnswers");
function firstValue(object, names) {
  const keys = Object.keys(object);
  for (const name of names) {
    if (object[name] != null && object[name] !== "") return object[name];
    const fuzzy = keys.find((key) => key.toLowerCase().includes(name));
    if (fuzzy && object[fuzzy] != null && object[fuzzy] !== "") return object[fuzzy];
  }
  return null;
}
__name(firstValue, "firstValue");
__name2(firstValue, "firstValue");
function extractUtm(source) {
  const out = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    if (source?.[key]) out[key] = source[key];
  }
  return out;
}
__name(extractUtm, "extractUtm");
__name2(extractUtm, "extractUtm");
async function verifyTypeformSignature(received, payload, secret) {
  if (!received || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = `sha256=${bytesToBase64(new Uint8Array(signature))}`;
  return constantTimeEqual(expected, received);
}
__name(verifyTypeformSignature, "verifyTypeformSignature");
__name2(verifyTypeformSignature, "verifyTypeformSignature");
function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
__name(bytesToBase64, "bytesToBase64");
__name2(bytesToBase64, "bytesToBase64");
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
__name2(constantTimeEqual, "constantTimeEqual");
function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
__name(normalizeEmail, "normalizeEmail");
__name2(normalizeEmail, "normalizeEmail");
function cleanId2(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || "unknown";
}
__name(cleanId2, "cleanId2");
__name2(cleanId2, "cleanId");
function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
__name(finite, "finite");
__name2(finite, "finite");
function json4(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    }
  });
}
__name(json4, "json4");
__name2(json4, "json");
async function onRequestGet4({ request, env }) {
  const auth = checkAuth2(request, env);
  if (auth) return auth;
  const url = new URL(request.url);
  const client = cleanId3(url.searchParams.get("client") || "unknown");
  if (!env.DB) return json5({ ok: false, error: "no database bound" }, 500);
  const [leadResult, viewerResult, pageResult, eventResult] = await Promise.all([
    env.DB.prepare(
      `SELECT id,email,name,phone,revenue,situation,applied_at,updated_at,status,source,
              visitor_id,session_id,page_id,response_id,kit_status,answers_json,utm_json
         FROM leads WHERE client=? ORDER BY applied_at DESC`
    ).bind(client).all(),
    env.DB.prepare(
      `SELECT
         COALESCE(NULLIF(visitor_id,''),NULLIF(email,''),NULLIF(session_id,''),'anonymous-'||id) AS viewer,
         MAX(email) AS email,
         MAX(visitor_id) AS visitor_id,
         MAX(percent) AS watched_percent,
         SUM(COALESCE(watch_seconds,0)) AS watch_seconds,
         MAX(COALESCE(unique_seconds,0)) AS unique_seconds,
         MAX(COALESCE(duration_seconds,0)) AS duration_seconds,
         SUM(CASE WHEN event='play' THEN 1 ELSE 0 END) AS plays,
         SUM(CASE WHEN event='pause' THEN 1 ELSE 0 END) AS pauses,
         SUM(CASE WHEN event IN ('seeked','seeking') THEN 1 ELSE 0 END) AS seeks,
         MAX(at) AS last_watched_at
       FROM watch_events WHERE client=? GROUP BY viewer`
    ).bind(client).all(),
    env.DB.prepare(
      `SELECT
         COUNT(DISTINCT CASE WHEN event='page_view' THEN COALESCE(visitor_id,session_id) END) AS visitors,
         SUM(CASE WHEN event='page_view' THEN 1 ELSE 0 END) AS page_views,
         SUM(CASE WHEN event='cta_click' THEN 1 ELSE 0 END) AS cta_clicks,
         SUM(CASE WHEN event='form_start' THEN 1 ELSE 0 END) AS form_starts,
         SUM(CASE WHEN event='form_submit' THEN 1 ELSE 0 END) AS form_submits,
         SUM(CASE WHEN event='optin' THEN 1 ELSE 0 END) AS optins
       FROM page_events WHERE client=?`
    ).bind(client).first(),
    env.DB.prepare(
      `SELECT event, COUNT(*) AS total
         FROM watch_events WHERE client=? GROUP BY event ORDER BY total DESC`
    ).bind(client).all()
  ]);
  const leads = leadResult.results || [];
  const viewers = (viewerResult.results || []).map(normalizeViewer);
  const page = pageResult || {};
  const viewerByVisitor = /* @__PURE__ */ new Map();
  const viewerByEmail = /* @__PURE__ */ new Map();
  for (const viewer of viewers) {
    if (viewer.visitor_id) viewerByVisitor.set(viewer.visitor_id, viewer);
    if (viewer.email) viewerByEmail.set(viewer.email.toLowerCase(), viewer);
  }
  const rows = leads.map((lead) => {
    const viewer = lead.visitor_id && viewerByVisitor.get(lead.visitor_id) || lead.email && viewerByEmail.get(lead.email.toLowerCase()) || null;
    return {
      ...lead,
      watched_percent: viewer?.watched_percent ?? null,
      watch_seconds: viewer?.watch_seconds ?? 0,
      unique_seconds: viewer?.unique_seconds ?? 0,
      plays: viewer?.plays ?? 0,
      pauses: viewer?.pauses ?? 0,
      seeks: viewer?.seeks ?? 0,
      last_watched_at: viewer?.last_watched_at ?? null
    };
  });
  const watchers = viewers.filter((viewer) => viewer.plays > 0 || viewer.watch_seconds > 0);
  const visitors = Number(page.visitors || 0);
  const applications = rows.filter((lead) => lead.source === "typeform").length;
  const optins = Number(page.optins || 0);
  const capturedLeadKeys = new Set(
    rows.map((lead) => lead.visitor_id || lead.email).filter(Boolean)
  );
  const totalWatchSeconds = sum(watchers, "watch_seconds");
  const averagePercent = watchers.length ? watchers.reduce((total, viewer) => total + (viewer.watched_percent || 0), 0) / watchers.length : 0;
  return json5({
    ok: true,
    client,
    summary: {
      visitors,
      page_views: Number(page.page_views || 0),
      watchers: watchers.length,
      plays: sum(watchers, "plays"),
      play_rate: visitors ? watchers.length / visitors : 0,
      total_watch_seconds: totalWatchSeconds,
      average_watch_seconds: watchers.length ? totalWatchSeconds / watchers.length : 0,
      average_watched_percent: averagePercent,
      reached_25: reached(watchers, 25),
      reached_50: reached(watchers, 50),
      reached_75: reached(watchers, 75),
      completed: reached(watchers, 99),
      cta_clicks: Number(page.cta_clicks || 0),
      form_starts: Number(page.form_starts || 0),
      applications,
      optins,
      lead_conversion_rate: visitors ? Math.min(capturedLeadKeys.size / visitors, 1) : 0,
      kit_synced: rows.filter((lead) => lead.kit_status === "synced").length
    },
    watch_event_counts: eventResult.results || [],
    leads: rows,
    viewers
  });
}
__name(onRequestGet4, "onRequestGet4");
__name2(onRequestGet4, "onRequestGet");
async function onRequestOptions3() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "x-admin-key",
      "access-control-max-age": "86400"
    }
  });
}
__name(onRequestOptions3, "onRequestOptions3");
__name2(onRequestOptions3, "onRequestOptions");
function normalizeViewer(row) {
  return {
    ...row,
    watched_percent: Number(row.watched_percent || 0),
    watch_seconds: Number(row.watch_seconds || 0),
    unique_seconds: Number(row.unique_seconds || 0),
    duration_seconds: Number(row.duration_seconds || 0),
    plays: Number(row.plays || 0),
    pauses: Number(row.pauses || 0),
    seeks: Number(row.seeks || 0)
  };
}
__name(normalizeViewer, "normalizeViewer");
__name2(normalizeViewer, "normalizeViewer");
function reached(viewers, threshold) {
  return viewers.filter((viewer) => viewer.watched_percent >= threshold).length;
}
__name(reached, "reached");
__name2(reached, "reached");
function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0);
}
__name(sum, "sum");
__name2(sum, "sum");
function checkAuth2(request, env) {
  if (!env.ADMIN_KEY) return json5({ ok: false, error: "ADMIN_KEY not configured" }, 500);
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json5({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}
__name(checkAuth2, "checkAuth2");
__name2(checkAuth2, "checkAuth");
function cleanId3(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64) || "unknown";
}
__name(cleanId3, "cleanId3");
__name2(cleanId3, "cleanId");
function json5(object, status = 200) {
  return new Response(JSON.stringify(object), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    }
  });
}
__name(json5, "json5");
__name2(json5, "json");
var routes = [
  {
    routePath: "/api/clients",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/funnel-config",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/settings",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/settings",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/settings",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/event",
    mountPath: "/",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/event",
    mountPath: "/",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/leads",
    mountPath: "/",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/leads",
    mountPath: "/",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions3]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-dXkNc1/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-dXkNc1/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.3169404538222099.js.map
