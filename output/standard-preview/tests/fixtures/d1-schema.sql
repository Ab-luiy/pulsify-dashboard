-- Live D1 schema (pulsify-portal), tables only, exported 2026-10-23 with wrangler d1 export --no-data. For tests that need every table.
CREATE TABLE leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client     TEXT NOT NULL,            -- which client this lead belongs to (e.g. "frank")
  email      TEXT,
  name       TEXT,
  revenue    TEXT,
  situation  TEXT,
  applied_at TEXT,
  status     TEXT DEFAULT 'new'
, visitor_id TEXT, session_id TEXT, page_id TEXT, source TEXT DEFAULT 'typeform', response_id TEXT, phone TEXT, answers_json TEXT, kit_status TEXT, utm_json TEXT, updated_at TEXT, ig_handle TEXT);
CREATE TABLE watch_events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  client    TEXT NOT NULL,
  email     TEXT,                      -- ties a watch to a person (passed from the form)
  media_id  TEXT,                      -- which Wistia video
  event     TEXT,                      -- play | progress | end
  percent   INTEGER,                   -- how far they watched
  at        TEXT
, visitor_id TEXT, session_id TEXT, page_id TEXT, wistia_visitor_key TEXT, position_seconds REAL, duration_seconds REAL, watch_seconds REAL DEFAULT 0, unique_seconds REAL, playback_rate REAL, muted INTEGER, metadata_json TEXT, ip TEXT, country TEXT);
CREATE TABLE client_config (
  client         TEXT PRIMARY KEY,
  wistia_media_id TEXT,
  typeform_url    TEXT,
  kit_tag_id      TEXT,
  kit_api_key     TEXT,
  updated_at      TEXT
, client_name TEXT, typeform_webhook_secret TEXT, allowed_origin TEXT, portal_token_hash TEXT, proof_images_json TEXT, template_variant TEXT DEFAULT 'canonical', page_content_json TEXT, status TEXT DEFAULT 'prospect', page_active INTEGER DEFAULT 1, prospect_email TEXT, acquisition_token TEXT);
CREATE TABLE page_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client      TEXT NOT NULL,
  visitor_id  TEXT,
  session_id  TEXT,
  page_id     TEXT,
  event       TEXT NOT NULL,
  email       TEXT,
  path        TEXT,
  referrer    TEXT,
  utm_json    TEXT,
  metadata_json TEXT,
  at          TEXT NOT NULL
, ip TEXT, country TEXT, city TEXT, user_agent TEXT, utm_source TEXT, utm_content TEXT, lat REAL, lng REAL);
CREATE TABLE content_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client        TEXT NOT NULL,
  title         TEXT NOT NULL,
  stage         TEXT NOT NULL DEFAULT 'production',
  platform      TEXT,
  url           TEXT,
  notes         TEXT,
  scheduled_for TEXT,
  updated_at    TEXT
);
CREATE TABLE call_notes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  client         TEXT NOT NULL,
  call_date      TEXT,
  title          TEXT,
  summary        TEXT,
  decisions      TEXT,
  actions        TEXT,
  recording_url  TEXT,
  created_at     TEXT
, booking_ref TEXT, lead_email TEXT, source_kind TEXT);
CREATE TABLE client_assets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client     TEXT NOT NULL,
  label      TEXT NOT NULL,
  kind       TEXT,
  url        TEXT,
  notes      TEXT,
  created_at TEXT
);
CREATE TABLE delivery_failures (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  client TEXT NOT NULL,
  kind   TEXT NOT NULL,
  detail TEXT,
  at     TEXT NOT NULL
);
CREATE TABLE integrations (
  scope       TEXT NOT NULL,
  client_id   TEXT NOT NULL DEFAULT '',
  provider    TEXT NOT NULL,
  config_json TEXT,
  secret_json TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (scope, client_id, provider)
);
CREATE TABLE integration_events (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  provider             TEXT NOT NULL,
  kind                 TEXT NOT NULL,
  client               TEXT,
  external_id          TEXT,
  payload_summary_json TEXT NOT NULL,
  ts                   TEXT NOT NULL
);
CREATE TABLE payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client       TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL,
  rail         TEXT NOT NULL,
  reference    TEXT NOT NULL UNIQUE,
  occurred_at  TEXT NOT NULL,
  recorded_by  TEXT NOT NULL,
  note         TEXT,
  created_at   TEXT NOT NULL
