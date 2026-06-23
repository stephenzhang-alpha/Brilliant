import { describe, it, expect } from 'vitest';
import type { BalanceConfig } from '../../../types';
import {
  applyMove,
  buildInitialState,
  evaluateSolved,
  isBalanced,
  tiltOf,
  type BalanceState,
} from '../balanceState';

const xPlus4eq9: BalanceConfig = {
  variable: 'x',
  left: [
    { kind: 'var', value: 1 },
    { kind: 'const', value: 4 },
  ],
  right: [{ kind: 'const', value: 9 }],
  targetValue: 5,
};

describe('balance construction', () => {
  it('starts balanced with the hidden solution', () => {
    const st = buildInitialState(xPlus4eq9);
    expect(st.solution).toBe(5);
    expect(isBalanced(st)).toBe(true);
    expect(tiltOf(st)).toBe(0);
  });
});

describe('constructive failure on asymmetric removal', () => {
  it('tips the beam and suggests a decomposing mirror move', () => {
    const st = buildInitialState(xPlus4eq9);
    const four = st.left.find((c) => c.kind === 'const' && c.value === 4)!;
    const { state, event } = applyMove(st, { type: 'transfer', chipId: four.id, from: 'left', to: 'bank' });

    expect(event.accepted).toBe(true);
    expect(event.balanced).toBe(false);
    expect(event.misconception).toBe('needs_decomposition');
    expect(event.mirror?.action).toBe('remove');
    expect(event.mirror?.zone).toBe('right');
    expect(event.mirror?.value).toBe(4);
    expect(event.mirror?.needsDecomposition?.into).toEqual([4, 5]);
    // beam is tipped because left lost 4
    expect(state.left.find((c) => c.value === 4)).toBeUndefined();
    expect(Math.abs(event.tilt)).toBeGreaterThan(0);
  });

  it('re-levels and solves after the mirror is completed', () => {
    let st = buildInitialState(xPlus4eq9);
    const four = st.left.find((c) => c.value === 4)!;
    st = applyMove(st, { type: 'transfer', chipId: four.id, from: 'left', to: 'bank' }).state;

    // split the 9 into 4 + 5
    const nine = st.right.find((c) => c.value === 9)!;
    st = applyMove(st, { type: 'split', chipId: nine.id, zone: 'right', into: [4, 5] }).state;

    // remove the 4 from the right pan
    const right4 = st.right.find((c) => c.value === 4)!;
    const res = applyMove(st, { type: 'transfer', chipId: right4.id, from: 'right', to: 'bank' });

    expect(res.event.balanced).toBe(true);
    expect(res.event.solved).toBe(true);
    expect(res.event.answer).toBe(5);
  });
});

describe('cross-pan carry is rejected', () => {
  it('does not change state and flags the misconception', () => {
    const st = buildInitialState(xPlus4eq9);
    const four = st.left.find((c) => c.value === 4)!;
    const res = applyMove(st, { type: 'transfer', chipId: four.id, from: 'left', to: 'right' });
    expect(res.event.accepted).toBe(false);
    expect(res.event.misconception).toBe('cross_pan_move');
    expect(res.state).toBe(st);
  });
});

describe('division', () => {
  const twoX: BalanceConfig = {
    variable: 'x',
    left: [{ kind: 'var', value: 2 }],
    right: [{ kind: 'const', value: 10 }],
    divisors: [2],
    targetValue: 5,
  };

  it('splits both sides evenly to solve', () => {
    const st = buildInitialState(twoX);
    const res = applyMove(st, { type: 'divide', divisor: 2 });
    expect(res.event.solved).toBe(true);
    expect(res.event.answer).toBe(5);
  });

  it('rejects uneven division', () => {
    const st: BalanceState = buildInitialState({
      ...twoX,
      right: [{ kind: 'const', value: 9 }],
    });
    const res = applyMove(st, { type: 'divide', divisor: 2 });
    expect(res.event.accepted).toBe(false);
    expect(res.event.misconception).toBe('uneven_division');
  });
});

describe('evaluateSolved guards', () => {
  it('is not solved while a constant remains with the variable', () => {
    const st = buildInitialState(xPlus4eq9);
    expect(evaluateSolved(st).solved).toBe(false);
  });
});
