// backend/sockets/teamSocket.js
const supabase = require('../db/supabase');

module.exports = (io) => {
  // ── Violation counter per team (in-memory, reset on restart) ──
  const violationCounts = {};   // { teamCode: { W: 0, F: 0 } }

  const getCount = (code) => {
    if (!violationCounts[code]) violationCounts[code] = { W: 0, F: 0 };
    return violationCounts[code];
  };

  io.on('connection', (socket) => {

    // ── Join team room ─────────────────────────────────────────
    socket.on('join_team', async ({ teamCode, deviceId }) => {
      const code = teamCode.toUpperCase();
      socket.join(code);
      socket.teamCode = code;
      socket.deviceId = deviceId;

      // Update device last_seen + increment device count
      await supabase.from('devices')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', deviceId);

      const { count } = await supabase
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('team_code', code);

      await supabase.from('teams')
        .update({ devices_connected: count })
        .eq('code', code);

      // Notify all room members
      io.to(code).emit('device_update', { deviceCount: count });

      // Send current violation count to this socket
      socket.emit('violation_count', getCount(code));
    });

    // ── Question opened by a device ────────────────────────────
    socket.on('question_opened', ({ questionId }) => {
      socket.to(socket.teamCode).emit('question_status_update', {
        questionId,
        status: 'in_progress',
        byDeviceId: socket.deviceId
      });
    });

    // ── Question solved broadcast ──────────────────────────────
    socket.on('question_solved', ({ questionId, segmentValue, coordinateSegment }) => {
      io.to(socket.teamCode).emit('question_status_update', {
        questionId,
        status: 'solved',
        segmentValue,
        coordinateSegment
      });
    });

    // ── Violation report from client ───────────────────────────
    socket.on('violation', async ({ type, severity }) => {
      const code = socket.teamCode;
      if (!code) return;

      // Persist to DB
      await supabase.from('violations').insert({
        team_code: code,
        device_id: socket.deviceId,
        type,
        severity
      });

      const counts = getCount(code);
      if (severity === 'WARNING') counts.W++;
      if (severity === 'FLAG')    counts.F++;

      const total = counts.W + counts.F;

      // Broadcast updated count to all team devices
      io.to(code).emit('violation_count', counts);

      // Auto-freeze at 5
      if (total >= 5) {
        await supabase.from('teams').update({ status: 'frozen' }).eq('code', code);
        io.to(code).emit('session_frozen', { reason: 'violation_threshold' });
      }
    });

    // ── Admin: freeze / unfreeze / disqualify broadcast ────────
    socket.on('admin_freeze',    ({ teamCode }) => io.to(teamCode.toUpperCase()).emit('session_frozen', {}));
    socket.on('admin_unfreeze',  ({ teamCode }) => io.to(teamCode.toUpperCase()).emit('session_unfrozen', {}));
    socket.on('admin_disqualify',({ teamCode }) => io.to(teamCode.toUpperCase()).emit('disqualified', {}));
    socket.on('admin_message',   ({ teamCode, message }) => io.to(teamCode.toUpperCase()).emit('admin_message', { message }));
    socket.on('admin_reveal',    ({ teamCode, coordinate }) => io.to(teamCode.toUpperCase()).emit('coordinate_revealed', { coordinate }));
    socket.on('admin_start',     () => io.emit('event_started'));

    // ── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', async () => {
      if (!socket.teamCode || !socket.deviceId) return;
      const code = socket.teamCode;

      await supabase.from('devices')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', socket.deviceId);

      const { count } = await supabase
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('team_code', code);

      await supabase.from('teams')
        .update({ devices_connected: Math.max(0, count - 1) })
        .eq('code', code);

      io.to(code).emit('device_update', { deviceCount: Math.max(0, count - 1) });
    });
  });
};