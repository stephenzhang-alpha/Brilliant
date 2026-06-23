import type { ASTNode, Equation } from './types';
import { toLinear } from './linear';
import { clean } from './util';

/** Numerically evaluate a node given variable assignments. */
export function evaluate(node: ASTNode, env: Record<string, number> = {}): number {
  switch (node.type) {
    case 'Constant':
      return node.value;
    case 'Variable':
      return env[node.name] ?? 0;
    case 'Addition':
      return node.args.reduce((s, a) => s + evaluate(a, env), 0);
    case 'Multiplication':
      return node.args.reduce((p, a) => p * evaluate(a, env), 1);
  }
}

export function variablesIn(node: ASTNode, acc = new Set<string>()): Set<string> {
  switch (node.type) {
    case 'Variable':
      acc.add(node.name);
      break;
    case 'Addition':
    case 'Multiplication':
      node.args.forEach((a) => variablesIn(a, acc));
      break;
  }
  return acc;
}

/**
 * Solve a single-variable linear equation for its unique value.
 * Returns null when there is no unique solution (identity or contradiction).
 * This value is kept HIDDEN from the learner and only used to drive the
 * physical tilt of the balance, so the scale behaves honestly.
 */
export function solutionValueOf(eq: Equation, varName: string): number | null {
  const l = toLinear(eq.left);
  const r = toLinear(eq.right);
  const a = (l.vars[varName] ?? 0) - (r.vars[varName] ?? 0);
  const b = r.constant - l.constant;
  if (clean(a) === 0) return null;
  return clean(b / a);
}

/** True when the equation reads exactly `x = c` (variable isolated, coefficient 1). */
export function isSolved(eq: Equation, varName: string): boolean {
  const l = toLinear(eq.left);
  const r = toLinear(eq.right);
  const leftVars = Object.keys(l.vars).filter((k) => clean(l.vars[k]) !== 0);
  const rightVars = Object.keys(r.vars).filter((k) => clean(r.vars[k]) !== 0);

  const leftIsolated =
    leftVars.length === 1 &&
    leftVars[0] === varName &&
    clean(l.vars[varName]) === 1 &&
    clean(l.constant) === 0 &&
    rightVars.length === 0;

  const rightIsolated =
    rightVars.length === 1 &&
    rightVars[0] === varName &&
    clean(r.vars[varName]) === 1 &&
    clean(r.constant) === 0 &&
    leftVars.length === 0;

  return leftIsolated || rightIsolated;
}
