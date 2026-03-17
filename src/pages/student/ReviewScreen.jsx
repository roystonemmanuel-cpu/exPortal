import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useExamStore } from '../../store/examStore.js';
import { useSessionStore } from '../../store/sessionStore.js';
import { syncResponses } from '../../lib/sync.js';
import { saveSession } from '../../lib/db.js';
import { supabase } from '../../lib/supabase.js';

/**
 * Review screen: shows all questions with answered / flagged / unanswered status.
 * Student can jump back or proceed to submit.
 */
export default function ReviewScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { questions, responses, flaggedIds, goTo, setPhase } = useExamStore();
  const { studentSession } = useSessionStore();
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const unansweredCount = questions.filter(q =>
    responses[q.id] === undefined || responses[q.id] === null || responses[q.id] === ''
  ).length;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Mark submitted locally
      await saveSession({ id: studentSession?.id, status: 'submitted' });

      // Mark submitted in Supabase
      if (studentSession?.id) {
        await supabase
          .from('student_sessions')
          .update({ submitted_at: new Date().toISOString() })
          .eq('id', studentSession.id);
      }

      // Attempt immediate sync
      await syncResponses();
      setPhase('submitted');
      navigate('/student/submitted');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-oecs-neutral-100 flex flex-col">
      <header className="bg-white border-b border-oecs-neutral-400 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label={t('common.back')}
          className="tap-target text-oecs-neutral-800 text-lg"
        >
          ←
        </button>
        <h1 className="text-[16px] font-semibold text-oecs-neutral-800">{t('exam.review')}</h1>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        {unansweredCount > 0 && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-oecs-amber-light border border-oecs-amber text-oecs-amber text-sm font-medium" role="alert">
            {unansweredCount === 1
              ? t('exam.unanswered_warning', { count: unansweredCount })
              : t('exam.unanswered_warning_plural', { count: unansweredCount })}
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {questions.map((q, i) => {
            const isAnswered = responses[q.id] !== undefined && responses[q.id] !== null && responses[q.id] !== '';
            const isFlagged = flaggedIds.has(q.id);
            return (
              <li key={q.id}>
                <button
                  onClick={() => { goTo(i); navigate('/student/exam'); }}
                  className={[
                    'w-full flex items-center gap-4 px-4 py-3 rounded-xl border-2',
                    'text-left transition-colors duration-100 min-h-[52px]',
                    isFlagged
                      ? 'border-oecs-amber bg-oecs-amber-light'
                      : isAnswered
                      ? 'border-oecs-teal bg-oecs-teal-light'
                      : 'border-oecs-neutral-400 bg-white',
                  ].join(' ')}
                >
                  <span className={[
                    'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                    isFlagged ? 'bg-oecs-amber text-white' :
                    isAnswered ? 'bg-oecs-teal text-white' :
                    'bg-oecs-neutral-400 text-white',
                  ].join(' ')}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-oecs-neutral-800 truncate">
                    {q.stem_text ?? `Question ${i + 1}`}
                  </span>
                  <span className="text-xs font-medium shrink-0">
                    {isFlagged ? '⚑ ' : ''}{isAnswered ? '✓' : '–'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="bg-white border-t border-oecs-neutral-400 px-4 py-4">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={submitting}
          className="w-full py-4 rounded-xl bg-oecs-teal text-white text-base font-semibold min-h-[56px]"
        >
          {submitting ? t('common.loading') : t('exam.submit')}
        </button>
      </footer>

      {/* Confirm dialog */}
      {showConfirm && (
        <div role="dialog" aria-modal="true" aria-label={t('exam.submit_confirm')}
          className="fixed inset-0 bg-black/40 flex items-end justify-center p-4 z-50">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="bg-white rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
          >
            <p className="text-[15px] font-medium text-oecs-neutral-800 text-center">
              {t('exam.submit_confirm')}
            </p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="py-4 rounded-xl bg-oecs-teal text-white font-semibold min-h-[52px]"
            >
              {t('exam.submit_confirm_yes')}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="py-3 rounded-xl border-2 border-oecs-neutral-400 text-oecs-neutral-800 font-medium min-h-[52px]"
            >
              {t('exam.submit_confirm_no')}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
