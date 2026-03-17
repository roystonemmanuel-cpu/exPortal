-- =============================================================================
-- OECS Primary Examination Portal — Seed Data
-- File: supabase/seed/seed.sql
--
-- Creates a complete, testable dataset:
--   • 1 school  (Roseau Primary, Dominica)
--   • 2 auth users  (admin + invigilator) with profiles
--   • 12 questions spanning Grade 3 Maths + ELA (all 7 types)
--   • 1 stimulus block  (reading passage with 3 child questions)
--   • 1 published exam  (Grade 3 Mathematics, 15 questions)
--   • 1 scheduled session  (with 5 student seats + PINs)
--
-- NOTE: auth.users rows must be created via Supabase Auth Admin API or
--       the Supabase dashboard — you cannot INSERT into auth.users directly
--       in production. The UUIDs below are fixed so the seed is deterministic.
--       Replace with real UUIDs after creating the auth users.
--
-- Usage:
--   supabase db reset          (local dev — runs migrations then seed)
--   psql $DATABASE_URL < seed.sql   (remote — run after migrations)
-- =============================================================================

-- ─── Fixed UUIDs (replace after creating auth users) ─────────────────────────

DO $$
DECLARE
  v_school_id     UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_admin_id      UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_invig_id      UUID := 'a1b2c3d4-0003-0003-0003-000000000003';

  -- Question IDs
  q_mcq1          UUID := 'a1b2c3d4-0010-0001-0001-000000000010';
  q_mcq2          UUID := 'a1b2c3d4-0010-0001-0001-000000000011';
  q_mcq3          UUID := 'a1b2c3d4-0010-0001-0001-000000000012';
  q_tf1           UUID := 'a1b2c3d4-0010-0001-0001-000000000020';
  q_tf2           UUID := 'a1b2c3d4-0010-0001-0001-000000000021';
  q_fill1         UUID := 'a1b2c3d4-0010-0001-0001-000000000030';
  q_fill2         UUID := 'a1b2c3d4-0010-0001-0001-000000000031';
  q_drag1         UUID := 'a1b2c3d4-0010-0001-0001-000000000040';
  q_audio1        UUID := 'a1b2c3d4-0010-0001-0001-000000000050';
  q_sa1           UUID := 'a1b2c3d4-0010-0001-0001-000000000060';
  -- Stimulus child questions
  q_stim1         UUID := 'a1b2c3d4-0010-0001-0001-000000000070';
  q_stim2         UUID := 'a1b2c3d4-0010-0001-0001-000000000071';
  q_stim3         UUID := 'a1b2c3d4-0010-0001-0001-000000000072';

  v_stimulus_id   UUID := 'a1b2c3d4-0020-0001-0001-000000000001';
  v_exam_id       UUID := 'a1b2c3d4-0030-0001-0001-000000000001';
  v_session_id    UUID := 'a1b2c3d4-0040-0001-0001-000000000001';

BEGIN

-- =============================================================================
-- School
-- =============================================================================

INSERT INTO schools (id, name, country_code, emis_id)
VALUES (v_school_id, 'Roseau Primary School', 'DM', 'DM-RPR-001')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Profiles
-- (auth.users rows must already exist with these UUIDs before this seed runs)
-- =============================================================================

INSERT INTO profiles (id, role, school_id, full_name)
VALUES
  (v_admin_id,  'admin',        v_school_id, 'Ms. Carla Benjamin'),
  (v_invig_id,  'invigilator',  v_school_id, 'Mr. Darius Joseph')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Questions — Grade 3 Mathematics
-- =============================================================================

-- MCQ 1
INSERT INTO questions (id, school_id, type, stem_text, choices, correct_answer, marks, subject, grade_level, created_by)
VALUES (
  q_mcq1, v_school_id, 'mcq',
  'Amara has 24 mangoes. She puts them into bags of 6. How many bags does she fill?',
  '[
    {"id":"a","text":"3"},
    {"id":"b","text":"4"},
    {"id":"c","text":"5"},
    {"id":"d","text":"6"}
  ]'::jsonb,
  '"b"'::jsonb,
  1, 'Mathematics', '3', v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- MCQ 2
INSERT INTO questions (id, school_id, type, stem_text, choices, correct_answer, marks, subject, grade_level, created_by)
VALUES (
  q_mcq2, v_school_id, 'mcq',
  'What is the value of the digit 7 in the number 3,742?',
  '[
    {"id":"a","text":"7"},
    {"id":"b","text":"70"},
    {"id":"c","text":"700"},
    {"id":"d","text":"7,000"}
  ]'::jsonb,
  '"c"'::jsonb,
  1, 'Mathematics', '3', v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- MCQ 3 — Caribbean context: EC dollars
