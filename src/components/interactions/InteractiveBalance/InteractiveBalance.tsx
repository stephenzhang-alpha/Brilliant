import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BalanceConfig, BalanceTermSpec } from '../../../types';
import {
  type BalanceState,
  type Chip,
  type MirrorHint,
  type MoveEvent,
  applyMove,
  buildInitialState,
  chipLabel,
  isBalanced,
  planRemoval,
  tiltOf,
} from '../../../engine/balance/balanceState';
import { useBalanceDrag, type DropZone } from '../../../hooks/useBalanceDrag';
import { Beam } from './Beam';
import { Pan } from './Pan';
import { WeightBank } from './WeightBank';
import { WeightToken } from './WeightToken';

interface Props {
  config: BalanceConfig;
  onSubmit: (answer: number) => void;
  disabled?: boolean;
}

const DEFAULT_PALETTE: BalanceTermSpec[] = [
  { kind: 'const', value: 1 },
  { kind: 'const', value: -1 },
  { kind: 'var', value: 1 },
];

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

interface Pending {
  action: 'remove' | 'add';
  zone: 'left' | 'right';
  kind: 'const' | 'var';
  value: number;
}

export function InteractiveBalance({ config, onSubmit, disabled }: Props) {
  const [state, setState] = useState<BalanceState>(() => buildInitialState(config));
  const [past, setPast] = useState<BalanceState[]>([]);
  const [event, setEvent] = useState<MoveEvent | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [displayTilt, setDisplayTilt] = useState(0);

  const stateRef = useRef(state);
  const solvedRef = useRef(false);
  const tiltCurrent = useRef(0);

  // Keep the latest state in a ref for event handlers (updated post-render).
  useEffect(() => {
    stateRef.current = state;
  });

  const leftEl = useRef<HTMLDivElement | null>(null);
  const rightEl = useRef<HTMLDivElement | null>(null);
  const bankEl = useRef<HTMLDivElement | null>(null);

  const palette = config.palette ?? DEFAULT_PALETTE;

  // Animate the beam toward the true (hidden-solution) tilt.
  useEffect(() => {
    let raf = 0;
    const animate = () => {
      const target = clamp(tiltOf(stateRef.current) * 2, -12, 12);
      const next = tiltCurrent.current + (target - tiltCurrent.current) * 0.18;
      tiltCurrent.current = Math.abs(target - next) < 0.01 ? target : next;
      setDisplayTilt(tiltCurrent.current);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const commit = useCallback(
    (res: { state: BalanceState; event: MoveEvent }, label: string) => {
      if (!res.event.accepted) {
        setEvent(res.event);
        return;
      }
      setPast((p) => [...p, stateRef.current]);
      setState(res.state);
      setMoves((m) => [...m, label]);
      setEvent(res.event);

      if (res.event.mirror) {
        const m = res.event.mirror;
        setPending({ action: m.action, zone: m.zone, kind: m.kind, value: m.value });
      } else if (res.event.balanced) {
        setPending(null);
      }

      if (res.event.solved && !solvedRef.current) {
        solvedRef.current = true;
        setSolved(true);
        window.setTimeout(() => onSubmit(res.event.answer ?? config.targetValue), 750);
      }
    },
    [config.targetValue, onSubmit],
  );

  const onDrop = useCallback(
    (chip: { id: string; from: DropZone | 'palette'; label: string; kind: 'const' | 'var'; value: number; name?: string }, to: DropZone) => {
      if (disabled || solvedRef.current) return;
      const st = stateRef.current;
      if (chip.from === 'palette') {
        if (to !== 'left' && to !== 'right') return;
        commit(
          applyMove(st, { type: 'spawn', chip: { kind: chip.kind, value: chip.value, name: chip.name }, to }),
          `add ${chip.label} to ${to}`,
        );
        return;
      }
      const label =
        to === 'bank'
          ? `remove ${chip.label} from ${chip.from}`
          : chip.from === 'bank'
            ? `return ${chip.label} to ${to}`
            : `${chip.label} ${chip.from}→${to}`;
      commit(applyMove(st, { type: 'transfer', chipId: chip.id, from: chip.from, to }), label);
    },
    [commit, disabled],
  );

  const getZoneRects = useCallback(() => {
    const out: Array<{ zone: DropZone; rect: DOMRect }> = [];
    if (leftEl.current) out.push({ zone: 'left', rect: leftEl.current.getBoundingClientRect() });
    if (rightEl.current) out.push({ zone: 'right', rect: rightEl.current.getBoundingClientRect() });
    if (bankEl.current) out.push({ zone: 'bank', rect: bankEl.current.getBoundingClientRect() });
    return out;
  }, []);

  const { drag, pointer, hoverZone, start } = useBalanceDrag({ onDrop, getZoneRects, disabled });

  const handleSplit = (chip: Chip, into: [number, number]) => {
    const st = stateRef.current;
    const zone: 'left' | 'right' = st.left.some((c) => c.id === chip.id) ? 'left' : 'right';
    commit(applyMove(st, { type: 'split', chipId: chip.id, zone, into }), `split ${chip.value} → ${into[0]} + ${into[1]}`);
  };

  const handleDivide = (d: number) => {
    if (disabled || solvedRef.current) return;
    commit(applyMove(stateRef.current, { type: 'divide', divisor: d }), `÷${d} both sides`);
  };

  const undo = () => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setState(prev);
    setEvent(null);
    setMoves((m) => [...m, '↩ undo']);
    setPending(isBalanced(prev) ? null : pending);
  };

  const reset = () => {
    setState(buildInitialState(config));
    setPast([]);
    setEvent(null);
    setPending(null);
    setMoves([]);
  };

  // Recompute the live mirror hint against the CURRENT board (so it survives
  // intermediate steps like splitting a weight).
  const activeMirror: MirrorHint | undefined = useMemo(() => {
    if (!pending || isBalanced(state) || solved) return undefined;
    if (pending.action === 'add') return { ...pending };
    const target = pending.zone === 'left' ? state.left : state.right;
    const plan = planRemoval(target, pending.kind, pending.value, state.variable);
    return { ...pending, needsDecomposition: plan && plan !== 'exact' ? plan : undefined };
  }, [pending, state, solved]);

  const balanced = isBalanced(state);
  const banner = buildBanner(activeMirror, event, balanced, solved);

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted text-center">
        {config.goalText ?? `Get ${config.variable} alone on one pan, keeping the scale level.`}
      </p>

      {/* Balance stage */}
      <div className="relative h-[300px]">
        <Beam tiltDeg={displayTilt} balanced={balanced} />
        <div
          className="absolute"
          style={{ left: '2%', top: 150 + displayTilt * 2.6 }}
        >
          <Pan
            zone="left"
            chips={state.left}
            panRef={(el) => (leftEl.current = el)}
            isHover={hoverZone === 'left'}
            disabled={!!disabled || solved}
            draggingId={drag?.id ?? null}
            mirror={activeMirror}
            onChipPointerDown={(e, c) =>
              start(e, { id: c.id, from: 'left', label: chipLabel(c), kind: c.kind, value: c.value, name: c.name })
            }
            onSplitChip={handleSplit}
          />
        </div>
        <div
          className="absolute"
          style={{ right: '2%', top: 150 - displayTilt * 2.6 }}
        >
          <Pan
            zone="right"
            chips={state.right}
            panRef={(el) => (rightEl.current = el)}
            isHover={hoverZone === 'right'}
            disabled={!!disabled || solved}
            draggingId={drag?.id ?? null}
            mirror={activeMirror}
            onChipPointerDown={(e, c) =>
              start(e, { id: c.id, from: 'right', label: chipLabel(c), kind: c.kind, value: c.value, name: c.name })
            }
            onSplitChip={handleSplit}
          />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-1">
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              balanced ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
            }`}
          >
            {solved ? 'Solved!' : balanced ? 'Balanced' : 'Tipping!'}
          </span>
        </div>
      </div>

      {/* Divide tools */}
      {config.divisors && config.divisors.length > 0 && !solved && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-text-muted">Apply to both sides:</span>
          {config.divisors.map((d) => (
            <button
              key={d}
              onClick={() => handleDivide(d)}
              disabled={disabled}
              className="px-3 py-1.5 rounded-lg bg-surface-light border border-white/20 text-sm font-medium hover:border-primary-light hover:bg-primary/10 transition-all active:scale-95 disabled:opacity-50"
            >
              ÷ {d}
            </button>
          ))}
        </div>
      )}

      {/* Bank + palette */}
      {!solved && (
        <WeightBank
          bankChips={state.bank}
          palette={palette}
          bankRef={(el) => (bankEl.current = el)}
          isHover={hoverZone === 'bank'}
          disabled={!!disabled}
          draggingId={drag?.id ?? null}
          onBankChipPointerDown={(e, c) =>
            start(e, { id: c.id, from: 'bank', label: chipLabel(c), kind: c.kind, value: c.value, name: c.name })
          }
          onPalettePointerDown={(e, spec, idx) =>
            start(e, {
              id: `tpl-${idx}-${Date.now()}`,
              from: 'palette',
              label: spec.kind === 'var' ? spec.name ?? 'x' : spec.value > 0 ? `+${spec.value}` : `${spec.value}`,
              kind: spec.kind,
              value: spec.value,
              name: spec.name,
            })
          }
        />
      )}

      {/* Constructive-failure remediation */}
      {banner && (
        <div
          className={`rounded-xl p-4 border-2 ${
            banner.tone === 'error' ? 'bg-error/10 border-error/40' : 'bg-warning/10 border-warning/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">⚖️</span>
            <div className="flex-1 space-y-1">
              <p className={`font-medium ${banner.tone === 'error' ? 'text-error' : 'text-warning'}`}>
                {banner.title}
              </p>
              <p className="text-sm text-text/80">{banner.body}</p>
            </div>
          </div>
        </div>
      )}

      {/* Controls + telemetry */}
      {!solved && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={past.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-text-muted hover:text-text hover:border-white/40 transition-colors disabled:opacity-30"
            >
              Undo
            </button>
            <button
              onClick={reset}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-text-muted hover:text-text hover:border-white/40 transition-colors"
            >
              Reset
            </button>
          </div>
          {moves.length > 0 && (
            <span className="text-xs text-text-muted/70 truncate max-w-[60%] text-right">
              {moves.length} step{moves.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

      {solved && (
        <div className="text-center text-success font-medium py-2 animate-pulse">
          The variable is isolated and the scale is level. Solved!
        </div>
      )}

      {/* Floating drag ghost */}
      {drag && pointer && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: pointer.x, top: pointer.y }}
        >
          <WeightToken label={drag.label} kind={drag.kind} negative={drag.kind === 'const' && drag.value < 0} />
        </div>
      )}
    </div>
  );
}

interface Banner {
  title: string;
  body: string;
  tone: 'warn' | 'error';
}

function buildBanner(
  mirror: MirrorHint | undefined,
  event: MoveEvent | null,
  balanced: boolean,
  solved: boolean,
): Banner | null {
  if (solved) return null;

  if (mirror) {
    if (mirror.action === 'add') {
      return {
        tone: 'warn',
        title: 'The scale tipped!',
        body: `You added to one side only. Add ${labelFor(mirror)} to the ${mirror.zone} pan too so both sides stay equal.`,
      };
    }
    if (mirror.needsDecomposition) {
      const [a, b] = mirror.needsDecomposition.into;
      return {
        tone: 'warn',
        title: 'Same move on both sides',
        body: `To remove ${mirror.value} from the ${mirror.zone} pan, first tap ✂ to split ${a + b} into ${a} + ${b}, then drag the ${a} to the bank.`,
      };
    }
    return {
      tone: 'warn',
      title: 'The scale tipped!',
      body: `Remove ${labelFor(mirror)} from the ${mirror.zone} pan as well — whatever you do to one side, do to the other.`,
    };
  }

  if (event && !event.accepted && event.message) {
    return { tone: 'error', title: 'Not a fair move', body: event.message };
  }

  if (!balanced && event && event.misconception === 'asymmetric_op') {
    return {
      tone: 'warn',
      title: 'The scale tipped!',
      body: 'Both sides must change together. Undo, or make the matching move on the other pan.',
    };
  }

  return null;
}

const labelFor = (m: MirrorHint): string => (m.kind === 'var' ? 'an x' : String(m.value));
