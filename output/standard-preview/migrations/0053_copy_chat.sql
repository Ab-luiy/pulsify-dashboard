-- The Copywriter as a conversation (pulsify-saas #18): every client has their own saved chats,
-- the ratings that teach it, and a short memory of how they like to work. Additive only.
-- client_id is on every row and every query; nothing here is shared between clients.

CREATE TABLE IF NOT EXISTS copy_chats (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT 'New chat',
  format      TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_copy_chats_client
  ON copy_chats (client_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS copy_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id     INTEGER NOT NULL,
  client_id   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  rating      TEXT CHECK (rating IN ('up', 'down')),
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_copy_messages_chat
  ON copy_messages (chat_id, id);

CREATE INDEX IF NOT EXISTS idx_copy_messages_liked
  ON copy_messages (client_id, rating, id DESC);

CREATE TABLE IF NOT EXISTS copy_memory (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id   TEXT NOT NULL,
  note        TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'chat' CHECK (source IN ('chat', 'client')),
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_copy_memory_client
  ON copy_memory (client_id, active, id);