, customer_email TEXT, customer_name TEXT, kind TEXT NOT NULL DEFAULT 'charge', refunded_cents INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS "d1_migrations"(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE media (
  id           TEXT PRIMARY KEY,
  client       TEXT,
  content_type TEXT,
  bytes        BLOB,
  created_at   TEXT
);
CREATE TABLE asset_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT NOT NULL UNIQUE,
  client      TEXT,
  label       TEXT,
  target_url  TEXT NOT NULL,
  lead_email  TEXT,
  created_at  TEXT NOT NULL,
  archived    INTEGER DEFAULT 0
, kind TEXT NOT NULL DEFAULT 'asset', video_id TEXT, placement TEXT, source TEXT, slug TEXT, origin TEXT, video_url TEXT);
CREATE TABLE asset_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  token       TEXT NOT NULL,
  client      TEXT,
  lead_email  TEXT,
  ip          TEXT,
  country     TEXT,
  city        TEXT,
  user_agent  TEXT,
  referrer    TEXT,
  at          TEXT NOT NULL
);
CREATE TABLE crm_overrides (
  name TEXT PRIMARY KEY,        -- lead name (CRM key)
  data TEXT NOT NULL,           -- JSON override object (status, fields, transcript, profile, assets, _ts)
  ts INTEGER NOT NULL DEFAULT 0,   -- client wall-clock ms of last edit (conflict resolution)
  sts INTEGER NOT NULL DEFAULT 0,  -- server wall-clock ms of last write (delta pulls)
  updated_at TEXT NOT NULL
);
CREATE TABLE crm_added (
  name TEXT PRIMARY KEY,        -- manually added lead name
  data TEXT NOT NULL,           -- JSON lead object {n,h,niche,dms,stage,_ts}
  ts INTEGER NOT NULL DEFAULT 0,
  sts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE crm_removed (
  name TEXT PRIMARY KEY,        -- lead name with a removal/restore record
  data TEXT NOT NULL,           -- JSON removedReasons entry {reason,note,at,restored,_ts,...}
  ts INTEGER NOT NULL DEFAULT 0,
  sts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE client_auth (
  client_id   TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  pass_hash   TEXT,
  pass_salt   TEXT,
  iterations  INTEGER NOT NULL DEFAULT 150000,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE TABLE client_sessions (
  token_hash  TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE TABLE client_setup_tokens (
  token_hash  TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL,
  email       TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
, emailed_at TEXT);
CREATE TABLE client_login_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT NOT NULL,
  attempted_at TEXT NOT NULL
, ip_hash TEXT);
CREATE TABLE client_dashboard_content (
  client_id   TEXT NOT NULL,
  section     TEXT NOT NULL,
  json        TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (client_id, section)
);
CREATE TABLE studio_sequences (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT NOT NULL,
  type          TEXT,
  intent        TEXT,
  topic         TEXT NOT NULL,
  goal          TEXT,
  trigger_word  TEXT,
  params_json   TEXT NOT NULL,
  output_json   TEXT,
  manual_prompt TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  review_note   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE TABLE client_email_codes (
  client_id   TEXT NOT NULL,
  email       TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  PRIMARY KEY (client_id, email, purpose)
);
CREATE TABLE sequence_log (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id          TEXT NOT NULL,
  posted_on          TEXT NOT NULL,
  type               TEXT NOT NULL,
  topic              TEXT NOT NULL,
  slide_count        INTEGER NOT NULL,
  slide_views_json   TEXT NOT NULL,
  dms                INTEGER,
  profile_visits     INTEGER,
  notes              TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE TABLE account_snapshots (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id    TEXT NOT NULL,
  taken_on     TEXT NOT NULL,
  followers    INTEGER NOT NULL,
  icp_leads    INTEGER,
  avg_views    INTEGER,
  notes        TEXT,
  created_at   TEXT NOT NULL
);
CREATE TABLE proof_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('image-link','video-link','screenshot-link')),
  url         TEXT NOT NULL,
  claim       TEXT,
  permission  TEXT NOT NULL DEFAULT 'unknown' CHECK (permission IN ('unknown','granted','denied')),
  created_at  TEXT NOT NULL
);
CREATE TABLE operator_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  client     TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE impersonation_sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash    TEXT UNIQUE,
  exchange_hash TEXT UNIQUE,
  client_id     TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  created_by    TEXT NOT NULL,
  consumed_at   TEXT
);
CREATE TABLE email_drafts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client     TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  tag_id     TEXT,
  status     TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'failed')),
  created_at TEXT NOT NULL,
  sent_at    TEXT
);
CREATE TABLE studio_carousels (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT NOT NULL,
  structure     TEXT NOT NULL,
  topic         TEXT NOT NULL,
  goal          TEXT NOT NULL,
  params_json   TEXT NOT NULL,
  output_json   TEXT,
  manual_prompt TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
  review_note   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE TABLE sequence_variants (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id        TEXT NOT NULL,
  sequence_ref     INTEGER NOT NULL,
  label            TEXT NOT NULL,
  hook_text        TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('testing', 'won', 'lost', 'retired')),
  completion_pct   REAL CHECK (completion_pct IS NULL OR (completion_pct >= 0 AND completion_pct <= 100)),
  started_at       TEXT NOT NULL,
  resolved_at      TEXT,
  created_at       TEXT NOT NULL,
  UNIQUE (client_id, sequence_ref, label)
);
CREATE TABLE asset_clicks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  asset      TEXT NOT NULL,
  cta        TEXT,
  path       TEXT,
  country    TEXT,
  ua         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE copywriter_usage (client_id TEXT NOT NULL, day TEXT NOT NULL, requests INTEGER NOT NULL DEFAULT 0, last_at INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(client_id,day));
