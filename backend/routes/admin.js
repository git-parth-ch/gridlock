// backend/routes/admin.js
const router   = require('express').Router();
const supabase = require('../db/supabase');

// Simple password guard (for demo — use JWT in production)
const adminAuth = (req, res, next) => {
  const pw = req.headers['x-admin-password'];
  if (pw !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'unauthorized' });
  next();
};

function secondsSince(iso) {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.floor((Date.now() - ms) / 1000));
}

async function accumulateAndFreezeTeams(where) {
  const { data: teams } = await supabase
    .from('teams')
    .select('code, status, started_at, total_time_seconds')
    .match(where);

  const list = teams || [];
  for (const t of list) {
    if (t.status !== 'active') continue;
    const add = secondsSince(t.started_at);
    const total = (t.total_time_seconds || 0) + add;
    await supabase.from('teams')
      .update({ status: 'frozen', total_time_seconds: total, started_at: null })
      .eq('code', t.code);
  }
}

async function unfreezeTeams(where) {
  const now = new Date().toISOString();
  await supabase.from('teams')
    .update({ status: 'active', started_at: now })
    .match(where);
}

async function accumulateAndSetStatus(code, nextStatus) {
  const { data: team } = await supabase
    .from('teams')
    .select('code, status, started_at, total_time_seconds')
    .eq('code', code)
    .single();

  if (!team) return;

  if (team.status === 'active') {
    const add = secondsSince(team.started_at);
    const total = (team.total_time_seconds || 0) + add;
    await supabase.from('teams')
      .update({ status: nextStatus, total_time_seconds: total, started_at: null })
      .eq('code', code);
  } else {
    await supabase.from('teams')
      .update({ status: nextStatus, started_at: null })
      .eq('code', code);
  }
}

// GET /api/admin/leaderboard
router.get('/leaderboard', adminAuth, async (req, res) => {
  const { data: teams } = await supabase
    .from('teams')
    .select('code, name, question_set_id, coordinate_id, questions_solved, total_time_seconds, status, devices_connected, started_at')
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

  const nowMs = Date.now();

  res.json(teams.map((t, i) => {
    const stored = t.total_time_seconds ?? 0;
    const running = (t.status === 'active' && t.started_at)
      ? Math.max(0, Math.floor((nowMs - new Date(t.started_at).getTime()) / 1000))
      : 0;
    const total = stored + (Number.isFinite(running) ? running : 0);

    return ({
      rank: i + 1,
      ...t,
      total_time_seconds: total,
      violations: vMap[t.code] || { W: 0, F: 0 }
    });
  }));
});

// POST /api/admin/start    – release all teams from waiting room
router.post('/start', adminAuth, async (req, res) => {
  const now = new Date().toISOString();
  await supabase.from('teams')
    .update({ status: 'active', started_at: now, total_time_seconds: 0 })
    .eq('status', 'waiting');
  res.json({ ok: true });
});

// POST /api/admin/pause-all
router.post('/pause-all', adminAuth, async (req, res) => {
  await accumulateAndFreezeTeams({ status: 'active' });
  res.json({ ok: true });
});

// POST /api/admin/unfreeze-all
router.post('/unfreeze-all', adminAuth, async (req, res) => {
  await unfreezeTeams({ status: 'frozen' });
  res.json({ ok: true });
});

// POST /api/admin/freeze/:code
router.post('/freeze/:code', adminAuth, async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  await accumulateAndFreezeTeams({ code });
  res.json({ ok: true });
});

// POST /api/admin/unfreeze/:code   body: { resetCount: true|false }
router.post('/unfreeze/:code', adminAuth, async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  await unfreezeTeams({ code });
  if (req.body.resetCount) {
    await supabase.from('violations').delete().eq('team_code', code);
  }
  res.json({ ok: true });
});

// POST /api/admin/disqualify/:code
router.post('/disqualify/:code', adminAuth, async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  await accumulateAndSetStatus(code, 'disqualified');
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

// POST /api/admin/logout/:code   – log out all devices of this team
router.post('/logout/:code', adminAuth, async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'team code required' });

  await supabase.from('devices')
    .delete()
    .eq('team_code', code);

  const { count } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('team_code', code);

  const deviceCount = count || 0;
  await supabase.from('teams')
    .update({ devices_connected: deviceCount })
    .eq('code', code);

  // Kick connected clients (they'll handle UI redirect).
  req.app.locals.io?.to(code).emit('force_logout', { reason: 'admin_logout' });

  res.json({ ok: true, deviceCount });
});

module.exports = router;