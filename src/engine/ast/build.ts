import type {
  ASTNode,
  AdditionNode,
  ConstantNode,
  Equation,
  MultiplicationNode,
  VariableNode,
} from './types';
import type { Term, EquationConfig } from '../../types';

// --- Constructors -----------------------------------------------------------

export const constant = (value: number): ConstantNode => ({ type: 'Constant', value });
export const variable = (name = 'x'): VariableNode => ({ type: 'Variable', name });
export const multiply = (...args: ASTNode[]): MultiplicationNode => ({ type: 'Multiplication', args });
export const add = (...args: ASTNode[]): AdditionNode => ({ type: 'Addition', args });
export const equation = (left: ASTNode, right: ASTNode): Equation => ({ type: 'Equation', left, right });

// --- Adapters from the legacy flat Term[] content model ---------------------
// Lets existing lesson content keep working while we migrate to the AST.

export function termToNode(t: Term): ASTNode {
  if (t.isConstant) return constant(t.coefficient);
  const name = t.variable ?? 'x';
  if (t.coefficient === 1) return variable(name);
  return multiply(constant(t.coefficient), variable(name));
}

export function nodeFromTerms(terms: Term[]): ASTNode {
  if (terms.length === 0) return constant(0);
  const nodes = terms.map(termToNode);
  return nodes.length === 1 ? nodes[0] : add(...nodes);
}

export function equationFromConfig(cfg: EquationConfig): Equation {
  return equation(nodeFromTerms(cfg.left), nodeFromTerms(cfg.right));
}
