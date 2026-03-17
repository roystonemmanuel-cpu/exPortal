import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

/**
 * Shown after successful submission. Calm and encouraging — no scores shown to student.
 */
export default function SubmittedScreen() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-oecs-teal-light flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6 max-w-sm"
      >
        {/* Star illustration */}
        <span aria-hidden="true" className="text-8xl select-none">⭐</span>

        <h1 className="text-3xl font-bold text-oecs-teal">
          {t('exam.submitted_title')}
        </h1>

        <p className="text-[16px] text-oecs-neutral-800 leading-relaxed">
          {t('exam.submitted_body')}
        </p>
      </motion.div>
    </div>
  );
}
