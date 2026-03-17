import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/examStore.js';
import { useSessionStore } from '../../store/sessionStore.js';
import { ProgressDots } from '../../components/shared/ProgressDots.jsx';
import { QuestionRenderer } from '../../components/student/QuestionRenderer.jsx';
import { StimulusBlock } from '../../components/student/StimulusBlock.jsx';
import { OfflineBanner } from '../../components/shared/OfflineBanner.jsx';

/**
 * Main exam delivery screen.
 * One question per screen, scroll-free.
 * No countdown timer. No red states.
 */
export default function ExamScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    questions, currentIndex, responses, flaggedIds,
    goNext, goPrev, goTo, recordResponse, toggleFlag: storeToggleFlag, setPhase,
  } = useExamStore();
  const { studentSession } = useSessionStore();

  const question = questions[currentIndex];
  const sessionId = studentSession?.id ?? 'offline';
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;
  const selectedValue = question ? responses[question.id] ?? null : null;

  const handleSelect = useCallback(async (value) => {
    if (!question) return;
    await recordResponse(sessionId, question.id, value);
  }, [question, sessionId, recordResponse]);

  const handleFlag = useCallback(async () => {
    if (!question) return;
    await storeToggleFlag(sessionId, question.id);
  }, [question, sessionId, storeToggleFlag]);

  const handleReview = () => {
    setPhase('review');
    navigate('/student/review');
  };

  if (!question) {
    return (
      <div className="flex items-center justify-center h-screen bg-oecs-neutral-100">
        <p className="text-oecs-neutral-400">{t('common.loading')}</p>
      </div>
    );
  }

  const isFlagged = flaggedIds.has(question.id);
  const hasStimulus = Boolean(question.stimulus);

  const questionContent = (
    <div className="flex flex-col gap-6">
      {/* Question number */}
      <p className="text-xs font-semibold text-oecs-neutral-400 uppercase tracking-wide">
        {t('exam.question_of', { current: currentIndex + 1, total: questions.length })}
      </p>

      {/* Stem */}
      {!hasStimulus && question.stem_text && (
        <h1 className="text-[16px] font-medium text-oecs-neutral-800 leading-relaxed">
          {question.stem_text}
        </h1>
      )}
      {!hasStimulus && question.stem_image_url && (
        <img
          src={question.stem_image_url}
          alt={question.stem_text ?? 'Question image'}
          className="rounded-xl w-full object-contain max-h-52"
        />
      )}

      {/* Question interaction area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <QuestionRenderer
            question={question}
            selectedValue={selectedValue}
            onSelect={handleSelect}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-oecs-neutral-100 overflow-hidden">
      <OfflineBanner />

      {/* Progress strip */}
      <div className="bg-white border-b border-oecs-neutral-400 shrink-0">
        <ProgressDots
          questions={questions}
          currentIndex={currentIndex}
          responses={responses}
          flaggedIds={flaggedIds}
          onDotClick={goTo}
        />
      </div>

      {/* Main content — full height minus header / footer */}
      <div className="flex-1 overflow-hidden">
        {hasStimulus ? (
          <StimulusBlock stimulus={question.stimulus} activeQuestionId={question.id}>
            {/* Stem for stimulus child */}
            <h1 className="text-[16px] font-medium text-oecs-neutral-800 leading-relaxed mb-4">
              {question.stem_text}
            </h1>
            {questionContent}
          </StimulusBlock>
        ) : (
          <div className="h-full overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full">
            {questionContent}
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <footer className="bg-white border-t border-oecs-neutral-400 px-4 py-3 flex items-center gap-3 shrink-0">
        {/* Flag button */}
        <button
          onClick={handleFlag}
          aria-pressed={isFlagged}
          aria-label={isFlagged ? t('exam.unflag') : t('exam.flag')}
          className={[
            'tap-target flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium',
            'transition-colors duration-150',
            isFlagged
              ? 'border-oecs-amber bg-oecs-amber-light text-oecs-amber'
              : 'border-oecs-neutral-400 bg-white text-oecs-neutral-400',
          ].join(' ')}
        >
          <span aria-hidden="true">⚑</span>
          <span className="hidden sm:inline">{isFlagged ? t('exam.unflag') : t('exam.flag')}</span>
        </button>

        <div className="flex-1" />

        {/* Previous */}
        <button
          onClick={goPrev}
          disabled={isFirst}
          aria-label={t('exam.prev')}
          className={[
            'tap-target px-6 py-2 rounded-xl border-2 text-sm font-medium',
            'transition-colors duration-150',
            isFirst
              ? 'border-oecs-neutral-400 text-oecs-neutral-400 opacity-40 cursor-not-allowed'
              : 'border-oecs-neutral-400 text-oecs-neutral-800 bg-white',
          ].join(' ')}
        >
          {t('exam.prev')}
        </button>

        {/* Next / Review */}
        {isLast ? (
          <button
            onClick={handleReview}
            className="tap-target px-6 py-2 rounded-xl bg-oecs-teal text-white text-sm font-semibold"
          >
            {t('exam.review')}
          </button>
        ) : (
          <button
            onClick={goNext}
            aria-label={t('exam.next')}
            className="tap-target px-6 py-2 rounded-xl bg-oecs-teal text-white text-sm font-semibold"
          >
            {t('exam.next')}
          </button>
        )}
      </footer>
    </div>
  );
}
