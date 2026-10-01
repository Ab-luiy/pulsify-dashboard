// The client's pages (InfoOS build, the Pages item and its builder):
//   GET  /api/pages?range=7d|30d|90d|all[&client=]
//        -> {pages:[{page_id, url, visits, visitors, completions, rate, last_at}], flow:[{from,to,people}],
//            page:{variant, active, url, preview_url, content, defaults, tokens, wistia_media_id, typeform_url, proof_images}}
//   POST /api/pages {client?, page_content?, wistia_media_id?, typeform_url?, proof_images?, page_active?}
// The builder edits the words, video, form and proof inside the locked template
// (wiki/playbooks/landing-page-fill-in-playbook.md): content only, never the design.
// Reads: client, preview or operator (?client=). Writes: client or operator, never a preview.

import { cleanId, json, parseJson, str } from "../_shared/common.js";
import { withOperator } from "../_shared/access.js";
import { resolveReportClient, resolveReportWriter } from "../_shared/client-read.js";
import { DEFAULT_CONTENT } from "../_shared/page-render.js";

const DAY = 86400000;
const RANGES = { "7d": 7, "30d": 30, "90d": 90 };
// Tokens a client edits. Page title, description and the operator's own note stay out.
export const EDITABLE = Object.keys(DEFAULT_CONTENT).filter((key) => !["CLOSING_NOTE"].includes(key));
const MAX_TEXT = 600;

async function handleGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const access = await resolveReportClient(request, env);
  if (access.error) return access.error;
  const url = new URL(request.url);
  const range = RANGES[url.searchParams.get("range")] ? url.searchParams.get("range") : url.searchParams.get("range") === "all" ? "all" : "30d";
  const from = RANGES[range] ? new Date(Date.now() - RANGES[range] * DAY).toISOString() : "0000";
  const client = access.client;
  const [cfg, pageRows, submits, bookings] = await Promise.all([
    env.DB.prepare(
      `SELECT template_variant, page_content_json, COALESCE(page_active,1) AS page_active, wistia_media_id, typeform_url, proof_images_json
         FROM client_config WHERE client=?`,
    ).bind(client).first(),
    env.DB.prepare(
      `SELECT COALESCE(page_id,'main') AS page_id, SUM(event='page_view') AS visits,
              COUNT(DISTINCT CASE WHEN event='page_view' THEN visitor_id END) AS visitors,
              COUNT(DISTINCT CASE WHEN event IN ('form_submit','optin') THEN COALESCE(email, visitor_id) END) AS completions,
              COUNT(DISTINCT CASE WHEN event='form_start' THEN visitor_id END) AS started,
              MAX(at) AS last_at
         FROM page_events WHERE client=? AND at >= ? GROUP BY COALESCE(page_id,'main') ORDER BY visits DESC`,
    ).bind(client, from).all(),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT lower(contact_email)) AS n FROM pipeline_touches WHERE client_id=? AND kind IN ('application','optin') AND ts >= ?`,
    ).bind(client, from).first(),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT lower(contact_email)) AS n FROM pipeline_touches
        WHERE client_id=? AND kind='booking' AND external_id NOT LIKE '%#canceled' AND COALESCE(json_extract(payload_json,'$.booked_at'), ts) >= ?`,
    ).bind(client, from).first(),
  ]);
  const origin = url.origin;
  const variant = cfg?.template_variant === "variant-02" ? "variant-02" : "canonical";
  const pages = (pageRows.results || []).map((r) => {
    const visitors = Number(r.visitors || 0);
    const completions = Number(r.completions || 0);
    return {
      page_id: r.page_id,
      url: `${origin}/${client}`,
      visits: Number(r.visits || 0),
      visitors,
      started: Number(r.started || 0),
      completions,
      rate: visitors ? completions / visitors : null,
      last_at: r.last_at,
    };
  });
  if (!pages.length) pages.push({ page_id: "main", url: `${origin}/${client}`, visits: 0, visitors: 0, started: 0, completions: 0, rate: null, last_at: null });
  const visitors = pages.reduce((n, p) => n + p.visitors, 0);
  const started = pages.reduce((n, p) => n + p.started, 0);
  const flow = [
    { key: "visit", label: "Visited the page", people: visitors },
    ...(started ? [{ key: "start", label: "Started the application", people: started }] : []),
    { key: "submit", label: "Applied or opted in", people: Number(submits?.n || 0) },
    { key: "booked", label: "Booked a call", people: Number(bookings?.n || 0) },
  ];
  const content = parseJson(cfg?.page_content_json, {});
  return json({
    ok: true,
    client,
    range,
    pages,
    flow,
    page: {
      variant,
      active: cfg ? cfg.page_active !== 0 : false,
      url: `${origin}/${client}`,
      preview_url: `/?client=${encodeURIComponent(client)}&preview=${variant}&tokens=1&draft=1`,
      content: Object.fromEntries(Object.entries(content).filter(([key]) => EDITABLE.includes(key))),
      defaults: Object.fromEntries(EDITABLE.map((key) => [key, DEFAULT_CONTENT[key]])),
      tokens: EDITABLE,
      wistia_media_id: cfg?.wistia_media_id || null,
      typeform_url: cfg?.typeform_url || null,
      proof_images: parseJson(cfg?.proof_images_json, {}),
    },
  });
}

