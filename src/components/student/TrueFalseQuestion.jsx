import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

/**
 * True/False question — simplified UI for K–2.
 * Two large tap targets: True (teal) and False (neutral).
 */
export function TrueFalseQuestion({ question, selectedValue, onSelect }) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-4 justify-center mt-4" role="radiogroup" aria-label={question.stem_text}>
      {[
        { value: 'true', label: t('exam.type_true') },
        { value: 'false', label: t('exam.type_false') },
      ].map(({ value, label }) => {
        const isSelected = selectedValue === value;
        return (
          <motion.button
            key={value}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            onClick={() => onSelect(value)}
            role="radio"
            aria-checked={isSelected}
            className={[
              'flex-1 max-w-[160px] h-[80px] rounded-2xl border-2 text-xl font-semibold',
              'transition-colors duration-150',
              isSelected
                ? 'border-oecs-teal bg-oecs-teal text-white'
                : 'border-oecs-neutral-400 bg-white text-oecs-neutral-800',
            ].join(' ')}
          >
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
