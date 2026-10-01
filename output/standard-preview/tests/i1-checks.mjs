import { fileURLToPath, pathToFileURL } from "node:url";
import { strict as assert } from "node:assert";

const base = fileURLToPath(new URL("..", import.meta.url)).replace(/\\/g, "/").replace(/\/$/, "");

const integrationsApi = await import(pathToFileURL(`${base}/functions/api/integrations.js`).href);
const paymentApi = await import(pathToFileURL(`${base}/functions/api/payment.js`).href);
const hookApi = await import(pathToFileURL(`${base}/functions/api/hooks/[provider].js`).href);
const clientDataApi = await import(pathToFileURL(`${base}/functions/api/client-data.js`).href);
const settingsApi = await import(pathToFileURL(`${base}/functions/api/settings.js`).href);
const mediaApi = await import(pathToFileURL(`${base}/functions/api/media.js`).href);
const mediaGetApi = await import(pathToFileURL(`${base}/functions/media/[id].js`).href);
const activityApi = await import(pathToFileURL(`${base}/functions/api/activity.js`).href);
const rendererApi = await import(pathToFileURL(`${base}/functions/index.js`).href);
const eventApi = await import(pathToFileURL(`${base}/functions/event.js`).href);
const { sha256Hex } = await import(pathToFileURL(`${base}/functions/_shared/common.js`).href);

const results = {};

class MockDB {
  constructor(seed = {}) {
    this.state = {
      integrations: seed.integrations || [],
      leads: seed.leads || [],
      watch_events: seed.watch_events || [],
      asset_links: seed.asset_links || [],
      asset_events: seed.asset_events || [],
      client_media_order: seed.client_media_order || [],
      copywriter_usage: seed.copywriter_usage || [],
      impersonation_sessions: seed.impersonation_sessions || [],
      payment_matches: seed.payment_matches || [],
      workspace_preferences: seed.workspace_preferences || [],
      workspace_records: seed.workspace_records || [],
      api_keys: seed.api_keys || [],
      webhook_endpoints: seed.webhook_endpoints || [],
      metric_points: seed.metric_points || [],
      ingest_records: seed.ingest_records || [],
      notifications: seed.notifications || [],
      snapshots: seed.snapshots || [],
      stories: seed.stories || [],
      contract_provisioning: seed.contract_provisioning || [],
      yt_videos: seed.yt_videos || [],
      integration_events: seed.integration_events || [],
      payments: seed.payments || [],
      client_provisioning: seed.client_provisioning || [],
      checklist_steps: seed.checklist_steps || [],
      pipeline_touches: seed.pipeline_touches || [],
      voice_notes: seed.voice_notes || [],
      webhook_outbox: seed.webhook_outbox || [],
      client_config: seed.client_config || [],
      client_auth: seed.client_auth || [],
      client_sessions: seed.client_sessions || [],
      client_setup_tokens: seed.client_setup_tokens || [],
      client_email_codes: seed.client_email_codes || [],
      client_dashboard_content: seed.client_dashboard_content || [],
      studio_sequences: seed.studio_sequences || [],
      studio_carousels: seed.studio_carousels || [],
      sequence_variants: seed.sequence_variants || [],
      sequence_log: seed.sequence_log || [],
      account_snapshots: seed.account_snapshots || [],
      client_brain: seed.client_brain || [],
      proof_items: seed.proof_items || [],
      content_items: seed.content_items || [],
      call_notes: seed.call_notes || [],
      client_assets: seed.client_assets || [],
      leads: seed.leads || [],
      page_events: seed.page_events || [],
      delivery_failures: seed.delivery_failures || [],
      email_drafts: seed.email_drafts || [],
      media: seed.media || [],
    };
    this.audit = [];
  }

  prepare(sql) {
    return new MockStmt(this, sql);
  }

  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

class MockStmt {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async first() {
    return this.#dispatch("first");
  }

  async all() {
    return this.#dispatch("all");
  }

  async run() {
    return this.#dispatch("run");
  }

  async #dispatch(mode) {
    const sql = this.sql;
    const p = this.params;
    const state = this.db.state;

    if (sql.includes("SELECT scope, client_id, provider, config_json, secret_json, created_at, updated_at FROM integrations")) {
      let rows = [...state.integrations];
      let index = 0;
      if (sql.includes("scope=?")) {
        rows = rows.filter((row) => row.scope === p[index]);
        index += 1;
      }
      if (sql.includes("COALESCE(client_id,'')=?")) {
        rows = rows.filter((row) => (row.client_id || "") === p[index]);
        index += 1;
      }
      if (sql.includes("provider=?")) {
        rows = rows.filter((row) => row.provider === p[index]);
      }
      return mode === "all" ? { results: rows } : rows[0] || null;
    }

    if (sql.includes("SELECT 1 AS has_integration FROM integrations WHERE scope='client' AND client_id=? LIMIT 1")) {
      const row = state.integrations.find((item) => item.scope === "client" && (item.client_id || "") === p[0]);
      return row ? { has_integration: 1 } : null;
    }

    if (sql.includes("SELECT provider, COALESCE(client,'') AS client_key, MAX(ts) AS last_event_ts FROM integration_events GROUP BY provider, COALESCE(client,'')")) {
      const grouped = new Map();
      for (const row of state.integration_events) {
        const key = `${row.provider}:${row.client || ""}`;
        const current = grouped.get(key);
        if (!current || row.ts > current.last_event_ts) {
          grouped.set(key, { provider: row.provider, client_key: row.client || "", last_event_ts: row.ts });
        }
      }
      return { results: [...grouped.values()] };
    }

    if (sql.includes("SELECT provider, kind, client, payload_summary_json, ts FROM integration_events ORDER BY ts DESC LIMIT 50")) {
      return {
        results: [...state.integration_events]
          .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
          .slice(0, 50),
      };
    }

