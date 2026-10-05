-- Footprints per note ("marks" in the code). One row per published note slug; no visitor data is stored.
-- Part of the site-wide database `elvinlab-dev-db`: each feature owns its tables, named after the
-- feature (`note_footprints`), and migrations are one shared sequence `NNNN_<feature>_<change>.sql`.
CREATE TABLE IF NOT EXISTS note_footprints (
  slug TEXT PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0)
);
