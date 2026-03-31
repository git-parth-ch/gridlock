// backend/routes/teams.js
const router = require('express').Router();
const supabase = require('../db/supabase');
const { v4: uuidv4 } = require('uuid');

function staleCutoffIso() {
  const secs = Number(process.env.STALE_DEVICE_SECONDS || 45);
  const ms = Date.now() - Math.max(10, secs) * 1000;
  return new Date(ms).toISOString();
}

async function pruneStaleDevices(code) {
  const cutoff = staleCutoffIso();
  await supabase
    .from('devices')
    .delete()
    .eq('team_code', code)
    .lt('last_seen', cutoff);
}

async function fetchQuestionsForTeam(team) {
  const { data: questions } = await supabase
    .from('questions')
    .select('id, type, topic, language, image_url, coordinate_segment, display_order')
    .eq('set_id', team.question_set_id)
    .order('display_order');

  const { data: solvedRows } = await supabase
    .from('submissions')
    .select('question_id')
    .eq('team_code', team.code)
    .eq('is_correct', true);

  const solved = new Set((solvedRows || []).map(r => r.question_id));

  return (questions || []).map(q => ({
    ...q,
    status: solved.has(q.id) ? 'solved' : 'open'
  }));
}

// POST /api/teams/join   { teamCode }
// Called when a participant enters their team code.
router.post('/join', async (req, res) => {
  const { teamCode } = req.body;
  if (!teamCode) return res.status(400).json({ error: 'teamCode required' });

  const code = teamCode.trim().toUpperCase();

  // MOCK TEST LOGIN HANDLER
  if (code === 'TEST01') {
    return res.json({
      team: { code: 'TEST01', name: 'Test Team Alpha', status: 'active', question_set_id: 'test_set_1' },
      deviceId: 'test-device-uuid',
      questions: [
        {
          id: 9991,
          type: 'find_output',
          topic: 'Diagnostics Output',
          language: 'javascript',
          status: 'open',
          display_order: 1,
          image_url: 'https://placehold.co/600x400/151515/f21d2f/png?text=ADD+10+AND+20+AND+PRINT+IT'
        }
      ]
    });
  }

  // Look up team
  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !team) return res.status(404).json({ error: 'Team not found' });
  if (team.status === 'disqualified') return res.status(403).json({ error: 'disqualified' });

  // Clean up crashed / stale devices before enforcing max devices.
  await pruneStaleDevices(code);

  // Count devices already connected
  const { count } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('team_code', code);

  if (count >= 1) return res.status(403).json({ error: 'max_devices_reached' });

  // Register device
  const deviceId = uuidv4();
  await supabase.from('devices').insert({ id: deviceId, team_code: code });

  const questions = await fetchQuestionsForTeam(team);

  return res.json({
    team,
    deviceId,
    questions
  });
});

// POST /api/teams/logout   { teamCode, deviceId }
// Participant-initiated logout: remove this device from the team
// and kick any connected sockets via `force_logout`.
router.post('/logout', async (req, res) => {
  const { teamCode, deviceId } = req.body || {};
  if (!teamCode || !deviceId) {
    return res.status(400).json({ error: 'teamCode and deviceId are required' });
  }

  const code = teamCode.trim().toUpperCase();

  // Delete only the device that belongs to this team.
  await supabase.from('devices')
    .delete()
    .eq('id', deviceId)
    .eq('team_code', code);

  // Recompute connected count (max-devices logic uses `devices` table).
  const { count } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('team_code', code);

  const deviceCount = count || 0;
  await supabase.from('teams')
    .update({ devices_connected: deviceCount })
    .eq('code', code);

  // Kick all sockets in this team room.
  req.app.locals.io?.to(code).emit('force_logout', { reason: 'user_logout' });

  res.json({ ok: true, deviceCount });
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

// POST /api/teams/heartbeat  { teamCode, deviceId }
router.post('/heartbeat', async (req, res) => {
  const { teamCode, deviceId } = req.body || {};
  if (!teamCode || !deviceId) return res.status(400).json({ error: 'teamCode and deviceId are required' });

  const code = String(teamCode).trim().toUpperCase();
  if (code === 'TEST01') return res.json({ ok: true });

  await supabase.from('devices')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', deviceId)
    .eq('team_code', code);

  res.json({ ok: true });
});

// POST /api/teams/resume { teamCode, deviceId }
// Used after reconnect / crash recovery. Does NOT create a new device.
router.post('/resume', async (req, res) => {
  const { teamCode, deviceId } = req.body || {};
  if (!teamCode || !deviceId) return res.status(400).json({ error: 'teamCode and deviceId are required' });

  const code = String(teamCode).trim().toUpperCase();

  if (code === 'TEST01') {
    return res.json({
      team: { code: 'TEST01', name: 'Test Team Alpha', status: 'active', question_set_id: 'test_set_1' },
      deviceId: 'test-device-uuid',
      questions: [
        {
          id: 9991,
          type: 'find_output',
          topic: 'Diagnostics Output',
          language: 'javascript',
          status: 'open',
          display_order: 1,
          image_url: 'https://placehold.co/600x400/151515/f21d2f/png?text=ADD+10+AND+20+AND+PRINT+IT'
        }
      ]
    });
  }

  await pruneStaleDevices(code);

  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !team) return res.status(404).json({ error: 'Team not found' });
  if (team.status === 'disqualified') return res.status(403).json({ error: 'disqualified' });

  const { data: device } = await supabase
    .from('devices')
    .select('id')
    .eq('id', deviceId)
    .eq('team_code', code)
    .maybeSingle();

  if (!device) return res.status(403).json({ error: 'device_not_registered' });

  await supabase.from('devices')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', deviceId);

  const questions = await fetchQuestionsForTeam(team);

  res.json({ team, deviceId, questions });
});

module.exports = router;