import { useRef, useState } from 'react';
import { BalanceScale } from './BalanceScale';

/**
 * The Balance Game — a SolveMe-Mobiles-inspired run of weight-balancing puzzles
 * and the finale of the Algebra Quest.
 *
 * Every puzzle is a single-variable relation encoded as a two-pan scale:
 * `left = leftA·x + leftB` vs `right = rightA·x + rightB`. The player assigns a
 * value to `x` with a slider / number input / steppers; the x-blocks resize and
 * the beam tips toward the heavier side in real time. Most puzzles ask the
 * player to *balance* the scale (the unique x where both pans weigh the same —
 * i.e. the equation's solution); the last two are inequalities asking them to
 * *tip* the scale a given way. Clearing the final puzzle fires `onComplete`
 * once so the page can finish the quest.
 */

/** A single balance puzzle: two linear sides plus the goal relation. */
export interface BalancePuzzle {
  id: string;
  /** Left pan = leftA·x + leftB. */
  leftA: number;
  leftB: number;
  /** Right pan = rightA·x + rightB. */
  rightA: number;
  rightB: number;
  /** What the player must achieve: level it, or tip it one way. */
  goal: 'balance' | 'tipLeft' | 'tipRight';
  /** For 'balance': the unique x where left === right (drives the nudge hint). */
  solution?: number;
  /** A one-line textbook nudge shown under the goal. */
  hint?: string;
}

/** Inclusive range the player may assign to x (slider + number input + steppers). */
const X_MIN = 0;
const X_MAX = 12;
/** Where every puzzle starts — deliberately solves none of them. */
const X_START = 1;

/**
 * Five balance puzzles of increasing difficulty (one-step → coefficient →
 * variable on both sides), then two "tip the scale" inequalities as a twist.
 *   1) x + 2 = 5         -> x = 3
 *   2) 2x = 8            -> x = 4
 *   3) 2x + 1 = x + 6    -> x = 5
 *   4) 3x + 2 = x + 6    -> x = 2
 *   5) 2x + 3 = x + 9    -> x = 6
 *   6) 2x + 1 > 7        -> any x >= 4   (make the LEFT pan heavier)
 *   7) 3x > x + 8        -> any x >= 5   (make the LEFT pan heavier)
 * Coefficients stay <= 3 and constants <= 9 so the block visuals read cleanly.
 */
const PUZZLES: BalancePuzzle[] = [
  {
    id: 'p1',
    leftA: 1, leftB: 2,
    rightA: 0, rightB: 5,
    goal: 'balance',
    solution: 3,
    hint: 'One x plus 2 units balances 5. How heavy must x be?',
  },
  {
    id: 'p2',
    leftA: 2, leftB: 0,
    rightA: 0, rightB: 8,
    goal: 'balance',
    solution: 4,
    hint: 'Two equal x-blocks balance 8 — split it evenly between them.',
  },
  {
    id: 'p3',
    leftA: 2, leftB: 1,
    rightA: 1, rightB: 6,
    goal: 'balance',
    solution: 5,
    hint: 'x sits on both pans now. Take one x off each side, then compare.',
  },
  {
    id: 'p4',
    leftA: 3, leftB: 2,
    rightA: 1, rightB: 6,
    goal: 'balance',
    solution: 2,
    hint: 'Lift an x from both sides, then peel the units away.',
  },
  {
    id: 'p5',
    leftA: 2, leftB: 3,
    rightA: 1, rightB: 9,
    goal: 'balance',
    solution: 6,
    hint: 'Variables on both sides again — even out the heavier pan.',
  },
  {
    id: 'p6',
    leftA: 2, leftB: 1,
    rightA: 0, rightB: 7,
    goal: 'tipLeft',
    hint: 'Make the LEFT pan heavier: push 2x + 1 past 7.',
  },
  {
    id: 'p7',
    leftA: 3, leftB: 0,
    rightA: 1, rightB: 8,
    goal: 'tipLeft',
    hint: 'Outweigh the right pan — how big must x be before 3x beats x + 8?',
  },
];

