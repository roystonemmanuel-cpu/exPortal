import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Drag-and-order question — touch-native, keyboard alternative via up/down buttons.
 * selectedValue is an ordered array of item ids.
 */
export function DragOrderQuestion({ question, selectedValue, onSelect }) {
  const { t } = useTranslation();
  const items = question.choices ?? [];

  // Initialise order from selectedValue or original order
  const [order, setOrder] = useState(() =>
    selectedValue?.length === items.length
      ? selectedValue.map(id => items.find(i => i.id === id)).filter(Boolean)
      : [...items]
  );

  useEffect(() => {
    onSelect(order.map(i => i.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // Drag state
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  function moveItem(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setOrder(next);
  }

  function handleDragStart(idx) { setDragging(idx); }
  function handleDragEnter(idx) { setDragOver(idx); }
  function handleDrop() {
    if (dragging !== null && dragOver !== null && dragging !== dragOver) {
      moveItem(dragging, dragOver);
    }
    setDragging(null);
    setDragOver(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-oecs-neutral-400">{t('exam.drag_hint')}</p>
      <ul className="flex flex-col gap-2" role="listbox" aria-label={question.stem_text}>
        {order.map((item, idx) => (
          <li
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className={[
              'flex items-center gap-3 rounded-xl border-2 px-4 py-3 min-h-[52px] bg-white',
              'cursor-grab select-none transition-colors duration-100',
              dragOver === idx ? 'border-oecs-teal bg-oecs-teal-light' : 'border-oecs-neutral-400',
              dragging === idx ? 'opacity-50' : 'opacity-100',
            ].join(' ')}
            role="option"
            aria-label={item.text}
          >
            {/* Drag handle */}
            <span aria-hidden="true" className="text-oecs-neutral-400 text-lg">⠿</span>
            <span className="flex-1 text-[14px]">{item.text}</span>

            {/* Keyboard alternative: up / down buttons */}
            <div className="flex flex-col gap-1 ml-2">
              <button
                onClick={() => moveItem(idx, idx - 1)}
                disabled={idx === 0}
                aria-label={`Move "${item.text}" up`}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-oecs-neutral-100 disabled:opacity-30 text-oecs-neutral-800"
              >▲</button>
              <button
                onClick={() => moveItem(idx, idx + 1)}
                disabled={idx === order.length - 1}
                aria-label={`Move "${item.text}" down`}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-oecs-neutral-100 disabled:opacity-30 text-oecs-neutral-800"
              >▼</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
