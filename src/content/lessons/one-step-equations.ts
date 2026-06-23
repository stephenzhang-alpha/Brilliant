import { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'one-step-equations',
  title: 'One-Step Equations',
  description: 'Solve equations by performing one operation to isolate the variable.',
  prerequisiteIds: ['variables-and-expressions'],
  xpReward: 75,
  steps: [
    {
      id: 'onestep-concept',
      type: 'concept',
      prompt: 'Solving an Equation',
      conceptText: 'Solving an equation means finding the value of the variable that makes both sides equal. To isolate the variable, we perform the inverse (opposite) operation on both sides. If something is added, we subtract it. If something is multiplied, we divide.',
      hints: [],
      feedbackMatrix: {},
    },
    {
      id: 'onestep-drag-1',
      type: 'problem',
      interactionType: 'TERM_DRAG',
      prompt: 'Solve for x: x + 5 = 12. Drag the +5 to the other side to isolate x.',
      hints: [
        'To remove +5 from the left, move it to the right side.',
        'When a term crosses the equals sign, its sign flips: +5 becomes -5.',
      ],
      validationRule: { type: 'exact', answer: 7 },
      feedbackMatrix: {
        wrong_answer: 'When you move +5 to the other side, it becomes -5. So x = 12 - 5.',
        sign_error: 'Remember: moving a term across the equals sign flips its sign!',
        incomplete: 'Drag the +5 term across the equals sign to the right side.',
        empty: 'Drag the term to solve the equation.',
      },
      problemConfig: {
        equation: {
          left: [
            { id: 'x', coefficient: 1, variable: 'x', isConstant: false },
            { id: 'c1', coefficient: 5, isConstant: true },
          ],
          right: [
            { id: 'c2', coefficient: 12, isConstant: true },
          ],
          targetVariable: 'x',
          targetValue: 7,
        },
      },
    },
    {
      id: 'onestep-drag-2',
      type: 'problem',
      interactionType: 'TERM_DRAG',
      prompt: 'Solve for x: x - 3 = 10. Drag the -3 to isolate x.',
      hints: [
        'Move the -3 to the right side.',
        'When -3 crosses the equals sign, it becomes +3. So x = 10 + 3.',
      ],
      validationRule: { type: 'exact', answer: 13 },
      feedbackMatrix: {
        wrong_answer: 'Moving -3 to the right makes it +3. So x = 10 + 3 = 13.',
        sign_error: 'When you move a negative term, it becomes positive on the other side.',
        empty: 'Drag the -3 term across the equals sign.',
      },
      problemConfig: {
        equation: {
          left: [
            { id: 'x', coefficient: 1, variable: 'x', isConstant: false },
            { id: 'c1', coefficient: -3, isConstant: true },
          ],
          right: [
            { id: 'c2', coefficient: 10, isConstant: true },
          ],
          targetVariable: 'x',
          targetValue: 13,
        },
      },
    },
    {
      id: 'onestep-drag-3',
      type: 'problem',
      interactionType: 'TERM_DRAG',
      prompt: 'Solve for x: x + 8 = 3. Drag to isolate x.',
      hints: [
        'Move +8 to the right side, where it becomes -8.',
        'x = 3 - 8. What is 3 - 8?',
      ],
      validationRule: { type: 'exact', answer: -5 },
      feedbackMatrix: {
        wrong_answer: 'Move +8 across: x = 3 - 8 = -5. Negative answers are okay!',
        sign_error: 'The answer is negative here. 3 - 8 = -5.',
        empty: 'Drag the +8 to the other side.',
      },
      problemConfig: {
        equation: {
          left: [
            { id: 'x', coefficient: 1, variable: 'x', isConstant: false },
            { id: 'c1', coefficient: 8, isConstant: true },
          ],
          right: [
            { id: 'c2', coefficient: 3, isConstant: true },
          ],
          targetVariable: 'x',
          targetValue: -5,
        },
      },
    },
    {
      id: 'onestep-synthesis',
      type: 'synthesis',
      prompt: 'Excellent!',
      synthesisText: 'You can solve one-step equations by moving terms across the equals sign. The key insight: whatever operation you undo on one side, you effectively apply the inverse on the other. This keeps the equation balanced. Next, we\'ll visualize this with a balance scale!',
      hints: [],
      feedbackMatrix: {},
    },
  ],
};

export default lesson;
