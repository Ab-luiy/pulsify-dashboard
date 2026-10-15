import { withOperator } from '../_shared/access.js';
import { hasOperator } from '../_shared/access.js';
import { checkAdmin, cleanId, json, nowIso, str } from "../_shared/common.js";
import { resolveClientAccess } from "../_shared/client-auth.js";

const SECTIONS = ["identity", "intent", "money", "offer", "icp", "story", "positioning", "voice", "content", "proof", "funnel", "program", "commitment", "donot"];
const SOURCES = new Set(["client-form", "voice-note", "transcript", "operator", "research"]);
const PROOF_KINDS = new Set(["image", "image-link", "video-link", "screenshot-link"]);
const PERMISSIONS = new Set(["unknown", "granted", "denied"]);

export const FIELD_DEFINITIONS = {
  identity: [
    field("name", "Name", "text"),
    field("handles", "Handles", "list"),
    field("niche", "Niche", "text"),
    field("business_explainer", "Exactly what they do and how it makes money", "textarea"),
    field("positioning", "One-line positioning", "textarea", true),
    field("mechanism_name", "Category-of-one mechanism name", "text", true),
    field("nickname", "What people call them", "text"),
    field("age", "Age", "text"),
    field("relationship_status", "Relationship status", "text"),
    field("niche_line", "What people learn from them, in one line", "text"),
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
    field("history", "Offer so far", "text"),
    field("current_name", "Current offer", "text"),
    field("price", "Current price", "text"),
    field("walkthrough", "What someone gets", "textarea"),
    field("result", "Result they walk away with", "textarea"),
    field("type", "Kind of offer", "text"),
    field("past_offer", "The offer they stopped", "textarea"),
    field("target_type", "What they want to sell", "text"),
    field("target_price", "Price they want", "text"),
    field("payment_platforms", "How they take payments", "list"),
    field("past_growth_help", "Who they worked with before", "json"),
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
    field("known", "Knows their buyer", "text"),
    field("best_client", "Best client ever", "textarea"),
    field("age_range", "Buyer age", "list"),
    field("gender_mix", "Buyer gender mix", "text"),
    field("life_stage", "Buyer life", "list"),
    field("daily_life", "A normal day for the buyer", "textarea"),
    field("income", "Buyer income", "text"),
    field("payment_style", "How buyers pay", "text"),
    field("engagers", "Who comments and DMs", "text"),
    field("before_state", "Stuck on before buying", "textarea"),
    field("tried_before", "Tried before", "textarea"),
    field("buying_behaviour", "How they act before buying", "list"),
    field("tipping_point", "What tips them into buying", "textarea"),
    field("client_objections", "Objections the client hears", "list"),
    field("client_language", "Buyer's own words", "textarea"),
    field("never_client", "Who they never want", "textarea"),
    field("starter_profile", "Starter buyer profile", "json"),
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
    field("start_type", "Where the story starts", "text"),
  ],
  voice: [
    field("tone", "Tone", "list"),
    field("curse_slang", "Cursing and slang", "text"),
    field("positioning_attitude", "Positioning attitude", "textarea"),
    field("sample_links", "Voice sample links", "list"),
    field("sentence_habits", "Sentence habits", "textarea", true),
    field("banned_words", "Banned words and phrases", "list", true),
    field("persona", "How they want to be seen", "text"),
    field("persona_second", "Second persona", "text"),
    field("persona_other", "Persona in their words", "text"),
    field("unhinged_level", "How unhinged on camera (1-5)", "text"),
    field("filter", "Thinks first or says it", "text"),
    field("flagged_level", "Slang or flaggable words", "text"),
    field("flagged_words", "Words fine to use and never to use", "json"),
    field("sliders", "Calm to hype, polished to raw", "json"),
    field("never_say", "Words they'd never say", "textarea"),
  ],
  proof: [
    field("has_proof", "Has student proof or case studies", "boolean"),
    field("items", "Proof links and the claims they support", "proof-list"),
    field("own_best", "Their own best result", "textarea"),
    field("own_how", "How they got it", "textarea"),
    field("own_proof", "Proof of their own result", "list"),
    field("level", "Student results", "text"),
    field("best_result", "Best student result", "json"),
    field("count", "How many results", "text"),
    field("top_results", "Top results", "json"),
    field("storage", "Where proof lives", "json"),
    field("own_enough", "Own result enough to bring people in", "json"),
    field("closest_thing", "Closest thing to a student result", "json"),
  ],
  // The client's onboarding form answers the facts they already know (where
  // traffic lands, audience sizes, cadence, email platform); routing, trigger
  // words and lead magnets stay operator work (pulsify-saas #16).
  funnel: [
    field("trigger_words", "Trigger words", "list", true),
    field("link_in_bio", "Link-in-bio destination", "url"),
    field("lead_magnets", "Lead magnets", "list", true),
    field("email_platform_tags", "Email platform and tags", "textarea"),
    field("booking_link", "Booking link", "url"),
    field("dm_routing", "DM routing", "textarea", true),
    field("platforms_audience", "Platforms and audience sizes", "textarea"),
    field("posting_cadence", "Posting cadence targets", "textarea"),
    field("current_funnel_links", "Current funnel links", "list"),
    field("stage_focus", "TOF, MOF, BOF they work on", "json"),
    field("terms_known", "Funnel words they know", "list"),
    field("tried", "Funnels tried", "json"),
    field("wanted", "Funnel they want", "json"),
    field("has_funnel", "Has a funnel", "json"),
    field("sales_method", "How people buy today", "json"),
    field("lead_sources", "Where buyers find them", "json"),
    field("path", "Their funnel, step by step", "list"),
    field("step_links", "Links for each step", "json"),
    field("tools", "Tools behind the funnel", "json"),
    field("owners", "Who handles each part", "json"),
    field("tracks_numbers", "Tracks their numbers", "json"),
    field("metrics", "Funnel numbers", "json"),
    field("leak", "Where it leaks", "json"),
    field("non_buyer_followup", "What happens to people who don't buy", "json"),
    field("ads", "Ads", "json"),
    field("ads_detail", "Ad spend and cost per booked call", "json"),
    field("ads_stopped_why", "Why they stopped ads", "textarea"),
  ],
  intent: [
    field("why_joined", "Why they said yes", "list"),
    field("decision_story", "The moment they decided", "textarea"),
    field("win_90d", "A win in 90 days", "json"),
  ],
  money: [
    field("last_3_months", "Revenue and profit, last 3 months", "json"),
    field("monthly_income", "Monthly income now", "text"),
    field("content_revenue_baseline", "Income from content now (the 30% starting line)", "json"),
  ],
  positioning: [
    field("mechanism_status", "Unique mechanism", "text"),
    field("mechanism", "Mechanism name and steps", "json"),
    field("method_walkthrough", "How they get a result, step by step", "textarea"),
    field("difference_known", "Knows what makes them different", "text"),
    field("difference", "Why them and not others", "textarea"),
    field("competitors", "Competition", "list"),
    field("competitor_gap", "What they do that others don't", "textarea"),
    field("content_shows_it", "Content shows the difference", "text"),
    field("love_topics", "What they love talking about", "textarea"),
    field("hour_topic", "What they could talk about for an hour", "textarea"),
    field("avoid_topics", "Never on camera", "textarea"),
  ],
  content: [
    field("home_platform", "More at home on", "text"),
    field("longform_awareness", "Knew long form comes first", "text"),
    field("hard_parts", "What feels hard", "list"),
    field("hard_why", "Why it's hard", "textarea"),
    field("yt_format", "YouTube format", "text"),
    field("format_why", "Why that format", "textarea"),
    field("cadence", "Posting now, per platform", "json"),
    field("process", "How they make a video", "textarea"),
    field("video_time", "Time per video", "text"),
    field("script_time", "Time scripting", "text"),
    field("daily_time", "Time a day on content", "text"),
    field("schedule", "When they make content", "text"),
    field("film_hours", "Hours a week for filming", "text"),
    field("best_post", "Best post or video", "url"),
    field("skills", "What they already know", "json"),
    field("hates", "What they hate doing", "list"),
    field("helpers", "Who helps them", "list"),
  ],
  program: [
    field("status", "Paid program", "text"),
    field("missing", "What the program is missing", "list"),
  ],
  commitment: [
    field("understood", "Understood the deal", "text"),
    field("promised", "Promised to do the work", "text"),
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
  ["identity.niche", "client-form"],
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
  ["funnel.link_in_bio", "client-form"],
  ["funnel.booking_link", "client-form"],
  ["funnel.current_funnel_links", "client-form"],
  ["funnel.platforms_audience", "client-form"],
  ["funnel.posting_cadence", "client-form"],
  ["funnel.email_platform_tags", "client-form"],
]);