CREATE TABLE client_media_order (client_id TEXT PRIMARY KEY, ids_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL);
CREATE TABLE contract_provisioning (envelope_id TEXT PRIMARY KEY, account_id TEXT NOT NULL, client_id TEXT NOT NULL, email TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN ('pending','delivered','existing','expired')), invitation_cipher TEXT, expires_at TEXT, created_at TEXT NOT NULL, delivered_at TEXT);
CREATE TABLE metric_points ( id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT NOT NULL CHECK(scope IN ('operator','client')), client_id TEXT NOT NULL DEFAULT '', source TEXT NOT NULL, metric TEXT NOT NULL, ts TEXT NOT NULL, value REAL, value_text TEXT, dims_json TEXT NOT NULL DEFAULT '{}', UNIQUE(scope, client_id, source, metric, ts, dims_json) );
CREATE TABLE snapshots ( scope TEXT NOT NULL CHECK(scope IN ('operator','client')), client_id TEXT NOT NULL DEFAULT '', source TEXT NOT NULL, kind TEXT NOT NULL, captured_at TEXT NOT NULL, payload_json TEXT NOT NULL, PRIMARY KEY (scope, client_id, source, kind) );
CREATE TABLE stories ( scope TEXT NOT NULL CHECK(scope IN ('operator','client')), client_id TEXT NOT NULL DEFAULT '', media_id TEXT PRIMARY KEY, captured_at TEXT NOT NULL, payload_json TEXT NOT NULL );
CREATE TABLE yt_leads ( id TEXT PRIMARY KEY, payload_json TEXT NOT NULL, score REAL, tier TEXT, niche TEXT, updated_at TEXT NOT NULL );
CREATE TABLE yt_leads_meta ( key TEXT PRIMARY KEY, value_json TEXT NOT NULL );
CREATE TABLE operator_state ( operator_email TEXT NOT NULL, key TEXT NOT NULL, value_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (operator_email, key) );
CREATE TABLE sync_runs ( id INTEGER PRIMARY KEY AUTOINCREMENT, job TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL CHECK(status IN ('running','success','error')), items INTEGER NOT NULL DEFAULT 0, error TEXT );
CREATE TABLE ig_conversations ( id TEXT PRIMARY KEY, operator_email TEXT NOT NULL, connected_account_id TEXT NOT NULL DEFAULT '', participant_id TEXT, participant_username TEXT, participant_name TEXT, first_message_at TEXT, last_message_at TEXT NOT NULL, last_direction TEXT CHECK(last_direction IN ('inbound','outbound')), payload_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL );
CREATE TABLE ig_messages ( id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, operator_email TEXT NOT NULL, direction TEXT NOT NULL CHECK(direction IN ('inbound','outbound')), sent_at TEXT NOT NULL, text TEXT, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (conversation_id) REFERENCES ig_conversations(id) ON DELETE CASCADE );
CREATE TABLE workspace_preferences (
 client_id TEXT NOT NULL,
 key TEXT NOT NULL,
 value_json TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 PRIMARY KEY (client_id, key)
);
CREATE TABLE payment_matches ( id INTEGER PRIMARY KEY AUTOINCREMENT, payment_id INTEGER NOT NULL, client_id TEXT NOT NULL, target_kind TEXT NOT NULL CHECK(target_kind IN ('crm_lead','workspace_record','contact_email')), target_id TEXT NOT NULL, target_label TEXT, confidence REAL NOT NULL DEFAULT 0, reasons_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL CHECK(status IN ('suggested','confirmed','rejected')), decided_by TEXT, decided_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL );
CREATE TABLE webhook_endpoints ( id TEXT PRIMARY KEY, scope TEXT NOT NULL CHECK(scope IN ('operator','client')), client_id TEXT NOT NULL DEFAULT '', url TEXT NOT NULL, secret_enc TEXT NOT NULL, events_json TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1, description TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL );
CREATE TABLE webhook_outbox ( id TEXT PRIMARY KEY, scope TEXT NOT NULL CHECK(scope IN ('operator','client')), client_id TEXT NOT NULL DEFAULT '', event TEXT NOT NULL, payload_json TEXT NOT NULL, is_test INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, dispatched_at TEXT );
CREATE TABLE webhook_deliveries ( id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, event_id TEXT NOT NULL, attempt INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT, status TEXT NOT NULL CHECK(status IN ('pending','delivered','failed')), status_code INTEGER, error TEXT, sent_at TEXT, created_at TEXT NOT NULL, UNIQUE(endpoint_id, event_id) );
CREATE TABLE api_keys ( id TEXT PRIMARY KEY, scope TEXT NOT NULL CHECK(scope IN ('operator','client')), client_id TEXT NOT NULL DEFAULT '', key_hash TEXT NOT NULL UNIQUE, key_prefix TEXT NOT NULL, label TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, last_used_at TEXT, revoked_at TEXT );
CREATE TABLE api_key_usage ( key_id TEXT NOT NULL, bucket TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (key_id, bucket) );
CREATE TABLE ingest_records ( id TEXT PRIMARY KEY, scope TEXT NOT NULL CHECK(scope IN ('operator','client')), client_id TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL CHECK(kind IN ('lead','message','metric','payment')), external_id TEXT, payload_json TEXT NOT NULL, key_id TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(scope, client_id, kind, external_id) );
CREATE TABLE client_provisioning (
  client_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('docusign','payment','operator')),
  contract_ref TEXT,
  provisioned_at TEXT NOT NULL,
  provisioned_by TEXT NOT NULL,
  welcome_state TEXT NOT NULL DEFAULT 'pending' CHECK(welcome_state IN ('pending','sent','failed','skipped')),
  welcome_attempts INTEGER NOT NULL DEFAULT 0,
  welcome_sent_at TEXT,
  welcome_error TEXT
);
CREATE TABLE checklist_steps (
  client_id TEXT NOT NULL,
  step TEXT NOT NULL,
  position INTEGER NOT NULL,
  state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','skipped','done')),
  completed_by TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (client_id, step)
);
CREATE TABLE pipeline_touches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('application','optin','booking','payment')),
  ts TEXT NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT,
  amount_cents INTEGER,
  payload_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE(client_id, kind, external_id)
);
CREATE TABLE voice_notes (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  transcript TEXT,
  state TEXT NOT NULL DEFAULT 'uploaded' CHECK(state IN ('uploaded','transcribed','failed','applied')),
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE ig_outreach ( conversation_id TEXT PRIMARY KEY, operator_email TEXT NOT NULL DEFAULT 'operator', pfp_url TEXT, sentiment TEXT CHECK(sentiment IN ('positive','negative')), outcome TEXT CHECK(outcome IN ('booked','closed','lost')), hibernated_at TEXT, notes TEXT, seen_at TEXT, seen_notified_at TEXT, reply_notified_at TEXT, updated_at TEXT NOT NULL , pain_tags TEXT, asset_log TEXT, relation TEXT);
CREATE TABLE ig_outreach_events ( id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('seen','reply','booked','closed','hibernated')), handle TEXT, name TEXT, text TEXT, created_at TEXT NOT NULL, delivered_at TEXT );
CREATE TABLE zernio_events ( id TEXT PRIMARY KEY, event TEXT NOT NULL, received_at TEXT NOT NULL , payload_json TEXT);
CREATE TABLE zernio_conversation_map ( zernio_id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, account_id TEXT, updated_time TEXT, synced_at TEXT NOT NULL );
CREATE TABLE notifications ( id TEXT PRIMARY KEY, scope TEXT NOT NULL CHECK(scope IN ('operator','client')), client_id TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'info' CHECK(severity IN ('info','success','warn','error')), title TEXT NOT NULL, body TEXT, link TEXT, entity_json TEXT, dedupe_key TEXT, created_at TEXT NOT NULL, read_at TEXT );
CREATE TABLE search_index_state ( doc_id TEXT PRIMARY KEY, kind TEXT NOT NULL, scope TEXT NOT NULL, content_hash TEXT NOT NULL, indexed_at TEXT NOT NULL , source_id TEXT);
CREATE TABLE outreach_queue ( id TEXT PRIMARY KEY, handle TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('crm','yt_leads','manual')), name TEXT, niche TEXT, detail TEXT, gap TEXT NOT NULL DEFAULT '', link TEXT, draft TEXT, status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','sent','skipped','replied')), position INTEGER, conversation_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sent_at TEXT, skipped_at TEXT, UNIQUE(handle) );
CREATE TABLE automation_runs (
  kind       TEXT NOT NULL,
  ref        TEXT NOT NULL,
  client_id  TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL,
  detail     TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (kind, ref)
);
CREATE TABLE client_provider_identities (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (provider, provider_user_id, provider_org_id),
  UNIQUE (provider, provider_user_id, client_id),
  FOREIGN KEY (client_id) REFERENCES client_config(client)
);
CREATE TABLE operator_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS "workspace_records" (
 id TEXT PRIMARY KEY,
 client_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('youtube','lead','copy','reference','idea')),
 title TEXT NOT NULL,
 data_json TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE studio_feedback (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id    TEXT NOT NULL,
  sequence_id  INTEGER,
  rule         TEXT NOT NULL,
  scope        TEXT NOT NULL DEFAULT 'client',
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
, format TEXT NOT NULL DEFAULT '');
CREATE TABLE yt_videos (
  client_id        TEXT NOT NULL,
  video_id         TEXT NOT NULL,
  channel_id       TEXT,
  title            TEXT NOT NULL DEFAULT '',
  published_at     TEXT,
  thumbnail_url    TEXT,
  duration_seconds INTEGER,
  views            INTEGER,
  likes            INTEGER,
  comments         INTEGER,
  synced_at        TEXT NOT NULL,
  PRIMARY KEY (client_id, video_id)
);
CREATE TABLE lead_outcomes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id    TEXT NOT NULL,
  email        TEXT NOT NULL,
  booking_ref  TEXT,
  call_at      TEXT,
  attended     TEXT CHECK (attended IN ('showed','no_show','cancelled','rescheduled')),
  result       TEXT CHECK (result IN ('closed','not_closed','follow_up','unqualified')),
  deal_cents   INTEGER,
  payment_type TEXT CHECK (payment_type IN ('pif','plan','finance','deposit')),
  pre_sold     TEXT CHECK (pre_sold IN ('yes','somewhat','no')),
  objection    TEXT,
  notes        TEXT,
  closer       TEXT,
  created_by   TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
