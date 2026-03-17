import { useRef } from 'react';

/**
 * Stimulus block layout.
 * - Landscape / split: stimulus left 50%, questions right 50%.
 * - Portrait / stacked: sticky stimulus panel above questions (max-h 220px, scrollable).
 *
 * @param {{ stimulus: Object, activeQuestionId: string, children: React.ReactNode }} props
 */
export function StimulusBlock({ stimulus, activeQuestionId, children }) {
  return (
    <>
      {/* Landscape split layout (md+) */}
      <div className="hidden md:flex h-full gap-0">
        <StimulusPanel stimulus={stimulus} activeQuestionId={activeQuestionId}
          className="w-1/2 border-r border-oecs-neutral-400 overflow-y-auto" />
        <div className="w-1/2 overflow-y-auto px-6 py-6">
          {children}
        </div>
      </div>

      {/* Portrait stacked layout (< md) */}
      <div className="flex md:hidden flex-col">
        <StimulusPanel stimulus={stimulus} activeQuestionId={activeQuestionId}
          className="sticky top-0 z-10 bg-oecs-neutral-100 border-b border-oecs-neutral-400 max-h-[220px] overflow-y-auto" />
        <div className="px-4 py-6">
          {children}
        </div>
      </div>
    </>
  );
}

function StimulusPanel({ stimulus, activeQuestionId, className }) {
  return (
    <div className={['p-4', className].join(' ')} aria-label="Reading passage">
      {stimulus.content_text && (
        <p className="text-[15px] leading-relaxed text-oecs-neutral-800 whitespace-pre-wrap">
          {stimulus.content_text}
        </p>
      )}
      {stimulus.image_url && (
        <div className="relative mt-3">
          <img
            src={stimulus.image_url}
            alt={stimulus.title ?? 'Stimulus image'}
            className="w-full h-auto rounded-lg"
          />
          {/* Hotspot pulse markers — highlights region relevant to active question */}
          {(stimulus.hotspots ?? [])
            .filter(h => h.question_id === activeQuestionId)
            .map(h => (
              <span
                key={h.id}
                aria-hidden="true"
                style={{ position: 'absolute', left: `${h.x}%`, top: `${h.y}%` }}
                className="w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-oecs-amber/70 animate-ping"
              />
            ))}
        </div>
      )}
      {stimulus.audio_url && (
        <audio controls src={stimulus.audio_url} className="mt-3 w-full" />
      )}
    </div>
  );
}
