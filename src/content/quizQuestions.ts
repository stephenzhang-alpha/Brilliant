import type { QuizOption } from '../components/quiz/ConceptCheck';

/** A single multiple-choice concept check (question + shuffled-ish options). */
export interface Quiz {
  id: string;
  question: string;
  prompt?: string;
  options: QuizOption[];
  /** Preferred option grid width. */
  columns?: 2 | 3;
}

/**
 * VARIABLES bank — used by the landing-page gate (Page 0) and recycled as the
 * "+1000 points" reinforcement checks inside the Dino run (Page 1). All are
 * plain-text / Unicode math to match the rest of the app (no KaTeX).
 */
export const VARIABLE_QUESTIONS: Quiz[] = [
  {
    id: 'what-is-variable',
    question: 'Which of these is a variable?',
    prompt: "Remember: a variable's value can change.",
    columns: 3,
    options: [
      { id: 'score', label: 'Your score', hint: 'it keeps changing as you run', correct: true },
      {
        id: 'seven',
        label: 'The number 7',
        hint: 'it is always exactly 7',
        correct: false,
        feedback:
          '7 is always 7 — its value never changes, so it is a constant, not a variable. A variable is a value that CAN change.',
      },
      {
        id: 'red',
        label: 'The color red',
        hint: 'a color, not a changing amount',
        correct: false,
        feedback:
          'A color is not an amount that changes. A variable is a quantity whose value can change — like a score going up.',
      },
    ],
  },
  {
    id: 'variable-value',
    question: 'A variable is best described as…',
    columns: 2,
    options: [
      {
        id: 'changes',
        label: 'A named value that can change',
        correct: true,
      },
      {
        id: 'fixed',
        label: 'A number that never changes',
        correct: false,
        feedback: 'That describes a constant. A variable can take on different values.',
      },
      {
        id: 'symbol',
        label: 'A plus or minus sign',
        correct: false,
        feedback: 'Those are operations. A variable is a named quantity, usually a letter like x.',
      },
      {
        id: 'shape',
        label: 'A type of shape',
        correct: false,
        feedback: 'Not quite — a variable is a value (often written as a letter), not a shape.',
      },
    ],
  },
  {
    id: 'evaluate-n-plus-3',
    question: 'If n = 10, what is n + 3?',
    columns: 3,
    options: [
      { id: '13', label: '13', correct: true },
      {
        id: '103',
        label: '103',
        correct: false,
        feedback: 'n stands for the value 10, so n + 3 means 10 + 3, not "10 and a 3" stuck together.',
      },
      {
        id: '30',
        label: '30',
        correct: false,
        feedback: 'That would be n × 3. Here we add 3 to n: 10 + 3.',
      },
    ],
  },
  {
    id: 'which-symbol',
    question: 'Which symbol is most often used as a variable?',
    columns: 3,
    options: [
      { id: 'x', label: 'x', correct: true },
      {
        id: 'plus',
        label: '+',
        correct: false,
        feedback: '+ is an operation (add). Variables are usually letters like x, y, or n.',
      },
      {
        id: 'equals',
        label: '=',
        correct: false,
        feedback: '= means "equals". Variables are usually letters like x, y, or n.',
      },
    ],
  },
  {
    id: 'value-can',
    question: "A variable's value can…",
    columns: 3,
    options: [
      { id: 'change', label: 'Change', hint: 'that is the whole point', correct: true },
      {
        id: 'never',
        label: 'Never change',
        correct: false,
        feedback: 'A value that never changes is a constant. A variable can change.',
      },
      {
        id: 'only7',
        label: 'Only ever be 7',
        correct: false,
        feedback: 'A variable is not stuck on one number — it can take many values.',
      },
    ],
  },
];

/**
 * EXPRESSIONS bank — used by the expressions concept-check gate (Page 2),
 * leading into Gate Runner where the player builds and evaluates ax + b.
 */
export const EXPRESSION_QUESTIONS: Quiz[] = [
  {
    id: 'evaluate-3x-plus-2',
    question: 'Evaluate 3x + 2 when x = 4.',
    prompt: 'Multiply first, then add.',
    columns: 2,
    options: [
      { id: '14', label: '14', hint: '3 × 4 = 12, then + 2', correct: true },
      {
        id: '9',
        label: '9',
        correct: false,
        feedback: 'That adds everything (3 + 4 + 2). You must multiply 3 × 4 first, then add 2.',
      },
      {
        id: '18',
        label: '18',
        correct: false,
        feedback: 'That is 3 × (4 + 2). Multiply before you add: 3 × 4 = 12, then + 2 = 14.',
      },
      {
        id: '10',
        label: '10',
        correct: false,
        feedback: 'Close — that subtracts the 2. The expression adds it: 12 + 2 = 14.',
      },
    ],
  },
  {
    id: 'which-is-expression',
    question: 'Which of these is an expression (not an equation)?',
    columns: 2,
    options: [
      { id: 'expr', label: '2x + 5', hint: 'no equals sign', correct: true },
      {
        id: 'eqn',
        label: '2x + 5 = 9',
        correct: false,
        feedback: 'That has an equals sign, so it is an equation. An expression has no "=".',
      },
      {
        id: 'eq2',
        label: 'x = 7',
        correct: false,
        feedback: 'That is an equation (it has "="). An expression like 2x + 5 just describes a value.',
      },
      {
        id: 'ineq',
        label: 'x > 3',
        correct: false,
        feedback: 'That is an inequality. An expression like 2x + 5 has no =, >, or < sign.',
      },
    ],
  },
  {
    id: 'combine-like-terms',
    question: 'Combine like terms: 3x + 2x = ?',
    columns: 2,
    options: [
      { id: '5x', label: '5x', hint: '3 x-es plus 2 x-es', correct: true },
      {
        id: '6x',
        label: '6x',
        correct: false,
        feedback: 'That multiplies (3 × 2). To combine like terms you add the counts: 3 + 2 = 5, so 5x.',
      },
      {
        id: '5x2',
        label: '5x²',
        correct: false,
        feedback: 'Adding like terms keeps the x — it does not square it. 3x + 2x = 5x.',
      },
      {
        id: '23x',
        label: '23x',
        correct: false,
        feedback: 'Just add the coefficients: 3 + 2 = 5, giving 5x.',
      },
    ],
  },
];
