-- Footprints ("marks") per note. One row per published note slug; no visitor data is stored.
CREATE TABLE IF NOT EXISTS marks (
  slug TEXT PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0)
);
