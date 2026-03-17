import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

/**
 * Multiple-choice question with 4 options.
 * Touch-native: 44px+ tap targets, teal selected state.
 *
 * @param {{ question: Object, selectedValue: string|null, onSelect: (value:string)=>void }} props
 */
export function MCQQuestion({ question, selectedValue, onSelect }) {
  const choices = question.choices ?? [];

  return (
    <div className="flex flex-col gap-3" role="radiogroup" aria-label={question.stem_text}>
      {choices.map((choice, idx) => {
        const isSelected = selectedValue === choice.id;
        return (
          <ChoiceButton
            key={choice.id}
            choice={choice}
            index={idx}
            isSelected={isSelected}
            onSelect={() => onSelect(choice.id)}
          />
        );
      })}
    </div>
  );
}

const LABELS = ['A', 'B', 'C', 'D'];

function ChoiceButton({ choice, index, isSelected, onSelect }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      onClick={onSelect}
      role="radio"
      aria-checked={isSelected}
      className={[
        'flex items-center gap-4 w-full text-left rounded-xl px-4 py-3.5 min-h-[56px]',
        'border-2 transition-colors duration-150',
        isSelected
          ? 'border-oecs-teal bg-oecs-teal-light text-oecs-neutral-800'
          : 'border-oecs-neutral-400 bg-white text-oecs-neutral-800 active:bg-oecs-teal-light',
      ].join(' ')}
    >
      {/* Option letter badge */}
      <span className={[
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
        isSelected ? 'bg-oecs-teal text-white' : 'bg-oecs-neutral-100 text-oecs-neutral-800',
      ].join(' ')} aria-hidden="true">
        {LABELS[index] ?? index + 1}
      </span>

      {/* Choice text or image */}
      {choice.image_url ? (
        <img src={choice.image_url} alt={choice.text ?? `Option ${LABELS[index]}`}
          className="max-h-20 object-contain" />
      ) : (
        <span className="text-[14px] leading-snug">{choice.text}</span>
      )}
    </motion.button>
  );
}
