import { useEffect, useMemo, useRef, useState } from 'react';
import type { EquationConfig } from '../../types';
import {
  type Equation,
  type Transform,
  addOp,
  subtractOp,
  multiplyOp,
  divideOp,
  applyToBothSides,
  equationFromConfig,
  formatNode,
  isSolved,
  solutionValueOf,
  toLinear,
} from '../../engine/ast';

interface Props {
  config: EquationConfig;
  onSubmit: (answer: number) => void;
  disabled?: boolean;
}

type OpKind = '+' | '−' | '×' | '÷';

interface Step {
  eq: Equation;
  /** Operation that produced this state, e.g. "− 3" (empty for the start). */
  label: string;
}

interface Suggestion {
  kind: OpKind;
  n: number;
  label: string;
}

const REVEAL_MS = 720;

const transformFor = (kind: OpKind, n: number): Transform => {
  switch (kind) {
    case '+':
      return addOp(n);
    case '−':
      return subtractOp(n);
    case '×':
      return multiplyOp(n);
    case '÷':
      return divideOp(n);
  }
};

const opLabel = (kind: OpKind, n: number) => `${kind} ${n}`;

const isCompound = (s: string) => s.includes(' + ') || s.includes(' - ');

/** Build the "show the move on both sides" string before it simplifies. */
const expandSide = (sideStr: string, kind: OpKind, n: number): string => {
  switch (kind) {
    case '+':
      return `${sideStr} + ${n}`;
    case '−':
      return `${sideStr} − ${n}`;
    case '×':
      return isCompound(sideStr) ? `${n}(${sideStr})` : `${n} · ${sideStr}`;
    case '÷':
      return isCompound(sideStr) ? `(${sideStr}) ÷ ${n}` : `${sideStr} ÷ ${n}`;
  }
};

/** The fewest both-sides moves needed to isolate x from an `ax + b = c` form. */
function minimalSteps(eq: Equation, v: string): number {
  const l = toLinear(eq.left);
  const r = toLinear(eq.right);
  const aL = l.vars[v] ?? 0;
  const aR = r.vars[v] ?? 0;
  const varSide = Math.abs(aL) >= Math.abs(aR) ? l : r;
  const coeff = varSide === l ? aL : aR;
  let steps = 0;
  if (Math.round(varSide.constant * 1e6) !== 0) steps += 1; // a stray constant to clear
  if (Math.abs(Math.abs(coeff) - 1) > 1e-9) steps += 1; // a coefficient to divide out
  return Math.max(steps, 1);
}

/** Helpful next moves derived from the live equation (always solving-forward). */
function suggestionsFor(eq: Equation, v: string): Suggestion[] {
  const l = toLinear(eq.left);
  const r = toLinear(eq.right);
  const aL = l.vars[v] ?? 0;
  const aR = r.vars[v] ?? 0;
  if (aL === 0 && aR === 0) return [];
  const varForm = Math.abs(aL) >= Math.abs(aR) ? l : r;
  const coeff = varForm === l ? aL : aR;

  const out: Suggestion[] = [];
  const k = Math.round(varForm.constant * 1e6) / 1e6;
  if (k > 0) out.push({ kind: '−', n: k, label: `− ${k}` });
  else if (k < 0) out.push({ kind: '+', n: -k, label: `+ ${-k}` });

  if (Math.abs(Math.abs(coeff) - 1) > 1e-9) {
    out.push({ kind: '÷', n: coeff, label: `÷ ${coeff}` });
  }
  return out.slice(0, 2);
}

