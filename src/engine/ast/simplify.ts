import type { ASTNode, Equation } from './types';
import { add, constant, multiply, variable } from './build';
import { type LinearForm, toLinear } from './linear';
import { clean } from './util';

/** Rebuild a canonical AST node (sorted vars, then constant) from a linear form. */
export function fromLinear(lf: LinearForm): ASTNode {
  const terms: ASTNode[] = [];
  for (const name of Object.keys(lf.vars).sort()) {
    const c = clean(lf.vars[name]);
    if (c === 0) continue;
    terms.push(c === 1 ? variable(name) : multiply(constant(c), variable(name)));
  }
  const k = clean(lf.constant);
  if (k !== 0 || terms.length === 0) terms.push(constant(k));
  return terms.length === 1 ? terms[0] : add(...terms);
}

export const simplify = (node: ASTNode): ASTNode => fromLinear(toLinear(node));

export const simplifyEquation = (eq: Equation): Equation => ({
  type: 'Equation',
  left: simplify(eq.left),
  right: simplify(eq.right),
});

const formatNum = (n: number): string => (Number.isInteger(n) ? String(n) : String(clean(n)));

/** Human-readable rendering, e.g. "3x + 4" or "x = 5". */
export function formatNode(node: ASTNode): string {
  const lf = toLinear(node);
  const pieces: string[] = [];
  for (const name of Object.keys(lf.vars).sort()) {
    const c = clean(lf.vars[name]);
    if (c === 0) continue;
    const mag = Math.abs(c);
    const body = mag === 1 ? name : `${formatNum(mag)}${name}`;
    pieces.push(`${c < 0 ? '-' : '+'} ${body}`);
  }
  const k = clean(lf.constant);
  if (k !== 0 || pieces.length === 0) {
    pieces.push(`${k < 0 ? '-' : '+'} ${formatNum(Math.abs(k))}`);
  }
  let s = pieces.join(' ').trim();
  if (s.startsWith('+ ')) s = s.slice(2);
  else if (s.startsWith('- ')) s = `-${s.slice(2)}`;
  return s;
}

export const formatEquation = (eq: Equation): string =>
  `${formatNode(eq.left)} = ${formatNode(eq.right)}`;