, closer_id TEXT, setter_id TEXT);
CREATE TABLE call_flags (
  client_id    TEXT NOT NULL,
  booking_ref  TEXT NOT NULL,
  confirmed_at TEXT,
  confirmed_by TEXT,
  PRIMARY KEY (client_id, booking_ref)
);
CREATE TABLE lead_models (
  client_id   TEXT PRIMARY KEY,
  model_json  TEXT NOT NULL,
  fitted_at   TEXT NOT NULL
);
CREATE TABLE lead_score_snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  person_key  TEXT NOT NULL,
  score       INTEGER NOT NULL,
  band        TEXT NOT NULL,
  stage       TEXT NOT NULL,
  at          TEXT NOT NULL
);
CREATE TABLE team_members (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  name           TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('setter','closer','both')),
  email          TEXT,
  commission_pct REAL,
  setter_pct     REAL,
  link_token     TEXT,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE TABLE team_forms (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  member_id   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('eod','set')),
  lead_email  TEXT,
  data_json   TEXT NOT NULL DEFAULT '{}',
  day         TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE TABLE commission_payouts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id     TEXT NOT NULL,
  member_id     TEXT NOT NULL,
  period_start  TEXT NOT NULL,
  period_end    TEXT NOT NULL,
  amount_cents  INTEGER NOT NULL,
  paid_at       TEXT NOT NULL,
  paid_by       TEXT NOT NULL,
  UNIQUE (client_id, member_id, period_start)
);
CREATE TABLE access_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  link TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  decided_at TEXT,
  decided_by TEXT,
  client_id TEXT