    if (sql.includes("SELECT client, amount_cents, currency, rail, occurred_at, created_at FROM payments ORDER BY occurred_at DESC LIMIT 20")) {
      return {
        results: [...state.payments]
          .sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at)))
          .slice(0, 20),
      };
    }

    if (sql.includes("SELECT client, kind, detail, at FROM delivery_failures ORDER BY at DESC LIMIT 20")) {
      return {
        results: [...state.delivery_failures]
          .sort((a, b) => String(b.at).localeCompare(String(a.at)))
          .slice(0, 20),
      };
    }

    if (sql.startsWith("INSERT INTO integrations")) {
      const [scope, clientId, provider, configJson, secretJson, createdAt, updatedAt] = p;
      const existing = state.integrations.find((row) =>
        row.scope === scope && (row.client_id || "") === (clientId || "") && row.provider === provider,
      );
      if (existing) {
        existing.config_json = configJson;
        existing.secret_json = secretJson;
        existing.updated_at = updatedAt;
      } else {
        state.integrations.push({
          scope,
          client_id: clientId || "",
          provider,
          config_json: configJson,
          secret_json: secretJson,
          created_at: createdAt,
          updated_at: updatedAt,
        });
      }
      this.db.audit.push("upsert_integration");
      return { meta: { changes: 1 } };
    }

    if (sql.includes("SELECT id, client, content_type, bytes, created_at FROM media WHERE id=?")) {
      const row = state.media.find((item) => item.id === p[0]);
      return row ? { ...row } : null;
    }

    if (sql.startsWith("INSERT INTO media")) {
      const [id, client, contentType, bytes, createdAt] = p;
      if (state.media.some((row) => row.id === id)) throw new Error("UNIQUE constraint failed");
      state.media.push({
        id,
        client,
        content_type: contentType,
        bytes,
        created_at: createdAt,
      });
      return { meta: { changes: 1 } };
    }

    if (sql === "DELETE FROM media WHERE id=?") {
      const before = state.media.length;
      state.media = state.media.filter((row) => row.id !== p[0]);
      return { meta: { changes: before - state.media.length } };
    }

    const clientDelete = sql.match(/^DELETE FROM ([a-z_]+) WHERE (client|client_id)=\?$/);
    if (clientDelete) {
      const [, table, column] = clientDelete;
      if (!Array.isArray(state[table])) throw new Error(`Unknown mock table: ${table}`);
      const before = state[table].length;
      state[table] = state[table].filter((row) => row[column] !== p[0]);
      return { meta: { changes: before - state[table].length } };
    }

    if (sql.startsWith("DELETE FROM integrations")) {
      const [scope, clientId, provider] = p;
      const before = state.integrations.length;
      state.integrations = state.integrations.filter((row) =>
        !(row.scope === scope && (row.client_id || "") === clientId && row.provider === provider),
      );
      return { meta: { changes: before - state.integrations.length } };
    }

    if (sql.includes("SELECT id, client, amount_cents, currency, rail, reference")) {
      return state.payments.find((row) => row.reference === p[0]) || null;
    }

    if (sql.startsWith("INSERT INTO payments")) {
      const [client, amountCents, currency, rail, reference, occurredAt, recordedBy, note, createdAt] = p;
      const row = {
        id: state.payments.length + 1,
        client,
        amount_cents: amountCents,
        currency,
        rail,
        reference,
        occurred_at: occurredAt,
        recorded_by: recordedBy,
        note,
        created_at: createdAt,
      };
      state.payments.push(row);
      this.db.audit.push(`insert_payment:${reference}`);
      return { meta: { changes: 1, last_row_id: row.id } };
    }

    if (sql.startsWith("INSERT INTO content_items")) {
      const [client, title, stage, platform, url, notes, scheduledFor, updatedAt] = p;
      const row = {
        id: state.content_items.length + 1,
        client,
        title,
        stage,
        platform,
        url,
        notes,
        scheduled_for: scheduledFor,
        updated_at: updatedAt,
      };
      state.content_items.push(row);
      this.db.audit.push(`content_item:${client}:${row.id}`);
      return { meta: { changes: 1, last_row_id: row.id } };
    }

    if (sql.startsWith("INSERT INTO page_events")) {
      const [
        client, visitorId, sessionId, pageId, event, email, path, referrer,
        utmJson, metadataJson, ip, country, city, userAgent, utmSource, utmContent, lat, lng, at,
      ] = p;
      const row = {
        id: state.page_events.length + 1,
        client,
        visitor_id: visitorId,
        session_id: sessionId,
        page_id: pageId,
        event,
        email,
        path,
        referrer,
        utm_json: utmJson,
        metadata_json: metadataJson,
        ip,
        country,
        city,
        user_agent: userAgent,
        utm_source: utmSource,
        utm_content: utmContent,
        lat,
        lng,
        at,
      };
      state.page_events.push(row);
      this.db.audit.push(`page_event:${client}:${event}`);
      return { meta: { changes: 1, last_row_id: row.id } };
    }

    if (sql.startsWith("INSERT INTO integration_events")) {
      const [provider, kind, client, externalId, payloadSummaryJson, ts] = p;
      const duplicate = state.integration_events.find((row) =>
        row.provider === provider && row.kind === kind && row.external_id === externalId && externalId,
      );
      if (duplicate) throw new Error("UNIQUE constraint failed");
      const row = {
        id: state.integration_events.length + 1,
        provider,
        kind,
        client,
        external_id: externalId,
        payload_summary_json: payloadSummaryJson,
        ts,
      };
      state.integration_events.push(row);
      this.db.audit.push(`integration_event:${provider}:${kind}:${externalId || row.id}`);
      return { meta: { changes: 1, last_row_id: row.id } };
    }

    if (sql.includes("SELECT provider, kind, client, payload_summary_json, external_id, ts FROM integration_events")) {
      const [provider, clientKey] = p;
      const rows = state.integration_events
        .filter((row) => row.provider === provider && (row.client || "") === clientKey)
        .sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
      return rows[0] || null;
    }

    if (sql.includes("SELECT 1 AS found FROM client_config WHERE client=?")) {
      return state.client_config.some((row) => row.client === p[0]) ? { found: 1 } : null;
    }

    if (sql.includes("SELECT template_variant, page_content_json, COALESCE(page_active,1) AS page_active FROM client_config WHERE client=?")) {
      const row = state.client_config.find((item) => item.client === p[0]);
      return row
        ? {
            template_variant: row.template_variant || null,
            page_content_json: row.page_content_json || null,
            page_active: row.page_active ?? 1,
          }
        : null;
    }

    if (sql.includes("SELECT client,client_name,wistia_media_id,typeform_url,typeform_webhook_secret, kit_tag_id,kit_api_key,allowed_origin,proof_images_json, template_variant,page_content_json,page_active,prospect_email, acquisition_token,updated_at FROM client_config WHERE client=?")) {
      const row = state.client_config.find((item) => item.client === p[0]);
      return row ? { ...row } : null;
    }

    if (sql.startsWith("INSERT INTO webhook_outbox")) {
      const [id, scope, clientId, event, payloadJson, isTest, createdAt] = p;
      if (state.webhook_outbox.some((row) => row.id === id)) throw new Error("UNIQUE constraint failed");
      state.webhook_outbox.push({
        id,
        scope,
        client_id: clientId,
        event,
        payload_json: payloadJson,
        is_test: isTest,
        created_at: createdAt,
      });
      return { meta: { changes: 1 } };
    }

    if (sql.includes("SELECT email, pass_hash, updated_at FROM client_auth WHERE client_id=?")) {
      const row = state.client_auth.find((item) => item.client_id === p[0]);
      return row ? { ...row } : null;
    }

    if (sql.includes("SELECT section, json, updated_at FROM client_dashboard_content WHERE client_id=?")) {
      const rows = state.client_dashboard_content.filter((item) => item.client_id === p[0]);
      return { results: rows.map((row) => ({ ...row })) };
    }

    if (sql.includes("SELECT client_name,wistia_media_id,typeform_url,typeform_webhook_secret, kit_tag_id,kit_api_key,allowed_origin,proof_images_json, template_variant,page_content_json,page_active,prospect_email,acquisition_token FROM client_config WHERE client=?")) {
      const row = state.client_config.find((item) => item.client === p[0]);
      return row ? { ...row } : null;
    }

    if (sql.startsWith("INSERT INTO client_config") && sql.includes("wistia_media_id")) {
      const [
        client, clientName, wistiaMediaId, typeformUrl, typeformWebhookSecret,
        kitTagId, kitApiKey, allowedOrigin, proofImagesJson,
        templateVariant, pageContentJson, pageActive, prospectEmail, acquisitionToken, updatedAt,
      ] = p;
      const next = {
        client,
        client_name: clientName,
        wistia_media_id: wistiaMediaId,
        typeform_url: typeformUrl,
        typeform_webhook_secret: typeformWebhookSecret,
        kit_tag_id: kitTagId,
        kit_api_key: kitApiKey,
        allowed_origin: allowedOrigin,
        proof_images_json: proofImagesJson,
        template_variant: templateVariant,
        page_content_json: pageContentJson,
        page_active: pageActive,
        prospect_email: prospectEmail,
        acquisition_token: acquisitionToken,
        updated_at: updatedAt,
      };
      const existing = state.client_config.find((row) => row.client === client);
      if (existing) Object.assign(existing, next);
      else state.client_config.push(next);
      this.db.audit.push(`settings_client:${client}`);
      return { meta: { changes: 1 } };
    }

    if (sql.startsWith("INSERT INTO client_config")) {
      const [client, clientName, status, updatedAt] = p;
      const existing = state.client_config.find((row) => row.client === client);
      if (existing) {
        existing.client_name = existing.client_name || clientName;
        existing.updated_at = updatedAt;
      } else {
        state.client_config.push({
          client,
          client_name: clientName,
          status,
          updated_at: updatedAt,
          portal_token_hash: null,
          kit_api_key: null,
          kit_tag_id: null,
        });
      }
      this.db.audit.push(`ensure_client:${client}`);
      return { meta: { changes: 1 } };
    }

    if (sql.includes("SELECT client, COALESCE(client_name, client) AS client_name, portal_token_hash") && sql.includes("FROM client_config")) {
      const row = state.client_config.find((item) => item.client === p[0]);
      return row
        ? {
            client: row.client,
            client_name: row.client_name || row.client,
            portal_token_hash: row.portal_token_hash || null,
            status: row.status || null,
          }
        : null;
    }

    if (sql.includes("SELECT client, COALESCE(client_name,client) AS client_name, wistia_media_id, typeform_url, typeform_webhook_secret, kit_api_key, kit_tag_id, allowed_origin, prospect_email, acquisition_token FROM client_config WHERE client=?")) {
      const row = state.client_config.find((item) => item.client === p[0]);
      return row
        ? {
            client: row.client,
            client_name: row.client_name || row.client,
            wistia_media_id: row.wistia_media_id || null,
            typeform_url: row.typeform_url || null,
            typeform_webhook_secret: row.typeform_webhook_secret || null,
            kit_api_key: row.kit_api_key || null,
            kit_tag_id: row.kit_tag_id || null,
            allowed_origin: row.allowed_origin || null,
            prospect_email: row.prospect_email || null,
            acquisition_token: row.acquisition_token || null,
          }
        : null;
    }

    if (sql.includes("SELECT portal_token_hash FROM client_config WHERE client=?")) {
      const row = state.client_config.find((item) => item.client === p[0]);
      return row ? { portal_token_hash: row.portal_token_hash || null } : null;
    }

    if (sql.includes("SELECT client FROM client_config WHERE portal_token_hash=?")) {
      const row = state.client_config.find((item) => item.portal_token_hash === p[0]);
      return row ? { client: row.client } : null;
    }

    if (sql.startsWith("UPDATE client_config SET portal_token_hash=?")) {
      const [hash, updatedAt, client] = p;
      const row = state.client_config.find((item) => item.client === client);
      if (!row) return { meta: { changes: 0 } };
      row.portal_token_hash = hash;
      row.updated_at = updatedAt;
      this.db.audit.push(`portal_token:${client}`);
      return { meta: { changes: 1 } };
    }

    if (sql.startsWith("UPDATE client_config SET status='client'")) {
      const [updatedAt, client] = p;
      const row = state.client_config.find((item) => item.client === client);
      if (!row) return { meta: { changes: 0 } };
      row.status = "client";
      row.updated_at = updatedAt;
      this.db.audit.push(`client_status:${client}`);
      return { meta: { changes: 1 } };
    }

    if (sql.includes("SELECT email, name FROM leads")) {
      const row = [...state.leads].reverse().find((lead) => lead.client === p[0] && lead.email);
      return row ? { email: row.email, name: row.name } : null;
    }

    if (sql.includes("SELECT kit_api_key FROM client_config WHERE client=?")) {
      const row = state.client_config.find((item) => item.client === p[0]);
      return row ? { kit_api_key: row.kit_api_key || null } : null;
    }

    if (sql.includes("SELECT kit_api_key, kit_tag_id FROM client_config WHERE client=?")) {
      const row = state.client_config.find((item) => item.client === p[0]);
      return row ? { kit_api_key: row.kit_api_key || null, kit_tag_id: row.kit_tag_id || null } : null;
    }

    if (sql.startsWith("INSERT INTO delivery_failures")) {
      const [client, kind, detail, at] = p;
      state.delivery_failures.push({ client, kind, detail, at });
      this.db.audit.push(`failure:${kind}`);
      return { meta: { changes: 1 } };
    }

    throw new Error(`Unhandled SQL (${mode}): ${sql}`);
  }
}

