import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'two-step-equations',
  title: 'Two-Step Equations',
  description: 'Solve equations that require two operations, combining what you\'ve learned.',
  prerequisiteIds: ['balancing-equations'],
  strand: 'core',
  mapPosition: { col: 3, row: 0 },
  xpReward: 100,
  steps: [
    {
      id: 'twostep-concept',
      type: 'concept',
      prompt: 'Two Steps to Solve',
      conceptText: 'Some equations need two steps to isolate the variable. For example, 2x + 3 = 11 requires you to first remove the +3 (subtract 3 from both sides), then divide by 2. The rule: undo addition/subtraction first, then undo multiplication/division.',
      hints: [],
      remediation: {},
    },
    {
      id: 'twostep-drag-1',
      type: 'problem',
      interactionType: 'TERM_DRAG',
      prompt: 'Solve: 2x + 3 = 11. First, drag the +3 to the other side, then solve for x.',
      hints: [
        'Step 1: Move +3 to get 2x = 11 - 3 = 8.',
        'Step 2: Divide both sides by 2: x = 8 ÷ 2 = 4.',
      ],
      validationRule: { type: 'exact', answer: 4 },
      remediation: {
        wrong_answer: 'Step 1: 2x + 3 = 11 → 2x = 8. Step 2: x = 8 ÷ 2 = 4.',
        sign_error: 'Check your signs when moving terms. +3 becomes -3 on the other side.',
        off_by_one: 'Close! Remember to divide by the coefficient after isolating the term.',
        empty: 'Drag the constant term across to start solving.',
      },
      problemConfig: {
        equation: {
          left: [
            { id: '2x', coefficient: 2, variable: 'x', isConstant: false },
            { id: 'c1', coefficient: 3, isConstant: true },
          ],
          right: [
            { id: 'c2', coefficient: 11, isConstant: true },
          ],
          targetVariable: 'x',
          targetValue: 4,
        },
      },
    },
    {
      id: 'twostep-drag-2',
      type: 'problem',
      interactionType: 'TERM_DRAG',
      prompt: 'Solve: 3x - 5 = 16. Isolate x step by step.',
      hints: [
        'Move -5 to the right: 3x = 16 + 5 = 21.',
        'Divide by 3: x = 21 ÷ 3 = 7.',
      ],
      validationRule: { type: 'exact', answer: 7 },
      remediation: {
        wrong_answer: '3x - 5 = 16 → 3x = 21 → x = 7. Move the constant first, then divide.',
        sign_error: 'Moving -5 across makes it +5. So 3x = 16 + 5 = 21.',
        empty: 'Start by dragging the constant term.',
      },
      problemConfig: {
        equation: {
          left: [
            { id: '3x', coefficient: 3, variable: 'x', isConstant: false },
            { id: 'c1', coefficient: -5, isConstant: true },
          ],
          right: [
            { id: 'c2', coefficient: 16, isConstant: true },
          ],
          targetVariable: 'x',
          targetValue: 7,
        },
      },
    },
    {
      id: 'twostep-input-1',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'Solve for x: 4x + 2 = 18. What is x?',
      hints: [
        'Subtract 2 from both sides: 4x = 16.',
        'Divide both sides by 4: x = 4.',
      ],
      validationRule: { type: 'exact', answer: 4 },
      remediation: {
        wrong_answer: '4x + 2 = 18. Subtract 2: 4x = 16. Divide by 4: x = 4.',
        off_by_one: 'Almost! Check your division step.',
        sign_error: 'The answer should be positive here.',
        empty: 'Enter your answer.',
      },
      problemConfig: {
        numberInput: { correctAnswer: 4, placeholder: 'x = ?' },
      },
    },
    {
      id: 'twostep-synthesis',
      type: 'synthesis',
      prompt: 'Two-step master!',
      synthesisText: 'You\'ve learned the two-step strategy: (1) undo addition or subtraction to isolate the variable term, then (2) undo multiplication or division to solve for the variable. This pattern works for any linear equation. Next up: visualizing these equations as lines on a graph!',
      hints: [],
      remediation: {},
    },
  ],
};

export default lesson;