// Onboarding v2 (pulsify-saas src/features/brain/model.ts mirrors this list). Everything the client
// answers in the form is theirs to write; research and operator fields stay operator-only.
const ONBOARDING_V2_FIELDS = {
  identity: ["nickname", "age", "relationship_status", "niche_line"],
  intent: ["why_joined", "decision_story", "win_90d"],
  money: ["last_3_months", "monthly_income", "content_revenue_baseline"],
  offer: ["history", "current_name", "price", "walkthrough", "result", "type", "past_offer", "target_type", "target_price", "payment_platforms", "past_growth_help"],
  icp: ["known", "best_client", "age_range", "gender_mix", "life_stage", "daily_life", "income", "payment_style", "engagers", "before_state", "tried_before", "buying_behaviour", "tipping_point", "client_objections", "client_language", "never_client", "starter_profile"],
  story: ["start_type"],
  positioning: ["mechanism_status", "mechanism", "method_walkthrough", "difference_known", "difference", "competitors", "competitor_gap", "content_shows_it", "love_topics", "hour_topic", "avoid_topics"],
  voice: ["persona", "persona_second", "persona_other", "unhinged_level", "filter", "flagged_level", "flagged_words", "sliders", "never_say"],
  content: ["home_platform", "longform_awareness", "hard_parts", "hard_why", "yt_format", "format_why", "cadence", "process", "video_time", "script_time", "daily_time", "schedule", "film_hours", "best_post", "skills", "hates", "helpers"],
  proof: ["own_best", "own_how", "own_proof", "level", "best_result", "count", "top_results", "storage", "own_enough", "closest_thing"],
  funnel: ["stage_focus", "terms_known", "tried", "wanted", "has_funnel", "sales_method", "lead_sources", "path", "step_links", "tools", "owners", "tracks_numbers", "metrics", "leak", "non_buyer_followup", "ads", "ads_detail", "ads_stopped_why"],
  program: ["status", "missing"],
  commitment: ["understood", "promised"],
};
for (const [section, keys] of Object.entries(ONBOARDING_V2_FIELDS)) {
  for (const key of keys) CLIENT_FIELDS.set(`${section}.${key}`, "client-form");
}