export function EquationLab({ config, onSubmit, disabled }: Props) {
  const v = config.targetVariable || 'x';
  const initial = useMemo(() => equationFromConfig(config), [config]);

  const [steps, setSteps] = useState<Step[]>([{ eq: initial, label: '' }]);
  const [redo, setRedo] = useState<Step[]>([]);
  const [operand, setOperand] = useState(3);
  const [op, setOp] = useState<OpKind>('−');
  const [preview, setPreview] = useState<{ left: string; right: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const solvedHandled = useRef(false);

  const animRef = useRef(false);
  const noteTimer = useRef(0);
  const eqBoxRef = useRef<HTMLDivElement>(null);

  const current = steps[steps.length - 1];
  const eq = current.eq;
  const solved = isSolved(eq, v);
  const moveCount = steps.length - 1;
  const optimal = useMemo(() => minimalSteps(initial, v), [initial, v]);
  const suggestions = useMemo(() => (solved ? [] : suggestionsFor(eq, v)), [eq, v, solved]);

  useEffect(() => () => window.clearTimeout(noteTimer.current), []);

  // Fire the answer exactly once, when the variable lands isolated.
  useEffect(() => {
    if (solved && !solvedHandled.current) {
      solvedHandled.current = true;
      const value = solutionValueOf(eq, v);
      window.setTimeout(() => onSubmit(value ?? config.targetValue), 900);
    }
  }, [solved, eq, v, onSubmit, config.targetValue]);

  const flash = (msg: string) => {
    setNote(msg);
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), 4200);
  };

  const apply = (kind: OpKind, n: number) => {
    if (disabled || solved || animRef.current) return;
    if (!Number.isFinite(n) || n === 0) {
      flash('Pick a number other than 0 to operate with.');
      return;
    }
    const next = applyToBothSides(eq, transformFor(kind, n));

    const beforeL = formatNode(eq.left);
    const beforeR = formatNode(eq.right);
    const afterEq = `${formatNode(next.left)} = ${formatNode(next.right)}`;
    if (afterEq === `${beforeL} = ${beforeR}`) {
      flash("That move doesn't change the equation — try one that isolates the variable.");
      return;
    }

    // Reversing the previous move? Allowed, but gently flagged.
    if (current.label === inverseLabel(kind, n)) {
      flash('Heads up: that undoes your previous step — you are back where you started.');
    }

    animRef.current = true;
    setPreview({ left: expandSide(beforeL, kind, n), right: expandSide(beforeR, kind, n) });

    window.setTimeout(() => {
      setSteps((prev) => [...prev, { eq: next, label: opLabel(kind, n) }]);
      setRedo([]);
      setPreview(null);
      animRef.current = false;
      eqBoxRef.current?.animate(
        [
          { transform: 'scale(0.96)', opacity: 0.4 },
          { transform: 'scale(1.04)', opacity: 1, offset: 0.6 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' },
      );
    }, REVEAL_MS);
  };

  const undo = () => {
    if (steps.length <= 1 || animRef.current) return;
    setRedo((r) => [steps[steps.length - 1], ...r]);
    setSteps((s) => s.slice(0, -1));
    setNote(null);
  };

  const redoMove = () => {
    if (redo.length === 0 || animRef.current) return;
    setSteps((s) => [...s, redo[0]]);
    setRedo((r) => r.slice(1));
  };

  const reset = () => {
    setSteps([{ eq: initial, label: '' }]);
    setRedo([]);
    setPreview(null);
    setNote(null);
    solvedHandled.current = false;
  };

  const opButtons: OpKind[] = ['+', '−', '×', '÷'];

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-muted text-center">
        Apply the same operation to <span className="text-text">both sides</span> until{' '}
        <span className="font-mono text-primary-light">{v}</span> stands alone.
      </p>

      {/* Live equation / both-sides reveal */}
      <div className="bg-surface/50 rounded-2xl border border-white/10 px-4 py-8">
        <div ref={eqBoxRef} className="flex items-center justify-center gap-3 flex-wrap">
          {preview ? (
            <>
              <EqChunk text={preview.left} highlight />
              <span className="text-2xl font-bold text-text-muted">=</span>
              <EqChunk text={preview.right} highlight />
            </>
          ) : (
            <>
              <EqChunk text={formatNode(eq.left)} solved={solved} />
              <span className="text-2xl font-bold text-text-muted">=</span>
              <EqChunk text={formatNode(eq.right)} solved={solved} />
            </>
          )}
        </div>
        <div className="mt-4 flex justify-center">
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              solved ? 'bg-success/20 text-success' : 'bg-primary/15 text-primary-light'
            }`}
          >
            {solved
              ? `Solved — ${v} = ${solutionValueOf(eq, v) ?? config.targetValue}`
              : preview
                ? 'Same move, both sides…'
                : `Move ${moveCount}`}
          </span>
        </div>
      </div>

      {/* Coaching note */}
      <div className="h-5 text-center text-sm">
        {note && !solved && <span className="text-warning">{note}</span>}
      </div>

      {!solved && (
        <>
          {/* One-tap guided next moves */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs text-text-muted">Try:</span>
              {suggestions.map((s) => (
                <button
                  key={s.label}
                  onClick={() => apply(s.kind, s.n)}
                  disabled={disabled || !!preview}
                  className="px-3 py-1.5 rounded-lg bg-primary/15 border border-primary-light/40 text-sm font-mono font-semibold text-primary-light hover:bg-primary/25 transition-all active:scale-95 disabled:opacity-40"
                >
                  {s.label} <span className="text-text-muted">both sides</span>
                </button>
              ))}
            </div>
          )}

          {/* Manual operation composer */}
          <div className="bg-surface/40 rounded-xl border border-white/10 p-3 space-y-3">
            <div className="flex items-center justify-center gap-2">
              {opButtons.map((k) => (
                <button
                  key={k}
                  onClick={() => setOp(k)}
                  className={`w-10 h-10 rounded-lg font-bold text-lg transition-all ${
                    op === k
                      ? 'bg-primary text-white'
                      : 'bg-surface-light/50 border border-white/15 text-text-muted hover:text-text'
                  }`}
                >
                  {k}
                </button>
              ))}
              <div className="flex items-center rounded-lg border border-white/15 overflow-hidden">
                <button
                  onClick={() => setOperand((n) => Math.max(1, n - 1))}
                  className="w-9 h-10 text-text-muted hover:text-text hover:bg-surface-light/50"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono font-bold">{operand}</span>
                <button
                  onClick={() => setOperand((n) => Math.min(20, n + 1))}
                  className="w-9 h-10 text-text-muted hover:text-text hover:bg-surface-light/50"
                >
                  +
                </button>
              </div>
            </div>
            <button
              onClick={() => apply(op, operand)}
              disabled={disabled || !!preview}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Apply <span className="font-mono">{op} {operand}</span> to both sides
            </button>
          </div>
        </>
      )}

      {/* Show Your Work */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="bg-surface-light/30 px-4 py-2 text-xs uppercase tracking-wider text-text-muted">
          Show your work
        </div>
        <ol className="divide-y divide-white/5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="w-16 shrink-0 font-mono text-xs text-text-muted">
                {i === 0 ? 'start' : s.label}
              </span>
              <span className={`font-mono ${i === steps.length - 1 ? 'text-text' : 'text-text-muted/70'}`}>
                {formatNode(s.eq.left)} = {formatNode(s.eq.right)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Controls */}
      {!solved && (
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={steps.length <= 1}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-text-muted hover:text-text hover:border-white/40 transition-colors disabled:opacity-30"
            >
              Undo
            </button>
            <button
              onClick={redoMove}
              disabled={redo.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-text-muted hover:text-text hover:border-white/40 transition-colors disabled:opacity-30"
            >
              Redo
            </button>
            <button
              onClick={reset}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-text-muted hover:text-text hover:border-white/40 transition-colors"
            >
              Reset
            </button>
          </div>
          <span className="text-xs text-text-muted/70">
            {moveCount} move{moveCount === 1 ? '' : 's'}
          </span>
        </div>
      )}

      {solved && (
        <div className="text-center space-y-1 py-1">
          <p className="text-success font-medium">
            Isolated {v} in {moveCount} move{moveCount === 1 ? '' : 's'}.
          </p>
          <p className="text-xs text-text-muted">
            {moveCount <= optimal
              ? 'That is the most direct path. Nicely done.'
              : `The shortest path was ${optimal} move${optimal === 1 ? '' : 's'} — undo addition/subtraction first, then divide out the coefficient.`}
          </p>
        </div>
      )}
    </div>
  );
}

function EqChunk({ text, highlight, solved }: { text: string; highlight?: boolean; solved?: boolean }) {
  return (
    <span
      className={`font-mono text-2xl sm:text-3xl font-bold px-3 py-2 rounded-xl transition-colors ${
        highlight
          ? 'bg-primary/15 text-primary-light'
          : solved
            ? 'bg-success/15 text-success'
            : 'bg-surface-light/40 text-text'
      }`}
    >
      {text}
    </span>
  );
}

const inverseLabel = (kind: OpKind, n: number): string => {
  const inv: Record<OpKind, OpKind> = { '+': '−', '−': '+', '×': '÷', '÷': '×' };
  return `${inv[kind]} ${n}`;
};
