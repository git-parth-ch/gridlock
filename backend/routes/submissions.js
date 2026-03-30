// backend/routes/submissions.js
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const supabase = require('../db/supabase');

// POST /api/submissions   { teamCode, questionId, answer, deviceId }
router.post('/', async (req, res) => {
  const { teamCode, questionId, answer, deviceId } = req.body;
  if (!teamCode || !questionId || !answer) {
    return res.status(400).json({ error: 'teamCode, questionId, and answer are required' });
  }

  const code = teamCode.trim().toUpperCase();

  // Look up the question to check the correct answer (stored as bcrypt hash in DB)
  const { data: question, error: qErr } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (qErr || !question) {
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

  // Record the submission
  const { error: insertErr } = await supabase.from('submissions').insert({
    team_code: code,
    question_id: questionId,
    device_id: deviceId || null,
    answer,
    is_correct: isCorrect,
  });

  if (insertErr) {
    return res.status(500).json({ error: insertErr.message });
  }

  // If correct, increment team's questions_solved count
  if (isCorrect) {
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

  res.json({
    isCorrect,
    segmentValue: isCorrect ? question.segment_value : null,
    coordinateSegment: isCorrect ? question.coordinate_segment : null,
  });
});

module.exports = router;
