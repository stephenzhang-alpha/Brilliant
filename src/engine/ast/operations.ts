import type { ASTNode, Equation } from './types';
import { add, constant, multiply } from './build';
import { simplify } from './simplify';

// A Transform is a pure function on one side of an equation. The whole point
// of the balance metaphor is that the SAME transform is applied to both sides.
export type Transform = (side: ASTNode) => ASTNode;

export const addOp = (n: number): Transform => (s) => simplify(add(s, constant(n)));
export const subtractOp = (n: number): Transform => (s) => simplify(add(s, constant(-n)));
export const multiplyOp = (n: number): Transform => (s) => simplify(multiply(s, constant(n)));
export const divideOp = (n: number): Transform => (s) => simplify(multiply(s, constant(1 / n)));

/** Apply the same transform to both sides, returning a new immutable equation. */
export function applyToBothSides(eq: Equation, t: Transform): Equation {
  return { type: 'Equation', left: t(eq.left), right: t(eq.right) };
}
