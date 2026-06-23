import { useEffect, useRef, useState } from 'react';
import type { ExpressionBuilderConfig, Term } from '../../types';

interface Props {
  config: ExpressionBuilderConfig;
  onSubmit: (answer: number) => void;
  disabled?: boolean;
}

const constLabel = (coeff: number, isFirst: boolean): string => {
  if (isFirst) return `${coeff}`;
  return coeff >= 0 ? `+ ${coeff}` : `− ${Math.abs(coeff)}`;
};

/**
 * Drag-substitution module that replaces multiple choice: the learner drags the
 * given value into the variable's slot, then drags a marker to build the result.
 */
export function ExpressionBuilder({ config, onSubmit, disabled }: Props) {
  const { expression, variable, substituteValue, maxValue = 20 } = config;
  const slotRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const [substituted, setSubstituted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [marker, setMarker] = useState(0);
  const [markerDrag, setMarkerDrag] = useState(false);

  // Drag the value tile onto the variable slot.
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      setPointer({ x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent) => {
      const rect = slotRef.current?.getBoundingClientRect();
      if (
        rect &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        setSubstituted(true);
      }
      setDragging(false);
      setPointer(null);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging]);

  // Drag the result marker along the number line.
  useEffect(() => {
    if (!markerDrag) return;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setMarker(Math.round(ratio * maxValue));
    };
    const up = () => setMarkerDrag(false);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [markerDrag, maxValue]);

  const ticks = Array.from({ length: maxValue + 1 }, (_, i) => i);

  return (
    <div className="space-y-6">
      {/* Expression with substitution slot */}
      <div className="flex items-center justify-center gap-2 flex-wrap py-6 px-4 bg-surface/50 rounded-2xl border border-white/10 text-2xl font-mono font-bold">
        {expression.map((t: Term, i) => {
          if (!t.isConstant) {
            return (
              <span key={t.id} className="inline-flex items-center gap-1.5">
                {Math.abs(t.coefficient) !== 1 && <span className="text-text">{t.coefficient} ×</span>}
                <div
                  ref={slotRef}
                  className={`min-w-[3rem] h-12 px-3 rounded-lg border-2 flex items-center justify-center transition-colors
                    ${substituted ? 'border-primary-light bg-primary/20 text-primary-light' : 'border-dashed border-white/40 text-text-muted'}
                  `}
                >
                  {substituted ? substituteValue : variable}
                </div>
              </span>
            );
          }
          return (
            <span key={t.id} className="text-text">
              {constLabel(t.coefficient, i === 0)}
            </span>
          );
        })}
        {substituted && <span className="text-text-muted">= ?</span>}
      </div>

      {!substituted && (
        <div className="text-center space-y-2">
          <p className="text-sm text-text-muted">
            Drag the value of {variable} into the box
          </p>
          <div
            onPointerDown={(e) => {
              if (disabled) return;
              e.preventDefault();
              setDragging(true);
              setPointer({ x: e.clientX, y: e.clientY });
            }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/30 border-2 border-primary-light text-primary-light font-mono font-bold text-xl cursor-grab active:cursor-grabbing touch-none mx-auto"
            style={{ touchAction: 'none', opacity: dragging ? 0.3 : 1 }}
          >
            {substituteValue}
          </div>
        </div>
      )}

      {substituted && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted text-center">Slide the marker to the value of the expression</p>
          <div
            ref={trackRef}
            className="relative h-10 select-none touch-none"
            onPointerDown={(e) => {
              if (disabled) return;
              setMarkerDrag(true);
              const rect = trackRef.current?.getBoundingClientRect();
              if (rect) {
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setMarker(Math.round(ratio * maxValue));
              }
            }}
          >
            <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-white/15 rounded-full" />
            {ticks.filter((t) => t % 2 === 0).map((t) => (
              <div
                key={t}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${(t / maxValue) * 100}%` }}
              >
                <div className="w-0.5 h-2 bg-white/25" />
                <span className="text-[10px] text-text-muted mt-1">{t}</span>
              </div>
            ))}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary border-2 border-primary-light text-white flex items-center justify-center text-xs font-bold cursor-grab active:cursor-grabbing"
              style={{ left: `${(marker / maxValue) * 100}%` }}
            >
              {marker}
            </div>
          </div>
          <button
            onClick={() => onSubmit(marker)}
            disabled={disabled}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-40 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Check Answer
          </button>
        </div>
      )}

      {dragging && pointer && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-lg bg-primary/40 border-2 border-primary-light text-primary-light font-mono font-bold text-xl flex items-center justify-center"
          style={{ left: pointer.x, top: pointer.y }}
        >
          {substituteValue}
        </div>
      )}
    </div>
  );
}
