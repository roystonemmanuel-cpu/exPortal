import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Image label question — tap a label from the bank, then tap a hotspot on the image.
 * selectedValue is Record<regionId, labelId>.
 * question.regions is [{ id, x, y, width, height, label }]
 * question.labels is [{ id, text }]
 */
export function ImageLabelQuestion({ question, selectedValue, onSelect }) {
  const { t } = useTranslation();
  const regions = question.regions ?? [];
  const labels = question.labels ?? [];
  const [activeLabel, setActiveLabel] = useState(null);
  const current = selectedValue ?? {};

  function handleRegionTap(regionId) {
    if (!activeLabel) return;
    const next = { ...current, [regionId]: activeLabel };
    onSelect(next);
    setActiveLabel(null);
  }

  function handleLabelTap(labelId) {
    setActiveLabel(prev => prev === labelId ? null : labelId);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-oecs-neutral-400">{t('exam.label_hint')}</p>

      {/* Image with hotspot overlays */}
      <div className="relative rounded-xl overflow-hidden border-2 border-oecs-neutral-400 bg-oecs-neutral-100">
        {question.stem_image_url && (
          <img
            src={question.stem_image_url}
            alt={question.stem_text ?? 'Image question'}
            className="w-full h-auto block"
          />
        )}
        {regions.map(region => {
          const placed = labels.find(l => l.id === current[region.id]);
          const isActive = activeLabel !== null;
          return (
            <button
              key={region.id}
              onClick={() => handleRegionTap(region.id)}
              aria-label={`Region: ${region.label}${placed ? ` — labelled: ${placed.text}` : ''}`}
              style={{
                position: 'absolute',
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width ?? 10}%`,
                height: `${region.height ?? 10}%`,
              }}
              className={[
                'flex items-center justify-center rounded-lg border-2 text-xs font-semibold',
                'transition-colors duration-150',
                placed ? 'border-oecs-teal bg-oecs-teal text-white' :
                isActive ? 'border-oecs-amber bg-oecs-amber-light text-oecs-amber animate-pulse' :
                'border-oecs-neutral-400 bg-white/70 text-oecs-neutral-800',
              ].join(' ')}
            >
              {placed ? placed.text : '+'}
            </button>
          );
        })}
      </div>

      {/* Label bank */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Available labels">
        {labels.map(label => {
          const isUsed = Object.values(current).includes(label.id);
          const isActive = activeLabel === label.id;
          return (
            <button
              key={label.id}
              onClick={() => handleLabelTap(label.id)}
              aria-pressed={isActive}
              className={[
                'px-4 py-2 rounded-full border-2 text-sm font-medium min-h-[44px]',
                'transition-colors duration-150',
                isActive
                  ? 'border-oecs-amber bg-oecs-amber text-white'
                  : isUsed
                  ? 'border-oecs-teal bg-oecs-teal-light text-oecs-teal'
                  : 'border-oecs-neutral-400 bg-white text-oecs-neutral-800',
              ].join(' ')}
            >
              {label.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