, role TEXT);
CREATE TABLE operator_users (
  email TEXT PRIMARY KEY,
  name TEXT,
  added_by TEXT,
  created_at TEXT NOT NULL,
  removed_at TEXT
);
CREATE TABLE operator_auth (
  email TEXT PRIMARY KEY,
  pass_hash TEXT NOT NULL,
  pass_salt TEXT NOT NULL,
  iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE operator_setup_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE operator_challenges (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  trust INTEGER NOT NULL DEFAULT 0,
  next TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE operator_devices (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE content_reviews (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id      TEXT NOT NULL,
  record_id      TEXT NOT NULL,
  format         TEXT NOT NULL DEFAULT 'youtube',
  title          TEXT NOT NULL,
  snapshot_json  TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'review',
  review_note    TEXT,
  submitted_at   TEXT NOT NULL,
  decided_at     TEXT
);
CREATE TABLE receipts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no   TEXT NOT NULL UNIQUE,
  token        TEXT NOT NULL UNIQUE,
  payment_id   INTEGER NOT NULL UNIQUE,
  client       TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'USD',
  asset        TEXT NOT NULL,
  network      TEXT NOT NULL,
  txid         TEXT NOT NULL,
  note         TEXT,
  issued_at    TEXT NOT NULL,
  issued_by    TEXT NOT NULL
, emailed_at TEXT, email_error TEXT);
CREATE TABLE pulsify_wallets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  asset      TEXT NOT NULL,
  network    TEXT NOT NULL,
  address    TEXT NOT NULL,
  label      TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE (asset, network, address)
);
CREATE TABLE copy_chats (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT 'New chat',
  format      TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE TABLE copy_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id     INTEGER NOT NULL,
  client_id   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  rating      TEXT CHECK (rating IN ('up', 'down')),
  created_at  TEXT NOT NULL
);
CREATE TABLE copy_memory (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  note        TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'chat' CHECK (source IN ('chat', 'client')),
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);
CREATE TABLE sales_targets (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  member_id TEXT,
  metric TEXT NOT NULL CHECK(metric IN ('calls_taken','show_rate','close_rate','cash_collected_cents','eod_forms_filed')),
  period TEXT NOT NULL CHECK(period IN ('week','month')),
  target REAL NOT NULL CHECK(target >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE operator_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storage_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  folder TEXT NOT NULL CHECK (folder IN ('portraits','everyday','scenery','other')),
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  uploaded_by TEXT NOT NULL
);
CREATE TABLE usage_counters (client TEXT NOT NULL, kind TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (client, kind, day));
CREATE TABLE incoming_transfers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id    INTEGER NOT NULL,
  asset        TEXT NOT NULL,
  network      TEXT NOT NULL,
  txid         TEXT NOT NULL,
  log_index    INTEGER NOT NULL,
  from_address TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'needs_client' CHECK(status IN ('needs_client','receipted','dismissed','ignored')),
  client       TEXT,
  receipt_no   TEXT,
  seen_at      TEXT NOT NULL,
  notified_at  TEXT,
  UNIQUE (txid, log_index)
);
CREATE TABLE client_payer_addresses (
  address    TEXT PRIMARY KEY,
  client     TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE crypto_watch_state (
  wallet_id  INTEGER PRIMARY KEY,
  last_block INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE form_drafts (
  client_id TEXT NOT NULL,
  form_key TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  position TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (client_id, form_key)
);
CREATE TABLE sale_stories (
  client_id TEXT PRIMARY KEY,
  answers_json TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE onboarding_needs (
  client_id TEXT NOT NULL,
  need_key TEXT NOT NULL,
  state TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (client_id, need_key)
);
CREATE TABLE client_brain_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  section TEXT NOT NULL,
  field TEXT NOT NULL,
  value_json TEXT NOT NULL,
  source TEXT,
  replaced_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "client_brain" (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  section     TEXT NOT NULL,
  field       TEXT NOT NULL,
  value_json  TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('client-form','voice-note','transcript','operator','research')),
  updated_at  TEXT NOT NULL,
  UNIQUE (client_id, section, field)
);
CREATE TABLE link_domains (
  host         TEXT PRIMARY KEY,
  client       TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active')),
  created_at   TEXT NOT NULL,
  checked_at   TEXT,
  activated_at TEXT,
  check_json   TEXT
);
CREATE TABLE lead_merge_decisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  TEXT NOT NULL,
  key_a      TEXT NOT NULL,
  key_b      TEXT NOT NULL,
  decision   TEXT NOT NULL CHECK (decision IN ('same','different')),
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  UNIQUE (client_id, key_a, key_b)
);
CREATE TABLE ig_contacts (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  ig_user_id     TEXT NOT NULL,
  ig_username    TEXT,
  ig_name        TEXT,
  lead_email     TEXT,
  lead_phone     TEXT,
  link_source    TEXT,
  first_dm_at    TEXT NOT NULL,
  last_dm_at     TEXT NOT NULL,
  first_ref      TEXT,
  first_ref_label TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE (client_id, ig_user_id)
);
CREATE TABLE ig_dm_events (
  message_id TEXT PRIMARY KEY,
  client_id  TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  direction  TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  at         TEXT NOT NULL,
  ref        TEXT,
  ref_label  TEXT
);
CREATE TABLE follower_places (
  client_id  TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('country','city')),
  place      TEXT NOT NULL,
  followers  INTEGER NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (client_id, kind, place)
);
CREATE TABLE contracts (
  id                  TEXT PRIMARY KEY,
  crm_key             TEXT NOT NULL,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  upfront_cents       INTEGER NOT NULL DEFAULT 500000,
  fee_percent         INTEGER NOT NULL DEFAULT 30,
  start_revenue_cents INTEGER NOT NULL,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','signed','declined','voided')),
  envelope_id         TEXT,
  send_error          TEXT,
  created_by          TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  sent_at             TEXT,
  signed_at           TEXT
);
CREATE TABLE workflow_recipes (
  client_id   TEXT NOT NULL,
  kind        TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 0,
  config_json TEXT NOT NULL DEFAULT '{}',
  public_slug TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (client_id, kind)
);
CREATE TABLE workflow_runs (
  id            TEXT PRIMARY KEY,
  client_id     TEXT NOT NULL,
  kind          TEXT NOT NULL,
  flow          TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  trigger_ref   TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('running','awaiting_approval','waiting','done','failed','rejected','skipped')),
  step_index    INTEGER NOT NULL DEFAULT 0,
  steps_json    TEXT NOT NULL DEFAULT '[]',
  state_json    TEXT NOT NULL DEFAULT '{}',
  summary       TEXT,
  error         TEXT,
  is_test       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  finished_at   TEXT,
  UNIQUE (client_id, kind, trigger_ref)
);
CREATE TABLE lead_magnet_captures (
  id               TEXT PRIMARY KEY,
  client_id        TEXT NOT NULL,
  slug             TEXT NOT NULL,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  visitor_id       TEXT,
  run_id           TEXT,
  lead_id          INTEGER,
  download_token   TEXT NOT NULL,
  download_expires TEXT NOT NULL,
  emailed_at       TEXT,
  downloaded_at    TEXT,
  is_test          INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL
);
CREATE INDEX idx_leads_client ON leads (client);
CREATE INDEX idx_watch_client ON watch_events (client);
CREATE INDEX idx_leads_client_email ON leads (client, email);
CREATE INDEX idx_leads_visitor ON leads (client, visitor_id);
CREATE INDEX idx_watch_visitor ON watch_events (client, visitor_id);
CREATE INDEX idx_watch_session ON watch_events (client, session_id);
CREATE INDEX idx_page_events_client ON page_events (client, event);
CREATE INDEX idx_page_events_visitor ON page_events (client, visitor_id);
CREATE INDEX idx_client_config_portal_token
  ON client_config (portal_token_hash);
