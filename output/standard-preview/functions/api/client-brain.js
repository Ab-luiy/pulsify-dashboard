import { checkAdmin, cleanId, json, nowIso, str } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

const SECTIONS = ["identity", "offer", "icp", "story", "voice", "proof", "funnel", "donot"];
const SOURCES = new Set(["client-form", "voice-note", "transcript", "operator", "research"]);
const PROOF_KINDS = new Set(["image", "image-link", "video-link", "screenshot-link"]);
const PERMISSIONS = new Set(["unknown", "granted", "denied"]);

export const FIELD_DEFINITIONS = {
  identity: [
    field("name", "Name", "text"),
    field("handles", "Handles", "list"),
    field("business_explainer", "Exactly what they do and how it makes money", "textarea"),
    field("positioning", "One-line positioning", "textarea", true),
    field("mechanism_name", "Category-of-one mechanism name", "text", true),
  ],
  offer: [
    field("voice_note_url", "Offer voice note", "url"),
    field("direction", "What they want to do", "textarea"),
    field("offer_stack", "Offer stack", "textarea", true),
    field("delivery_model", "Delivery model", "text", true),
    field("unique_mechanism", "Unique mechanism", "textarea", true),
    field("guarantees", "Guarantees", "textarea", true),
    field("payment_plans", "Payment plans and rails", "textarea", true),
    field("upsell_path", "Upsell path", "textarea", true),
  ],
  icp: [
    field("client_guess", "Client's starting-point ICP guess", "textarea"),
    field("avatar", "Researched audience and avatar", "textarea", true),
    field("daily_frustrations", "Daily frustrations", "textarea", true),
    field("secret_desires", "Secret desires", "textarea", true),
    field("language", "Language they use", "textarea", true),
    field("objections", "Objections", "textarea", true),
    field("false_beliefs", "False beliefs", "textarea", true),
    field("emotional_triggers", "Emotional triggers", "textarea", true),
    field("pain_scenarios", "Pain scenarios", "textarea", true),
    field("financial_qualification", "Financial qualification", "textarea", true),
  ],
  story: [
    field("input_type", "Story source selected", "text"),
    field("voice_note_url", "Story voice note", "url"),
    field("transcript", "Podcast, interview, or meetup transcript", "textarea"),
    field("narrative", "Career journey", "textarea"),
    field("origin_story", "Origin story", "textarea", true),
    field("beliefs", "Key beliefs and contrarian takes", "textarea", true),
    field("human_details", "Recurring human details", "textarea", true),
    field("wins_losses", "Wins and losses worth telling", "textarea", true),
  ],
  voice: [
    field("tone", "Tone", "list"),
    field("curse_slang", "Cursing and slang", "text"),
    field("positioning_attitude", "Positioning attitude", "textarea"),
    field("sample_links", "Voice sample links", "list"),
    field("sentence_habits", "Sentence habits", "textarea", true),
    field("banned_words", "Banned words and phrases", "list", true),
  ],
  proof: [
    field("has_proof", "Has student proof or case studies", "boolean"),
    field("items", "Proof links and the claims they support", "proof-list"),
  ],
  funnel: [
    field("trigger_words", "Trigger words", "list", true),
    field("link_in_bio", "Link-in-bio destination", "url", true),
    field("lead_magnets", "Lead magnets", "list", true),
    field("email_platform_tags", "Email platform and tags", "textarea", true),
    field("booking_link", "Booking link", "url", true),
    field("dm_routing", "DM routing", "textarea", true),
    field("platforms_audience", "Platforms and audience sizes", "textarea", true),
    field("posting_cadence", "Posting cadence targets", "textarea", true),
    field("current_funnel_links", "Current funnel links", "list", true),
  ],
  donot: [
    field("claims", "Claims they cannot make", "textarea", true),
    field("topics", "Topics to avoid", "textarea", true),
    field("competitors", "Competitors not to name", "list", true),
    field("private_numbers", "Private numbers", "textarea", true),
    field("compliance", "Legal and compliance guardrails", "textarea", true),
  ],
};

