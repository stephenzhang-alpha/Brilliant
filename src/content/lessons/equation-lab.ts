import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'equation-lab',
  title: 'Equation Lab',
  description:
    'Solve equations the real way: apply the same operation to both sides, step by step, and watch your work build up.',
  prerequisiteIds: [],
  strand: 'core',
  entryPoint: true,
  mapPosition: { col: 5, row: 0 },
  xpReward: 90,
  steps: [
    {
      id: 'lab-concept',
      type: 'concept',
      prompt: 'You are the one doing the algebra',
      conceptText:
        'A real equation solver never "drags" terms — it applies the same operation to BOTH sides until the variable is alone. In the Lab you pick the move (subtract, divide, …) and the engine keeps both sides equal. Your goal: isolate x. The "Show your work" log records every step you take.',
      hints: [],
      remediation: {},
    },
    {
      id: 'lab-one-step',
      type: 'problem',
      interactionType: 'EQUATION_LAB',
      prompt: 'Isolate x: x + 4 = 9',
      hints: [
        'There is a + 4 sitting next to x. What single operation removes it?',
        'Subtract 4 from both sides: x + 4 − 4 = 9 − 4 → x = 5.',
      ],
      validationRule: { type: 'exact', answer: 5 },
      remediation: {
        wrong_answer: 'Subtract 4 from both sides to undo the + 4. That leaves x = 5.',
        off_by_one: 'Close — recount: 9 − 4 = 5.',
      },
      problemConfig: {
        equation: {
          left: [
            { id: 'x', coefficient: 1, variable: 'x', isConstant: false },
            { id: 'c1', coefficient: 4, isConstant: true },
          ],
          right: [{ id: 'c2', coefficient: 9, isConstant: true }],
          targetVariable: 'x',
          targetValue: 5,
        },
      },
    },
    {
      id: 'lab-two-step',
      type: 'problem',
      interactionType: 'EQUATION_LAB',
      prompt: 'Isolate x: 2x + 3 = 11',
      hints: [
        'Undo addition/subtraction first, then divide out the coefficient.',
        'Subtract 3 → 2x = 8, then ÷ 2 → x = 4.',
      ],
      validationRule: { type: 'exact', answer: 4 },
      remediation: {
        wrong_answer: 'Two moves: subtract 3 from both sides (2x = 8), then divide both sides by 2 (x = 4).',
        off_by_one: 'Check the division: 8 ÷ 2 = 4.',
      },
      problemConfig: {
        equation: {
          left: [
            { id: '2x', coefficient: 2, variable: 'x', isConstant: false },
            { id: 'c1', coefficient: 3, isConstant: true },
          ],
          right: [{ id: 'c2', coefficient: 11, isConstant: true }],
          targetVariable: 'x',
          targetValue: 4,
        },
      },
    },
    {
      id: 'lab-negative',
      type: 'problem',
      interactionType: 'EQUATION_LAB',
      prompt: 'Isolate x: 3x − 5 = 16',
      hints: [
        'The constant on the x side is −5. Adding 5 to both sides clears it.',
        'Add 5 → 3x = 21, then ÷ 3 → x = 7.',
      ],
      validationRule: { type: 'exact', answer: 7 },
      remediation: {
        wrong_answer: 'Add 5 to both sides to undo the − 5 (3x = 21), then divide by 3 (x = 7).',
        sign_error: 'To undo − 5 you ADD 5 to both sides.',
      },
      problemConfig: {
        equation: {
          left: [
            { id: '3x', coefficient: 3, variable: 'x', isConstant: false },
            { id: 'c1', coefficient: -5, isConstant: true },
          ],
          right: [{ id: 'c2', coefficient: 16, isConstant: true }],
          targetVariable: 'x',
          targetValue: 7,
        },
      },
    },
    {
      id: 'lab-synthesis',
      type: 'synthesis',
      prompt: 'That is the whole game',
      synthesisText:
        'Every linear equation is solved the same way: keep the scale balanced by doing the same thing to both sides, clearing constants before coefficients. Because you chose each move yourself, the "Show your work" log is literally your reasoning — that is the habit that transfers to any equation.',
      hints: [],
      remediation: {},
    },
  ],
};

export default lesson;
