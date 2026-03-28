-- ============================================================
-- GRIDLOCK  –  Supabase Schema
-- Paste this into the Supabase SQL Editor and run it.
-- ============================================================

-- ── teams ────────────────────────────────────────────────────
CREATE TABLE teams (
  code               TEXT PRIMARY KEY,       -- e.g. GRIDLOCK-FALCON-447
  name               TEXT NOT NULL,
  question_set_id    TEXT NOT NULL,           -- A1 … C3
  coordinate_id      TEXT NOT NULL,           -- A | B | C
  devices_connected  INT  DEFAULT 0,
  questions_solved   INT  DEFAULT 0,
  total_time_seconds INT  DEFAULT 0,
  status             TEXT DEFAULT 'waiting',  -- waiting|active|frozen|disqualified|advanced
  started_at         TIMESTAMPTZ,
  coordinate_revealed BOOLEAN DEFAULT FALSE
);

-- ── question_sets ────────────────────────────────────────────
CREATE TABLE question_sets (
  id            TEXT PRIMARY KEY,   -- A1 … C3
  coordinate_id TEXT NOT NULL,
  label         TEXT
);

-- ── questions ────────────────────────────────────────────────
CREATE TABLE questions (
  id                 TEXT PRIMARY KEY,   -- e.g. B2_Q3
  set_id             TEXT REFERENCES question_sets(id),
  type               TEXT NOT NULL,      -- debug|find_output|fill_missing
  topic              TEXT,               -- OOP|Stack|BST|Queue|Graph
  language           TEXT NOT NULL,      -- python|java|cpp
  image_url          TEXT,               -- Supabase Storage URL
  answer_hash        TEXT NOT NULL,      -- bcrypt hash
  coordinate_segment TEXT,              -- lat_int|lat_dec_12 …
  segment_value      TEXT,
  display_order      INT DEFAULT 0
);

-- ── devices ──────────────────────────────────────────────────
CREATE TABLE devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code   TEXT REFERENCES teams(code),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  last_seen   TIMESTAMPTZ DEFAULT NOW()
);

-- ── submissions ──────────────────────────────────────────────
CREATE TABLE submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code        TEXT REFERENCES teams(code),
  question_id      TEXT REFERENCES questions(id),
  device_id        UUID,
  submitted_answer TEXT,
  is_correct       BOOLEAN DEFAULT FALSE,
  attempt_number   INT DEFAULT 1,
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  time_since_start INT  -- seconds from event start for this team
);

-- ── violations ───────────────────────────────────────────────
CREATE TABLE violations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code   TEXT REFERENCES teams(code),
  device_id   UUID,
  type        TEXT,      -- TAB_SWITCH|DEVTOOLS|FULLSCREEN_EXIT|SHORTCUT
  severity    TEXT,      -- INFO|WARNING|FLAG
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── coordinates (reference table) ────────────────────────────
CREATE TABLE coordinates (
  id        TEXT PRIMARY KEY,   -- A | B | C
  latitude  TEXT,
  longitude TEXT,
  location  TEXT
);

INSERT INTO coordinates VALUES
  ('A', '12.823527° N', '80.04229° E', 'VIT Chennai'),
  ('B', 'TBD',          'TBD',         'TBD'),
  ('C', 'TBD',          'TBD',         'TBD');

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX idx_submissions_team   ON submissions(team_code);
CREATE INDEX idx_submissions_q      ON submissions(question_id);
CREATE INDEX idx_violations_team    ON violations(team_code);
CREATE INDEX idx_devices_team       ON devices(team_code);

-- ── Row-Level Security ────────────────────────────────────────
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices      ENABLE ROW LEVEL SECURITY;

-- Allow service-role (backend) full access; anon key read-only on questions
CREATE POLICY "service full access" ON teams        USING (auth.role() = 'service_role');
CREATE POLICY "service full access" ON submissions  USING (auth.role() = 'service_role');
CREATE POLICY "service full access" ON violations   USING (auth.role() = 'service_role');
CREATE POLICY "service full access" ON devices      USING (auth.role() = 'service_role');
CREATE POLICY "anon read questions" ON questions    FOR SELECT USING (true);

-- ── Storage bucket for question images ───────────────────────
-- Create a bucket called 'questions' in Supabase Dashboard > Storage
-- Set it to PUBLIC so image_url links work without auth