function request(url, options = {}) {
  return new Request(url, options);
}

function makeEnv(seed) {
  return {
    ADMIN_KEY: "admin-secret",
    DB: new MockDB(seed),
  };
}

async function readJson(response) {
  return JSON.parse(await response.text());
}

async function stripeSignature(payload, secret, timestamp = String(Math.floor(Date.now() / 1000))) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const hex = [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

async function runMaskedGetAndPreservePost() {
  const env = makeEnv({
    integrations: [
      {
        scope: "operator",
        client_id: "",
        provider: "kit",
        config_json: JSON.stringify({ onboarding_subject: "Saved subject", onboarding_form_url: "https://example.com/form" }),
        secret_json: JSON.stringify({ api_key: "kit-secret-live" }),
        created_at: "2026-07-04T10:00:00.000Z",
        updated_at: "2026-07-04T10:00:00.000Z",
      },
    ],
  });

  const getResponse = await integrationsApi.onRequestGet({
    request: request("https://example.com/api/integrations?scope=operator", {
      headers: { "x-admin-key": "admin-secret" },
    }),
    env,
  });
  const getText = await getResponse.text();
  const getJson = JSON.parse(getText);
  assert.equal(getJson.integrations[0].config.api_key_set, true);
  assert.equal(getJson.integrations[0].config.onboarding_subject, "Saved subject");
  assert.equal(getText.includes("kit-secret-live"), false, "secret leaked in GET response");

  const postResponse = await integrationsApi.onRequestPost({
    request: request("https://example.com/api/integrations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "admin-secret",
      },
      body: JSON.stringify({
        scope: "operator",
        provider: "kit",
        config: { onboarding_preview_text: "Fresh preview" },
      }),
    }),
    env,
  });
  const postJson = await readJson(postResponse);
  assert.equal(postJson.ok, true);
  const stored = env.DB.state.integrations[0];
  const storedConfig = JSON.parse(stored.config_json);
  const storedSecrets = JSON.parse(stored.secret_json);
  assert.equal(storedConfig.onboarding_subject, "Saved subject");
  assert.equal(storedConfig.onboarding_preview_text, "Fresh preview");
  assert.equal(storedSecrets.api_key, "kit-secret-live");

  results.masked_get = getJson;
  results.preserve_on_absent = postJson;
}

