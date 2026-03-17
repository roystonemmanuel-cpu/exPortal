import { useTranslation } from 'react-i18next';

const MAX_CHARS = 200;

/**
 * Short-answer question — free text, max 200 chars, routed to marking queue.
 */
export function ShortAnswerQuestion({ question, selectedValue, onSelect }) {
  const { t } = useTranslation();
  const value = selectedValue ?? '';
  const remaining = MAX_CHARS - value.length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-oecs-neutral-400">{t('exam.short_answer_hint')}</p>
      <textarea
        value={value}
        onChange={e => onSelect(e.target.value.slice(0, MAX_CHARS))}
        rows={5}
        aria-label={question.stem_text}
        className={[
          'w-full rounded-xl border-2 border-oecs-neutral-400 bg-white',
          'text-[15px] text-oecs-neutral-800 leading-relaxed',
          'px-4 py-3 resize-none',
          'focus:outline-none focus:border-oecs-teal',
        ].join(' ')}
      />
      <p className="text-xs text-oecs-neutral-400 text-right" aria-live="polite">
        {remaining} characters remaining
      </p>
    </div>
  );
}
