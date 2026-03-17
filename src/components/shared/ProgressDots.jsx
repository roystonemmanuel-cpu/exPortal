import { useTranslation } from 'react-i18next';

/**
 * Progress dot strip for exam navigation.
 * answered=teal, current=wide teal pill, flagged=amber, unanswered=neutral border.
 *
 * @param {{ questions: Object[], currentIndex: number, responses: Record<string,*>, flaggedIds: Set<string>, onDotClick: (i:number)=>void }} props
 */
export function ProgressDots({ questions, currentIndex, responses, flaggedIds, onDotClick }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t('exam.question_of', { current: currentIndex + 1, total: questions.length })}
      className="flex flex-wrap gap-1.5 px-4 py-3 justify-center">
      {questions.map((q, i) => {
        const isCurrent = i === currentIndex;
        const isFlagged = flaggedIds.has(q.id);
        const isAnswered = responses[q.id] !== undefined && responses[q.id] !== null && responses[q.id] !== '';

        let cls = 'tap-target flex items-center justify-center rounded-full transition-all duration-150 ';
        let ariaLabel = '';

        if (isCurrent) {
          cls += 'w-8 h-5 rounded-full bg-oecs-teal text-white text-[11px] font-semibold px-2.5';
          ariaLabel = `${t('progress.current')}, ${i + 1}`;
        } else if (isFlagged) {
          cls += 'w-5 h-5 bg-oecs-amber-light border-2 border-oecs-amber';
          ariaLabel = `${t('progress.flagged')}, ${i + 1}`;
        } else if (isAnswered) {
          cls += 'w-5 h-5 bg-oecs-teal';
          ariaLabel = `${t('progress.answered')}, ${i + 1}`;
        } else {
          cls += 'w-5 h-5 bg-white border-2 border-oecs-neutral-400';
          ariaLabel = `${t('progress.unanswered')}, ${i + 1}`;
        }

        return (
          <button
            key={q.id}
            className={cls}
            aria-label={ariaLabel}
            aria-current={isCurrent ? 'step' : undefined}
            onClick={() => onDotClick(i)}
          >
            {isCurrent ? i + 1 : null}
          </button>
        );
      })}
    </nav>
  );
}