async function runStripeHookChecks() {
  const env = makeEnv({
    integrations: [
      {
        scope: "client",
        client_id: "alpha",
        provider: "stripe",
        config_json: JSON.stringify({ contact_email: "client@alpha.com", contact_name: "Alpha Client" }),
        secret_json: JSON.stringify({ path_secret: "stripe-path", webhook_secret: "whsec_test" }),
        created_at: "2026-07-04T10:00:00.000Z",
        updated_at: "2026-07-04T10:00:00.000Z",
      },
    ],
    client_config: [
      { client: "alpha", client_name: "Alpha", status: "prospect", updated_at: "", portal_token_hash: null, kit_api_key: null, kit_tag_id: null },
    ],
  });

  const badPayload = JSON.stringify({
    id: "evt_bad",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_bad", amount_received: 150000, currency: "usd", created: 1700000000 } },
  });
  const badResponse = await hookApi.onRequestPost({
    request: request("https://example.com/api/hooks/stripe/stripe-path", {
      method: "POST",
      headers: { "Stripe-Signature": "t=1,v1=bad" },
      body: badPayload,
    }),
    env,
    params: { provider: "stripe", secret: "stripe-path" },
  });
  assert.equal(badResponse.status, 401);

  const goodPayload = JSON.stringify({
    id: "evt_live",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_live", amount_received: 250000, currency: "usd", created: 1700000000 } },
  });
  const header = await stripeSignature(goodPayload, "whsec_test");
  const first = await hookApi.onRequestPost({
    request: request("https://example.com/api/hooks/stripe/stripe-path", {
      method: "POST",
      headers: { "Stripe-Signature": header },
      body: goodPayload,
    }),
    env,
    params: { provider: "stripe", secret: "stripe-path" },
  });
  const second = await hookApi.onRequestPost({
    request: request("https://example.com/api/hooks/stripe/stripe-path", {
      method: "POST",
      headers: { "Stripe-Signature": header },
      body: goodPayload,
    }),
    env,
    params: { provider: "stripe", secret: "stripe-path" },
  });
  const firstJson = await readJson(first);
  const secondJson = await readJson(second);
  assert.equal(firstJson.recorded, true);
  assert.equal(secondJson.duplicate, true);
  assert.equal(env.DB.state.payments.length, 1);

  const unknownResponse = await hookApi.onRequestPost({
    request: request("https://example.com/api/hooks/stripe/not-real", {
      method: "POST",
      body: JSON.stringify({
        id: "evt_unknown",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_unknown", amount_received: 999, currency: "usd", created: 1700000000 } },
      }),
    }),
    env,
    params: { provider: "stripe", secret: "not-real" },
  });
  const unknownJson = await readJson(unknownResponse);
  assert.equal(unknownJson.ok, true);
  assert.equal(unknownJson.recorded, false);
  assert.equal(unknownJson.reason, "unknown client");
  assert.equal(env.DB.state.payments.length, 1);
  assert.equal(env.DB.state.integration_events.some((row) => row.client === "unknown"), false);

  results.hook_signature_reject = { status: badResponse.status };
  results.hook_idempotency = {
    first: firstJson,
    second: secondJson,
    unknown: unknownJson,
    payments: env.DB.state.payments.length,
  };
}