async function handlePost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);
  const raw = await request.text();
  if (raw.length > 64000) return json({ ok: false, error: "That's too much text for one page." }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const access = await resolveReportWriter(request, env, body?.client);
  if (access.error) return access.error;
  const cfg = await env.DB.prepare(
    "SELECT page_content_json, wistia_media_id, typeform_url, proof_images_json, COALESCE(page_active,1) AS page_active FROM client_config WHERE client=?",
  ).bind(access.client).first();
  if (!cfg) return json({ ok: false, error: "This workspace has no page yet." }, 404);

  const content = parseJson(cfg.page_content_json, {});
  if (body.page_content && typeof body.page_content === "object") {
    for (const [key, value] of Object.entries(body.page_content)) {
      if (!EDITABLE.includes(key)) continue;
      const text = str(value).slice(0, MAX_TEXT);
      if (text) content[key] = text;
      else delete content[key];
    }
  }
  let media = cfg.wistia_media_id;
  if ("wistia_media_id" in body) {
    const id = str(body.wistia_media_id);
    if (id && !/^[a-z0-9]{6,20}$/i.test(id)) return json({ ok: false, error: "That doesn't look like a Wistia video id." }, 422);
    media = id || null;
  }
  let form = cfg.typeform_url;
  if ("typeform_url" in body) {
    const value = str(body.typeform_url);
    if (value) {
      try {
        const url = new URL(value);
        if (url.protocol !== "https:" || !/(^|\.)typeform\.com$/.test(url.hostname)) throw new Error("bad");
      } catch {
        return json({ ok: false, error: "Paste the full Typeform link (https://....typeform.com/to/...)." }, 422);
      }
    }
    form = value || null;
  }
  let proof = cfg.proof_images_json;
  if (body.proof_images && typeof body.proof_images === "object") {
    const images = {};
    for (const [key, value] of Object.entries(body.proof_images).slice(0, 12)) {
      const link = str(value);
      if (!link) continue;
      try {
        const url = new URL(link);
        if (!/^https?:$/.test(url.protocol)) continue;
        images[cleanId(key, "image") || "image"] = url.toString();
      } catch { /* skip bad links */ }
    }
    proof = JSON.stringify(images);
  }
  const active = "page_active" in body ? (body.page_active ? 1 : 0) : cfg.page_active;
  await env.DB.prepare(
    `UPDATE client_config SET page_content_json=?, wistia_media_id=?, typeform_url=?, proof_images_json=?, page_active=?, updated_at=? WHERE client=?`,
  ).bind(JSON.stringify(content), media, form, proof, active, new Date().toISOString(), access.client).run();
  return json({ ok: true, content, active: active !== 0 });
}

export const onRequestGet = withOperator(handleGet);
export const onRequestPost = withOperator(handlePost);