const CLIENT_FIELDS = new Map([
  ["identity.name", "client-form"],
  ["identity.handles", "client-form"],
  ["identity.business_explainer", "client-form"],
  ["offer.voice_note_url", "voice-note"],
  ["offer.direction", "client-form"],
  ["icp.client_guess", "client-form"],
  ["story.input_type", "client-form"],
  ["story.voice_note_url", "voice-note"],
  ["story.transcript", "transcript"],
  ["story.narrative", "client-form"],
  ["voice.tone", "client-form"],
  ["voice.curse_slang", "client-form"],
  ["voice.positioning_attitude", "client-form"],
  ["voice.sample_links", "client-form"],
  ["proof.has_proof", "client-form"],
  ["proof.items", "client-form"],
]);

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  let client;
  if (request.headers.get("x-admin-key") != null) {
    const auth = checkAdmin(request, env);
    if (auth) return auth;
    client = cleanId(new URL(request.url).searchParams.get("client"));
  } else {
    const access = await resolveClientAccess(request, env, {
      allowHeaderToken: true,
      allowQueryToken: false,
    });
    if (access.error) return access.error;
    client = cleanId(access.client);
  }
  if (!client) return json({ ok: false, error: "valid client id required" }, 422);

  const [brainResult, proofResult, config] = await Promise.all([
    env.DB.prepare(
      `SELECT id, client_id, section, field, value_json, source, updated_at
         FROM client_brain
        WHERE client_id=?
        ORDER BY section, field`,
    ).bind(client).all(),
    env.DB.prepare(
      `SELECT id, client_id, kind, url, claim, permission, created_at
         FROM proof_items
        WHERE client_id=?
        ORDER BY created_at DESC, id DESC`,
    ).bind(client).all(),
    env.DB.prepare(
      "SELECT COALESCE(client_name, client) AS client_name FROM client_config WHERE client=?",
    ).bind(client).first(),
  ]);

  const grouped = groupBrainRows(brainResult.results || []);
  return json({
    ok: true,
    client,
    client_name: config?.client_name || client,
    sections: grouped.sections,
    summary: grouped.summary,
    proof_items: (proofResult.results || []).map(normalizeProofRow),
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  if (request.headers.get("x-admin-key") != null) {
    const auth = checkAdmin(request, env);
    if (auth) return auth;
    return saveOperatorField(request, env);
  }

  const access = await resolveClientAccess(request, env, {
    allowHeaderToken: true,
    allowQueryToken: false,
  });
  if (access.error) return access.error;
  const body = await request.json().catch(() => ({}));
  if (body.action === "update-proof") return updateClientProof(body, env, access.client);
  return saveClientSubmission(body, env, access.client);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-key, x-portal-token",
      "access-control-max-age": "86400",
    },
  });
}

