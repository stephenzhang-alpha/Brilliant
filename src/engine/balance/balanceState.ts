import type { BalanceConfig, BalanceTermSpec, MisconceptionId } from '../../types';
import type { ASTNode } from '../ast';
import {
  add,
  clean,
  constant,
  equation,
  multiply,
  solutionValueOf,
  uid,
  variable,
} from '../ast';

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type Zone = 'left' | 'right' | 'bank';

export interface Chip {
  id: string;
  kind: 'const' | 'var';
  /** const: numeric value; var: coefficient (a single unit chip is +/-1). */
  value: number;
  name?: string;
}

export interface BalanceState {
  left: Chip[];
  right: Chip[];
  bank: Chip[];
  variable: string;
  /** Hidden true solution, used ONLY to drive the physical tilt. */
  solution: number | null;
}

export interface MirrorHint {
  action: 'remove' | 'add';
  zone: 'left' | 'right';
  kind: 'const' | 'var';
  value: number;
  /** When set, the matching chip must be split before the mirror move is possible. */
  needsDecomposition?: { chipId: string; into: [number, number] };
}

export interface MoveEvent {
  /** Whether the move was applied (false means it was rejected and reverted). */
  accepted: boolean;
  balanced: boolean;
  solved: boolean;
  answer?: number;
  /** Signed weight difference (left - right) at the hidden solution. */
  tilt: number;
  misconception?: MisconceptionId;
  message?: string;
  mirror?: MirrorHint;
}

export type Move =
  | { type: 'transfer'; chipId: string; from: Zone; to: Zone }
  | { type: 'spawn'; chip: Omit<Chip, 'id'>; to: 'left' | 'right' }
  | { type: 'split'; chipId: string; zone: 'left' | 'right'; into: [number, number] }
  | { type: 'divide'; divisor: number };

const EPS = 1e-9;

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

function specToChips(spec: BalanceTermSpec, fallbackName: string): Chip[] {
  if (spec.kind === 'const') {
    return [{ id: uid('c'), kind: 'const', value: spec.value }];
  }
  const name = spec.name ?? fallbackName;
  const coef = spec.value;
  if (Number.isInteger(coef) && Math.abs(coef) >= 1) {
    const sign = coef < 0 ? -1 : 1;
    return Array.from({ length: Math.abs(coef) }, () => ({
      id: uid('v'),
      kind: 'var' as const,
      value: sign,
      name,
    }));
  }
  return [{ id: uid('v'), kind: 'var', value: coef, name }];
}

function sideNode(specs: BalanceTermSpec[], variableName: string): ASTNode {
  const nodes = specs.map((s) =>
    s.kind === 'const'
      ? constant(s.value)
      : s.value === 1
        ? variable(s.name ?? variableName)
        : multiply(constant(s.value), variable(s.name ?? variableName)),
  );
  if (nodes.length === 0) return constant(0);
  return nodes.length === 1 ? nodes[0] : add(...nodes);
}

export function buildInitialState(config: BalanceConfig): BalanceState {
  const left = config.left.flatMap((s) => specToChips(s, config.variable));
  const right = config.right.flatMap((s) => specToChips(s, config.variable));
  const eq = equation(
    sideNode(config.left, config.variable),
    sideNode(config.right, config.variable),
  );
  return {
    left,
    right,
    bank: [],
    variable: config.variable,
    solution: solutionValueOf(eq, config.variable),
  };
}

// ---------------------------------------------------------------------------
// Physics / status
// ---------------------------------------------------------------------------

const weightOf = (chips: Chip[], solution: number | null): number =>
  chips.reduce((s, c) => s + (c.kind === 'var' ? c.value * (solution ?? 0) : c.value), 0);

export const tiltOf = (st: BalanceState): number =>
  clean(weightOf(st.left, st.solution) - weightOf(st.right, st.solution));

export const isBalanced = (st: BalanceState): boolean => Math.abs(tiltOf(st)) < EPS;

const sumValues = (chips: Chip[]): number => clean(chips.reduce((s, c) => s + c.value, 0));

/** Remove +n / -n constant pairs and any zero-value constants from a pan. */
export function collapseZeroPairs(chips: Chip[]): Chip[] {
  const result = chips.filter((c) => !(c.kind === 'const' && c.value === 0));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < result.length && !changed; i += 1) {
      if (result[i].kind !== 'const') continue;
      for (let j = i + 1; j < result.length; j += 1) {
        if (result[j].kind !== 'const') continue;
        if (clean(result[i].value + result[j].value) === 0) {
          result.splice(j, 1);
          result.splice(i, 1);
          changed = true;
          break;
        }
      }
    }
  }
  return result;
}

