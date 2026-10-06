-- Email subscribers to new notes (`features.subscribe`, ADR 0014). One row per address, trimmed and
-- lower-cased. Only `confirmed` rows are mailed; `unsubscribed` rows stay as a suppression entry.
-- `subscribe_quota` counts the confirmation emails sent per UTC day (`YYYY-MM-DD`), a global cap
-- that keeps part of the provider's daily pool for notes.
-- The confirmation token is never stored, only its SHA-256 hash, and it is cleared once used.
-- Part of the site-wide database `elvinlab-dev-db`: each feature owns its tables, named after the
-- feature (`subscribers`), and migrations are one shared sequence `NNNN_<feature>_<change>.sql`.
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  locale TEXT NOT NULL CHECK (locale IN ('es', 'en')),
  confirm_hash TEXT,
  confirm_expires INTEGER,
  confirm_sent_at INTEGER,
  last_note TEXT,
  created_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  unsubscribed_at INTEGER
);
CREATE INDEX IF NOT EXISTS subscribers_status ON subscribers (status);
CREATE INDEX IF NOT EXISTS subscribers_confirm_hash ON subscribers (confirm_hash);
CREATE TABLE IF NOT EXISTS subscribe_quota (
  day TEXT PRIMARY KEY,
  confirmations INTEGER NOT NULL DEFAULT 0 CHECK (confirmations >= 0)
);
