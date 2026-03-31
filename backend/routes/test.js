// routes/test.js
const express = require('express');
const router = express.Router();

// Simple static test login data
router.get('/login', (req, res) => {
  // In a real scenario, you would create or fetch a test team and question from DB.
  const testTeam = {
    code: 'TEST01',
    status: 'active',
    name: 'Test Team',
  };
  const testQuestion = {
    id: 999,
    title: 'Sample Coding Question',
    description: 'Write a function that returns the sum of two numbers.',
    language: 'javascript',
    // Additional fields as required by the front-end
  };
  res.json({
    team: testTeam,
    deviceId: 'test-device',
    questions: [testQuestion],
  });
});

module.exports = router;
