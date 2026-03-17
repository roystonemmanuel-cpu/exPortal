import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSessionStore } from '../../store/sessionStore.js';
import { useExamStore } from '../../store/examStore.js';
import { saveExamPackage } from '../../lib/db.js';
import { supabase } from '../../lib/supabase.js';

/**
 * Student PIN entry screen.
 * The invigilator shares the session code; the student enters their PIN (4–6 digits).
 * On success: download exam package → navigate to exam.
 */
export default function PinLoginScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [sessionCode, setSessionCode] = useState(params.get('session') ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pinInputRef = useRef(null);

  const { claimStudentSeat } = useSessionStore();
  const { loadExam } = useExamStore();

  useEffect(() => { pinInputRef.current?.focus(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pin.trim()) { setError(t('pin.error_empty')); return; }
    if (!sessionCode.trim()) { setError('Please enter the session code.'); return; }

    setLoading(true);
    setError('');

    try {
      // 1. Claim seat
      const result = await claimStudentSeat(pin, sessionCode);
      if (!result.success) { setError(result.error); return; }

      const { studentSession } = useSessionStore.getState();

      // 2. Fetch exam package from Supabase
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(`
          id,
          exam_id,
          exams (
            id, title, subject, grade_level, duration_minutes,
            exam_questions (
              order,
              question:questions (
                id, type, stem_text, stem_image_url, stem_audio_url,
                choices, correct_answer, marks,
                stimulus:stimulus_questions (
                  stimulus:stimuli (id, title, content_text, image_url, audio_url),
                  order
                )
              )
            )
          )
        `)
        .eq('id', sessionCode)
        .single();

      if (sessionError || !sessionData) {
        setError(t('common.error'));
        return;
      }

      const exam = sessionData.exams;
      await saveExamPackage(sessionCode, exam);
      await loadExam({ ...exam, exam_questions: exam.exam_questions }, studentSession.id);
      navigate('/student/exam');

    } catch (err) {
      console.error(err);
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-oecs-neutral-100 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm flex flex-col gap-6"
      >
        {/* Friendly header */}
        <div className="text-center">
          <span aria-hidden="true" className="text-5xl block mb-3">📝</span>
          <h1 className="text-2xl font-bold text-oecs-neutral-800">{t('pin.title')}</h1>
          <p className="text-[15px] text-oecs-neutral-400 mt-1">{t('pin.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Session code */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-code"
              className="text-sm font-medium text-oecs-neutral-800">
              {t('pin.session_code_label')}
            </label>
            <p className="text-xs text-oecs-neutral-400">{t('pin.session_code_hint')}</p>
            <input
              id="session-code"
              type="text"
              value={sessionCode}
              onChange={e => setSessionCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="e.g. SLC-2026-001"
              className={[
                'rounded-xl border-2 px-4 py-3 text-[15px] font-mono text-oecs-neutral-800',
                'focus:outline-none focus:border-oecs-teal',
                error ? 'border-oecs-amber' : 'border-oecs-neutral-400',
              ].join(' ')}
            />
          </div>

          {/* PIN */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="student-pin"
              className="text-sm font-medium text-oecs-neutral-800">
              {t('pin.label')}
            </label>
            <input
              id="student-pin"
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,6}"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="off"
              placeholder={t('pin.placeholder')}
              aria-describedby={error ? 'pin-error' : undefined}
              className={[
                'rounded-xl border-2 px-4 py-3 text-center text-2xl tracking-[0.5em] text-oecs-neutral-800',
                'focus:outline-none focus:border-oecs-teal',
                error ? 'border-oecs-amber' : 'border-oecs-neutral-400',
              ].join(' ')}
            />
          </div>

          {/* Error */}
          {error && (
            <p id="pin-error" role="alert"
              className="text-sm text-oecs-amber text-center font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className={[
              'mt-2 py-4 rounded-xl text-base font-semibold text-white min-h-[56px]',
              'transition-colors duration-150',
              loading || pin.length < 4
                ? 'bg-oecs-teal/50 cursor-not-allowed'
                : 'bg-oecs-teal',
            ].join(' ')}
          >
            {loading ? t('common.loading') : t('pin.submit')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