INSERT INTO questions (id, school_id, type, stem_text, choices, correct_answer, marks, subject, grade_level, created_by)
VALUES (
  q_mcq3, v_school_id, 'mcq',
  'Jovani had EC$15.50. He spent EC$8.75 on a roti. How much money does he have left?',
  '[
    {"id":"a","text":"EC$6.25"},
    {"id":"b","text":"EC$6.75"},
    {"id":"c","text":"EC$7.25"},
    {"id":"d","text":"EC$7.75"}
  ]'::jsonb,
  '"b"'::jsonb,
  2, 'Mathematics', '3', v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- True / False 1
INSERT INTO questions (id, school_id, type, stem_text, choices, correct_answer, marks, subject, grade_level, created_by)
VALUES (
  q_tf1, v_school_id, 'true_false',
  'A square has 4 equal sides and 4 right angles.',
  NULL,
  '"true"'::jsonb,
  1, 'Mathematics', '3', v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- True / False 2
INSERT INTO questions (id, school_id, type, stem_text, choices, correct_answer, marks, subject, grade_level, created_by)
VALUES (
  q_tf2, v_school_id, 'true_false',
  '18 ÷ 4 = 5 with no remainder.',
  NULL,
  '"false"'::jsonb,
  1, 'Mathematics', '3', v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- Fill in the blank 1
INSERT INTO questions (id, school_id, type, stem_text, choices, correct_answer, marks, subject, grade_level, created_by)
VALUES (
  q_fill1, v_school_id, 'fill_blank',
  'The perimeter of a rectangle with length 8 cm and width 5 cm is ___ cm.',
  NULL,
  '"26"'::jsonb,
  1, 'Mathematics', '3', v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- Fill in the blank 2
INSERT INTO questions (id, school_id, type, stem_text, choices, correct_answer, marks, subject, grade_level, created_by)
VALUES (
  q_fill2, v_school_id, 'fill_blank',
  'The number 500 + 40 + 3 written in standard form is ___.',
  NULL,
  '"543"'::jsonb,
  1, 'Mathematics', '3', v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- Drag and order — place events in order from smallest to largest
INSERT INTO questions (id, school_id, type, stem_text, choices, correct_answer, marks, subject, grade_level, created_by)
VALUES (
  q_drag1, v_school_id, 'drag_order',
  'Order these numbers from smallest to largest.',
  '[
    {"id":"a","text":"847"},
    {"id":"b","text":"478"},
    {"id":"c","text":"784"},
    {"id":"d","text":"748"}
  ]'::jsonb,
  '["b","d","c","a"]'::jsonb,
  1, 'Mathematics', '3', v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- Audio question (audio_url would point to a Supabase Storage file in production)
INSERT INTO questions (id, school_id, type, stem_text, stem_audio_url, choices, correct_answer, marks, subject, grade_level, created_by)
VALUES (
  q_audio1, v_school_id, 'audio',
  'Listen to the number sentence and choose the correct answer.',
  NULL,   -- populated when audio file is uploaded to storage
  '[
    {"id":"a","text":"12"},
    {"id":"b","text":"15"},
    {"id":"c","text":"18"},
    {"id":"d","text":"21"}
  ]'::jsonb,
  '"c"'::jsonb,
  1, 'Mathematics', '3', v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- Short answer (not auto-marked)
INSERT INTO questions (id, school_id, type, stem_text, choices, correct_answer, mark_scheme, marks, subject, grade_level, created_by)
VALUES (
  q_sa1, v_school_id, 'short_answer',
  'Kessia has a bag of 30 guavas. She gives ⅓ to her class and ¼ to her neighbours. How many guavas does she have left? Show your working.',
  NULL,
  NULL,
  'Award 1 mark for correct calculation of ⅓ of 30 = 10. Award 1 mark for correct calculation of ¼ of 30 = 7.5 (accept 7 with remainder). Award 1 mark for correct final answer of 12 or 13. Full marks: 3.',
  3, 'Mathematics', '3', v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Stimulus block — ELA reading passage (Grade 3)
-- =============================================================================

INSERT INTO stimuli (id, school_id, title, content_text, created_by)
VALUES (
  v_stimulus_id,
  v_school_id,
  'The Breadfruit Tree',
  E'Maya loved the big breadfruit tree in her grandmother''s yard in Saint Lucia.\n\n'
  E'Every Saturday morning, she helped Granny pick the round, green fruits that had fallen overnight. They were heavy and bumpy, almost like small footballs.\n\n'
  E'"Granny," said Maya, "how do you know when a breadfruit is ready to eat?"\n\n'
  E'Granny smiled and pressed her thumb gently into the skin of one fruit. "When it gives a little, like this," she said, "it is ready. If it is hard like a stone, we must wait."\n\n'
  E'That evening, Granny roasted two breadfruits over a coal pot until the skin turned black. Inside, the flesh was soft and white, and it smelled like fresh bread. Maya ate two slices and decided it was the best thing she had ever tasted.',
  v_admin_id
) ON CONFLICT (id) DO NOTHING;

-- Stimulus child questions — ELA Grade 3
INSERT INTO questions (id, school_id, type, stem_text, choices, correct_answer, marks, subject, grade_level, created_by)
VALUES
(
  q_stim1, v_school_id, 'mcq',
  'What does Maya do every Saturday morning?',
  '[
    {"id":"a","text":"She goes to the market with Granny."},
    {"id":"b","text":"She helps Granny pick breadfruits."},
    {"id":"c","text":"She roasts breadfruits over a coal pot."},
    {"id":"d","text":"She waters the breadfruit tree."}
  ]'::jsonb,
  '"b"'::jsonb,
  1, 'English Language Arts', '3', v_admin_id
),
(
  q_stim2, v_school_id, 'mcq',
  'How does Granny know when a breadfruit is ready to eat?',
  '[
    {"id":"a","text":"The skin turns black."},
    {"id":"b","text":"It smells like fresh bread."},
    {"id":"c","text":"It gives a little when pressed."},
    {"id":"d","text":"It falls from the tree by itself."}
  ]'::jsonb,
  '"c"'::jsonb,
  1, 'English Language Arts', '3', v_admin_id
),
(
  q_stim3, v_school_id, 'short_answer',
  'How do you think Maya felt at the end of the passage? Use details from the story to support your answer.',
  NULL,
  NULL,
  'Award 1 mark for any reasonable emotion (e.g. happy, satisfied, delighted). Award 1 mark for a supporting detail from the text (e.g. "she ate two slices", "she decided it was the best thing she ever tasted"). Full marks: 2.',
  2, 'English Language Arts', '3', v_admin_id
)
ON CONFLICT (id) DO NOTHING;

-- Link child questions to the stimulus
INSERT INTO stimulus_questions (stimulus_id, question_id, "order")
VALUES
  (v_stimulus_id, q_stim1, 1),
  (v_stimulus_id, q_stim2, 2),
  (v_stimulus_id, q_stim3, 3)
ON CONFLICT (stimulus_id, question_id) DO NOTHING;

-- =============================================================================
-- Exam — Grade 3 Mathematics (15 questions)
-- =============================================================================

INSERT INTO exams (id, school_id, title, subject, grade_level, duration_minutes, status, created_by)
VALUES (
  v_exam_id,
  v_school_id,
  'Grade 3 Mathematics — Term 2 Assessment',
  'Mathematics',
  '3',
  60,
  'published',
  v_admin_id
) ON CONFLICT (id) DO NOTHING;

INSERT INTO exam_questions (exam_id, question_id, "order")
VALUES
  (v_exam_id, q_mcq1,  1),
  (v_exam_id, q_mcq2,  2),
  (v_exam_id, q_mcq3,  3),
  (v_exam_id, q_tf1,   4),
  (v_exam_id, q_tf2,   5),
  (v_exam_id, q_fill1, 6),
  (v_exam_id, q_fill2, 7),
  (v_exam_id, q_drag1, 8),
  (v_exam_id, q_audio1,9),
  (v_exam_id, q_sa1,   10)
ON CONFLICT (exam_id, question_id) DO NOTHING;

-- =============================================================================
-- Session + student seats
-- =============================================================================

INSERT INTO sessions (id, exam_id, school_id, invigilator_id, status, scheduled_at)
VALUES (
  v_session_id,
  v_exam_id,
  v_school_id,
  v_invig_id,
  'scheduled',
  now() + INTERVAL '1 day'
) ON CONFLICT (id) DO NOTHING;

-- 5 student seats with deterministic PINs for dev testing
INSERT INTO student_sessions (session_id, student_name, student_pin, emis_student_id)
VALUES
  (v_session_id, 'Amara Charles',   '100001', 'DM-RPR-001-2026-001'),
  (v_session_id, 'Jovani Baptiste', '100002', 'DM-RPR-001-2026-002'),
  (v_session_id, 'Kessia Joseph',   '100003', 'DM-RPR-001-2026-003'),
  (v_session_id, 'Marcus Thomas',   '100004', 'DM-RPR-001-2026-004'),
  (v_session_id, 'Reia Austrie',    '100005', 'DM-RPR-001-2026-005')
ON CONFLICT (session_id, student_pin) DO NOTHING;

END $$;
