import type { QuizOption } from '../components/quiz/ConceptCheck';
import type { AnswerMeta } from '../firebase/ai';

/** A single multiple-choice concept check (question + shuffled-ish options). */
export interface Quiz {
  id: string;
  question: string;
  prompt?: string;
  options: QuizOption[];
  /** Preferred option grid width. */
  columns?: 2 | 3;
  /**
   * Optional data-driven ground truth for computable items, threaded to the
   * assistant's deterministic verifier so it checks AI guidance against data
   * (operands + intermediate + final results) instead of parsed prose.
   */
  answer?: AnswerMeta;
}

/**
 * VARIABLES bank — used by the landing-page gate (Page 0) and recycled as the
 * every-300-to-500-points reinforcement checks inside the Dino run (Page 1).
 * Framing: a variable is a LETTER that stands for a number (one we do not know
 * yet, or that can stand for different values) — not "a value that changes."
 * All plain-text / Unicode math to match the rest of the app (no KaTeX).
 */
export const VARIABLE_QUESTIONS: Quiz[] = [
  {
    id: 'what-is-variable',
    question: 'Which of these is a variable?',
    prompt: 'A variable is a letter that stands for a number.',
    columns: 3,
    options: [
      { id: 'x', label: 'x', hint: 'a letter that stands for a number', correct: true },
      {
        id: 'seven',
        label: '7',
        hint: 'a fixed number',
        correct: false,
        feedback:
          '7 is a constant — it always means 7. A variable is a letter (like x) that stands for a number.',
      },
      {
        id: 'plus',
        label: '+',
        hint: 'an operation',
        correct: false,
        feedback: '+ is an operation (it means add). A variable is a letter, like x, that stands for a number.',
      },
    ],
  },
  {
    id: 'variable-def',
    question: 'A variable is best described as…',
    columns: 2,
    options: [
      { id: 'letter', label: 'A letter that stands for a number', correct: true },
      {
        id: 'fixed',
        label: 'A number that never changes',
        correct: false,
        feedback:
          'That describes a constant. A variable is a letter that stands for a number — often one we do not know yet.',
      },
      {
        id: 'op',
        label: 'A plus or minus sign',
        correct: false,
        feedback: 'Those are operations. A variable is a letter (like x) that represents a number.',
      },
      {
        id: 'shape',
        label: 'A kind of shape',
        correct: false,
        feedback: 'Not quite — a variable is a letter that stands for a number, not a shape.',
      },
    ],
  },
  {
    id: 'evaluate-n-plus-3',
    question: 'If n = 10, what is n + 3?',
    prompt: 'Here the variable n stands for the number 10.',
    columns: 3,
    answer: { value: '13', allowedNumbers: [10, 3, 13] },
    options: [
      { id: '13', label: '13', correct: true },
      {
        id: '103',
        label: '103',
        correct: false,
        feedback: 'n stands for the number 10, so n + 3 means 10 + 3 = 13 (not "10 and a 3" joined).',
      },
      {
        id: '30',
        label: '30',
        correct: false,
        feedback: 'That would be n × 3. Here we add: 10 + 3 = 13.',
      },
    ],
  },
  {
    id: 'which-symbol',
    question: 'Which symbol is most often used as a variable?',
    columns: 3,
    options: [
      { id: 'x', label: 'x', hint: 'a letter', correct: true },
      {
        id: 'plus',
        label: '+',
        correct: false,
        feedback: '+ is an operation. Variables are letters like x, y, or n.',
      },
      {
        id: 'equals',
        label: '=',
        correct: false,
        feedback: '= means "equals". Variables are letters like x, y, or n.',
      },
    ],
  },
  {
    id: 'variable-true',
    question: 'Which statement about a variable is true?',
    columns: 2,
    options: [
      { id: 'stands', label: 'It can stand for different numbers', correct: true },
      {
        id: 'always1',
        label: 'It is always 1',
        correct: false,
        feedback: 'A variable is not stuck on one number — it stands for a number that can differ.',
      },
      {
        id: 'neverletter',
        label: 'It can never be a letter',
        correct: false,
        feedback: 'A variable is usually written as a letter, like x.',
      },
      {
        id: 'add',
        label: 'It always means add',
        correct: false,
        feedback: '"Add" is the + operation. A variable is a letter that stands for a number.',
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
    answer: { value: '14', allowedNumbers: [3, 4, 2, 12, 14] },
    options: [
      { id: '14', label: '14', correct: true },
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
        feedback: 'That is 3 × (4 + 2). Multiply before you add: do 3 × 4 first, then add 2.',
      },
      {
        id: '10',
        label: '10',
        correct: false,
        feedback: 'Close — that subtracts the 2. The expression adds it instead.',
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
    answer: { value: '5x', allowedNumbers: [3, 2, 5] },
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

/**
 * EQUATIONS & INEQUALITIES bank — used by the Scales intro page (Page 5), where
 * a balanced scale means the two sides are equal and a tilt means one side is
 * greater. Leads into the Balance game.
 */
export const EQUATION_QUESTIONS: Quiz[] = [
  {
    id: 'balanced-means-equal',
    question: 'A balanced (level) scale shows that the two sides are…',
    prompt: 'Think about what "balanced" means.',
    columns: 3,
    options: [
      { id: 'equal', label: 'Equal', hint: 'same weight on both', correct: true },
      {
        id: 'left',
        label: 'Left is bigger',
        correct: false,
        feedback: 'If the left were bigger, that pan would sink — the scale would tilt, not stay level.',
      },
      {
        id: 'right',
        label: 'Right is bigger',
        correct: false,
        feedback: 'If the right were bigger, that pan would sink. A level scale means the sides are equal.',
      },
    ],
  },
  {
    id: 'left-sinks',
    question: 'If the left pan sinks lower, then…',
    prompt: 'The heavier side drops.',
    columns: 3,
    options: [
      { id: 'gt', label: 'left > right', hint: 'heavier side drops', correct: true },
      {
        id: 'lt',
        label: 'left < right',
        correct: false,
        feedback: 'The pan that sinks is the HEAVIER side, so the left side is greater, not less.',
      },
      {
        id: 'eq',
        label: 'left = right',
        correct: false,
        feedback: 'Equal sides keep the scale level. A sinking pan means that side is greater.',
      },
    ],
  },
  {
    id: 'solve-x-plus-3',
    question: 'Balance it: x + 3 = 7. What is x?',
    prompt: 'What value of x makes both sides weigh the same?',
    columns: 3,
    answer: { value: '4', allowedNumbers: [3, 7, 4] },
    options: [
      { id: '4', label: '4', hint: '4 + 3 = 7', correct: true },
      {
        id: '10',
        label: '10',
        correct: false,
        feedback: 'That is too heavy: 10 + 3 = 13. You need x so that x + 3 = 7, which is x = 4.',
      },
      {
        id: '3',
        label: '3',
        correct: false,
        feedback: 'Close — 3 + 3 = 6, still a little light. x = 4 gives 4 + 3 = 7.',
      },
    ],
  },
  {
    id: 'keep-balanced',
    question: 'Which keeps a level scale balanced?',
    columns: 2,
    options: [
      { id: 'both', label: 'Add the same weight to BOTH sides', correct: true },
      {
        id: 'one',
        label: 'Add weight to one side',
        correct: false,
        feedback: 'Adding to just one side makes it heavier and tips the scale. Do the same to both sides to stay balanced.',
      },
      {
        id: 'remove',
        label: 'Remove weight from one side',
        correct: false,
        feedback: 'Removing from one side makes it lighter and tips the scale. Whatever you do, do it to both sides.',
      },
      {
        id: 'never',
        label: 'It can never stay balanced',
        correct: false,
        feedback: 'It can! As long as you change both sides the same way, the balance holds.',
      },
    ],
  },
];

/**
 * Answer metadata indexed by question text, so the deterministic verifier gets
 * data-driven ground truth even for the gates whose pages pass `ConceptCheck`
 * props individually (rather than spreading the whole `Quiz`). Built once from
 * every bank; only computable questions carry an `answer`, so most lookups
 * return `undefined` (the verifier then relies on its other sources).
 */
const ANSWER_META_BY_QUESTION = new Map<string, AnswerMeta>();
for (const q of [...VARIABLE_QUESTIONS, ...EXPRESSION_QUESTIONS, ...EQUATION_QUESTIONS]) {
  if (q.answer) ANSWER_META_BY_QUESTION.set(q.question, q.answer);
}

/** Look up the (optional) answer metadata for a question by its exact text. */
export function answerMetaForQuestion(question: string): AnswerMeta | undefined {
  return ANSWER_META_BY_QUESTION.get(question);
}
