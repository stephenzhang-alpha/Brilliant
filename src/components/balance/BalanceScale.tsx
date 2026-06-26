/**
 * An animated two-pan balance used by the Equations & Inequalities pages.
 *
 * It is purely presentational: give it the total `left`/`right` weights and it
 * tilts toward the heavier side (balancing when they are equal), shows a live
 * relation readout (= / < / >), and renders the block makeup of each pan
 * (x-blocks + unit blocks). The x-blocks grow a little with `xValue`, so
 * changing x visibly changes the weights before the scale even tips.
 *
 * Built with HTML/CSS transforms (not SVG) so the beam rotation and the
 * upright, counter-rotated pans animate smoothly across browsers.
 */
interface PanBlocks {
  /** How many "x" blocks sit in this pan (the coefficient of x). */
  xCount: number;
  /** How many plain unit ("1") blocks sit in this pan (the constant). */
  units: number;
}

interface BalanceScaleProps {
  /** Total weight currently on the left pan. */
  left: number;
  /** Total weight currently on the right pan. */
  right: number;
  /** Textbook label for each side, e.g. "2x + 1". */
  leftLabel?: string;
  rightLabel?: string;
  /** Current value of x — sizes/labels the x-blocks. */
  xValue?: number;
  leftBlocks?: PanBlocks;
  rightBlocks?: PanBlocks;
  className?: string;
}

const BEAM_W = 300;
const PIVOT_TOP = 78;
const HANGER = 22;

/** Beam tilt in degrees: heavier side dips down (clamped, with a gentle ramp). */
function angleFor(left: number, right: number): number {
  const diff = left - right;
  if (diff === 0) return 0;
  const mag = Math.min(12, 4 + 1.1 * Math.min(Math.abs(diff), 8));
  // CSS rotate is clockwise-positive (right end dips). Left heavier => CCW.
  return diff > 0 ? -mag : mag;
}

function Chip({ kind, xValue }: { kind: 'x' | 'unit'; xValue?: number }) {
  if (kind === 'unit') {
    return (
      <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-amber-400 text-[9px] font-bold text-amber-950 shadow-sm ring-1 ring-amber-600/40">
        1
      </span>
    );
  }
  const v = Math.max(0, Math.min(12, xValue ?? 3));
  const height = 18 + v * 1.4; // grows with x to "feel" heavier
  return (
    <span
      className="grid w-5 place-items-center rounded-[5px] bg-primary text-[10px] font-extrabold text-white shadow-sm ring-1 ring-primary-dark/50 transition-[height] duration-300"
      style={{ height }}
    >
      x
    </span>
  );
}

function Pan({
  side,
  theta,
  blocks,
  total,
  xValue,
}: {
  side: 'left' | 'right';
  theta: number;
  blocks?: PanBlocks;
  total: number;
  xValue?: number;
}) {
  const xs = Array.from({ length: blocks?.xCount ?? 0 });
  const us = Array.from({ length: blocks?.units ?? 0 });
  return (
    <div
      className="absolute top-1/2 flex flex-col items-center"
      style={{
        [side]: 0,
        transform: `translateX(${side === 'left' ? '-50%' : '50%'}) rotate(${-theta}deg)`,
        transformOrigin: 'center top',
        transition: 'transform 0.42s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
    >
      {/* hanger */}
      <div className="h-[var(--hanger)] w-0.5 bg-slate-400/70" style={{ ['--hanger' as string]: `${HANGER}px` }} />
      {/* blocks resting on the pan */}
      <div className="flex min-h-[30px] max-w-[120px] flex-wrap items-end justify-center gap-1 px-1 pb-1">
        {xs.map((_, i) => (
          <Chip key={`x${i}`} kind="x" xValue={xValue} />
        ))}
        {us.map((_, i) => (
          <Chip key={`u${i}`} kind="unit" />
        ))}
      </div>
      {/* pan bowl */}
      <div className="h-3 w-28 rounded-b-[40px] border-x-2 border-b-2 border-slate-400/80 bg-gradient-to-b from-slate-200 to-slate-300 shadow-md" />
      {/* numeric total */}
      <div className="mt-1.5 rounded-full bg-slate-900/80 px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-white">
        {total}
      </div>
    </div>
  );
}

export function BalanceScale({
  left,
  right,
  leftLabel,
  rightLabel,
  xValue,
  leftBlocks,
  rightBlocks,
  className = '',
}: BalanceScaleProps) {
  const theta = angleFor(left, right);
  const balanced = left === right;
  const rel = balanced ? '=' : left > right ? '>' : '<';

  return (
    <div className={`relative mx-auto w-full max-w-[440px] ${className}`} style={{ height: 300 }}>
      {/* Relation readout */}
      <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 font-display text-sm font-extrabold shadow-md ring-1 ${
            balanced
              ? 'bg-emerald-500 text-white ring-emerald-700/40'
              : 'bg-amber-400 text-amber-950 ring-amber-600/40'
          }`}
        >
          {leftLabel && <span className="font-mono">{leftLabel}</span>}
          <span className="text-base">{rel}</span>
          {rightLabel && <span className="font-mono">{rightLabel}</span>}
        </div>
      </div>

      {/* Stand: base + center post up to the pivot */}
      <div
        className="absolute left-1/2 bottom-0 -translate-x-1/2"
        style={{ width: 0, height: 0, borderLeft: '34px solid transparent', borderRight: '34px solid transparent', borderBottom: '20px solid #94a3b8' }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-t bg-slate-400"
        style={{ width: 8, top: PIVOT_TOP, bottom: 18 }}
      />
      {/* Pivot cap */}
      <div
        className="absolute left-1/2 z-10 h-3 w-3 -translate-x-1/2 rounded-full bg-slate-500 ring-2 ring-white"
        style={{ top: PIVOT_TOP - 6 }}
      />

      {/* Beam (rotates around its center = the pivot); pans hang from its ends */}
      <div
        className="absolute left-1/2"
        style={{
          top: PIVOT_TOP,
          width: BEAM_W,
          transform: `translateX(-50%) rotate(${theta}deg)`,
          transformOrigin: 'center',
          transition: 'transform 0.42s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500 shadow" />
        <Pan side="left" theta={theta} blocks={leftBlocks} total={left} xValue={xValue} />
        <Pan side="right" theta={theta} blocks={rightBlocks} total={right} xValue={xValue} />
      </div>
    </div>
  );
}
