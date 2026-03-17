import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useSessionStore } from '../../store/sessionStore.js';
import { useSchoolResults } from '../../hooks/useAnalytics.js';

/**
 * Results release — admin-controlled gate.
 * Shows completed exams with their release status.
 * Releasing an exam publishes results to Supabase and triggers EMIS sync.
 * PDF export prints a formatted slip for each student.
 */
export default function ResultsRelease() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useSessionStore();

  const [selectedExamId, setSelectedExamId] = useState('');
  const [confirmRelease, setConfirmRelease] = useState(null); // exam object to confirm

  // Completed exams for this school
  const { data: exams = [] } = useQuery({
    queryKey: ['exams-completed', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exams')
        .select('id, title, subject, grade_level, status, results_released_at')
        .eq('school_id', profile.school_id)
        .in('status', ['completed', 'results_released'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(profile?.school_id),
  });

  // Results for selected exam (for PDF)
  const { data: examData } = useSchoolResults(
    profile?.school_id,
    selectedExamId ? { examId: selectedExamId } : {}
  );

  const releaseMutation = useMutation({
    mutationFn: async (examId) => {
      const { error } = await supabase
        .from('exams')
        .update({
          status: 'results_released',
          results_released_at: new Date().toISOString(),
        })
        .eq('id', examId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams-completed'] });
      setConfirmRelease(null);
    },
  });

  function handlePrint() {
    window.print();
  }

  const selectedExam = exams.find(e => e.id === selectedExamId);
  const resultsForExam = (examData?.results ?? []).filter(r => r.exam_id === selectedExamId);

  return (
    <div className="min-h-screen bg-oecs-neutral-100">
      {/* Print styles injected inline so they work without a separate CSS file */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-slip { page-break-after: always; }
          body { background: white; }
        }
      `}</style>

      <header className="bg-white border-b border-oecs-neutral-400 px-4 py-4 flex items-center gap-3 no-print">
        <button onClick={() => navigate('/admin')} aria-label={t('common.back')}
          className="tap-target text-oecs-neutral-800 text-lg">←</button>
        <h1 className="text-[16px] font-semibold text-oecs-neutral-800 flex-1">
          {t('admin.results')}
        </h1>
        {selectedExamId && resultsForExam.length > 0 && (
          <button onClick={handlePrint}
            className="tap-target px-4 py-2 rounded-xl bg-oecs-navy text-white text-sm font-semibold">
            Print Slips
          </button>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6 no-print">
        {/* Exam list */}
        <div className="flex flex-col gap-3">
          {exams.length === 0 && (
            <p className="text-oecs-neutral-400 text-sm">No completed exams found.</p>
          )}
          {exams.map(exam => {
            const isReleased = exam.status === 'results_released';
            const isSelected = exam.id === selectedExamId;
            return (
              <div key={exam.id}
                className={[
                  'bg-white rounded-xl border-2 px-4 py-4 flex items-center gap-4',
                  isSelected ? 'border-oecs-navy' : 'border-oecs-neutral-400',
                ].join(' ')}>
                <button onClick={() => setSelectedExamId(isSelected ? '' : exam.id)}
                  className="flex-1 text-left flex flex-col gap-1 min-w-0">
                  <span className="font-semibold text-oecs-neutral-800 truncate">{exam.title}</span>
                  <span className="text-sm text-oecs-neutral-400">
                    Grade {exam.grade_level} · {exam.subject}
                    {isReleased && (
                      <span className="ml-2 text-oecs-teal font-medium">· Released</span>
                    )}
                  </span>
                </button>

                {!isReleased && (
                  <button
                    onClick={() => setConfirmRelease(exam)}
                    className="tap-target px-4 py-2 rounded-xl bg-oecs-teal text-white text-sm font-semibold shrink-0"
                  >
                    Release
                  </button>
                )}
                {isReleased && (
                  <span className="text-oecs-teal text-sm font-medium shrink-0">✓ Released</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Results preview for selected exam */}
        {selectedExam && resultsForExam.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-oecs-neutral-800">
              Results — {selectedExam.title}
            </h2>
            <div className="overflow-x-auto rounded-2xl border-2 border-oecs-neutral-400 bg-white">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b-2 border-oecs-neutral-400 bg-oecs-neutral-100">
                    <th className="text-left px-4 py-3 font-semibold">Student</th>
                    <th className="text-right px-4 py-3 font-semibold">Marks</th>
                    <th className="text-right px-4 py-3 font-semibold">%</th>
                    <th className="text-right px-4 py-3 font-semibold">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsForExam
                    .slice()
                    .sort((a, b) => b.percent - a.percent)
                    .map((r, i) => (
                      <tr key={i} className="border-b border-oecs-neutral-400/50">
                        <td className="px-4 py-3 text-oecs-neutral-800">{r.student_name}</td>
                        <td className="px-4 py-3 text-right">{r.total_marks}/{r.possible_marks}</td>
                        <td className={[
                          'px-4 py-3 text-right font-bold',
                          r.percent >= 70 ? 'text-oecs-teal' :
                          r.percent >= 50 ? 'text-oecs-amber' : 'text-oecs-neutral-400',
                        ].join(' ')}>{r.percent}%</td>
                        <td className="px-4 py-3 text-right font-medium text-oecs-neutral-800">
                          {letterGrade(r.percent)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Printable result slips — hidden on screen, shown on print */}
      <div className="hidden print:block">
        {resultsForExam.map((r, i) => (
          <ResultSlip key={i} result={r} exam={selectedExam} />
        ))}
      </div>

      {/* Release confirm dialog */}
      {confirmRelease && (
        <div role="dialog" aria-modal="true"
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-semibold text-oecs-neutral-800 text-center">
              Release results for<br />
              <span className="text-oecs-navy">{confirmRelease.title}</span>?
            </h2>
            <p className="text-sm text-oecs-neutral-400 text-center">
              Students and guardians will be able to view results. This cannot be undone.
            </p>
            <button
              onClick={() => releaseMutation.mutate(confirmRelease.id)}
              disabled={releaseMutation.isPending}
              className="py-4 rounded-xl bg-oecs-teal text-white font-semibold min-h-[52px]">
              {releaseMutation.isPending ? t('common.loading') : 'Yes, release results'}
            </button>
            <button onClick={() => setConfirmRelease(null)}
              className="py-3 rounded-xl border-2 border-oecs-neutral-400 text-oecs-neutral-800 font-medium min-h-[52px]">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Printable result slip for one student.
 */
function ResultSlip({ result, exam }) {
  if (!exam) return null;
  return (
    <div className="print-slip p-8 font-sans" style={{ minHeight: '148mm' }}>
      <div style={{ borderBottom: '2px solid #1D9E75', paddingBottom: '12px', marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
          OECS Examination Portal
        </p>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#2C2C2A', margin: '4px 0 0' }}>
          {exam.title}
        </h1>
        <p style={{ fontSize: '13px', color: '#888780', margin: '2px 0 0' }}>
          Grade {exam.grade_level} · {exam.subject}
        </p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <tbody>
          <SlipRow label="Student" value={result.student_name} />
          {result.emis_student_id && <SlipRow label="EMIS ID" value={result.emis_student_id} />}
          <SlipRow label="Marks awarded" value={`${result.total_marks} / ${result.possible_marks}`} />
          <SlipRow label="Percentage" value={`${result.percent}%`} bold />
          <SlipRow label="Grade" value={letterGrade(result.percent)} bold />
        </tbody>
      </table>

      <p style={{ fontSize: '11px', color: '#888780', marginTop: '24px' }}>
        Results released by school administration. For queries contact your class teacher.
      </p>
    </div>
  );
}

function SlipRow({ label, value, bold }) {
  return (
    <tr>
      <td style={{ padding: '6px 0', color: '#888780', width: '40%' }}>{label}</td>
      <td style={{ padding: '6px 0', color: '#2C2C2A', fontWeight: bold ? 700 : 400 }}>{value}</td>
    </tr>
  );
}

/**
 * Convert a percentage to a letter grade (Caribbean standard).
 * @param {number} percent
 * @returns {string}
 */
function letterGrade(percent) {
  if (percent >= 90) return 'A+';
  if (percent >= 80) return 'A';
  if (percent >= 70) return 'B';
  if (percent >= 60) return 'C';
  if (percent >= 50) return 'D';
  return 'F';
}
