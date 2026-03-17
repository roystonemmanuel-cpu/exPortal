-- =============================================================================
-- OECS Primary Examination Portal — Row Level Security Policies
-- Migration: 20260317000002_rls.sql
--
-- Design principles:
--   • Every table has RLS enabled — nothing is publicly readable.
--   • All data access is scoped to the authenticated user's school_id,
--     fetched from the profiles table.
--   • Students never authenticate via Supabase Auth. Their PIN session is
--     managed client-side; only staff (invigilator / admin) have auth.users rows.
--   • The helper function auth_school_id() returns the school_id from profiles
--     for the current Supabase auth user. Used in every policy.
--   • Realtime subscriptions (invigilator dashboard) rely on SELECT policies
--     already defined here — no extra config needed.
-- =============================================================================

-- ─── Helper: current user's school_id ────────────────────────────────────────
-- SECURITY DEFINER so it can read profiles without recursion.

CREATE OR REPLACE FUNCTION auth_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ─── Helper: current user's role ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- =============================================================================
-- schools
-- =============================================================================

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Any authenticated staff can read their own school record.
CREATE POLICY schools_select
  ON schools FOR SELECT
  USING (id = auth_school_id());

-- Only admins can update school metadata.
CREATE POLICY schools_update
  ON schools FOR UPDATE
  USING (id = auth_school_id() AND auth_role() IN ('admin', 'school_admin'));

-- No client-side inserts or deletes — schools are provisioned by Supabase admin.

-- =============================================================================
-- profiles
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Staff can read profiles within their own school.
CREATE POLICY profiles_select
  ON profiles FOR SELECT
  USING (school_id = auth_school_id());

-- A user can update their own profile (e.g. display name).
CREATE POLICY profiles_update_own
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Admins can update any profile in their school (e.g. change role).
CREATE POLICY profiles_update_admin
  ON profiles FOR UPDATE
  USING (school_id = auth_school_id() AND auth_role() IN ('admin', 'school_admin'));

-- Admins can insert new profiles (provisioning).
CREATE POLICY profiles_insert_admin
  ON profiles FOR INSERT
  WITH CHECK (school_id = auth_school_id() AND auth_role() IN ('admin', 'school_admin'));

-- =============================================================================
-- questions
-- =============================================================================

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- All staff in the school can read questions.
CREATE POLICY questions_select
  ON questions FOR SELECT
  USING (school_id = auth_school_id());

-- Admins can insert questions.
CREATE POLICY questions_insert
  ON questions FOR INSERT
  WITH CHECK (school_id = auth_school_id() AND auth_role() IN ('admin', 'school_admin'));

-- Admins can update questions (including retiring them).
CREATE POLICY questions_update
  ON questions FOR UPDATE
  USING (school_id = auth_school_id() AND auth_role() IN ('admin', 'school_admin'));

-- No hard deletes — soft-delete via retired_at.

-- =============================================================================
-- stimuli
-- =============================================================================

ALTER TABLE stimuli ENABLE ROW LEVEL SECURITY;

CREATE POLICY stimuli_select
  ON stimuli FOR SELECT
  USING (school_id = auth_school_id());

CREATE POLICY stimuli_insert
  ON stimuli FOR INSERT
  WITH CHECK (school_id = auth_school_id() AND auth_role() IN ('admin', 'school_admin'));

CREATE POLICY stimuli_update
  ON stimuli FOR UPDATE
  USING (school_id = auth_school_id() AND auth_role() IN ('admin', 'school_admin'));

-- =============================================================================
-- stimulus_questions
-- =============================================================================

ALTER TABLE stimulus_questions ENABLE ROW LEVEL SECURITY;

-- Join-table: access is granted if the underlying question is in the school.
CREATE POLICY stimulus_questions_select
  ON stimulus_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = stimulus_questions.question_id
        AND q.school_id = auth_school_id()
    )
  );

CREATE POLICY stimulus_questions_insert
  ON stimulus_questions FOR INSERT
  WITH CHECK (
    auth_role() IN ('admin', 'school_admin') AND
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = stimulus_questions.question_id
        AND q.school_id = auth_school_id()
    )
  );

CREATE POLICY stimulus_questions_delete
  ON stimulus_questions FOR DELETE
  USING (
    auth_role() IN ('admin', 'school_admin') AND
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = stimulus_questions.question_id
        AND q.school_id = auth_school_id()
    )
  );

-- =============================================================================
-- exams
-- =============================================================================

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY exams_select
  ON exams FOR SELECT
  USING (school_id = auth_school_id());

CREATE POLICY exams_insert
  ON exams FOR INSERT
  WITH CHECK (school_id = auth_school_id() AND auth_role() IN ('admin', 'school_admin'));

CREATE POLICY exams_update
  ON exams FOR UPDATE
  USING (school_id = auth_school_id() AND auth_role() IN ('admin', 'school_admin'));

