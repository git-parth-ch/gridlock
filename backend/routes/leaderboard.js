const router = require('express').Router();
const supabase = require('../db/supabase');

// Public leaderboard — no auth required
router.get('/leaderboard', async (req, res) => {
  const { data: teams, error } = await supabase
    .from('teams')
    .select(`
      code,
      name,
      question_set_id,
      coordinate_id,
      questions_solved,
      total_time_seconds,
      status,
      devices_connected,
      started_at
    `)
    .neq('status', 'waiting')        // only show teams that have started
    .order('questions_solved', { ascending: false })
    .order('total_time_seconds', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const nowMs = Date.now();

  // Add rank field
  const ranked = (teams || []).map((team, i) => ({
    ...team,
    rank: i + 1,
    total_time_seconds: (team.total_time_seconds || 0) + (
      team.status === 'active' && team.started_at
        ? Math.max(0, Math.floor((nowMs - new Date(team.started_at).getTime()) / 1000))
        : 0
    ),
    // Format time nicely
    timeFormatted: formatTime(
      (team.total_time_seconds || 0) + (
        team.status === 'active' && team.started_at
          ? Math.max(0, Math.floor((nowMs - new Date(team.started_at).getTime()) / 1000))
          : 0
      )
    ),
    // Don't expose sensitive info
    coordinate_id: undefined,
  }));

  res.json(ranked);
});

// Public event status
router.get('/leaderboard/status', async (req, res) => {
  const { data: teams, error } = await supabase
    .from('teams')
    .select('status');

  if (error) return res.status(500).json({ error: error.message });

  const statuses = (teams || []).map(t => t.status);
  if (statuses.length === 0) return res.json({ status: 'waiting' });
  if (statuses.every(s => s === 'waiting')) return res.json({ status: 'waiting' });
  if (statuses.every(s => s === 'ended')) return res.json({ status: 'ended' });
  if (statuses.some(s => s === 'active')) return res.json({ status: 'active' });
  if (statuses.some(s => s === 'frozen')) return res.json({ status: 'paused' });

  return res.json({ status: 'waiting' });
});

function formatTime(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = router;