async function runEventBoundaryChecks() {
  const unknownEnv = makeEnv();
  const unknownResponse = await eventApi.onRequestPost({
    request: request("https://example.com/event?client=review-check-ghost-xyz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "page", event: "page_view", path: "/ghost" }),
    }),
    env: unknownEnv,
  });
  const unknownJson = await readJson(unknownResponse);
  assert.equal(unknownResponse.status, 404);
  assert.deepEqual(unknownJson, { ok: false, error: "unknown client" });
  assert.equal(unknownEnv.DB.state.page_events.length, 0);
  assert.equal(unknownEnv.DB.state.leads.length, 0);
  assert.equal(unknownEnv.DB.state.delivery_failures.length, 0);

  const knownEnv = makeEnv({
    integrations: [
      {
        scope: "client",
        client_id: "integrations-only",
        provider: "calcom",
        config_json: JSON.stringify({ booking_url: "https://cal.com/integrations-only" }),
        secret_json: JSON.stringify({ path_secret: "integration-only-path" }),
        created_at: "2026-07-04T10:00:00.000Z",
        updated_at: "2026-07-04T10:00:00.000Z",
      },
    ],
  });
  const knownResponse = await eventApi.onRequestPost({
    request: request("https://example.com/event?client=integrations-only", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "page",
        event: "page_view",
        path: "/known",
        visitor_id: "visitor-1",
        session_id: "session-1",
      }),
    }),
    env: knownEnv,
  });
  const knownJson = await readJson(knownResponse);
  assert.equal(knownResponse.status, 200);
  assert.equal(knownJson.ok, true);
  assert.equal(knownJson.kind, "page");
  assert.equal(knownEnv.DB.state.page_events.length, 1);
  assert.equal(knownEnv.DB.state.page_events[0].client, "integrations-only");
  assert.equal(knownEnv.DB.state.leads.length, 0);

  results.event_client_boundary = {
    unknown: {
      status: unknownResponse.status,
      json: unknownJson,
      page_events: unknownEnv.DB.state.page_events.length,
      leads: unknownEnv.DB.state.leads.length,
    },
    integrations_only: {
      status: knownResponse.status,
      json: knownJson,
      page_events: knownEnv.DB.state.page_events.length,
    },
  };
}

async function runPaymentChecks() {
  const env = makeEnv({
    integrations: [
      {
        scope: "client",
        client_id: "beta",
        provider: "whop",
        config_json: JSON.stringify({ contact_email: "buyer@beta.com", contact_name: "Beta Buyer" }),
        secret_json: JSON.stringify({ path_secret: "whop-path" }),
        created_at: "2026-07-04T10:00:00.000Z",
        updated_at: "2026-07-04T10:00:00.000Z",
      },
    ],
    client_config: [
      { client: "beta", client_name: "Beta", status: "client", updated_at: "", portal_token_hash: null, kit_api_key: null, kit_tag_id: null },
    ],
  });

  const first = await paymentApi.onRequestPost({
    request: request("https://example.com/api/payment", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "admin-secret",
      },
      body: JSON.stringify({
        client: "beta",
        amount: 2500,
        currency: "usd",
        rail: "whop",
        reference: "manual-001",
        note: "Bank transfer confirmed",
      }),
    }),
    env,
  });
  const second = await paymentApi.onRequestPost({
    request: request("https://example.com/api/payment", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "admin-secret",
      },
      body: JSON.stringify({
        client: "beta",
        amount: 2500,
        currency: "usd",
        rail: "whop",
        reference: "manual-001",
        note: "Duplicate replay",
      }),
    }),
    env,
  });
  const firstJson = await readJson(first);
  const secondJson = await readJson(second);
  assert.equal(firstJson.ok, true);
  assert.equal(secondJson.duplicate, true);
  assert.equal(firstJson.side_effects.skipped, true);
  assert.equal(firstJson.side_effects.reason, "client is not a prospect");
  assert.equal(env.DB.state.client_config[0].status, "client");
  assert.equal(env.DB.state.payments.length, 1);
  assert.deepEqual(
    env.DB.audit.filter((entry) =>
      entry.startsWith("insert_payment") ||
      entry.startsWith("portal_token") ||
      entry.startsWith("failure:kit_onboarding") ||
      entry.startsWith("client_status"),
    ),
    [
      "insert_payment:manual-001",
    ],
  );

  results.payment_idempotency = { first: firstJson, second: secondJson, audit: env.DB.audit };
}