-- =============================================================================
-- exam_questions
-- =============================================================================

ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY exam_questions_select
  ON exam_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_questions.exam_id
        AND e.school_id = auth_school_id()
    )
  );

CREATE POLICY exam_questions_insert
  ON exam_questions FOR INSERT
  WITH CHECK (
    auth_role() IN ('admin', 'school_admin') AND
    EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_questions.exam_id
        AND e.school_id = auth_school_id()
    )
  );

CREATE POLICY exam_questions_delete
  ON exam_questions FOR DELETE
  USING (
    auth_role() IN ('admin', 'school_admin') AND
    EXISTS (
      SELECT 1 FROM exams e
      WHERE e.id = exam_questions.exam_id
        AND e.school_id = auth_school_id()
    )
  );

-- =============================================================================
-- sessions
-- =============================================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- All school staff can read sessions (invigilator needs to see their own sessions).
CREATE POLICY sessions_select
  ON sessions FOR SELECT
  USING (school_id = auth_school_id());

-- Admins can create sessions (scheduling).
CREATE POLICY sessions_insert
  ON sessions FOR INSERT
  WITH CHECK (school_id = auth_school_id() AND auth_role() IN ('admin', 'school_admin'));

-- Invigilators can update sessions they own (status changes: active/paused/collecting).
-- Admins can update any session in their school.
CREATE POLICY sessions_update
  ON sessions FOR UPDATE
  USING (
    school_id = auth_school_id() AND (
      invigilator_id = auth.uid() OR
      auth_role() IN ('admin', 'school_admin')
    )
  );

-- =============================================================================
-- student_sessions
-- =============================================================================

ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;

-- Staff in the school can read student seats.
CREATE POLICY student_sessions_select
  ON student_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = student_sessions.session_id
        AND s.school_id = auth_school_id()
    )
  );

-- Admins create seats during scheduling.
CREATE POLICY student_sessions_insert
  ON student_sessions FOR INSERT
  WITH CHECK (
    auth_role() IN ('admin', 'school_admin') AND
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = student_sessions.session_id
        AND s.school_id = auth_school_id()
    )
  );

-- Invigilator + admin can update seats (mark submitted_at).
CREATE POLICY student_sessions_update
  ON student_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = student_sessions.session_id
        AND s.school_id = auth_school_id()
        AND (s.invigilator_id = auth.uid() OR auth_role() IN ('admin', 'school_admin'))
    )
  );

-- =============================================================================
-- responses
-- =============================================================================

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Staff can read responses for student sessions in their school.
CREATE POLICY responses_select
  ON responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM student_sessions ss
      JOIN sessions s ON s.id = ss.session_id
      WHERE ss.id = responses.student_session_id
        AND s.school_id = auth_school_id()
    )
  );

-- Upsert from offline sync queue — authenticated staff sync on behalf of students.
-- The client sends the student_session_id; we verify it belongs to the school.
CREATE POLICY responses_upsert
  ON responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM student_sessions ss
      JOIN sessions s ON s.id = ss.session_id
      WHERE ss.id = responses.student_session_id
        AND s.school_id = auth_school_id()
    )
  );

CREATE POLICY responses_update
  ON responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM student_sessions ss
      JOIN sessions s ON s.id = ss.session_id
      WHERE ss.id = responses.student_session_id
        AND s.school_id = auth_school_id()
    )
  );

-- =============================================================================
-- incidents
-- =============================================================================

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY incidents_select
  ON incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = incidents.session_id
        AND s.school_id = auth_school_id()
    )
  );

CREATE POLICY incidents_insert
  ON incidents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = incidents.session_id
        AND s.school_id = auth_school_id()
        AND (s.invigilator_id = auth.uid() OR auth_role() IN ('admin', 'school_admin'))
    )
  );

-- =============================================================================
-- Supabase Storage buckets
-- =============================================================================
-- Run these in the Supabase dashboard → Storage, or via the management API.
-- Listed here for documentation.
--
-- bucket: exam-assets  (question images, audio files)
--   • Private bucket — no public access
--   • Authenticated staff can upload (admins only via policy below)
--   • Authenticated staff can download files in their school's path
--
-- Object path convention:  {school_id}/{question_id}/{filename}

-- Storage policies are managed via Supabase dashboard or storage API.
-- The SQL below is illustrative; actual storage RLS uses the storage schema.

/*
INSERT INTO storage.buckets (id, name, public) VALUES ('exam-assets', 'exam-assets', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "exam-assets admins upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exam-assets' AND
    auth_role() IN ('admin', 'school_admin') AND
    (storage.foldername(name))[1] = auth_school_id()::text
  );

CREATE POLICY "exam-assets staff read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exam-assets' AND
    (storage.foldername(name))[1] = auth_school_id()::text
  );
*/
