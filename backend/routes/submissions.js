// backend/routes/submissions.js
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const supabase = require('../db/supabase');

function secondsSince(iso) {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.floor((Date.now() - ms) / 1000));
}

async function getTeamElapsedSeconds(code) {
  const { data: team } = await supabase
    .from('teams')
    .select('status, started_at, total_time_seconds')
    .eq('code', code)
    .single();

  if (!team) return null;
  const base = team.total_time_seconds || 0;
  const running = team.status === 'active' ? secondsSince(team.started_at) : 0;
  return base + running;
}

// POST /api/submissions   { teamCode, questionId, answer, deviceId }
router.post('/', async (req, res) => {
  try {
    const { teamCode, questionId, answer, deviceId } = req.body;
    if (!teamCode || !questionId || !answer) {
      return res.status(400).json({ error: 'teamCode, questionId, and answer are required' });
    }

    const code = teamCode.trim().toUpperCase();

    // MOCK SUBMISSION HANDLER
    if (code === 'TEST01' && String(questionId) === '9991') {
      const isCorrect = answer.trim() === '30';
      return res.json({
        isCorrect,
        segmentValue: isCorrect ? 999 : null,
        coordinateSegment: isCorrect ? '[[0,0],[1,1]]' : null,
      });
    }

    // Look up the question to check the correct answer (stored as bcrypt hash in DB)
    const { data: question, error: qErr } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (qErr || !question) {
      console.error('[submissions] Question lookup failed:', qErr?.message || 'not found', { questionId });
      return res.status(404).json({ error: 'Question not found' });
    }

    const plain = answer.trim();
    let isCorrect = false;
    if (question.answer_hash) {
      try {
        isCorrect = await bcrypt.compare(plain, question.answer_hash);
      } catch (_) {
        isCorrect = false;
      }
    }
    if (!isCorrect && question.answer) {
      isCorrect = plain.toLowerCase() === String(question.answer).trim().toLowerCase();
    }

    const timeSinceStart = isCorrect ? await getTeamElapsedSeconds(code) : null;

    // Record the submission
    const { error: insertErr } = await supabase.from('submissions').insert({
      team_code: code,
      question_id: questionId,
      device_id: deviceId || null,
      submitted_answer: answer,
      is_correct: isCorrect,
      time_since_start: (typeof timeSinceStart === 'number' && Number.isFinite(timeSinceStart)) ? timeSinceStart : null,
    });

    if (insertErr) {
      console.error('[submissions] Insert failed:', insertErr.message);
      return res.status(500).json({ error: insertErr.message });
    }

    // If correct, increment team's questions_solved count — but only for the FIRST correct submission
    if (isCorrect) {
      // Check if this question was already solved by this team (prior correct submission)
      const { count: priorCorrect } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('team_code', code)
        .eq('question_id', questionId)
        .eq('is_correct', true);

      // priorCorrect includes the row we just inserted, so first correct = count of 1
      if ((priorCorrect || 0) <= 1) {
        const { data: team } = await supabase
          .from('teams')
          .select('questions_solved')
          .eq('code', code)
          .single();

        if (team) {
          await supabase.from('teams')
            .update({ questions_solved: (team.questions_solved || 0) + 1 })
            .eq('code', code);
        }
      }
    }

    res.json({
      isCorrect,
      segmentValue: isCorrect ? question.segment_value : null,
      coordinateSegment: isCorrect ? question.coordinate_segment : null,
    });
  } catch (err) {
    console.error('[submissions] Unhandled error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});

module.exports = router;