async function runTenantIsolationCheck() {
  const alphaToken = "portal-alpha";
  const betaToken = "portal-beta";
  const env = makeEnv({
    integrations: [
      {
        scope: "operator",
        client_id: "",
        provider: "discord",
        config_json: JSON.stringify({}),
        secret_json: JSON.stringify({ webhook_url: "https://discord.test" }),
        created_at: "2026-07-04T10:00:00.000Z",
        updated_at: "2026-07-04T10:00:00.000Z",
      },
      {
        scope: "client",
        client_id: "alpha",
        provider: "stripe",
        config_json: JSON.stringify({ contact_email: "alpha@example.com" }),
        secret_json: JSON.stringify({ path_secret: "alpha-path", webhook_secret: "whsec_alpha" }),
        created_at: "2026-07-04T10:00:00.000Z",
        updated_at: "2026-07-04T10:00:00.000Z",
      },
      {
        scope: "client",
        client_id: "beta",
        provider: "whop",
        config_json: JSON.stringify({ contact_email: "beta@example.com" }),
        secret_json: JSON.stringify({ path_secret: "beta-path" }),
        created_at: "2026-07-04T10:00:00.000Z",
        updated_at: "2026-07-04T10:00:00.000Z",
      },
    ],
    integration_events: [
      { provider: "stripe", kind: "payment", client: "alpha", external_id: "evt_a", payload_summary_json: "{}", ts: "2026-07-04T11:00:00.000Z" },
      { provider: "whop", kind: "payment", client: "beta", external_id: "evt_b", payload_summary_json: "{}", ts: "2026-07-04T12:00:00.000Z" },
    ],
    client_config: [
      { client: "alpha", client_name: "Alpha", status: "client", updated_at: "", portal_token_hash: await sha256Hex(alphaToken), kit_api_key: null, kit_tag_id: null },
      { client: "beta", client_name: "Beta", status: "client", updated_at: "", portal_token_hash: await sha256Hex(betaToken), kit_api_key: null, kit_tag_id: null },
    ],
  });

  const response = await clientDataApi.onRequestGet({
    request: request("https://example.com/api/client-data?client=beta", {
      headers: { "x-portal-token": alphaToken },
    }),
    env,
  });
  const data = await readJson(response);
  assert.equal(data.client, "alpha");
  assert.equal(data.integrations.some((row) => row.provider === "whop"), false);
  assert.equal(data.integrations.some((row) => row.provider === "stripe"), true);
  assert.equal(data.integrations.some((row) => row.provider === "discord"), false);

  results.tenant_isolation = data;
}

async function runMediaChecks() {
  const env = makeEnv({
    client_config: [
      { client: "media-client", client_name: "Media Client" },
    ],
  });
  const sourceBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);

  const postResponse = await mediaApi.onRequestPost({
    request: request("https://example.com/api/media", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "admin-secret",
      },
      body: JSON.stringify({
        client: "media-client",
        filename: "proof.png",
        content_type: "image/png",
        data_base64: Buffer.from(sourceBytes).toString("base64"),
      }),
    }),
    env,
  });
  const postJson = await readJson(postResponse);
  assert.equal(postResponse.status, 200);
  assert.equal(postJson.ok, true);
  assert.match(postJson.id, /^[A-Za-z0-9_-]+$/);
  assert.equal(postJson.url, `/media/${postJson.id}`);

  const getResponse = await mediaGetApi.onRequestGet({
    env,
    params: { id: postJson.id },
  });
  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.headers.get("content-type"), "image/png");
  assert.equal(
    getResponse.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
  assert.deepEqual(
    new Uint8Array(await getResponse.arrayBuffer()),
    sourceBytes,
    "served media bytes changed",
  );

  const deleteResponse = await mediaApi.onRequestDelete({
    request: request(`https://example.com/api/media?id=${postJson.id}`, {
      method: "DELETE",
      headers: { "x-admin-key": "admin-secret" },
    }),
    env,
  });
  const deleteJson = await readJson(deleteResponse);
  assert.equal(deleteResponse.status, 200);
  assert.equal(deleteJson.deleted, 1);

  const missingResponse = await mediaGetApi.onRequestGet({
    env,
    params: { id: postJson.id },
  });
  assert.equal(missingResponse.status, 404);

  const unknownResponse = await mediaApi.onRequestPost({
    request: request("https://example.com/api/media", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "admin-secret",
      },
      body: JSON.stringify({
        client: "not-a-client",
        filename: "unknown.webp",
        content_type: "image/webp",
        data_base64: Buffer.from([1]).toString("base64"),
      }),
    }),
    env,
  });
  assert.equal(unknownResponse.status, 404);
  assert.equal((await readJson(unknownResponse)).error, "client not found");

  const oversizedBytes = Buffer.alloc(900 * 1024 + 1, 1);
  const oversizedResponse = await mediaApi.onRequestPost({
    request: request("https://example.com/api/media", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "admin-secret",
      },
      body: JSON.stringify({
        client: "media-client",
        filename: "too-large.jpg",
        content_type: "image/jpeg",
        data_base64: oversizedBytes.toString("base64"),
      }),
    }),
    env,
  });
  const oversizedJson = await readJson(oversizedResponse);
  assert.equal(oversizedResponse.status, 413);
  assert.match(oversizedJson.error, /900KB/);

  results.media = {
    uploaded: postJson,
    content_type: getResponse.headers.get("content-type"),
    deleted: deleteJson.deleted,
    after_delete_status: missingResponse.status,
    unknown_client_status: unknownResponse.status,
    cap_status: oversizedResponse.status,
  };
}