/** Clamp + round an arbitrary number into a valid integer x assignment. */
function clampX(value: number): number {
  if (!Number.isFinite(value)) return X_MIN;
  return Math.max(X_MIN, Math.min(X_MAX, Math.round(value)));
}

/** Format a·x + b like a textbook: hide a=1 ("x") and b=0, show negatives with −. */
function fmtSide(a: number, b: number): string {
  const ax = a === 0 ? '' : a === 1 ? 'x' : `${a}x`;
  if (b === 0) return ax === '' ? '0' : ax;
  if (ax === '') return `${b}`;
  return b > 0 ? `${ax} + ${b}` : `${ax} − ${Math.abs(b)}`;
}

/** The relation symbol the player is aiming to make true. */
function goalSymbol(goal: BalancePuzzle['goal']): string {
  return goal === 'balance' ? '=' : goal === 'tipLeft' ? '>' : '<';
}

/** Has the current x satisfied the puzzle's goal? */
function isSolved(goal: BalancePuzzle['goal'], left: number, right: number): boolean {
  switch (goal) {
    case 'balance':
      return left === right;
    case 'tipLeft':
      return left > right;
    case 'tipRight':
      return right > left;
  }
}

interface BalanceGameProps {
  /** Fired once when the player solves the FINAL puzzle (clicks "Finish"). */
  onComplete?: () => void;
  className?: string;
}

