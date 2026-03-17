import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MCQQuestion } from './MCQQuestion.jsx';

/**
 * Audio question: plays audio clip, then shows MCQ or T/F options.
 * Audio must be in the exam package — no on-demand fetching.
 */
export function AudioQuestion({ question, selectedValue, onSelect }) {
  const { t } = useTranslation();
  const audioRef = useRef(null);
  const [playState, setPlayState] = useState('idle'); // 'idle' | 'playing' | 'done'
  const hasPlayed = playState !== 'idle';

  function handlePlay() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setPlayState('playing');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Audio player */}
      <div className="flex flex-col items-center gap-3">
        {question.stem_audio_url && (
          <audio
            ref={audioRef}
            src={question.stem_audio_url}
            onEnded={() => setPlayState('done')}
            preload="auto"
            aria-hidden="true"
          />
        )}

        <motion.button
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          onClick={handlePlay}
          disabled={playState === 'playing'}
          aria-label={hasPlayed ? t('exam.audio_replay') : t('exam.audio_play')}
          className={[
            'flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-semibold',
            'min-h-[56px] transition-colors duration-150',
            playState === 'playing'
              ? 'bg-oecs-teal-light text-oecs-teal border-2 border-oecs-teal'
              : 'bg-oecs-teal text-white',
          ].join(' ')}
        >
          {/* Speaker icon */}
          <span aria-hidden="true" className="text-2xl">
            {playState === 'playing' ? '🔊' : hasPlayed ? '🔁' : '▶'}
          </span>
          {playState === 'playing'
            ? t('exam.audio_playing')
            : hasPlayed
            ? t('exam.audio_replay')
            : t('exam.audio_play')}
        </motion.button>
      </div>

      {/* Show choices only after the audio has been played */}
      {hasPlayed && (
        <MCQQuestion question={question} selectedValue={selectedValue} onSelect={onSelect} />
      )}
    </div>
  );
}