async function runActivityChecks() {
  const env = makeEnv({
    integration_events: [
      {
        provider: "landing",
        kind: "application",
        client: "alpha",
        payload_summary_json: JSON.stringify({ name: "Alex" }),
        ts: "2026-07-04T12:00:00.000Z",
      },
    ],
    payments: [
      {
        client: "beta",
        amount_cents: 100000,
        currency: "USD",
        rail: "stripe",
        occurred_at: "2026-07-04T11:00:00.000Z",
        created_at: "2026-07-04T11:00:01.000Z",
      },
    ],
    delivery_failures: [
      {
        client: "gamma",
        kind: "kit_onboarding",
        detail: "API unavailable",
        at: "2026-07-04T10:00:00.000Z",
      },
    ],
  });

  const unauthorizedResponse = await activityApi.onRequestGet({
    request: request("https://example.com/api/activity"),
    env,
  });
  assert.equal(unauthorizedResponse.status, 401);

  const response = await activityApi.onRequestGet({
    request: request("https://example.com/api/activity", {
      headers: { "x-admin-key": "admin-secret" },
    }),
    env,
  });
  const data = await readJson(response);
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.activity.length, 3);
  assert.deepEqual(
    data.activity.map((item) => item.ts),
    [
      "2026-07-04T12:00:00.000Z",
      "2026-07-04T11:00:00.000Z",
      "2026-07-04T10:00:00.000Z",
    ],
  );
  for (const item of data.activity) {
    assert.deepEqual(Object.keys(item).sort(), ["client", "kind", "summary", "ts"]);
    assert.equal(typeof item.summary, "string");
    assert.ok(item.summary.length > 0);
  }

  results.activity = {
    unauthorized_status: unauthorizedResponse.status,
    activity: data.activity,
  };
}

async function runRendererTokenChecks() {
  const env = makeEnv({
    client_config: [
      {
        client: "preview-check",
        template_variant: "canonical",
        page_content_json: JSON.stringify({
          HEADLINE_LINE_ONE: "A < B",
          FOOTER_LABEL: "Preview Client",
        }),
      },
    ],
  });
  env.ASSETS = {
    async fetch() {
      return new Response(
        '<!doctype html><meta name="description" content="{{META_DESCRIPTION}}">' +
        "<title>{{PAGE_TITLE}}</title>" +
        '<body data-client="{{CLIENT_SLUG}}">' +
        "<h1>{{HEADLINE_LINE_ONE}}</h1><footer>{{FOOTER_LABEL}}</footer></body>",
        { status: 200 },
      );
    },
  };
  const next = async () => new Response("fallback", { status: 404 });

  const previewResponse = await rendererApi.onRequestGet({
    request: request("https://example.com/?client=preview-check&preview=canonical&tokens=1"),
    env,
    next,
  });
  const previewHtml = await previewResponse.text();
  assert.match(
    previewHtml,
    /<span data-token="HEADLINE_LINE_ONE">A &lt; B<\/span>/,
  );
  assert.match(
    previewHtml,
    /<span data-token="FOOTER_LABEL">Preview Client<\/span>/,
  );
  assert.match(previewHtml, /data-client="preview-check"/);
  assert.equal(
    previewHtml.includes("<title>Preview Check \u2014 Private Application</title>"),
    true,
  );

  const normalResponse = await rendererApi.onRequestGet({
    request: request("https://example.com/?client=preview-check"),
    env,
    next,
  });
  const normalHtml = await normalResponse.text();
  assert.equal(normalHtml.includes("data-token="), false);
  assert.match(normalHtml, /<h1>A &lt; B<\/h1>/);

  const tokensWithoutPreviewResponse = await rendererApi.onRequestGet({
    request: request("https://example.com/?client=preview-check&tokens=1"),
    env,
    next,
  });
  assert.equal((await tokensWithoutPreviewResponse.text()).includes("data-token="), false);

  results.renderer_tokens = {
    preview_wrapped: true,
    normal_wrapped: false,
    tokens_without_preview_wrapped: false,
  };
}

