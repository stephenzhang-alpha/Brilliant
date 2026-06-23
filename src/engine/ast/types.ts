// Abstract Syntax Tree node model for linear Algebra 1 expressions.
// Mirrors the JSON shape in the spec (section 1.1): Equation { left, right }
// where each side is built from Constant / Variable / Multiplication / Addition.

export type ConstantNode = { type: 'Constant'; value: number };
export type VariableNode = { type: 'Variable'; name: string };
export type MultiplicationNode = { type: 'Multiplication'; args: ASTNode[] };
export type AdditionNode = { type: 'Addition'; args: ASTNode[] };

export type ASTNode = ConstantNode | VariableNode | MultiplicationNode | AdditionNode;

export interface Equation {
  type: 'Equation';
  left: ASTNode;
  right: ASTNode;
}
