// backend/routes/questions.js
const router   = require('express').Router();
const supabase = require('../db/supabase');

// GET /api/questions/:setId
router.get('/:setId', async (req, res) => {
  const { data, error } = await supabase
    .from('questions')
    .select('id, type, topic, language, image_url, coordinate_segment, display_order')
    .eq('set_id', req.params.setId)
    .order('display_order');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;