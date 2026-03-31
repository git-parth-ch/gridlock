require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
);

async function createTestData() {
  console.log('Inserting test data into Supabase...');
  
  const testSetId = 'test_set_1';
  const testTeamCode = 'TEST01';
  const bcrypt = require('bcryptjs');
  const answerHash = bcrypt.hashSync('30', 10);

  const { error: qErr } = await supabase
    .from('questions')
    .upsert(
      {
        id: 9991,
        set_id: testSetId,
        type: 'find_output',
        topic: 'Test Node',
        language: 'javascript',
        answer_hash: answerHash,
        display_order: 1,
        coordinate_segment: '[[0,0],[1,1]]',
        segment_value: 1234,
        image_url: 'https://placehold.co/600x400/111111/f21d2f/png?text=ADD+10+AND+20'
      },
      { onConflict: 'id' }
    );

  if (qErr) {
    console.error('Error inserting question:', qErr);
    return;
  }
  console.log('✅ Inserted Test Question');

  // Insert a mock Team
  const { error: tErr } = await supabase
    .from('teams')
    .upsert(
      {
        code: testTeamCode,
        name: 'Test Team Alpha',
        status: 'active',
        question_set_id: testSetId,
        devices_connected: 0,
        questions_solved: 0,
        total_time_seconds: 0
      },
      { onConflict: 'code' }
    );

  if (tErr) {
    console.error('Error inserting team:', tErr);
    return;
  }
  console.log(`✅ Inserted Test Team`);
  console.log(`\n============================`);
  console.log(`Use this Auth Code to Log In:`);
  console.log(`===>  ${testTeamCode}  <===`);
  console.log(`============================\n`);
  process.exit(0);
}

createTestData();
