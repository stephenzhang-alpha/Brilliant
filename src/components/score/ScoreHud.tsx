import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { rankInfo, useOverallStore, type ScoreSource } from '../../stores/overallStore';

const GAME_META: Record<ScoreSource, { label: string; icon: string; color: string }> = {
  dino: { label: 'Dino Runner', icon: '🦖', color: '#f59e0b' },
  gates: { label: 'Gate Runner', icon: '🚪', color: '#06b6d4' },
  tower: { label: 'Algebra Tower', icon: '🗼', color: '#7c3aed' },
};

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

/**
 * The interactive score HUD for the journey bar: the chip plus an expandable
 * panel showing rank progress, a per-game *best* breakdown (the overall is the
 * sum of these three bests), the session tally, and a guarded "reset progress"
 * control.
 */
export function ScoreHud() {
  const [open, setOpen] = useState(false);
  const overall = useOverallStore((s) => s.overall);
  const contributions = useOverallStore((s) => s.contributions);
  const sessionGain = useOverallStore((s) => s.sessionGain);
  const lastGain = useOverallStore((s) => s.lastGain);
  const reset = useOverallStore((s) => s.reset);
  const info = rankInfo(overall);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest('[data-scorehud]')) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const handleReset = () => {
    if (
      window.confirm(
        'Reset all progress? This clears your score, ranks, and unlocked games on this device.',
      )
    ) {
      reset();
      setOpen(false);
    }
  };

  const maxContribution = Math.max(
    1,
    contributions.dino,
    contributions.gates,
    contributions.tower,
  );
  const games: ScoreSource[] = ['dino', 'gates', 'tower'];
  // The game whose record just fell (for a one-shot "new best!" badge), if any.
  const justBeatSource = lastGain?.isBest ? lastGain.source : null;
  const justBeatAt = lastGain?.at ?? 0;

  return (
    <div className="relative" data-scorehud>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Toggle rank and score details"
        className="block rounded-2xl outline-none transition-transform active:translate-y-px focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <ScoreChip />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Rank and score details"
          className="animate-fadein fixed right-2 top-[3.25rem] z-50 w-[min(20rem,92vw)] rounded-2xl border border-black/10 bg-surface p-4 text-text shadow-2xl sm:right-3"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl"
              style={{
                background: `${info.rank.color}22`,
                boxShadow: `inset 0 0 0 2px ${info.rank.color}55`,
              }}
            >
              {info.rank.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-text-muted">
                Your rank
              </p>
              <p
                className="font-display text-lg font-extrabold leading-tight"
                style={{ color: info.rank.color }}
              >
                {info.rank.name}
              </p>
            </div>
            <div className="ml-auto text-right">
              <span className="block font-display text-xl font-extrabold leading-none tabular-nums">
                {overall.toLocaleString()}
              </span>
              <span className="block text-[0.55rem] font-bold uppercase tracking-wider text-text-muted">
                sum of bests
              </span>
            </div>
          </div>

          <div className="mt-3">
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-light">
              <div
                className="relative h-full overflow-hidden rounded-full"
                style={{
                  width: `${info.progress * 100}%`,
                  background: `linear-gradient(90deg, ${info.rank.color}, ${
                    info.next ? info.next.color : info.rank.color
                  })`,
                }}
              >
                <span
                  className="animate-shimmer pointer-events-none absolute inset-y-0 -left-1/2 w-1/2"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
                  }}
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {info.next ? (
                <>
                  <span className="font-bold text-text">{info.toNext.toLocaleString()}</span> pts to{' '}
                  <span className="font-semibold" style={{ color: info.next.color }}>
                    {info.next.icon} {info.next.name}
                  </span>
                </>
              ) : (
                'Top rank reached — you are an Algebra Legend! 🏆'
              )}
            </p>
          </div>

          <div className="mt-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-text-muted">
              Your best per game
            </p>
            <div className="mt-2 space-y-2">
              {games.map((g) => {
                const meta = GAME_META[g];
                const val = contributions[g];
                const pct = (val / maxContribution) * 100;
                const justBeat = justBeatSource === g;
                return (
                  <div key={g} className="flex items-center gap-2">
                    <span aria-hidden className="w-5 text-center">
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <span className="truncate text-sm font-medium">{meta.label}</span>
                          {justBeat && (
                            <span
                              key={`best-${g}-${justBeatAt}`}
                              className="animate-pop shrink-0 rounded-full bg-success/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-success"
                            >
                              new best!
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-baseline gap-1">
                          <span className="text-[0.55rem] font-semibold uppercase tracking-wide text-text-muted">
                            best
                          </span>
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: meta.color }}
                          >
                            {val.toLocaleString()}
                          </span>
                        </span>
                      </div>
                      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-light">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{ width: `${pct}%`, background: meta.color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[0.7rem] leading-snug text-text-muted">
              Your overall is the{' '}
              <span className="font-semibold text-text">sum of your three best scores</span>. Beat a
              game&apos;s record to raise it!
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3">
            <span className="text-sm text-text-muted">Earned this session</span>
            <span className="font-display font-bold tabular-nums text-success">
              +{sessionGain.toLocaleString()}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Link
              to="/leaderboard"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl bg-primary px-3 py-2 text-center text-sm font-display font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              🏆 Leaderboard
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-error/40 px-3 py-2 text-sm font-display font-semibold text-error transition-colors hover:bg-error/10"
              title="Reset all progress on this device"
            >
              ↺ Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
