import { useTranslation } from 'react-i18next';

/**
 * Fill-in-the-blank question.
 * Renders the stem with a text input inline for the blank marker `___`.
 */
export function FillBlankQuestion({ question, selectedValue, onSelect }) {
  const { t } = useTranslation();
  const stem = question.stem_text ?? '';

  // Split on the blank marker so we can render the input inline
  const parts = stem.split(/_{3,}/);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-relaxed font-medium flex flex-wrap items-center gap-1">
        {parts.map((part, i) => (
          <span key={i} className="inline">
            {part}
            {i < parts.length - 1 && (
              <input
                type="text"
                value={selectedValue ?? ''}
                onChange={e => onSelect(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                aria-label={t('exam.short_answer_hint')}
                className={[
                  'inline-block mx-1 border-b-2 border-oecs-teal bg-transparent',
                  'text-[15px] font-medium text-oecs-neutral-800 text-center',
                  'min-w-[120px] focus:outline-none focus:border-oecs-teal',
                  'px-2 py-0.5',
                ].join(' ')}
              />
            )}
          </span>
        ))}
      </p>
    </div>
  );
}