export function evaluateSolved(st: BalanceState): { solved: boolean; answer?: number } {
  const leftVars = st.left.filter((c) => c.kind === 'var');
  const rightVars = st.right.filter((c) => c.kind === 'var');
  const leftConst = st.left.filter((c) => c.kind === 'const');
  const rightConst = st.right.filter((c) => c.kind === 'const');

  // The variable is isolated when one side is a single x (coefficient 1) whose
  // accompanying constants cancel to zero, and the other side has no variable.
  if (
    leftVars.length === 1 &&
    leftVars[0].value === 1 &&
    sumValues(leftConst) === 0 &&
    rightVars.length === 0 &&
    isBalanced(st)
  ) {
    return { solved: true, answer: sumValues(rightConst) };
  }
  if (
    rightVars.length === 1 &&
    rightVars[0].value === 1 &&
    sumValues(rightConst) === 0 &&
    leftVars.length === 0 &&
    isBalanced(st)
  ) {
    return { solved: true, answer: sumValues(leftConst) };
  }
  return { solved: false };
}

export function chipLabel(c: Chip): string {
  if (c.kind === 'var') {
    const name = c.name ?? 'x';
    if (c.value === 1) return name;
    if (c.value === -1) return `-${name}`;
    return `${c.value}${name}`;
  }
  return String(c.value);
}

// ---------------------------------------------------------------------------
// Moves
// ---------------------------------------------------------------------------

const zoneArr = (st: BalanceState, z: Zone): Chip[] =>
  z === 'left' ? st.left : z === 'right' ? st.right : st.bank;

const setZone = (st: BalanceState, z: Zone, chips: Chip[]): BalanceState =>
  z === 'left'
    ? { ...st, left: chips }
    : z === 'right'
      ? { ...st, right: chips }
      : { ...st, bank: chips };

const other = (z: 'left' | 'right'): 'left' | 'right' => (z === 'left' ? 'right' : 'left');

function reject(
  st: BalanceState,
  misconception: MisconceptionId,
  message: string,
): { state: BalanceState; event: MoveEvent } {
  return {
    state: st,
    event: {
      accepted: false,
      balanced: isBalanced(st),
      solved: false,
      tilt: tiltOf(st),
      misconception,
      message,
    },
  };
}

/** Find how to remove `value`/`kind` from a pan: directly, or via a split. */
export function planRemoval(
  arr: Chip[],
  kind: 'const' | 'var',
  value: number,
  name?: string,
): MirrorHint['needsDecomposition'] | 'exact' | null {
  const exact = arr.find((c) =>
    c.kind === kind && (kind === 'var' ? c.value === value && c.name === name : c.value === value),
  );
  if (exact) return 'exact';
  if (kind === 'const') {
    const splittable = arr.find(
      (c) =>
        c.kind === 'const' &&
        Math.sign(c.value) === Math.sign(value) &&
        Math.abs(c.value) > Math.abs(value),
    );
    if (splittable) {
      return { chipId: splittable.id, into: [value, clean(splittable.value - value)] };
    }
  }
  return null;
}

function applyTransfer(
  st: BalanceState,
  move: Extract<Move, { type: 'transfer' }>,
): { state: BalanceState; event: MoveEvent } {
  const { chipId, from, to } = move;
  if (from === to) return reject(st, 'wrong_answer', '');

  const fromChips = zoneArr(st, from);
  const chip = fromChips.find((c) => c.id === chipId);
  if (!chip) return reject(st, 'wrong_answer', '');

  // Carrying a weight from one pan straight to the other is a category error.
  if (from !== 'bank' && to !== 'bank') {
    return reject(
      st,
      'cross_pan_move',
      "You can't slide a weight across the beam — that secretly changes both sides. To stay fair, remove the same amount from BOTH pans.",
    );
  }

  let next: BalanceState = setZone(st, from, fromChips.filter((c) => c.id !== chipId));
  next = setZone(next, to, [...zoneArr(next, to), chip]);
  next = { ...next, left: collapseZeroPairs(next.left), right: collapseZeroPairs(next.right) };

  const tilt = tiltOf(next);
  const balanced = Math.abs(tilt) < EPS;
  const { solved, answer } = evaluateSolved(next);

  if (balanced) {
    return { state: next, event: { accepted: true, balanced, solved, answer, tilt } };
  }

  // Unbalanced: build a mirror hint that re-levels the beam.
  let mirror: MirrorHint | undefined;
  let misconception: MisconceptionId = 'asymmetric_op';

  if (to === 'bank' && (from === 'left' || from === 'right')) {
    // A removal from one pan: mirror by removing the same from the other pan.
    const target = other(from);
    const plan = planRemoval(zoneArr(next, target), chip.kind, chip.value, chip.name);
    mirror = { action: 'remove', zone: target, kind: chip.kind, value: chip.value };
    if (plan && plan !== 'exact') {
      mirror.needsDecomposition = plan;
      misconception = 'needs_decomposition';
    }
  } else if (from === 'bank' && (to === 'left' || to === 'right')) {
    // Added to one pan: mirror by adding the same to the other pan.
    mirror = { action: 'add', zone: other(to), kind: chip.kind, value: chip.value };
  }

  return {
    state: next,
    event: {
      accepted: true,
      balanced: false,
      solved: false,
      tilt,
      misconception,
      mirror,
    },
  };
}

