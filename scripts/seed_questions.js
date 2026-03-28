// scripts/seed_questions.js
// Usage: node seed_questions.js
// Hashes all answers with bcrypt and inserts question sets into Supabase.
// Edit the QUESTIONS array below with your actual question data.

require('dotenv').config({ path: '../backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt           = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Insert question sets first ─────────────────────────────
const QUESTION_SETS = [
  { id: 'A1', coordinate_id: 'A', label: 'Set A1' },
  { id: 'A2', coordinate_id: 'A', label: 'Set A2' },
  { id: 'A3', coordinate_id: 'A', label: 'Set A3' },
  { id: 'B1', coordinate_id: 'B', label: 'Set B1' },
  { id: 'B2', coordinate_id: 'B', label: 'Set B2' },
  { id: 'B3', coordinate_id: 'B', label: 'Set B3' },
  { id: 'C1', coordinate_id: 'C', label: 'Set C1' },
  { id: 'C2', coordinate_id: 'C', label: 'Set C2' },
  { id: 'C3', coordinate_id: 'C', label: 'Set C3' },
];

// ── Question definitions ───────────────────────────────────
// image_url: upload images to Supabase Storage bucket 'questions'
//            and paste the public URL here.
// answer:    plain-text correct answer — will be bcrypt-hashed before insert.
// coordinate_segment / segment_value: which part of the coordinate
//            this question's correct answer encodes.
//
// Segment key convention used in Set A1 (Coordinate A: 12.823527° N, 80.04229° E):
//   lat_int      → 12
//   lat_dec_1_2  → 82
//   lat_dec_3_4  → 35
//   lat_dec_5_6  → 27
//   lng_int      → 80
//   lng_dec      → 04229

const QUESTIONS = [
  // ── Set A1 ──────────────────────────────────────────────
  {
    id: 'A1_Q1', set_id: 'A1', type: 'find_output', topic: 'OOP',
    language: 'python',
    image_url: 'https://your-project.supabase.co/storage/v1/object/public/questions/A1_Q1.png',
    answer: '12',
    coordinate_segment: 'lat_int', segment_value: '12',
    display_order: 1,
  },
  {
    id: 'A1_Q2', set_id: 'A1', type: 'find_output', topic: 'Generator',
    language: 'python',
    image_url: 'https://your-project.supabase.co/storage/v1/object/public/questions/A1_Q2.png',
    answer: '82',
    coordinate_segment: 'lat_dec_1_2', segment_value: '82',
    display_order: 2,
  },
  {
    id: 'A1_Q3', set_id: 'A1', type: 'debug', topic: 'Stack',
    language: 'python',
    image_url: 'https://your-project.supabase.co/storage/v1/object/public/questions/A1_Q3.png',
    answer: '35',
    coordinate_segment: 'lat_dec_3_4', segment_value: '35',
    display_order: 3,
  },
  {
    id: 'A1_Q4', set_id: 'A1', type: 'fill_missing', topic: 'BST',
    language: 'python',
    image_url: 'https://your-project.supabase.co/storage/v1/object/public/questions/A1_Q4.png',
    answer: '27',
    coordinate_segment: 'lat_dec_5_6', segment_value: '27',
    display_order: 4,
  },
  {
    id: 'A1_Q5', set_id: 'A1', type: 'debug', topic: 'OOP',
    language: 'python',
    image_url: 'https://your-project.supabase.co/storage/v1/object/public/questions/A1_Q5.png',
    answer: '80',
    coordinate_segment: 'lng_int', segment_value: '80',
    display_order: 5,
  },
  {
    id: 'A1_Q6', set_id: 'A1', type: 'find_output', topic: 'Descriptor',
    language: 'python',
    image_url: 'https://your-project.supabase.co/storage/v1/object/public/questions/A1_Q6.png',
    answer: '4229',
    coordinate_segment: 'lng_dec', segment_value: '4229',
    display_order: 6,
  },

  // ── Set A2 ──────────────────────────────────────────────
  // Add your A2 questions here following the same pattern…

  // ── Set B1, B2, B3, C1, C2, C3 ─────────────────────────
  // Add remaining sets here…
];

async function main() {
  // 1. Upsert question sets
  const { error: setErr } = await supabase
    .from('question_sets')
    .upsert(QUESTION_SETS, { onConflict: 'id' });
  if (setErr) { console.error('Sets error:', setErr); return; }
  console.log(`✅  ${QUESTION_SETS.length} question sets upserted`);

  // 2. Hash answers and upsert questions
  const SALT_ROUNDS = 10;
  let count = 0;

  for (const q of QUESTIONS) {
    const { answer, ...rest } = q;
    const answer_hash = await bcrypt.hash(answer, SALT_ROUNDS);
    const { error } = await supabase
      .from('questions')
      .upsert({ ...rest, answer_hash }, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌  ${q.id}:`, error.message);
    } else {
      count++;
      console.log(`  ✅  ${q.id}  (answer: ${answer})`);
    }
  }

  console.log(`\n✅  ${count}/${QUESTIONS.length} questions seeded`);
  console.log('\n⚠️  Keep this file secure — it contains plain-text answers!');
}

main();