-- Which notes were already sent to which subscriber (`features.subscribe`, ADR 0014). One row per
-- subscriber and note slug; the primary key makes a repeated send of the same note impossible to
-- record twice, and the send logic only mails subscribers who have no row for that slug. This
-- replaces `subscribers.last_note` for that decision: one value could not remember several notes.
-- `last_note` stays in place and is still written (it documents the last send) but decides nothing.
-- Rows are removed with their subscriber (`ON DELETE CASCADE`), so deleting an address leaves nothing behind.
-- Part of the site-wide database `elvinlab-dev-db`: each feature owns its tables, named after the
-- feature (`subscriber_notes`), and migrations are one shared sequence `NNNN_<feature>_<change>.sql`.
CREATE TABLE IF NOT EXISTS subscriber_notes (
  subscriber_id TEXT NOT NULL REFERENCES subscribers (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  PRIMARY KEY (subscriber_id, slug)
);
CREATE INDEX IF NOT EXISTS subscriber_notes_slug ON subscriber_notes (slug);
-- Backfill: the only note the old column remembers is the last one each subscriber received. The
-- real send time was never stored, so the confirmation time stands in for it.
INSERT OR IGNORE INTO subscriber_notes (subscriber_id, slug, sent_at)
SELECT id, last_note, COALESCE(confirmed_at, created_at, 0)
FROM subscribers
WHERE last_note IS NOT NULL;
