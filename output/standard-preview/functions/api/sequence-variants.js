import { withOperator } from '../_shared/access.js';
import { hasOperator } from '../_shared/access.js';
import { checkAdmin, cleanId, json, nowIso } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

const VARIANT_COLUMNS = `id, client_id, sequence_ref, label, hook_text, status,
  completion_pct, started_at, resolved_at, created_at`;

async function handle_onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const url = new URL(request.url);
  const adminRequested = url.searchParams.get("admin") === "1";
  const hasAdminKey = hasOperator(request, env);
  let client = "";
  let authMode = "client";

  if (adminRequested || hasAdminKey) {
    const auth = checkAdmin(request, env);
    if (auth) return auth;
    client = cleanId(url.searchParams.get("client"), "");
    authMode = "admin";
  } else {
    const access = await resolveClientAccess(request, env, {
      allowHeaderToken: true,
      allowImpersonated: true,
    });
    if (access.error) return access.error;
    client = cleanId(access.client);
    authMode = access.auth_mode;
  }

  const variants = await listVariants(env, client);
  const sequences = await listSequences(env, client);
  return json({
    ok: true,
    auth_mode: authMode,
    rows: groupLineage(variants, sequences),
  });
}

async function handle_onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim().toLowerCase();
  const access = await resolveClientAccess(request, env, { allowHeaderToken: true });
  if (access.error) return access.error;
  const client = cleanId(access.client);

  if (action === "start") return startRetest(env, client, body);
  if (action === "log") return logOutcome(env, client, body);
  if (action === "resolve") return resolveRetest(env, client, body);
  return json({ ok: false, error: "unknown action" }, 422);
}

async function handle_onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

async function startRetest(env, client, body) {
  const sequenceRef = positiveInteger(body.sequence_ref);
  const newHook = normalizeHook(body.new_hook);
  if (!sequenceRef) return json({ ok: false, error: "sequence_ref is required" }, 422);
  if (!newHook) return json({ ok: false, error: "new_hook is required" }, 422);

  const sequence = await env.DB.prepare(
    `SELECT id, client_id, posted_on, type, topic, slide_count, slide_views_json
       FROM sequence_log
      WHERE id=?`,
  ).bind(sequenceRef).first();
  if (!sequence || cleanId(sequence.client_id) !== client) {
    return json({ ok: false, error: "sequence log not found" }, 404);
  }

  const diagnostic = computeDiagnostic(sequence.slide_views_json, sequence.slide_count);
  if (diagnostic.name !== "hook failed") {
    return json({ ok: false, error: "only a diagnosed hook failure can start a hook retest" }, 422);
  }

  const existing = await env.DB.prepare(
    `SELECT ${VARIANT_COLUMNS}
       FROM sequence_variants
      WHERE client_id=? AND sequence_ref=?
      ORDER BY id`,
  ).bind(client, sequenceRef).all();
  const variants = existing.results || [];
  if (variants.some((variant) => variant.status === "testing")) {
    return json({ ok: false, error: "a retest is already running for this sequence" }, 409);
  }

  const timestamp = nowIso();
  const baseline = variants.filter((variant) => variant.status === "won").at(-1) || null;
  const nextNumber = nextVariantNumber(variants);
  const statements = [];

  if (baseline) {
    statements.push(env.DB.prepare(
      `UPDATE sequence_variants
          SET status='testing', resolved_at=NULL, started_at=?
        WHERE id=? AND client_id=? AND sequence_ref=? AND status='won'`,
    ).bind(timestamp, Number(baseline.id), client, sequenceRef));
  } else {
    statements.push(env.DB.prepare(
      `INSERT INTO sequence_variants (
         client_id, sequence_ref, label, hook_text, status, completion_pct,
         started_at, resolved_at, created_at
       ) VALUES (?, ?, 'v1', ?, 'testing', ?, ?, NULL, ?)`,
    ).bind(
      client,
      sequenceRef,
      normalizeHook(sequence.topic) || "Original hook",
      diagnostic.completionPct,
      timestamp,
      timestamp,
    ));
  }

  statements.push(env.DB.prepare(
    `INSERT INTO sequence_variants (
       client_id, sequence_ref, label, hook_text, status, completion_pct,
       started_at, resolved_at, created_at
     ) VALUES (?, ?, ?, ?, 'testing', NULL, ?, NULL, ?)`,
  ).bind(client, sequenceRef, `v${nextNumber}`, newHook, timestamp, timestamp));

  const results = await env.DB.batch(statements);
  const createdId = Number(results.at(-1)?.meta?.last_row_id || 0);
  return json({
    ok: true,
    sequence_ref: sequenceRef,
    leaking_slide: diagnostic.biggestDropSlide,
    leak_loss_pct: diagnostic.biggestDropPct,
    original_hook: baseline?.hook_text || normalizeHook(sequence.topic) || "Original hook",
    variant: {
      id: createdId,
      label: `v${nextNumber}`,
      hook_text: newHook,
      status: "testing",
      completion_pct: null,
    },
  });
}