CREATE INDEX idx_content_items_client_stage ON content_items (client, stage);
CREATE INDEX idx_call_notes_client_date ON call_notes (client, call_date);
CREATE INDEX idx_client_assets_client ON client_assets (client);
CREATE INDEX idx_delivery_failures_client_at ON delivery_failures (client, at);
CREATE UNIQUE INDEX idx_integration_events_external
  ON integration_events (provider, kind, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX idx_integration_events_client_ts
  ON integration_events (client, ts);
CREATE INDEX idx_payments_client_occurred
  ON payments (client, occurred_at);
CREATE INDEX idx_media_client ON media (client);
CREATE INDEX idx_asset_links_client ON asset_links (client);
CREATE INDEX idx_asset_events_token ON asset_events (token);
CREATE INDEX idx_crm_overrides_sts ON crm_overrides (sts);
CREATE INDEX idx_client_sessions_client
  ON client_sessions (client_id, expires_at);
CREATE INDEX idx_client_setup_tokens_client
  ON client_setup_tokens (client_id, expires_at);
CREATE INDEX idx_client_login_attempts_email_time
  ON client_login_attempts (email, attempted_at);
CREATE INDEX idx_client_dashboard_content_client
  ON client_dashboard_content (client_id);
CREATE INDEX idx_studio_sequences_client_status
  ON studio_sequences (client_id, status, updated_at DESC);
CREATE INDEX idx_client_email_codes_expires
  ON client_email_codes (expires_at);
CREATE INDEX idx_sequence_log_client_posted
  ON sequence_log (client_id, posted_on);
CREATE INDEX idx_account_snapshots_client_taken
  ON account_snapshots (client_id, taken_on);
CREATE INDEX idx_proof_items_client_created
  ON proof_items (client_id, created_at);
CREATE INDEX idx_operator_events_client_created
  ON operator_events (client, created_at DESC);
CREATE INDEX idx_operator_events_created
  ON operator_events (created_at DESC);
CREATE INDEX idx_impersonation_sessions_client_expiry
  ON impersonation_sessions (client_id, expires_at);
CREATE INDEX idx_impersonation_sessions_creator_time
  ON impersonation_sessions (created_by, created_at DESC);
CREATE INDEX idx_email_drafts_created_at
  ON email_drafts (created_at DESC);
CREATE INDEX idx_email_drafts_client_created_at
  ON email_drafts (client, created_at DESC);
CREATE INDEX idx_studio_carousels_client_status
  ON studio_carousels (client_id, status, updated_at DESC);
CREATE INDEX idx_studio_carousels_review
  ON studio_carousels (status, updated_at DESC);
CREATE INDEX idx_sequence_variants_client_status
  ON sequence_variants (client_id, status, started_at);
CREATE INDEX idx_sequence_variants_sequence
  ON sequence_variants (client_id, sequence_ref, id);
CREATE UNIQUE INDEX idx_client_config_acquisition_token
  ON client_config (acquisition_token);
CREATE INDEX idx_asset_clicks_asset ON asset_clicks(asset, created_at);
CREATE INDEX idx_metric_points_lookup ON metric_points (scope, client_id, source, metric, ts);
CREATE INDEX idx_snapshots_scope_client ON snapshots (scope, client_id);
CREATE INDEX idx_stories_scope_client_captured ON stories (scope, client_id, captured_at);
CREATE INDEX idx_yt_leads_filter ON yt_leads (tier, niche, score DESC, updated_at DESC);
CREATE INDEX idx_sync_runs_job_started ON sync_runs (job, started_at DESC);
CREATE INDEX idx_ig_conversations_operator_recent ON ig_conversations (operator_email, last_message_at DESC);
CREATE UNIQUE INDEX idx_ig_conversations_operator_participant ON ig_conversations (operator_email, connected_account_id, participant_id) WHERE participant_id IS NOT NULL AND participant_id <> '';
CREATE INDEX idx_ig_messages_conversation_sent ON ig_messages (conversation_id, sent_at);
CREATE INDEX idx_ig_messages_operator_sent ON ig_messages (operator_email, sent_at DESC);
CREATE UNIQUE INDEX idx_payment_matches_one_confirmed ON payment_matches (payment_id) WHERE status='confirmed';
CREATE INDEX idx_payment_matches_client_status ON payment_matches (client_id, status, updated_at DESC);
CREATE INDEX idx_payment_matches_payment ON payment_matches (payment_id, status);
CREATE INDEX idx_webhook_endpoints_scope_client ON webhook_endpoints (scope, client_id, active);
CREATE INDEX idx_webhook_outbox_pending ON webhook_outbox (dispatched_at, created_at);
CREATE INDEX idx_webhook_deliveries_due ON webhook_deliveries (status, next_attempt_at);
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries (endpoint_id, created_at DESC);
CREATE INDEX idx_api_keys_scope_client ON api_keys (scope, client_id, revoked_at);
CREATE INDEX idx_pipeline_touches_contact
  ON pipeline_touches (client_id, contact_email, ts DESC);
CREATE INDEX idx_voice_notes_client
  ON voice_notes (client_id, created_at DESC);
CREATE INDEX idx_ig_outreach_events_recent ON ig_outreach_events (created_at DESC);
CREATE INDEX idx_zernio_map_conversation ON zernio_conversation_map (conversation_id);
CREATE INDEX idx_notifications_feed ON notifications (scope, client_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (scope, client_id, read_at);
CREATE UNIQUE INDEX idx_notifications_dedupe ON notifications (dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX idx_search_index_kind ON search_index_state (kind, indexed_at);
CREATE INDEX idx_search_index_source ON search_index_state (source_id);
CREATE INDEX idx_notifications_operator_feed ON notifications(scope, created_at DESC) WHERE kind != 'system';
CREATE INDEX idx_notifications_operator_unread ON notifications(scope, read_at) WHERE kind != 'system';
CREATE INDEX idx_ig_messages_search_recent ON ig_messages(sent_at DESC) WHERE text IS NOT NULL AND length(text)>=12;
CREATE INDEX idx_ig_outreach_seen_pending ON ig_outreach(seen_at) WHERE seen_at IS NOT NULL AND seen_notified_at IS NULL;
CREATE INDEX idx_sync_runs_active ON sync_runs(job, started_at) WHERE status='running';
CREATE INDEX idx_outreach_queue_status_position ON outreach_queue (status, position);
CREATE INDEX idx_automation_runs_client ON automation_runs (client_id, kind, created_at);
CREATE INDEX idx_client_provider_identities_client
  ON client_provider_identities(client_id);
CREATE INDEX idx_operator_sessions_expires
  ON operator_sessions (expires_at);
CREATE INDEX workspace_records_client ON workspace_records(client_id,kind,updated_at);
CREATE INDEX idx_studio_feedback_client
  ON studio_feedback (client_id, active, created_at DESC);
CREATE INDEX idx_studio_feedback_scope
  ON studio_feedback (scope, active, created_at DESC);
CREATE INDEX idx_yt_videos_client_published
  ON yt_videos (client_id, published_at DESC);
CREATE UNIQUE INDEX idx_asset_links_video
  ON asset_links (client, video_id, placement) WHERE kind='video';
CREATE INDEX idx_page_events_utm_content
  ON page_events (client, utm_content, at);
CREATE INDEX idx_page_events_client_visitor
  ON page_events (client, visitor_id, at);
CREATE INDEX idx_page_events_client_at
  ON page_events (client, at);
CREATE INDEX idx_watch_events_client_visitor
  ON watch_events (client, visitor_id, at);
CREATE UNIQUE INDEX idx_lead_outcomes_booking
  ON lead_outcomes (client_id, booking_ref) WHERE booking_ref IS NOT NULL;
CREATE INDEX idx_lead_outcomes_client_email
  ON lead_outcomes (client_id, email, call_at);
CREATE INDEX idx_lead_score_snapshots_person
  ON lead_score_snapshots (client_id, person_key, at);
CREATE INDEX idx_asset_links_client_kind ON asset_links (client, kind);
CREATE INDEX idx_team_members_client ON team_members (client_id, active);
CREATE INDEX idx_team_forms_client_day ON team_forms (client_id, day);
CREATE INDEX idx_access_requests_status ON access_requests(status, created_at);
CREATE INDEX idx_access_requests_email ON access_requests(email);
CREATE INDEX idx_client_login_attempts_ip_time ON client_login_attempts (ip_hash, attempted_at);
CREATE INDEX idx_operator_setup_tokens_email ON operator_setup_tokens (email);
CREATE INDEX idx_operator_devices_email ON operator_devices (email);
CREATE INDEX idx_content_reviews_status
  ON content_reviews (status, submitted_at DESC);
CREATE INDEX idx_content_reviews_client
  ON content_reviews (client_id, format, status, decided_at DESC);
CREATE INDEX idx_content_reviews_record
  ON content_reviews (client_id, record_id, id DESC);
CREATE INDEX idx_receipts_client ON receipts (client, issued_at DESC);
CREATE INDEX idx_copy_chats_client
  ON copy_chats (client_id, updated_at DESC);
CREATE INDEX idx_copy_messages_chat
  ON copy_messages (chat_id, id);
CREATE INDEX idx_copy_messages_liked
  ON copy_messages (client_id, rating, id DESC);
CREATE INDEX idx_copy_memory_client
  ON copy_memory (client_id, active, id);
CREATE UNIQUE INDEX sales_targets_scope ON sales_targets(client_id, COALESCE(member_id,''), metric, period);
CREATE INDEX call_notes_booking ON call_notes(client, booking_ref);
CREATE INDEX idx_incoming_transfers_status ON incoming_transfers (status, seen_at DESC);
CREATE INDEX idx_client_brain_history ON client_brain_history (client_id, replaced_at);
CREATE INDEX idx_client_brain_client_section
  ON client_brain (client_id, section);
CREATE UNIQUE INDEX idx_asset_links_client_slug
  ON asset_links (client, slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_asset_links_slug ON asset_links (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX idx_asset_links_auto_video
  ON asset_links (client, video_id) WHERE origin = 'youtube-sync';
CREATE INDEX idx_lead_merge_client ON lead_merge_decisions (client_id);
CREATE INDEX idx_ig_contacts_username ON ig_contacts (client_id, ig_username);
CREATE INDEX idx_ig_dm_events_contact ON ig_dm_events (client_id, contact_id, at);
CREATE INDEX idx_contracts_crm_key ON contracts (crm_key, created_at);
CREATE INDEX idx_contracts_envelope ON contracts (envelope_id);
CREATE UNIQUE INDEX idx_workflow_recipes_slug ON workflow_recipes (public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX idx_workflow_runs_client ON workflow_runs (client_id, created_at DESC);
CREATE INDEX idx_lead_magnet_captures_client ON lead_magnet_captures (client_id, created_at DESC);
CREATE UNIQUE INDEX idx_lead_magnet_captures_token ON lead_magnet_captures (download_token);
