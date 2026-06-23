import type { ASTNode } from './types';

// A linear form is the canonical reduction of any Algebra 1 expression:
//   sum(coef_i * var_i) + constant
// This is what lets us combine like terms and fold constants reliably.

export interface LinearForm {
  vars: Record<string, number>;
  constant: number;
}

export function toLinear(node: ASTNode): LinearForm {
  switch (node.type) {
    case 'Constant':
      return { vars: {}, constant: node.value };
    case 'Variable':
      return { vars: { [node.name]: 1 }, constant: 0 };
    case 'Addition':
      return node.args.reduce<LinearForm>(
        (acc, a) => addLinear(acc, toLinear(a)),
        { vars: {}, constant: 0 },
      );
    case 'Multiplication':
      return node.args.reduce<LinearForm>(
        (acc, a) => mulLinear(acc, toLinear(a)),
        { vars: {}, constant: 1 },
      );
  }
}

export function addLinear(a: LinearForm, b: LinearForm): LinearForm {
  const vars: Record<string, number> = { ...a.vars };
  for (const k of Object.keys(b.vars)) vars[k] = (vars[k] ?? 0) + b.vars[k];
  return { vars, constant: a.constant + b.constant };
}

export function mulLinear(a: LinearForm, b: LinearForm): LinearForm {
  const aHasVar = Object.keys(a.vars).length > 0;
  const bHasVar = Object.keys(b.vars).length > 0;
  // Algebra 1 stays linear: we never multiply two variable-bearing factors.
  if (aHasVar && bHasVar) {
    throw new Error('Non-linear term produced (variable times variable).');
  }
  if (!aHasVar && !bHasVar) {
    return { vars: {}, constant: a.constant * b.constant };
  }
  const scalar = aHasVar ? b.constant : a.constant;
  const base = aHasVar ? a : b;
  const vars: Record<string, number> = {};
  for (const k of Object.keys(base.vars)) vars[k] = base.vars[k] * scalar;
  return { vars, constant: base.constant * scalar };
}
