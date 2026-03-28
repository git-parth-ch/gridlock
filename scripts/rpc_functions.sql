-- scripts/rpc_functions.sql
-- Run this in the Supabase SQL Editor AFTER schema.sql
-- These are Postgres functions called via supabase.rpc(...)

-- ── increment_solved ─────────────────────────────────────────
-- Atomically increments questions_solved and updates total_time_seconds.
-- Prevents race conditions when two devices solve simultaneously.
CREATE OR REPLACE FUNCTION increment_solved(p_team_code TEXT, p_time INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE teams
  SET
    questions_solved   = questions_solved + 1,
    total_time_seconds = p_time
  WHERE code = p_team_code;
END;
$$;

-- ── get_leaderboard ──────────────────────────────────────────
-- Returns ranked teams with violation counts.
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  rank               BIGINT,
  code               TEXT,
  name               TEXT,
  question_set_id    TEXT,
  coordinate_id      TEXT,
  questions_solved   INT,
  total_time_seconds INT,
  status             TEXT,
  devices_connected  INT,
  warnings           BIGINT,
  flags              BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY t.questions_solved DESC, t.total_time_seconds ASC) AS rank,
    t.code,
    t.name,
    t.question_set_id,
    t.coordinate_id,
    t.questions_solved,
    t.total_time_seconds,
    t.status,
    t.devices_connected,
    COUNT(v.id) FILTER (WHERE v.severity = 'WARNING') AS warnings,
    COUNT(v.id) FILTER (WHERE v.severity = 'FLAG')    AS flags
  FROM teams t
  LEFT JOIN violations v ON v.team_code = t.code
  GROUP BY t.code
  ORDER BY t.questions_solved DESC, t.total_time_seconds ASC;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION increment_solved TO service_role;
GRANT EXECUTE ON FUNCTION get_leaderboard  TO service_role;