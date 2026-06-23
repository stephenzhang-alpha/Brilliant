import { describe, it, expect } from 'vitest';
import {
  add,
  constant,
  equation,
  equationFromConfig,
  multiply,
  variable,
} from '../build';
import { simplify, formatNode, formatEquation } from '../simplify';
import { addOp, subtractOp, divideOp, multiplyOp, applyToBothSides } from '../operations';
import { evaluate, isSolved, solutionValueOf, variablesIn } from '../solve';

describe('simplify / formatting', () => {
  it('combines like terms and folds constants', () => {
    const n = add(multiply(constant(3), variable('x')), constant(6), constant(-2));
    expect(formatNode(simplify(n))).toBe('3x + 4');
  });

  it('renders the spec example 3x + 6 = 15', () => {
    const eq = equation(add(multiply(constant(3), variable('x')), constant(6)), constant(15));
    expect(formatEquation(eq)).toBe('3x + 6 = 15');
  });

  it('drops zero coefficients', () => {
    const n = add(variable('x'), multiply(constant(-1), variable('x')), constant(7));
    expect(formatNode(simplify(n))).toBe('7');
  });
});

describe('applyToBothSides keeps the equation balanced', () => {
  it('subtracts equally from both sides to isolate x', () => {
    const eq = equation(add(variable('x'), constant(4)), constant(9));
    const out = applyToBothSides(eq, subtractOp(4));
    expect(formatEquation(out)).toBe('x = 5');
    expect(isSolved(out, 'x')).toBe(true);
  });

  it('adds equally to undo subtraction', () => {
    const eq = equation(add(variable('x'), constant(-6)), constant(2));
    const out = applyToBothSides(eq, addOp(6));
    expect(formatEquation(out)).toBe('x = 8');
  });

  it('divides both sides', () => {
    const eq = equation(multiply(constant(2), variable('x')), constant(10));
    const out = applyToBothSides(eq, divideOp(2));
    expect(formatEquation(out)).toBe('x = 5');
  });

  it('multiplies both sides', () => {
    const eq = equation(multiply(constant(0.5), variable('x')), constant(4));
    const out = applyToBothSides(eq, multiplyOp(2));
    expect(formatEquation(out)).toBe('x = 8');
  });

  it('solves a two-step equation in sequence', () => {
    let eq = equation(add(multiply(constant(2), variable('x')), constant(3)), constant(11));
    eq = applyToBothSides(eq, subtractOp(3));
    expect(formatEquation(eq)).toBe('2x = 8');
    eq = applyToBothSides(eq, divideOp(2));
    expect(formatEquation(eq)).toBe('x = 4');
    expect(isSolved(eq, 'x')).toBe(true);
  });
});

describe('solve helpers', () => {
  it('computes the hidden solution value from a config', () => {
    const eq = equationFromConfig({
      left: [
        { id: 'x', coefficient: 1, variable: 'x', isConstant: false },
        { id: 'c', coefficient: 7, isConstant: true },
      ],
      right: [{ id: 'r', coefficient: 15, isConstant: true }],
      targetVariable: 'x',
      targetValue: 8,
    });
    expect(solutionValueOf(eq, 'x')).toBe(8);
  });

  it('evaluates an expression at an environment', () => {
    const n = add(multiply(constant(3), variable('x')), constant(6));
    expect(evaluate(n, { x: 3 })).toBe(15);
  });

  it('returns null when there is no unique solution', () => {
    const eq = equation(add(variable('x'), constant(1)), add(variable('x'), constant(1)));
    expect(solutionValueOf(eq, 'x')).toBeNull();
  });

  it('collects variable names', () => {
    const n = add(variable('x'), variable('y'));
    expect([...variablesIn(n)].sort()).toEqual(['x', 'y']);
  });
});