function applySpawn(
  st: BalanceState,
  move: Extract<Move, { type: 'spawn' }>,
): { state: BalanceState; event: MoveEvent } {
  const chip: Chip = { ...move.chip, id: uid(move.chip.kind === 'var' ? 'v' : 'c') };
  let next = setZone(st, move.to, [...zoneArr(st, move.to), chip]);
  next = { ...next, left: collapseZeroPairs(next.left), right: collapseZeroPairs(next.right) };

  const tilt = tiltOf(next);
  const balanced = Math.abs(tilt) < EPS;
  const { solved, answer } = evaluateSolved(next);

  if (balanced) {
    return { state: next, event: { accepted: true, balanced, solved, answer, tilt } };
  }
  return {
    state: next,
    event: {
      accepted: true,
      balanced: false,
      solved: false,
      tilt,
      misconception: 'asymmetric_op',
      mirror: { action: 'add', zone: other(move.to), kind: chip.kind, value: chip.value },
    },
  };
}

function applySplit(
  st: BalanceState,
  move: Extract<Move, { type: 'split' }>,
): { state: BalanceState; event: MoveEvent } {
  const arr = zoneArr(st, move.zone);
  const idx = arr.findIndex((c) => c.id === move.chipId);
  if (idx === -1) return reject(st, 'wrong_answer', '');
  const chip = arr[idx];
  if (chip.kind !== 'const') return reject(st, 'wrong_answer', '');
  if (clean(move.into[0] + move.into[1]) !== clean(chip.value)) return reject(st, 'wrong_answer', '');

  const replacement: Chip[] = [
    { id: uid('c'), kind: 'const', value: move.into[0] },
    { id: uid('c'), kind: 'const', value: move.into[1] },
  ];
  const next = setZone(st, move.zone, [...arr.slice(0, idx), ...replacement, ...arr.slice(idx + 1)]);
  const tilt = tiltOf(next);
  const { solved, answer } = evaluateSolved(next);
  return { state: next, event: { accepted: true, balanced: Math.abs(tilt) < EPS, solved, answer, tilt } };
}

function applyDivide(
  st: BalanceState,
  move: Extract<Move, { type: 'divide' }>,
): { state: BalanceState; event: MoveEvent } {
  const d = move.divisor;
  const summarize = (chips: Chip[]) => ({
    constSum: chips.filter((c) => c.kind === 'const').reduce((s, c) => s + c.value, 0),
    varSum: chips.filter((c) => c.kind === 'var').reduce((s, c) => s + c.value, 0),
  });
  const L = summarize(st.left);
  const R = summarize(st.right);
  const divisible = (n: number) => Number.isInteger(clean(n / d));

  if (![L.constSum, L.varSum, R.constSum, R.varSum].every(divisible)) {
    return reject(
      st,
      'uneven_division',
      `These groups don't split evenly into ${d}. Divide only when both sides can form ${d} equal whole groups.`,
    );
  }

  const rebuild = (s: { constSum: number; varSum: number }): Chip[] => {
    const chips: Chip[] = [];
    const coef = clean(s.varSum / d);
    const n = Math.round(Math.abs(coef));
    for (let i = 0; i < n; i += 1) {
      chips.push({ id: uid('v'), kind: 'var', value: Math.sign(coef) || 1, name: st.variable });
    }
    const k = clean(s.constSum / d);
    if (k !== 0 || chips.length === 0) chips.push({ id: uid('c'), kind: 'const', value: k });
    return chips;
  };

  const next: BalanceState = { ...st, left: rebuild(L), right: rebuild(R) };
  const tilt = tiltOf(next);
  const { solved, answer } = evaluateSolved(next);
  return { state: next, event: { accepted: true, balanced: Math.abs(tilt) < EPS, solved, answer, tilt } };
}

export function applyMove(st: BalanceState, move: Move): { state: BalanceState; event: MoveEvent } {
  switch (move.type) {
    case 'transfer':
      return applyTransfer(st, move);
    case 'spawn':
      return applySpawn(st, move);
    case 'split':
      return applySplit(st, move);
    case 'divide':
      return applyDivide(st, move);
  }
}
