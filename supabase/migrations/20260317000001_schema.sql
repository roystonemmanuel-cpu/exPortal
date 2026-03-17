-- =============================================================================
-- OECS Primary Examination Portal — Database Schema
-- Migration: 20260317000001_schema.sql
--
-- Run order matters:
--   1. Extensions
--   2. Reference tables (schools)
--   3. Auth-linked tables (profiles)
--   4. Item bank (questions, stimuli)
--   5. Examination tables (exams, sessions)
--   6. Response tables (responses, incidents)
-- =============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram indexes for question search

-- ─── 1. Schools ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schools (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  country_code  CHAR(2) NOT NULL
                  CHECK (country_code IN ('LC','GD','DM','VC','KN','AG','VG')),
  emis_id       TEXT UNIQUE,           -- canonical EMIS school identifier
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE schools IS
  'OECS member-state schools. country_code is ISO 3166-1 alpha-2.';

-- ─── 2. Profiles (auth.users extension) ──────────────────────────────────────
-- Mirrors auth.users with role + school scoping.
-- Created automatically via trigger on auth.users INSERT.

CREATE TYPE user_role AS ENUM ('admin', 'school_admin', 'invigilator');

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  full_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS
  'One row per authenticated staff member. Linked to auth.users by id.';

-- Trigger: auto-create a profile shell when a new auth user is inserted.
-- The admin fills in role + school_id after provisioning.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if metadata provides school_id (set during provisioning)
  IF NEW.raw_user_meta_data->>'school_id' IS NOT NULL THEN
    INSERT INTO profiles (id, role, school_id, full_name)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'role')::user_role,
      (NEW.raw_user_meta_data->>'school_id')::UUID,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ─── 3. Item bank ─────────────────────────────────────────────────────────────

CREATE TYPE question_type AS ENUM (
  'mcq',
  'true_false',
  'fill_blank',
  'drag_order',
  'image_label',
  'audio',
  'short_answer'
);

CREATE TABLE IF NOT EXISTS questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  type             question_type NOT NULL,
  stem_text        TEXT,
  stem_image_url   TEXT,
  stem_audio_url   TEXT,
  -- choices: [{id, text, image_url?}] for MCQ/drag/audio; null for others
  choices          JSONB,
  -- correct_answer: string (MCQ choice id, 'true'/'false', fill-blank text)
  --                 string[] (drag_order: ordered id array)
  --                 object   (image_label: {regionId: labelId})
  correct_answer   JSONB,
  -- mark_scheme: free-form notes for short-answer markers
  mark_scheme      TEXT,
  marks            SMALLINT NOT NULL DEFAULT 1 CHECK (marks BETWEEN 1 AND 20),
  subject          TEXT NOT NULL,
  grade_level      TEXT NOT NULL CHECK (grade_level IN ('K','1','2','3','4','5','6')),
  -- version bump when stem/answer changes so historical results remain valid
  version          SMALLINT NOT NULL DEFAULT 1,
  retired_at       TIMESTAMPTZ,       -- soft-delete; null = active
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE questions IS
  'Item bank. Scoped to school_id. Soft-deleted via retired_at.';
COMMENT ON COLUMN questions.correct_answer IS
  'Polymorphic: string for mcq/true_false/fill_blank/audio, '
  'string[] for drag_order, {regionId:labelId} for image_label, null for short_answer.';