async function saveClientSubmission(body, env, client) {
  if (body.client && cleanId(body.client) !== client) {
    return json({ ok: false, error: "unauthorized" }, 403);
  }

  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const writes = [];
  const accepted = [];
  const now = nowIso();

  for (const section of Object.keys(answers)) {
    if (!SECTIONS.includes(section) || typeof answers[section] !== "object") continue;
    for (const [key, value] of Object.entries(answers[section])) {
      const source = CLIENT_FIELDS.get(`${section}.${key}`);
      if (!source) continue;
      const normalized = section === "proof" && key === "items"
        ? normalizeProofItems(value, true)
        : normalizeValue(value);
      if (isGap(normalized)) {
        writes.push(
          env.DB.prepare("DELETE FROM client_brain WHERE client_id=? AND section=? AND field=?").bind(client, section, key),
        );
        accepted.push({ section, field: key, source, cleared: true });
      } else {
        writes.push(upsertBrain(env, client, section, key, normalized, source, now));
        accepted.push({ section, field: key, source });
      }
    }
  }

  const proofItemsProvided = Object.prototype.hasOwnProperty.call(body, "proof_items");
  const proofItems = proofItemsProvided ? normalizeProofItems(body.proof_items, true) : [];
  if (proofItemsProvided) {
    writes.push(env.DB.prepare("DELETE FROM proof_items WHERE client_id=?").bind(client));
    for (const item of proofItems) {
      writes.push(
        env.DB.prepare(
          `INSERT INTO proof_items (client_id, kind, url, claim, permission, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(client, item.kind, item.url, item.claim, item.permission, now),
      );
    }
  }

  if (!writes.length) return json({ ok: false, error: "no accepted answers" }, 422);
  await env.DB.batch(writes);

  return json({
    ok: true,
    client,
    saved_fields: accepted,
    proof_items_saved: proofItems.length,
    updated_at: now,
  });
}

async function updateClientProof(body, env, client) {
  if (body.client && cleanId(body.client) !== client) {
    return json({ ok: false, error: "unauthorized" }, 403);
  }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id < 1) {
    return json({ ok: false, error: "valid proof id required" }, 422);
  }

  const claim = str(body.claim).slice(0, 500);
  const result = await env.DB.prepare(
    "UPDATE proof_items SET claim=? WHERE id=? AND client_id=?",
  ).bind(claim || null, id, client).run();
  if (!Number(result?.meta?.changes || 0)) {
    return json({ ok: false, error: "proof item not found" }, 404);
  }

  return json({ ok: true, client, proof_item: { id, claim } });
}

async function saveOperatorField(request, env) {
  const body = await request.json().catch(() => ({}));
  const client = cleanId(body.client);
  const section = str(body.section);
  const key = str(body.field);
  const source = SOURCES.has(body.source) && ["operator", "research"].includes(body.source)
    ? body.source
    : "operator";

  if (!client) return json({ ok: false, error: "valid client id required" }, 422);
  if (!SECTIONS.includes(section) || !key || !knownField(section, key)) {
    return json({ ok: false, error: "known section and field required" }, 422);
  }

  if (body.clear === true || isGap(body.value)) {
    const statements = [env.DB.prepare(
      "DELETE FROM client_brain WHERE client_id=? AND section=? AND field=?",
    ).bind(client, section, key)];
    if (section === "proof" && key === "items") {
      statements.push(env.DB.prepare("DELETE FROM proof_items WHERE client_id=?").bind(client));
    }
    await env.DB.batch(statements);
    return json({ ok: true, client, section, field: key, cleared: true });
  }

  const now = nowIso();
  const normalized = normalizeValue(body.value);
  if (section === "proof" && key === "items") {
    const proofItems = normalizeProofItems(normalized);
    const statements = [
      upsertBrain(env, client, section, key, proofItems, source, now),
      env.DB.prepare("DELETE FROM proof_items WHERE client_id=?").bind(client),
      ...proofItems.map((item) => env.DB.prepare(
        `INSERT INTO proof_items (client_id, kind, url, claim, permission, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(client, item.kind, item.url, item.claim, item.permission, now)),
    ];
    await env.DB.batch(statements);
  } else {
    await upsertBrain(env, client, section, key, normalized, source, now).run();
  }
  return json({ ok: true, client, section, field: key, source, updated_at: now });
}

export function groupBrainRows(rows) {
  const rowMap = new Map();
  for (const row of rows || []) rowMap.set(`${row.section}.${row.field}`, row);

  let total = 0;
  let filled = 0;
  let latest = null;
  const sections = SECTIONS.map((section) => {
    const fields = FIELD_DEFINITIONS[section].map((definition) => {
      total += 1;
      const row = rowMap.get(`${section}.${definition.key}`);
      const value = row ? parseValue(row.value_json) : null;
      const gap = isGap(value);
      if (!gap) filled += 1;
      if (row?.updated_at && (!latest || row.updated_at > latest)) latest = row.updated_at;
      return {
        ...definition,
        value,
        source: row?.source || null,
        updated_at: row?.updated_at || null,
        gap,
      };
    });

    for (const row of rows || []) {
      if (row.section !== section || knownField(section, row.field)) continue;
      total += 1;
      const value = parseValue(row.value_json);
      const gap = isGap(value);
      if (!gap) filled += 1;
      if (row.updated_at && (!latest || row.updated_at > latest)) latest = row.updated_at;
      fields.push({
        key: row.field,
        label: labelFromKey(row.field),
        type: "textarea",
        operator_only: true,
        value,
        source: row.source || null,
        updated_at: row.updated_at || null,
        gap,
      });
    }

    return {
      key: section,
      label: sectionLabel(section),
      operator_only: section === "funnel",
      fields,
      gaps: fields.filter((entry) => entry.gap).length,
    };
  });

  return { sections, summary: { total_fields: total, filled_fields: filled, gaps: total - filled, updated_at: latest } };
}

function field(key, label, type, operatorOnly = false) {
  return { key, label, type, operator_only: operatorOnly };
}

function knownField(section, key) {
  return Boolean(FIELD_DEFINITIONS[section]?.some((entry) => entry.key === key));
}

function upsertBrain(env, client, section, key, value, source, updatedAt) {
  return env.DB.prepare(
    `INSERT INTO client_brain (client_id, section, field, value_json, source, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id, section, field) DO UPDATE SET
       value_json=excluded.value_json,
       source=excluded.source,
       updated_at=excluded.updated_at`,
  ).bind(client, section, key, JSON.stringify(value), source, updatedAt);
}

function normalizeProofItems(value, forceUnknownPermission = false) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((item) => ({
    kind: PROOF_KINDS.has(item?.kind) ? item.kind : "screenshot-link",
    url: str(item?.url),
    claim: str(item?.claim) || null,
    permission: forceUnknownPermission
      ? "unknown"
      : (PERMISSIONS.has(item?.permission) ? item.permission : "unknown"),
  })).filter((item) => item.url);
}

function normalizeProofRow(row) {
  return {
    ...row,
    claim: row.claim || "",
    permission: PERMISSIONS.has(row.permission) ? row.permission : "unknown",
  };
}

function normalizeValue(value) {
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => {
    if (item && typeof item === "object") return Object.fromEntries(
      Object.entries(item).map(([key, entry]) => [key, typeof entry === "string" ? entry.trim() : entry]),
    );
    return typeof item === "string" ? item.trim() : item;
  });
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, typeof entry === "string" ? entry.trim() : entry]),
  );
  return typeof value === "string" ? value.trim() : value;
}

function parseValue(value) {
  try { return JSON.parse(value); } catch { return value; }
}

function isGap(value) {
  if (value == null) return true;
  if (typeof value === "string") return !value.trim();
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function sectionLabel(section) {
  return ({ identity: "Identity", offer: "Offer", icp: "ICP", story: "Story", voice: "Voice", proof: "Proof vault", funnel: "Funnel facts", donot: "Do-not list" })[section] || labelFromKey(section);
}

function labelFromKey(key) {
  return String(key || "").replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}
