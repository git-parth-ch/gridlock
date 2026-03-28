// backend/routes/admin.js
const router   = require('express').Router();
const supabase = require('../db/supabase');

// Simple password guard (for demo — use JWT in production)
const adminAuth = (req, res, next) => {
  const pw = req.headers['x-admin-password'];
  if (pw !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'unauthorized' });
  next();
};

// GET /api/admin/leaderboard
router.get('/leaderboard', adminAuth, async (req, res) => {
  const { data: teams } = await supabase
    .from('teams')
    .select('code, name, question_set_id, coordinate_id, questions_solved, total_time_seconds, status, devices_connected')
    .order('questions_solved', { ascending: false })
    .order('total_time_seconds', { ascending: true });

  // Attach violation counts
  const { data: viols } = await supabase
    .from('violations')
    .select('team_code, severity');

  const vMap = {};
  (viols || []).forEach(v => {
    if (!vMap[v.team_code]) vMap[v.team_code] = { W: 0, F: 0 };
    if (v.severity === 'WARNING') vMap[v.team_code].W++;
    if (v.severity === 'FLAG')    vMap[v.team_code].F++;
  });

  res.json(teams.map((t, i) => ({
    rank: i + 1,
    ...t,
    violations: vMap[t.code] || { W: 0, F: 0 }
  })));
});

// POST /api/admin/start    – release all teams from waiting room
router.post('/start', adminAuth, async (req, res) => {
  const now = new Date().toISOString();
  await supabase.from('teams')
    .update({ status: 'active', started_at: now })
    .eq('status', 'waiting');
  res.json({ ok: true });
});

// POST /api/admin/pause-all
router.post('/pause-all', adminAuth, async (req, res) => {
  await supabase.from('teams')
    .update({ status: 'frozen' })
    .eq('status', 'active');
  res.json({ ok: true });
});

// POST /api/admin/unfreeze-all
router.post('/unfreeze-all', adminAuth, async (req, res) => {
  await supabase.from('teams')
    .update({ status: 'active' })
    .eq('status', 'frozen');
  res.json({ ok: true });
});

// POST /api/admin/freeze/:code
router.post('/freeze/:code', adminAuth, async (req, res) => {
  await supabase.from('teams').update({ status: 'frozen' }).eq('code', req.params.code);
  res.json({ ok: true });
});

// POST /api/admin/unfreeze/:code   body: { resetCount: true|false }
router.post('/unfreeze/:code', adminAuth, async (req, res) => {
  await supabase.from('teams').update({ status: 'active' }).eq('code', req.params.code);
  if (req.body.resetCount) {
    await supabase.from('violations').delete().eq('team_code', req.params.code);
  }
  res.json({ ok: true });
});

// POST /api/admin/disqualify/:code
router.post('/disqualify/:code', adminAuth, async (req, res) => {
  await supabase.from('teams').update({ status: 'disqualified' }).eq('code', req.params.code);
  res.json({ ok: true });
});

// POST /api/admin/reveal/:code    – reveal coordinate to team
router.post('/reveal/:code', adminAuth, async (req, res) => {
  await supabase.from('teams')
    .update({ coordinate_revealed: true })
    .eq('code', req.params.code);
  res.json({ ok: true });
});

// GET /api/admin/violations/:code
router.get('/violations/:code', adminAuth, async (req, res) => {
  const { data } = await supabase
    .from('violations')
    .select('*')
    .eq('team_code', req.params.code)
    .order('occurred_at', { ascending: false });
  res.json(data);
});

// POST /api/admin/message/:code   body: { message }
router.post('/message/:code', adminAuth, async (req, res) => {
  // Caller also needs to emit via socket — done in admin dashboard via WS
  res.json({ ok: true, message: req.body.message });
});

// GET /api/admin/coordinate/:code  — fetch full coordinate object for a team
router.get('/coordinate/:code', adminAuth, async (req, res) => {
  const { data: team } = await supabase
    .from('teams')
    .select('coordinate_id')
    .eq('code', req.params.code.toUpperCase())
    .single();

  if (!team) return res.status(404).json({ error: 'team not found' });

  const { data: coord } = await supabase
    .from('coordinates')
    .select('*')
    .eq('id', team.coordinate_id)
    .single();

  res.json(coord);
});

module.exports = router;