async function handle_onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  let client;
  let wantsHistory = false;
  if ((hasOperator(request, env) || request.headers.get("x-admin-key") != null)) {
    const auth = checkAdmin(request, env);
    if (auth) return auth;
    client = cleanId(new URL(request.url).searchParams.get("client"));
    wantsHistory = new URL(request.url).searchParams.get("history") === "1";
  } else {
    const access = await resolveClientAccess(request, env, {
      allowHeaderToken: true,
      allowQueryToken: false,
      allowImpersonated: true,
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
  let history;
  if (wantsHistory) {
    const rows = await env.DB.prepare(
      `SELECT section, field, value_json, source, replaced_at
         FROM client_brain_history
        WHERE client_id=?
        ORDER BY replaced_at DESC, id DESC
        LIMIT 200`,
    ).bind(client).all();
    history = (rows.results || []).map((row) => ({ section: row.section, field: row.field, value: parseValue(row.value_json), source: row.source || null, replaced_at: row.replaced_at }));
  }
  return json({
    ok: true,
    ...(history ? { history } : {}),
    client,
    client_name: config?.client_name || client,
    sections: grouped.sections,
    summary: grouped.summary,
    proof_items: (proofResult.results || []).map(normalizeProofRow),
  });
}

async function handle_onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no database bound" }, 500);

  if ((hasOperator(request, env) || request.headers.get("x-admin-key") != null)) {
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
  if (body.action === "add-proof") return addClientProof(body, env, access.client);
  return saveClientSubmission(body, env, access.client);
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
        const valueJson = JSON.stringify(normalized);
        // Keep what the answer said before when it changes, in the same batch (no extra read).
        writes.push(
          env.DB.prepare(
            `INSERT INTO client_brain_history (client_id, section, field, value_json, source, replaced_at)
             SELECT client_id, section, field, value_json, source, ?
               FROM client_brain
              WHERE client_id=? AND section=? AND field=? AND value_json<>?`,
          ).bind(now, client, section, key, valueJson),
        );
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

// The onboarding form adds video links to the proof vault. It only ever adds:
// the full-list submission (proof_items) deletes and rewrites every row, which
// would wipe proof the client uploaded elsewhere and reset granted permissions.
// Uploaded images already have their row (media-upload.js). A link the vault
// already holds is skipped, so pressing Finish twice adds nothing twice.
async function addClientProof(body, env, client) {
  if (body.client && cleanId(body.client) !== client) {
    return json({ ok: false, error: "unauthorized" }, 403);
  }
  const requested = normalizeProofItems(Array.isArray(body.items) ? body.items.slice(0, 20) : [], true)
    .filter((item) => /^https?:\/\//i.test(item.url) || item.url.startsWith("/m/"))
    // The table only takes link kinds (0014_client_brain.sql).
    .map((item) => ({ ...item, kind: item.kind === "image" ? "image-link" : item.kind }));
  if (!requested.length) return json({ ok: false, error: "add at least one proof link" }, 422);

  const existing = await env.DB.prepare("SELECT url FROM proof_items WHERE client_id=?").bind(client).all();
  const known = new Set((existing.results || []).map((row) => row.url));
  const items = requested.filter((item) => !known.has(item.url) && known.add(item.url));
  const now = nowIso();
  if (items.length) {
    await env.DB.batch(items.map((item) => env.DB.prepare(
      `INSERT INTO proof_items (client_id, kind, url, claim, permission, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(client, item.kind, item.url, item.claim, item.permission, now)));
  }
  return json({ ok: true, client, added: items.length, skipped: requested.length - items.length });
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
      operator_only: FIELD_DEFINITIONS[section].every((definition) => definition.operator_only),
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
  return ({
    identity: "Identity", intent: "Why now", money: "Money", offer: "Offer", icp: "ICP", story: "Story",
    positioning: "Positioning", voice: "Voice", content: "Content", proof: "Proof vault", funnel: "Funnel facts",
    program: "Program", commitment: "The deal", donot: "Do-not list",
  })[section] || labelFromKey(section);
}

function labelFromKey(key) {
  return String(key || "").replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

export const onRequestGet = withOperator(handle_onRequestGet);
export const onRequestPost = withOperator(handle_onRequestPost);
export const onRequestOptions = withOperator(handle_onRequestOptions);
