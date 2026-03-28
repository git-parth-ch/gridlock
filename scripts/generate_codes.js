// scripts/generate_codes.js
// Usage: node generate_codes.js
// Generates 20 team codes and inserts them into Supabase.
// Edit TEAM_NAMES and SET_ASSIGNMENTS before running.

require('dotenv').config({ path: '../backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Edit these before your event ──────────────────────────
// Each entry: [team name, question set]
// You decide exactly which team gets which set
const TEAM_ASSIGNMENTS = [
  ['FALCON', 'A1'],
  ['STORM', 'A2'],
  ['NOVA', 'A3'],
  ['VIPER', 'B1'],
  ['TITAN', 'B2'],
  ['BLAZE', 'B3'],
  ['PULSE', 'C1'],
  ['NEXUS', 'C2'],
  ['ORBIT', 'C3'],
  ['FROST', 'A1'],
  ['SPARK', 'A2'],
  ['VAPOR', 'A3'],
  ['DRIFT', 'B1'],
  ['FLARE', 'B2'],
  ['SURGE', 'B3'],
  ['PRISM', 'C1'],
  ['LUNAR', 'C2'],
  ['ECHO', 'C3'],
  ['SWIFT', 'A1'],
  ['FORGE', 'B1'],
];

const COORDINATE_MAP = {
  A1: 'A', A2: 'A', A3: 'A',
  B1: 'B', B2: 'B', B3: 'B',
  C1: 'C', C2: 'C', C3: 'C',
};

function randomSuffix() {
  return String(Math.floor(100 + Math.random() * 900));
}

async function main() {
  const teams = TEAM_ASSIGNMENTS.map(([name, setId]) => ({
    code: `GRIDLOCK-${name}-${randomSuffix()}`,
    name,
    question_set_id: setId,
    coordinate_id: COORDINATE_MAP[setId],
    status: 'waiting',
  }));

  const { data, error } = await supabase.from('teams').insert(teams).select('code');
  if (error) { console.error('Error:', error); return; }

  console.log('\n✅  Team codes generated:\n');
  data.forEach(t => console.log(`  ${t.code}`));
}

main();