async function runClientDeletionChecks() {
  const client = "delete-check";
  const env = makeEnv();

  const createResponse = await settingsApi.onRequestPost({
    request: request("https://example.com/api/settings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "admin-secret",
      },
      body: JSON.stringify({ client, client_name: "Deletion Check" }),
    }),
    env,
  });
  assert.equal(createResponse.status, 200);
  const createJson = await readJson(createResponse);
  assert.equal(createJson.ok, true);
  assert.match(createJson.share_url, new RegExp(`^https://example\\.com/${client}\\?lead=[A-Za-z0-9_-]+$`));
  const createdConfig = env.DB.state.client_config.find((row) => row.client === client);
  assert.equal(createdConfig.page_active, 1);
  assert.match(createdConfig.acquisition_token, /^[A-Za-z0-9_-]+$/);

  const contentResponse = await clientDataApi.onRequestPost({
    request: request("https://example.com/api/client-data", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "admin-secret",
      },
      body: JSON.stringify({
        client,
        type: "content",
        item: { title: "Throwaway content", stage: "production" },
      }),
    }),
    env,
  });
  assert.equal(contentResponse.status, 200);
  assert.equal((await readJson(contentResponse)).created, true);

  const paymentResponse = await paymentApi.onRequestPost({
    request: request("https://example.com/api/payment", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-key": "admin-secret",
      },
      body: JSON.stringify({
        client,
        amount: 100,
        currency: "usd",
        rail: "manual",
        reference: "delete-check-payment",
      }),
    }),
    env,
  });
  assert.equal(paymentResponse.status, 200);
  assert.equal((await readJson(paymentResponse)).duplicate, false);

  env.DB.state.call_notes.push({ id: 1, client, title: "Throwaway call" });
  env.DB.state.client_assets.push({ id: 1, client, label: "Throwaway asset" });
  env.DB.state.integrations.push({ scope: "client", client_id: client, provider: "stripe" });
  env.DB.state.email_drafts.push({ id: 1, client, subject: "Throwaway email" });
  env.DB.state.delivery_failures.push({ id: 1, client, kind: "throwaway", detail: "Delete me" });
  env.DB.state.studio_carousels.push({ id: 1, client_id: client, topic: "Throwaway carousel" });
  env.DB.state.sequence_variants.push({ id: 1, client_id: client, sequence_ref: 1, label: "v1" });
  env.DB.state.page_events.push({ id: 1, client, event: "page_view" });
  env.DB.state.client_provisioning.push({ client_id: client, email: "delete@example.com" });
  env.DB.state.checklist_steps.push({ client_id: client, step: "offer-voice-note" });
  env.DB.state.pipeline_touches.push({ id: 1, client_id: client, contact_email: "lead@example.com" });
  env.DB.state.voice_notes.push({ id: "voice-delete", client_id: client, r2_key: `clients/${client}/voice-notes/voice-delete` });
  env.DB.state.media.push({
    id: "delete-check-media",
    client,
    content_type: "image/png",
    bytes: Uint8Array.from([1]).buffer,
    created_at: "2026-07-04T12:00:00.000Z",
  });

  const unauthorizedResponse = await settingsApi.onRequestDelete({
    request: request(`https://example.com/api/settings?client=${client}`, {
      method: "DELETE",
    }),
    env,
  });
  assert.equal(unauthorizedResponse.status, 401);
  assert.equal(env.DB.state.client_config.length, 1, "unauthorized delete changed client data");

  const unknownResponse = await settingsApi.onRequestDelete({
    request: request("https://example.com/api/settings?client=not-a-client", {
      method: "DELETE",
      headers: { "x-admin-key": "admin-secret" },
    }),
    env,
  });
  const unknownJson = await readJson(unknownResponse);
  assert.equal(unknownResponse.status, 404);
  assert.deepEqual(unknownJson, { ok: false, error: "client not found" });

  const deleteResponse = await settingsApi.onRequestDelete({
    request: request(`https://example.com/api/settings?client=${client}`, {
      method: "DELETE",
      headers: { "x-admin-key": "admin-secret" },
    }),
    env,
  });
  const deleteJson = await readJson(deleteResponse);
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(deleteJson, {
    ok: true,
    deleted: {
      client_config: 1,
      client_auth: 0,
      client_sessions: 0,
      client_setup_tokens: 0,
      client_email_codes: 0,
      client_dashboard_content: 0,
      studio_sequences: 0,
      studio_carousels: 1,
      sequence_variants: 1,
      sequence_log: 0,
      account_snapshots: 0,
      client_brain: 0,
      proof_items: 0,
      content_items: 1,
      call_notes: 1,
      client_assets: 1,
      payments: 1,
      client_provisioning: 1,
      checklist_steps: 1,
      pipeline_touches: 1,
      voice_notes: 1,
      integrations: 1,
      integration_events: 1,
      delivery_failures: 1,
      email_drafts: 1,
      page_events: 1,
      leads: 0,
      watch_events: 0,
      asset_links: 0,
      asset_events: 0,
      yt_videos: 0,
      client_media_order: 0,
      copywriter_usage: 0,
      impersonation_sessions: 0,
      payment_matches: 0,
      workspace_preferences: 0,
      workspace_records: 0,
      api_keys: 0,
      webhook_endpoints: 0,
      webhook_outbox: 0,
      metric_points: 0,
      ingest_records: 0,
      notifications: 0,
      snapshots: 0,
      stories: 0,
      contract_provisioning: 0,
      media: 1,
      proof_media: 0,
      voice_media: 0,
    },
  });

  const getResponse = await settingsApi.onRequestGet({
    request: request(`https://example.com/api/settings?client=${client}`, {
      headers: { "x-admin-key": "admin-secret" },
    }),
    env,
  });
  const getJson = await readJson(getResponse);
  assert.equal(getResponse.status, 200);
  assert.equal(getJson.config, null);

  for (const table of [
    "client_config", "client_auth", "client_sessions", "client_setup_tokens", "client_email_codes",
    "client_dashboard_content", "studio_sequences", "studio_carousels", "sequence_variants", "sequence_log", "account_snapshots", "client_brain",
    "proof_items", "content_items", "call_notes", "client_assets", "payments", "client_provisioning",
    "checklist_steps", "pipeline_touches", "voice_notes", "integrations",
    "integration_events", "delivery_failures", "email_drafts", "page_events", "media",
  ]) {
    assert.equal(env.DB.state[table].length, 0, `${table} retained the deleted client`);
  }

  results.client_deletion = {
    unauthorized_status: unauthorizedResponse.status,
    unknown_status: unknownResponse.status,
    deleted: deleteJson.deleted,
    config_after_delete: getJson.config,
  };
}

await runMaskedGetAndPreservePost();
await runEventBoundaryChecks();
await runStripeHookChecks();
await runPaymentChecks();
await runTenantIsolationCheck();
await runMediaChecks();
await runActivityChecks();
await runRendererTokenChecks();
await runClientDeletionChecks();

console.log(JSON.stringify(results, null, 2));