export function BalanceGame({ onComplete, className = '' }: BalanceGameProps) {
  const [index, setIndex] = useState(0);
  const [x, setX] = useState(X_START);
  /** Raw text for the number field so partial/empty input doesn't snap x to 0. */
  const [xInput, setXInput] = useState(String(X_START));
  /** Highest puzzle index reached (for the progress dots / back-nav). */
  const [reached, setReached] = useState(0);
  const firedRef = useRef(false);

  const puzzle = PUZZLES[index];
  const isLast = index === PUZZLES.length - 1;
  const left = puzzle.leftA * x + puzzle.leftB;
  const right = puzzle.rightA * x + puzzle.rightB;
  const leftLabel = fmtSide(puzzle.leftA, puzzle.leftB);
  const rightLabel = fmtSide(puzzle.rightA, puzzle.rightB);
  const solved = isSolved(puzzle.goal, left, right);

  // Steppers / slider / resets carry a valid number: move x and mirror the field.
  const assign = (value: number) => {
    const c = clampX(value);
    setX(c);
    setXInput(String(c));
  };

  // Number field: keep the raw string for a live typing/empty state; only commit a
  // clamped x when it parses to a finite number, and treat empty as "no change".
  const onXInput = (raw: string) => {
    setXInput(raw);
    const n = Number(raw);
    if (raw.trim() !== '' && Number.isFinite(n)) setX(clampX(n));
  };

  const goToPuzzle = (i: number) => {
    setIndex(i);
    setX(X_START);
    setXInput(String(X_START));
  };

  const goNext = () => {
    if (isLast) return;
    const next = index + 1;
    setReached((r) => Math.max(r, next));
    goToPuzzle(next);
  };

  // Solving the last puzzle finishes the quest. Guarded so it can only fire once
  // (the page swaps us out for the celebration the moment it's called).
  const finish = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onComplete?.();
  };

  // Hint when not yet solved. For 'balance' we know the unique solution, so we
  // can say which way to nudge x; for the tip challenges the left pan grows
  // fastest, so "bigger x" always pushes it heavier.
  const heavier = left > right ? 'Left' : right > left ? 'Right' : 'Neither';
  const balanceNudge =
    puzzle.solution !== undefined && x < puzzle.solution ? 'a bigger' : 'a smaller';

  const solvedMessage =
    puzzle.goal === 'balance'
      ? `⚖️ Balanced! x = ${x} makes ${leftLabel} = ${rightLabel}.`
      : `✅ Solved! x = ${x} makes ${leftLabel} ${goalSymbol(puzzle.goal)} ${rightLabel}.`;

  return (
    <div className={`mt-5 rounded-3xl bg-surface p-4 shadow-xl ring-1 ring-black/5 sm:p-6 ${className}`}>
      {/* Progress + goal */}
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-bold text-text-muted">
          Puzzle {index + 1} / {PUZZLES.length}
        </span>
        <div className="flex items-center gap-1.5">
          {PUZZLES.map((p, i) => {
            const unlocked = i <= reached;
            const isCurrent = i === index;
            return (
              <button
                key={p.id}
                type="button"
                disabled={!unlocked}
                onClick={() => goToPuzzle(i)}
                aria-label={`Go to puzzle ${i + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  isCurrent
                    ? 'w-6 bg-primary'
                    : unlocked
                      ? 'w-2.5 bg-primary/40 hover:bg-primary/70'
                      : 'w-2.5 bg-black/10'
                }`}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
          {puzzle.goal === 'balance' ? 'Balance the scale' : 'Tip the scale left'}
        </p>
        <p className="mt-0.5 font-mono text-2xl font-black tabular-nums text-text">
          {leftLabel} <span className="text-primary">{goalSymbol(puzzle.goal)}</span> {rightLabel}
        </p>
        {puzzle.hint && (
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">{puzzle.hint}</p>
        )}
      </div>

      {/* The live scale */}
      <div className="mt-2">
        <BalanceScale
          left={left}
          right={right}
          leftLabel={leftLabel}
          rightLabel={rightLabel}
          xValue={x}
          leftBlocks={{ xCount: puzzle.leftA, units: puzzle.leftB }}
          rightBlocks={{ xCount: puzzle.rightA, units: puzzle.rightB }}
        />
      </div>

      {/* Value controls — steppers + number input + slider, all in sync */}
      <div className="rounded-2xl bg-surface-light p-4">
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Decrease x"
            onClick={() => assign(x - 1)}
            disabled={x <= X_MIN}
            className="btn-pop h-11 w-11 rounded-full bg-primary font-display text-2xl font-black leading-none text-white disabled:opacity-40"
          >
            −
          </button>
          <label className="flex flex-col items-center">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-text-muted">
              x =
            </span>
            <input
              type="number"
              min={X_MIN}
              max={X_MAX}
              step={1}
              value={xInput}
              onChange={(e) => onXInput(e.target.value)}
              onBlur={() => setXInput(String(x))}
              aria-label="Value of x"
              className="w-20 bg-transparent text-center font-mono text-4xl font-black tabular-nums text-primary outline-none"
            />
          </label>
          <button
            type="button"
            aria-label="Increase x"
            onClick={() => assign(x + 1)}
            disabled={x >= X_MAX}
            className="btn-pop h-11 w-11 rounded-full bg-primary font-display text-2xl font-black leading-none text-white disabled:opacity-40"
          >
            +
          </button>
        </div>
        <input
          type="range"
          min={X_MIN}
          max={X_MAX}
          step={1}
          value={x}
          onChange={(e) => assign(Number(e.target.value))}
          aria-label="Drag to set x"
          className="mt-3 w-full cursor-pointer accent-primary"
        />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-text-muted">
          <span>{X_MIN}</span>
          <span>{X_MAX}</span>
        </div>
      </div>

      {/* Feedback / advance */}
      <div className="mt-4 text-center">
        {solved ? (
          <div className="animate-pop">
            <p className="font-display text-lg font-extrabold text-success">{solvedMessage}</p>
            {isLast ? (
              <button
                type="button"
                onClick={finish}
                className="btn-pop mt-3 animate-pulse rounded-xl bg-primary px-7 py-3 font-display font-bold text-white"
              >
                Finish the quest →
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="btn-pop mt-3 animate-glow rounded-xl bg-primary px-7 py-3 font-display font-bold text-white"
              >
                Next puzzle →
              </button>
            )}
          </div>
        ) : (
          <p className="animate-fadein font-display text-sm font-semibold text-text-muted">
            {puzzle.goal === 'balance'
              ? `${heavier} pan is heavier — try ${balanceNudge} value of x.`
              : `Not heavy enough — make the left pan outweigh the right with a bigger x.`}
          </p>
        )}
      </div>
    </div>
  );
}
