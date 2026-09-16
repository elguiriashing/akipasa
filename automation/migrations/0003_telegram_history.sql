PRAGMA foreign_keys = ON;

CREATE TABLE telegram_messages (
  id TEXT PRIMARY KEY,
  update_id INTEGER,
  telegram_message_id INTEGER NOT NULL,
  chat_id TEXT NOT NULL,
  user_id TEXT,
  username TEXT,
  display_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  command TEXT,
  body TEXT NOT NULL,
  reply_to_message_id INTEGER,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX telegram_messages_update_direction
  ON telegram_messages(update_id, direction)
  WHERE update_id IS NOT NULL;
CREATE INDEX telegram_messages_created ON telegram_messages(created_at DESC);

CREATE TABLE telegram_backups (
  id TEXT PRIMARY KEY,
  requested_by_user_id TEXT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  message_count INTEGER NOT NULL CHECK (message_count >= 0),
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX telegram_backups_created ON telegram_backups(created_at DESC);
