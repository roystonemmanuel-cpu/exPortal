import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase.js';

/**
 * @typedef {Object} SessionResult
 * @property {string} session_id
 * @property {string} student_name
 * @property {string|null} emis_student_id
 * @property {number} total_marks
 * @property {number} possible_marks
 * @property {number} percent
 * @property {string} grade_level
 * @property {string} subject
 * @property {string} exam_title
 */

/**
 * Fetch aggregated results for a school (admin analytics).
 * Returns per-student results + summary stats broken down by grade + subject.
 *
 * @param {string} schoolId
 * @param {{ examId?: string, gradeLevel?: string, subject?: string }} filters
 */
export function useSchoolResults(schoolId, filters = {}) {
  return useQuery({
    queryKey: ['school-results', schoolId, filters],
    queryFn: async () => {
      if (!supabase) return { results: [], summary: [] };
      // Fetch all released responses with session + student info
      let q = supabase
        .from('student_sessions')
        .select(`
          id,
          student_name,
          emis_student_id,
          submitted_at,
          session:sessions!inner(
            id,
            exam:exams!inner(id, title, subject, grade_level, school_id)
          ),
          responses(
            marks_awarded,
            question:questions!inner(marks, type)
          )
        `)
        .not('submitted_at', 'is', null)
        .eq('session.exam.school_id', schoolId);

      if (filters.examId) q = q.eq('session.exam.id', filters.examId);
      if (filters.gradeLevel) q = q.eq('session.exam.grade_level', filters.gradeLevel);
      if (filters.subject) q = q.eq('session.exam.subject', filters.subject);

      const { data, error } = await q;
      if (error) throw error;

      // Compute per-student totals
      const results = (data ?? []).map(ss => {
        let total = 0;
        let possible = 0;
        for (const r of ss.responses ?? []) {
          if (r.question?.type !== 'short_answer' || r.marks_awarded !== null) {
            possible += r.question?.marks ?? 1;
          }
          if (r.marks_awarded !== null) total += r.marks_awarded;
        }
        const percent = possible > 0 ? Math.round((total / possible) * 100) : 0;
        return {
          session_id: ss.id,
          student_name: ss.student_name,
          emis_student_id: ss.emis_student_id,
          total_marks: total,
          possible_marks: possible,
          percent,
          grade_level: ss.session?.exam?.grade_level,
          subject: ss.session?.exam?.subject,
          exam_title: ss.session?.exam?.title,
          exam_id: ss.session?.exam?.id,
          submitted_at: ss.submitted_at,
        };
      });

      // Summary stats
      const summary = computeSummary(results);

      return { results, summary };
    },
    enabled: Boolean(schoolId),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Compute summary statistics grouped by grade + subject.
 * @param {SessionResult[]} results
 */
function computeSummary(results) {
  const groups = {};
  for (const r of results) {
    const key = `${r.grade_level}:${r.subject}`;
    if (!groups[key]) {
      groups[key] = {
        grade_level: r.grade_level,
        subject: r.subject,
        count: 0,
        totalPercent: 0,
        passCount: 0, // >= 50%
      };
    }
    groups[key].count++;
    groups[key].totalPercent += r.percent;
    if (r.percent >= 50) groups[key].passCount++;
  }

  return Object.values(groups).map(g => ({
    ...g,
    mean: g.count > 0 ? Math.round(g.totalPercent / g.count) : 0,
    passRate: g.count > 0 ? Math.round((g.passCount / g.count) * 100) : 0,
  }));
}