-- Full-text search index on question stems
CREATE INDEX IF NOT EXISTS questions_stem_trgm
  ON questions USING GIN (stem_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS questions_school_active
  ON questions (school_id, retired_at, grade_level, subject);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ─── 4. Stimuli (shared passage/image roots) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS stimuli (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  title         TEXT NOT NULL,
  content_text  TEXT,
  image_url     TEXT,
  -- hotspots: [{id, question_id, x, y}] pulse markers for image stimuli
  hotspots      JSONB,
  audio_url     TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE stimuli IS
  'Shared reading passage, image, or audio root for a group of questions.';

-- Junction: which questions belong to a stimulus, in what order
CREATE TABLE IF NOT EXISTS stimulus_questions (
  stimulus_id   UUID NOT NULL REFERENCES stimuli(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  "order"       SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (stimulus_id, question_id)
);

CREATE INDEX IF NOT EXISTS stim_q_question ON stimulus_questions (question_id);

-- ─── 5. Examinations ──────────────────────────────────────────────────────────

CREATE TYPE exam_status AS ENUM (
  'draft',
  'published',
  'active',       -- at least one sitting is in progress
  'completed',    -- all sittings ended, awaiting marking/release
  'results_released'
);

CREATE TABLE IF NOT EXISTS exams (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  title                 TEXT NOT NULL,
  subject               TEXT NOT NULL,
  grade_level           TEXT NOT NULL CHECK (grade_level IN ('K','1','2','3','4','5','6')),
  duration_minutes      SMALLINT NOT NULL CHECK (duration_minutes BETWEEN 5 AND 300),
  status                exam_status NOT NULL DEFAULT 'draft',
  results_released_at   TIMESTAMPTZ,
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- Ordered list of questions in an exam
CREATE TABLE IF NOT EXISTS exam_questions (
  exam_id      UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  "order"      SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS exam_q_question ON exam_questions (question_id);

-- ─── 6. Sittings (sessions + student seats) ───────────────────────────────────

CREATE TYPE session_status AS ENUM (
  'scheduled',
  'active',
  'paused',
  'collecting',   -- invigilator initiated tablet collection
  'completed'
);

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  invigilator_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status          session_status NOT NULL DEFAULT 'scheduled',
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE sessions IS
  'A single sitting of an exam. One exam can have multiple sessions '
  '(e.g. morning + afternoon sittings).';

CREATE INDEX IF NOT EXISTS sessions_school ON sessions (school_id, status);
CREATE INDEX IF NOT EXISTS sessions_invigilator ON sessions (invigilator_id, status);

-- One row per student seat in a session
CREATE TABLE IF NOT EXISTS student_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_name      TEXT NOT NULL,
  student_pin       TEXT NOT NULL,                    -- 6-digit string
  emis_student_id   TEXT,                             -- canonical EMIS learner id
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- A PIN must be unique within a session
  CONSTRAINT student_sessions_session_pin_unique UNIQUE (session_id, student_pin)
);

COMMENT ON TABLE student_sessions IS
  'One row per student seat. student_pin is session-scoped and expires on session close.';

CREATE INDEX IF NOT EXISTS ss_session ON student_sessions (session_id);
CREATE INDEX IF NOT EXISTS ss_emis ON student_sessions (emis_student_id) WHERE emis_student_id IS NOT NULL;

-- ─── 7. Responses ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS responses (
  id                  BIGSERIAL PRIMARY KEY,
  student_session_id  UUID NOT NULL REFERENCES student_sessions(id) ON DELETE CASCADE,
  question_id         UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  -- response_value mirrors the same polymorphic shape as questions.correct_answer
  response_value      JSONB,
  marked_correct      BOOLEAN,
  marks_awarded       NUMERIC(5,2),
  synced_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One response per question per student session
  CONSTRAINT responses_student_session_question_unique
    UNIQUE (student_session_id, question_id)
);

COMMENT ON TABLE responses IS
  'Student answers. Upserted from the client offline queue on sync.';

CREATE INDEX IF NOT EXISTS responses_student_session ON responses (student_session_id);
CREATE INDEX IF NOT EXISTS responses_unmarked
  ON responses (marks_awarded)
  WHERE marks_awarded IS NULL;

CREATE TRIGGER responses_updated_at
  BEFORE UPDATE ON responses
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ─── 8. Incidents ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incidents (
  id              BIGSERIAL PRIMARY KEY,
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  invigilator_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incidents_session ON incidents (session_id);
