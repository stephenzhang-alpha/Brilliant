import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  min: number;
  max: number;
  answer: number;
  caption?: string;
  onSolved?: () => void;
}

/**
 * Micro-activity: the learner drags a marker along a number line to physically
 * locate a value (e.g. computing 12 - 5). Used to repair arithmetic slips
 * surfaced by a wrong answer.
 */
export function NumberLineHop({ min, max, answer, caption, onSolved }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState(min);
  const [dragging, setDragging] = useState(false);
  const solvedRef = useRef(false);

  const span = max - min;
  const pct = ((value - min) / span) * 100;
  const correct = value === answer;

  useEffect(() => {
    if (correct && !solvedRef.current) {
      solvedRef.current = true;
      onSolved?.();
    }
  }, [correct, onSolved]);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setValue(Math.round(min + ratio * span));
    },
    [min, span],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      setFromClientX(e.clientX);
    };
    const up = () => setDragging(false);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, setFromClientX]);

  const ticks = Array.from({ length: span + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-2">
      {caption && <p className="text-xs text-text-muted">{caption}</p>}
      <div
        ref={trackRef}
        className="relative h-10 select-none touch-none"
        onPointerDown={(e) => {
          setDragging(true);
          setFromClientX(e.clientX);
        }}
      >
        <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-white/15 rounded-full" />
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${((t - min) / span) * 100}%` }}
          >
            <div className="w-0.5 h-2 bg-white/25" />
            <span className="text-[10px] text-text-muted mt-1">{t}</span>
          </div>
        ))}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold cursor-grab active:cursor-grabbing transition-colors
            ${correct ? 'bg-success border-success text-white' : 'bg-primary border-primary-light text-white'}
          `}
          style={{ left: `${pct}%` }}
        >
          {value}
        </div>
      </div>
      {correct && <p className="text-xs text-success font-medium">That's it — {answer}. Now try again.</p>}
    </div>
  );
}
