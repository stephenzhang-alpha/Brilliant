import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { rankInfo, useOverallStore } from '../../stores/overallStore';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Tween a displayed integer toward `target` (eased), animating only on change. */
function useCountUp(target: number, duration = 650): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    // Reduced motion: snap (render returns `target` directly), no animation.
    if (prefersReducedMotion()) {
      displayRef.current = target;
      return;
    }
    const from = displayRef.current;
    if (from === target) return;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(from + (target - from) * eased);
      displayRef.current = val;
      setDisplay(val);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return prefersReducedMotion() ? target : display;
}

/**
 * The compact, animated score pill: rank badge + count-up total (the sum of the
 * player's best runs) + a slim progress bar toward the next rank. A new personal
 * best floats a green "+N · new best!" up; a run that doesn't beat your record
 * floats a subtle "no new best" instead. A glow flourish plays while a promotion
 * is being celebrated. Purely presentational — wrap it in a button (HUD) or a
 * Link (nav) for interaction.
 */
export function ScoreChip({ className = '' }: { className?: string }) {
  const overall = useOverallStore((s) => s.overall);
  const lastGain = useOverallStore((s) => s.lastGain);
  const justRankedUp = useOverallStore((s) => s.justRankedUp);
  const display = useCountUp(overall);
  const info = rankInfo(overall);

  const gainAt = lastGain?.at ?? 'init';
  const gainPoints = lastGain?.points ?? 0;
  const newBest = !!lastGain && lastGain.isBest && gainPoints > 0;
  const noBest = !!lastGain && !lastGain.isBest;

  return (
    <div
      className={`relative flex flex-col gap-1 rounded-2xl bg-amber-400 px-2.5 py-1 text-amber-950 shadow sm:px-3 ${
        justRankedUp !== null ? 'animate-glow' : ''
      } ${className}`}
      style={{ '--rank': info.rank.color } as CSSProperties}
      title={`${info.rank.name} — ${overall.toLocaleString()} pts (sum of your best scores)`}
    >
      <span className="flex items-center gap-1.5 font-display font-bold leading-none tabular-nums">
        <span aria-hidden className="text-sm leading-none">
          {info.rank.icon}
        </span>
        <span aria-hidden>⭐</span>
        <span key={gainAt} className={newBest ? 'animate-pop' : ''}>
          {display.toLocaleString()}
        </span>
      </span>
      <span className="relative h-1 w-full overflow-hidden rounded-full bg-amber-950/15">
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${info.progress * 100}%`, background: info.rank.color }}
        />
      </span>
      {newBest && (
        <span
          key={`gain-${gainAt}`}
          className="animate-floatup pointer-events-none absolute -top-4 right-1 flex flex-col items-end leading-none"
        >
          <span className="font-display text-sm font-bold text-success">
            +{gainPoints.toLocaleString()}
          </span>
          <span className="font-display text-[0.6rem] font-bold uppercase tracking-wide text-success/90">
            new best!
          </span>
        </span>
      )}
      {noBest && (
        <span
          key={`nobest-${gainAt}`}
          className="animate-floatup pointer-events-none absolute -top-3 right-1 font-display text-[0.65rem] font-semibold text-amber-950/55"
        >
          no new best
        </span>
      )}
    </div>
  );
}
