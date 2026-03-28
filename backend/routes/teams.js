// backend/routes/teams.js
const router = require('express').Router();
const supabase = require('../db/supabase');
const { v4: uuidv4 } = require('uuid');

// POST /api/teams/join   { teamCode }
// Called when a participant enters their team code.
router.post('/join', async (req, res) => {
  const { teamCode } = req.body;
  if (!teamCode) return res.status(400).json({ error: 'teamCode required' });

  const code = teamCode.trim().toUpperCase();

  // Look up team
  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !team) return res.status(404).json({ error: 'Team not found' });
  if (team.status === 'disqualified') return res.status(403).json({ error: 'disqualified' });

  // Count devices already connected
  const { count } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('team_code', code);

  if (count >= 1) return res.status(403).json({ error: 'max_devices_reached' });

  // Register device
  const deviceId = uuidv4();
  await supabase.from('devices').insert({ id: deviceId, team_code: code });

  // Fetch questions for this set
  const { data: questions } = await supabase
    .from('questions')
    .select('id, type, topic, language, image_url, coordinate_segment, display_order')
    .eq('set_id', team.question_set_id)
    .order('display_order');

  // Fetch already-solved questions
  const { data: solvedRows } = await supabase
    .from('submissions')
    .select('question_id')
    .eq('team_code', code)
    .eq('is_correct', true);

  const solved = new Set((solvedRows || []).map(r => r.question_id));

  return res.json({
    team,
    deviceId,
    questions: questions.map(q => ({
      ...q,
      status: solved.has(q.id) ? 'solved' : 'open'
    }))
  });
});

// GET /api/teams/:code/status
router.get('/:code/status', async (req, res) => {
  const { data: team } = await supabase
    .from('teams')
    .select('status, questions_solved, total_time_seconds, coordinate_revealed')
    .eq('code', req.params.code.toUpperCase())
    .single();
  res.json(team);
});

module.exports = router;