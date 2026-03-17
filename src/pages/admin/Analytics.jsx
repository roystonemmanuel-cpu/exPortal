import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../store/sessionStore.js';
import { useSchoolResults } from '../../hooks/useAnalytics.js';

const SUBJECTS = ['', 'Mathematics', 'English Language Arts', 'Science', 'Social Studies'];
const GRADES = ['', 'K', '1', '2', '3', '4', '5', '6'];

/**
 * Analytics dashboard.
 * Shows summary table (grade × subject) and a detailed per-student results list.
 * Filters: subject, grade.
 */
export default function Analytics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useSessionStore();

  const [filterGrade, setFilterGrade] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [view, setView] = useState('summary'); // 'summary' | 'students'

  const { data, isLoading, isError } = useSchoolResults(
    profile?.school_id,
    { gradeLevel: filterGrade || undefined, subject: filterSubject || undefined }
  );

  const summary = data?.summary ?? [];
  const results = data?.results ?? [];

  return (
    <div className="min-h-screen bg-oecs-neutral-100">
      <header className="bg-white border-b border-oecs-neutral-400 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} aria-label={t('common.back')}
          className="tap-target text-oecs-neutral-800 text-lg">←</button>
        <h1 className="text-[16px] font-semibold text-oecs-neutral-800 flex-1">
          {t('admin.analytics')}
        </h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
            className="rounded-xl border-2 border-oecs-neutral-400 px-4 py-2.5 text-[14px] bg-white focus:outline-none focus:border-oecs-teal">
            {GRADES.map(g => (
              <option key={g} value={g}>{g === '' ? 'All Grades' : g === 'K' ? 'Kindergarten' : `Grade ${g}`}</option>
            ))}
          </select>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
            className="rounded-xl border-2 border-oecs-neutral-400 px-4 py-2.5 text-[14px] bg-white focus:outline-none focus:border-oecs-teal">
            {SUBJECTS.map(s => <option key={s} value={s}>{s === '' ? 'All Subjects' : s}</option>)}
          </select>

          {/* View toggle */}
          <div className="flex rounded-xl border-2 border-oecs-neutral-400 overflow-hidden ml-auto">
            {['summary', 'students'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={[
                  'px-4 py-2 text-sm font-medium capitalize transition-colors',
                  view === v ? 'bg-oecs-navy text-white' : 'bg-white text-oecs-neutral-800',
                ].join(' ')}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <p className="text-oecs-neutral-400 text-sm">{t('common.loading')}</p>}
        {isError && <p className="text-oecs-amber text-sm">{t('common.error')}</p>}

        {/* Summary table */}
        {!isLoading && view === 'summary' && (
          <div className="overflow-x-auto rounded-2xl border-2 border-oecs-neutral-400 bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-oecs-neutral-400 bg-oecs-neutral-100">
                  <th className="text-left px-4 py-3 font-semibold text-oecs-neutral-800">Grade</th>
                  <th className="text-left px-4 py-3 font-semibold text-oecs-neutral-800">Subject</th>
                  <th className="text-right px-4 py-3 font-semibold text-oecs-neutral-800">Students</th>
                  <th className="text-right px-4 py-3 font-semibold text-oecs-neutral-800">Mean %</th>
                  <th className="text-right px-4 py-3 font-semibold text-oecs-neutral-800">Pass Rate</th>
                  <th className="px-4 py-3" aria-label="Score bar" />
                </tr>
              </thead>
              <tbody>
                {summary.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-oecs-neutral-400">No results released yet.</td>
                  </tr>
                )}
                {summary.map((row, i) => (
                  <tr key={i} className="border-b border-oecs-neutral-400/50">
                    <td className="px-4 py-3 text-oecs-neutral-800">
                      {row.grade_level === 'K' ? 'Kindergarten' : `Grade ${row.grade_level}`}
                    </td>
                    <td className="px-4 py-3 text-oecs-neutral-800">{row.subject}</td>
                    <td className="px-4 py-3 text-right text-oecs-neutral-800">{row.count}</td>
                    <td className="px-4 py-3 text-right font-semibold text-oecs-neutral-800">
                      {row.mean}%
                    </td>
                    <td className={[
                      'px-4 py-3 text-right font-semibold',
                      row.passRate >= 70 ? 'text-oecs-teal' :
                      row.passRate >= 50 ? 'text-oecs-amber' : 'text-oecs-coral',
                    ].join(' ')}>
                      {row.passRate}%
                    </td>
                    <td className="px-4 py-3 w-32">
                      <div className="h-2 bg-oecs-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={[
                            'h-full rounded-full',
                            row.mean >= 70 ? 'bg-oecs-teal' :
                            row.mean >= 50 ? 'bg-oecs-amber' : 'bg-oecs-coral',
                          ].join(' ')}
                          style={{ width: `${row.mean}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Per-student results */}
        {!isLoading && view === 'students' && (
          <div className="overflow-x-auto rounded-2xl border-2 border-oecs-neutral-400 bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-oecs-neutral-400 bg-oecs-neutral-100">
                  <th className="text-left px-4 py-3 font-semibold text-oecs-neutral-800">Student</th>
                  <th className="text-left px-4 py-3 font-semibold text-oecs-neutral-800">Exam</th>
                  <th className="text-right px-4 py-3 font-semibold text-oecs-neutral-800">Score</th>
                  <th className="text-right px-4 py-3 font-semibold text-oecs-neutral-800">%</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-oecs-neutral-400">No student results yet.</td>
                  </tr>
                )}
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-oecs-neutral-400/50">
                    <td className="px-4 py-3 text-oecs-neutral-800">{r.student_name}</td>
                    <td className="px-4 py-3 text-oecs-neutral-400">{r.exam_title}</td>
                    <td className="px-4 py-3 text-right text-oecs-neutral-800">
                      {r.total_marks}/{r.possible_marks}
                    </td>
                    <td className={[
                      'px-4 py-3 text-right font-bold',
                      r.percent >= 70 ? 'text-oecs-teal' :
                      r.percent >= 50 ? 'text-oecs-amber' : 'text-oecs-neutral-400',
                    ].join(' ')}>
                      {r.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