async function logOutcome(env, client, body) {
  const variantId = positiveInteger(body.variant_id);
  const completionPct = validCompletion(body.completion_pct);
  if (!variantId) return json({ ok: false, error: "variant_id is required" }, 422);
  if (completionPct == null) {
    return json({ ok: false, error: "completion_pct must be between 0 and 100" }, 422);
  }

  const variant = await env.DB.prepare(
    `SELECT ${VARIANT_COLUMNS}
       FROM sequence_variants
      WHERE id=?`,
  ).bind(variantId).first();
  if (!variant || cleanId(variant.client_id) !== client) {
    return json({ ok: false, error: "variant not found" }, 404);
  }
  if (variant.status !== "testing") {
    return json({ ok: false, error: "only a testing variant can receive an outcome" }, 422);
  }

  const result = await env.DB.prepare(
    `UPDATE sequence_variants
        SET completion_pct=?
      WHERE id=? AND client_id=? AND status='testing'`,
  ).bind(completionPct, variantId, client).run();
  if (Number(result.meta?.changes || 0) !== 1) {
    return json({ ok: false, error: "the variant changed before the outcome was saved" }, 409);
  }
  return json({ ok: true, id: variantId, completion_pct: completionPct, status: "testing" });
}

async function resolveRetest(env, client, body) {
  const sequenceRef = positiveInteger(body.sequence_ref);
  if (!sequenceRef) return json({ ok: false, error: "sequence_ref is required" }, 422);

  const sequence = await env.DB.prepare(
    "SELECT id, client_id FROM sequence_log WHERE id=?",
  ).bind(sequenceRef).first();
  if (!sequence || cleanId(sequence.client_id) !== client) {
    return json({ ok: false, error: "sequence log not found" }, 404);
  }

  const result = await env.DB.prepare(
    `SELECT ${VARIANT_COLUMNS}
       FROM sequence_variants
      WHERE client_id=? AND sequence_ref=? AND status='testing'
      ORDER BY id`,
  ).bind(client, sequenceRef).all();
  const testing = result.results || [];
  if (testing.length !== 2) {
    return json({ ok: false, error: "a retest needs exactly two testing variants" }, 422);
  }
  if (testing.some((variant) => validCompletion(variant.completion_pct) == null)) {
    return json({ ok: false, error: "log both completion results before resolving" }, 422);
  }

  const [first, second] = testing;
  const firstCompletion = Number(first.completion_pct);
  const secondCompletion = Number(second.completion_pct);
  if (firstCompletion === secondCompletion) {
    return json({ ok: false, error: "the variants are tied; collect another result before resolving" }, 422);
  }
  const winner = firstCompletion > secondCompletion ? first : second;
  const loser = winner.id === first.id ? second : first;
  const timestamp = nowIso();
  const update = await env.DB.prepare(
    `UPDATE sequence_variants
        SET status=CASE WHEN id=? THEN 'won' ELSE 'lost' END,
            resolved_at=?
      WHERE client_id=? AND sequence_ref=? AND status='testing' AND id IN (?, ?)`,
  ).bind(
    Number(winner.id),
    timestamp,
    client,
    sequenceRef,
    Number(winner.id),
    Number(loser.id),
  ).run();
  if (Number(update.meta?.changes || 0) !== 2) {
    return json({ ok: false, error: "the retest changed before it could be resolved" }, 409);
  }

  return json({
    ok: true,
    sequence_ref: sequenceRef,
    winner: serializeVariant({ ...winner, status: "won", resolved_at: timestamp }),
    loser: serializeVariant({ ...loser, status: "lost", resolved_at: timestamp }),
  });
}

async function listVariants(env, client) {
  const query = client
    ? `SELECT ${VARIANT_COLUMNS} FROM sequence_variants WHERE client_id=? ORDER BY sequence_ref DESC, id`
    : `SELECT ${VARIANT_COLUMNS} FROM sequence_variants ORDER BY client_id, sequence_ref DESC, id`;
  const statement = env.DB.prepare(query);
  const result = client ? await statement.bind(client).all() : await statement.all();
  return result.results || [];
}

