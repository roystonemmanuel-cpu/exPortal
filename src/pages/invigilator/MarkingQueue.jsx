import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useSessionStore } from '../../store/sessionStore.js';

/**
 * Marking queue for short-answer questions.
 * Invigilators/markers see one response at a time — they award marks and move on.
 * The question stem is shown alongside the student's answer (student name is hidden).
 */
export default function MarkingQueue() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useSessionStore();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [awardedMarks, setAwardedMarks] = useState('');
  const [saved, setSaved] = useState(false);

  // Load unmarked short-answer responses for this school
  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['marking-queue', profile?.school_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responses')
        .select(`
          id,
          response_value,
          marked_correct,
          marks_awarded,
          student_sessions!inner(session_id, sessions!inner(school_id)),
          questions!inner(stem_text, stem_image_url, marks, type)
        `)
        .eq('questions.type', 'short_answer')
        .is('marks_awarded', null)
        .eq('student_sessions.sessions.school_id', profile.school_id)
        .order('id', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(profile?.school_id),
  });

  const markMutation = useMutation({
    mutationFn: async ({ id, marks, maxMarks }) => {
      const awarded = Math.min(Math.max(0, Number(marks)), maxMarks);
      const { error } = await supabase
        .from('responses')
        .update({
          marks_awarded: awarded,
          marked_correct: awarded > 0,
        })
        .eq('id', id);
      if (error) throw error;
      return awarded;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marking-queue'] });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setAwardedMarks('');
        setCurrentIdx(prev => prev + 1);
      }, 600);
    },
  });

  const current = queue[currentIdx];
  const question = current?.questions;
  const remaining = queue.length - currentIdx;

  if (isLoading) {
    return <LoadingState />;
  }

  if (!current || remaining === 0) {
    return (
      <div className="min-h-screen bg-oecs-neutral-100 flex flex-col items-center justify-center gap-4 px-4">
        <span aria-hidden="true" className="text-6xl">✅</span>
        <h1 className="text-xl font-bold text-oecs-neutral-800">Marking complete!</h1>
        <p className="text-oecs-neutral-400 text-sm text-center">All short-answer responses have been marked.</p>
        <button onClick={() => navigate('/admin')}
          className="tap-target px-6 py-3 rounded-xl bg-oecs-teal text-white font-semibold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const maxMarks = question?.marks ?? 1;

  return (
    <div className="min-h-screen bg-oecs-neutral-100 flex flex-col">
      <header className="bg-white border-b border-oecs-neutral-400 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label={t('common.back')}
          className="tap-target text-oecs-neutral-800 text-lg">←</button>
        <h1 className="text-[16px] font-semibold text-oecs-neutral-800 flex-1">
          {t('admin.marking_queue')}
        </h1>
        <span className="text-sm text-oecs-neutral-400">{remaining} remaining</span>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6 gap-6">
        {/* Progress bar */}
        <div className="h-1.5 bg-oecs-neutral-400/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-oecs-teal rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx) / Math.max(queue.length, 1)) * 100}%` }}
          />
        </div>

        {/* Question stem */}
        <div className="bg-white rounded-2xl border-2 border-oecs-neutral-400 p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold text-oecs-neutral-400 uppercase tracking-wide">Question</p>
          {question?.stem_image_url && (
            <img src={question.stem_image_url} alt="Question" className="rounded-lg w-full object-contain max-h-40" />
          )}
          <p className="text-[15px] font-medium text-oecs-neutral-800 leading-relaxed">
            {question?.stem_text}
          </p>
          <p className="text-xs text-oecs-neutral-400">Max marks: {maxMarks}</p>
        </div>

        {/* Student's response — anonymised */}
        <div className="bg-oecs-navy-light rounded-2xl border-2 border-oecs-navy p-5 flex flex-col gap-2">
          <p className="text-xs font-semibold text-oecs-navy uppercase tracking-wide">Student Response</p>
          <p className="text-[15px] text-oecs-neutral-800 leading-relaxed whitespace-pre-wrap">
            {current.response_value || <span className="italic text-oecs-neutral-400">No response given.</span>}
          </p>
        </div>

        {/* Mark input */}
        <div className="bg-white rounded-2xl border-2 border-oecs-neutral-400 p-5 flex flex-col gap-4">
          <p className="text-sm font-medium text-oecs-neutral-800">
            Award marks (0 – {maxMarks})
          </p>
          <div className="flex gap-3 flex-wrap">
            {Array.from({ length: maxMarks + 1 }, (_, i) => i).map(mark => (
              <button
                key={mark}
                onClick={() => setAwardedMarks(String(mark))}
                className={[
                  'w-14 h-14 rounded-xl border-2 text-lg font-bold transition-colors',
                  awardedMarks === String(mark)
                    ? mark === 0
                      ? 'border-oecs-coral bg-oecs-coral-light text-oecs-coral'
                      : 'border-oecs-teal bg-oecs-teal text-white'
                    : 'border-oecs-neutral-400 bg-white text-oecs-neutral-800',
                ].join(' ')}
              >
                {mark}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => { setAwardedMarks(''); setCurrentIdx(prev => prev + 1); }}
            className="flex-1 py-3 rounded-xl border-2 border-oecs-neutral-400 text-oecs-neutral-800 font-medium min-h-[52px]"
          >
            Skip
          </button>
          <button
            onClick={() => markMutation.mutate({ id: current.id, marks: awardedMarks, maxMarks })}
            disabled={awardedMarks === '' || markMutation.isPending}
            className={[
              'flex-1 py-3 rounded-xl font-semibold min-h-[52px] text-white transition-colors',
              awardedMarks === '' ? 'bg-oecs-teal/40 cursor-not-allowed' :
              saved ? 'bg-oecs-teal' : 'bg-oecs-teal',
            ].join(' ')}
          >
            {saved ? '✓ Saved' : markMutation.isPending ? t('common.loading') : 'Save & Next'}
          </button>
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-oecs-neutral-100">
      <p className="text-oecs-neutral-400">Loading responses…</p>
    </div>
  );
}
