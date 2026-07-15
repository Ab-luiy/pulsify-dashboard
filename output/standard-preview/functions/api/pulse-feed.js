import { cleanId, json, str } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

const SOURCE_LIMIT = 12;
const FEED_LIMIT = 50;
const LOOKBACK_DAYS = 30;

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: true,
    allowQueryToken: false,
  });
  if (access.error) return access.error;

  const client = cleanId(access.client);
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const cutoffDate = cutoff.slice(0, 10);
  const queries = [
    env.DB.prepare(
      `SELECT amount_cents, currency, rail, note, occurred_at AS ts
         FROM payments
        WHERE client=? AND occurred_at>=?
        ORDER BY occurred_at DESC, id DESC
        LIMIT ?`,
    ).bind(client, cutoff, SOURCE_LIMIT),
    env.DB.prepare(
      `SELECT event, path, page_id, at AS ts
         FROM page_events
        WHERE client=? AND at>=?
        ORDER BY at DESC, id DESC
        LIMIT ?`,
    ).bind(client, cutoff, SOURCE_LIMIT),
    env.DB.prepare(
      `SELECT event, percent, media_id, page_id, at AS ts
         FROM watch_events
        WHERE client=? AND at>=?
          AND (percent>=25 OR event IN ('play','complete','exit'))
        ORDER BY at DESC, id DESC
        LIMIT ?`,
    ).bind(client, cutoff, SOURCE_LIMIT),
    env.DB.prepare(
      `SELECT type, topic, status, updated_at AS ts
         FROM studio_sequences
        WHERE client_id=? AND updated_at>=?
        ORDER BY updated_at DESC, id DESC
        LIMIT ?`,
    ).bind(client, cutoff, SOURCE_LIMIT),
    env.DB.prepare(
      `SELECT type, topic, posted_on AS ts
         FROM sequence_log
        WHERE client_id=? AND posted_on>=?
        ORDER BY posted_on DESC, id DESC
        LIMIT ?`,
    ).bind(client, cutoffDate, SOURCE_LIMIT),
    env.DB.prepare(
      `SELECT kind, claim, created_at AS ts
         FROM proof_items
        WHERE client_id=? AND created_at>=?
        ORDER BY created_at DESC, id DESC
        LIMIT ?`,
    ).bind(client, cutoff, SOURCE_LIMIT),
    env.DB.prepare(
      `SELECT provider, kind, payload_summary_json, ts
         FROM integration_events
        WHERE client=? AND ts>=?
        ORDER BY ts DESC, id DESC
        LIMIT ?`,
    ).bind(client, cutoff, SOURCE_LIMIT),
    env.DB.prepare(
      `SELECT title, platform, updated_at AS ts
         FROM content_items
        WHERE client=? AND stage='published' AND updated_at>=?
        ORDER BY updated_at DESC, id DESC
        LIMIT ?`,
    ).bind(client, cutoff, SOURCE_LIMIT),
  ];

  const results = await Promise.all(queries.map(readRows));
  const items = [
    ...results[0].map(paymentItem),
    ...results[1].map(pageItem),
    ...results[2].map(watchItem),
    ...results[3].map(studioItem),
    ...results[4].map(sequenceItem),
    ...results[5].map(proofItem),
    ...results[6].map(integrationItem),
    ...results[7].map(contentItem),
  ]
    .filter((item) => item.ts)
    .sort((left, right) => timestamp(right.ts) - timestamp(left.ts))
    .slice(0, FEED_LIMIT);

  return json({ ok: true, client, lookback_days: LOOKBACK_DAYS, items });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

async function readRows(statement) {
  try {
    const result = await statement.all();
    return result.results || [];
  } catch {
    return [];
  }
}

function paymentItem(row) {
  const amount = `${String(row.currency || "USD").toUpperCase()} ${(Number(row.amount_cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return item("payment", "Payment landed", [amount, row.rail, row.note].filter(Boolean).join(" | "), row.ts);
}

function pageItem(row) {
  const event = str(row.event).replace(/_/g, " ") || "page view";
  return item("page", `Funnel ${event}`, str(row.path || row.page_id) || "A funnel page received activity.", row.ts);
}

function watchItem(row) {
  const percent = Number(row.percent);
  const reached = Number.isFinite(percent) && percent > 0 ? `${Math.round(percent)}% reached` : str(row.event).replace(/_/g, " ");
  return item("watch", "Funnel video watched", [reached, row.media_id || row.page_id].filter(Boolean).join(" | "), row.ts);
}

function studioItem(row) {
  const titles = {
    draft: "Sequence draft created",
    review: "Sequence sent for review",
    approved: "Sequence approved",
    rejected: "Sequence returned for edits",
  };
  return item("studio", titles[str(row.status)] || "Sequence updated", [row.type, row.topic].filter(Boolean).join(" | "), row.ts);
}

function sequenceItem(row) {
  return item("sequence", "Sequence logged", [row.type, row.topic].filter(Boolean).join(" | "), row.ts);
}

function proofItem(row) {
  return item("proof", "Proof added", str(row.claim) || proofKind(row.kind), row.ts);
}

function integrationItem(row) {
  const payload = parseObject(row.payload_summary_json);
  const isBooking = /book|appoint|call|calendar/i.test(`${row.kind || ""} ${row.provider || ""}`);
  const title = isBooking ? "Booking recorded" : `${label(row.provider || "Integration")} activity`;
  const detail = str(payload.summary || payload.title || payload.name || payload.email)
    || label(row.kind || "event");
  return item("integration", title, detail, row.ts);
}

function contentItem(row) {
  return item("content", "Content shipped", [row.platform, row.title].filter(Boolean).join(" | "), row.ts);
}

function item(kind, title, detail, ts) {
  return { kind, title, detail: detail || "", ts: str(ts) };
}

function proofKind(value) {
  return str(value).includes("video") ? "Video testimonial" : "Student result";
}

function label(value) {
  return str(value).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseObject(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function timestamp(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