async function listSequences(env, client) {
  const columns = "id, client_id, posted_on, type, topic, slide_count, slide_views_json";
  const query = client
    ? `SELECT ${columns} FROM sequence_log WHERE client_id=? ORDER BY id DESC`
    : `SELECT ${columns} FROM sequence_log ORDER BY client_id, id DESC`;
  const statement = env.DB.prepare(query);
  const result = client ? await statement.bind(client).all() : await statement.all();
  return result.results || [];
}

function groupLineage(variants, sequences) {
  const sequenceByKey = new Map(sequences.map((sequence) => [lineageKey(sequence.client_id, sequence.id), sequence]));
  const groups = new Map();
  for (const variant of variants) {
    const key = lineageKey(variant.client_id, variant.sequence_ref);
    if (!groups.has(key)) {
      const sequence = sequenceByKey.get(key) || {};
      const diagnostic = computeDiagnostic(sequence.slide_views_json, sequence.slide_count);
      groups.set(key, {
        client_id: variant.client_id,
        sequence_ref: Number(variant.sequence_ref || 0),
        sequence: {
          posted_on: sequence.posted_on || "",
          type: sequence.type || "",
          topic: sequence.topic || "",
        },
        leaking_slide: diagnostic.biggestDropSlide,
        leak_loss_pct: diagnostic.biggestDropPct,
        active: false,
        resolved: false,
        winner: null,
        variants: [],
      });
    }
    const group = groups.get(key);
    const serialized = serializeVariant(variant);
    group.variants.push(serialized);
    if (serialized.status === "testing") group.active = true;
    if (serialized.status === "won") group.winner = serialized;
  }
  for (const group of groups.values()) group.resolved = Boolean(group.winner) && !group.active;
  return Array.from(groups.values()).sort((a, b) => b.sequence_ref - a.sequence_ref);
}

function computeDiagnostic(slideViewsJson, slideCount) {
  const views = parseSlideViews(slideViewsJson, slideCount);
  const first = Number(views[0] || 0);
  const last = Number(views.at(-1) || 0);
  const completionPct = first > 0 ? round1((last / first) * 100) : null;
  let biggestDrop = 0;
  let biggestDropSlide = null;
  let biggestDropPct = null;
  for (let index = 1; index < views.length; index += 1) {
    const prior = Number(views[index - 1] || 0);
    const current = Number(views[index] || 0);
    const drop = prior - current;
    if (drop > biggestDrop) {
      biggestDrop = drop;
      biggestDropSlide = index + 1;
      biggestDropPct = prior > 0 ? round1((drop / prior) * 100) : null;
    }
  }
  const name = completionPct != null && completionPct >= 70
    ? "healthy"
    : (biggestDropSlide === 2
      ? "hook failed"
      : (biggestDropSlide != null && biggestDropSlide >= 6 && biggestDropSlide <= 8
        ? "body failed before the ask"
        : "monitor"));
  return { name, completionPct, biggestDropSlide, biggestDropPct };
}

function parseSlideViews(value, slideCount) {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(Number)
      .filter((item) => Number.isFinite(item) && item >= 0)
      .slice(0, Math.max(0, Number(slideCount || parsed.length)));
  } catch {
    return [];
  }
}

function serializeVariant(variant) {
  return {
    id: Number(variant.id || 0),
    client_id: variant.client_id,
    sequence_ref: Number(variant.sequence_ref || 0),
    label: variant.label || "",
    hook_text: variant.hook_text || "",
    status: variant.status || "testing",
    completion_pct: variant.completion_pct == null ? null : Number(variant.completion_pct),
    started_at: variant.started_at || "",
    resolved_at: variant.resolved_at || "",
    created_at: variant.created_at || "",
  };
}

function nextVariantNumber(variants) {
  const numbers = variants.map((variant) => Number(String(variant.label || "").match(/^v(\d+)$/i)?.[1] || 0));
  return Math.max(1, ...numbers) + 1;
}

function normalizeHook(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 1000);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function validCompletion(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? round1(number) : null;
}

function lineageKey(client, sequenceRef) {
  return `${cleanId(client)}:${Number(sequenceRef || 0)}`;
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

export const onRequestGet = withOperator(handle_onRequestGet);
export const onRequestPost = withOperator(handle_onRequestPost);
export const onRequestOptions = withOperator(handle_onRequestOptions);
