// scripts/check_team.js
require('dotenv').config({ path: '../backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const code = 'GRIDLOCK-TESTTEAM-759';
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    console.error('Error fetching team:', error);
  } else {
    console.log('Team found:', data);
  }
}

main();
