import { describe, it, expect } from 'vitest';
import { verifyExplanation } from '../verifyExplanation';
import type { HelpRequest } from '../ai';

// --- fixtures (mirror the real computable questions in content/quizQuestions) -

/** evaluate-3x-plus-2 (answer 14) — the default fixture. */
function req(overrides: Partial<HelpRequest> = {}): HelpRequest {
  return {
    topic: 'expressions',
    question: 'Evaluate 3x + 2 when x = 4.',
    prompt: 'Multiply first, then add.',
    options: ['14', '9', '18', '10'],
    userPickLabel: '9',
    correctLabel: '14',
    authoredExplanation:
      'That adds everything (3 + 4 + 2). You must multiply 3 × 4 first, then add 2.',
    answer: { value: '14', allowedNumbers: [3, 4, 2, 12, 14] },
    ...overrides,
  };
}

/** evaluate-n-plus-3 (answer 13). */
const nPlus3: HelpRequest = {
  topic: 'variables',
  question: 'If n = 10, what is n + 3?',
  prompt: 'Here the variable n stands for the number 10.',
  options: ['13', '103', '30'],
  userPickLabel: '103',
  correctLabel: '13',
  authoredExplanation: 'n stands for the number 10, so n + 3 means 10 + 3 = 13.',
  answer: { value: '13', allowedNumbers: [10, 3, 13] },
};

/** combine-like-terms (answer 5x). */
const combine: HelpRequest = {
  topic: 'expressions',
  question: 'Combine like terms: 3x + 2x = ?',
  options: ['5x', '6x', '5x²', '23x'],
  userPickLabel: '6x',
  correctLabel: '5x',
  authoredExplanation: 'To combine like terms you add the counts: 3 + 2 = 5, so 5x.',
  answer: { value: '5x', allowedNumbers: [3, 2, 5] },
};

/** solve-x-plus-3 (answer 4). */
const solve: HelpRequest = {
  topic: 'equations and inequalities',
  question: 'Balance it: x + 3 = 7. What is x?',
  prompt: 'What value of x makes both sides weigh the same?',
  options: ['4', '10', '3'],
  userPickLabel: '10',
  correctLabel: '4',
  authoredExplanation: 'You need x so that x + 3 = 7, which is x = 4.',
  answer: { value: '4', allowedNumbers: [3, 7, 4] },
};

// --- adversarial REJECT cases ----------------------------------------------

const rejects: Array<{ name: string; text: string; request: HelpRequest }> = [
  {
    name: 'wrong final number as a "get" result',
    text: 'First, 3 × 4 is 14, then add 2 to get 16.',
    request: req(),
  },
  {
    name: 'asserts a distractor as the answer',
    text: 'After working it through, the answer is 18.',
    request: req(),
  },
  {
    name: 'asserts a real-but-wrong value (the substituted variable) as the answer',
    text: 'So the answer is 4.',
    request: req(),
  },
  {
    name: 'endorses the student\'s wrong pick',
    text: 'Yes, 9 is correct! Nice work.',
    request: req(),
  },
  {
    name: 'endorses the wrong pick without "yes"',
    text: '9 is right — that is the one.',
    request: req(),
  },
  {
    name: 'residual LaTeX \\frac',
    text: 'Think of it as \\frac{1}{2} of the group, then double it.',
    request: req(),
  },
  {
    name: 'residual LaTeX \\times and superscript braces',
    text: 'We compute 3 \\times 4 and x^{2} along the way.',
    request: req(),
  },
  {
    name: 'concatenates instead of adding (n + 3)',
    text: 'If you just stick them together you get 103.',
    request: nPlus3,
  },
  {
    name: 'multiplies coefficients instead of adding (like terms)',
    text: 'Multiply the coefficients: 3 × 2 is 6, so it is 6x.',
    request: combine,
  },
  {
    name: 'states the wrong-pick distractor as the solution',
    text: 'Since it is heavy, the answer is 10.',
    request: solve,
  },
  {
    name: 'wrong computed result mid-sentence (solve)',
    text: 'Take 3 from 7 and you get 5, so x is 5.',
    request: solve,
  },
  {
    name: 'equation result equal to a distractor that is also an operand (solve)',
    text: 'Move the numbers around and x = 3.',
    request: solve,
  },
];

// --- faithful ACCEPT cases --------------------------------------------------

const accepts: Array<{ name: string; text: string; request: HelpRequest }> = [
  {
    name: 'faithful worked steps with the right intermediate',
    text: 'Multiply 3 × 4 to get 12, then add 2 to land on 14.',
    request: req(),
  },
  {
    name: 'everyday analogy with incidental numbers',
    text: 'Picture 3 baskets, each holding 4 apples — 12 apples, and 2 bonus apples makes 14 in all!',
    request: req(),
  },
  {
    name: 'purely conceptual rephrase, no numbers',
    text: 'Think of x as a labeled mystery box: use whatever number hides inside wherever you see x.',
    request: req(),
  },
  {
    name: 'restates the given equation faithfully (solve)',
    text: 'We want x so that x + 3 = 7. Take 3 away from 7 and x is 4.',
    request: solve,
  },
  {
    name: 'words instead of digits, correct conclusion (like terms)',
    text: 'Three x-es plus two more x-es is five x-es altogether, so 5x.',
    request: combine,
  },
  {
    name: 'substitutes the variable then adds (n + 3)',
    text: 'n is just a stand-in for 10, so 10 + 3 is 13.',
    request: nPlus3,
  },
];

describe('verifyExplanation — rejects clear contradictions', () => {
  it.each(rejects)('rejects: $name', ({ text, request }) => {
    const result = verifyExplanation(text, request);
    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});

describe('verifyExplanation — accepts faithful rephrasings', () => {
  it.each(accepts)('accepts: $name', ({ text, request }) => {
    const result = verifyExplanation(text, request);
    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe('verifyExplanation — edge cases', () => {
  it('rejects empty / whitespace-only text', () => {
    expect(verifyExplanation('   ', req()).ok).toBe(false);
  });

  it('accepts the correct answer stated explicitly', () => {
    expect(verifyExplanation('Multiply first: 3 × 4 = 12, plus 2, so the answer is 14.', req()).ok).toBe(
      true,
    );
  });

  it('catches a wrong stated answer and accepts the right one (Unicode × handled)', () => {
    expect(verifyExplanation('So the answer is 18.', req()).ok).toBe(false);
    expect(verifyExplanation('3 × 4 = 12 and 12 + 2 = 14, the answer is 14.', req()).ok).toBe(true);
  });

  it('does not flag incidental analogy numbers far from result keywords', () => {
    const text = 'Imagine sharing with 6 friends at a party; multiply 3 × 4 to get 12, then add 2 for 14.';
    expect(verifyExplanation(text, req()).ok).toBe(true);
  });
});
