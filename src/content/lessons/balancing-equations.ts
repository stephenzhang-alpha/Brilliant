import { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'balancing-equations',
  title: 'Balancing Equations',
  description: 'Use a visual balance scale to understand why we apply the same operation to both sides.',
  prerequisiteIds: ['one-step-equations'],
  xpReward: 100,
  steps: [
    {
      id: 'balance-concept',
      type: 'concept',
      prompt: 'The Balance Principle',
      conceptText: 'An equation is like a balance scale. Both sides must weigh the same. If you add weight to one side, you must add the same weight to the other side to keep it level. This is why we always perform the same operation on both sides of an equation.',
      hints: [],
      feedbackMatrix: {},
    },
    {
      id: 'balance-1',
      type: 'problem',
      interactionType: 'SCALE_BALANCE',
      prompt: 'The scale shows x + 4 = 9. Remove 4 from both sides to find x. Apply "subtract 4" to both sides.',
      hints: [
        'Click "Subtract 4" to apply the operation to both sides.',
        'After subtracting 4 from both sides: x = 9 - 4 = 5.',
      ],
      validationRule: { type: 'exact', answer: 5 },
      feedbackMatrix: {
        wrong_answer: 'Subtract 4 from both sides to keep the scale balanced. x + 4 - 4 = 9 - 4, so x = 5.',
        unbalanced: 'You must apply the same operation to BOTH sides! The scale tips when you only change one side.',
        empty: 'Use the operation buttons to balance the scale.',
      },
      problemConfig: {
        scale: {
          leftItems: [
            { id: 'x', label: 'x', value: 5, isVariable: true },
            { id: 'w1', label: '4', value: 4 },
          ],
          rightItems: [
            { id: 'w2', label: '9', value: 9 },
          ],
          targetBalance: [
            { id: 'x', label: 'x', value: 5, isVariable: true },
          ],
          availableOperations: [
            { type: 'subtract', value: 4, label: 'Subtract 4' },
            { type: 'subtract', value: 9, label: 'Subtract 9' },
            { type: 'add', value: 4, label: 'Add 4' },
          ],
        },
      },
    },
    {
      id: 'balance-2',
      type: 'problem',
      interactionType: 'SCALE_BALANCE',
      prompt: 'The scale shows x + 7 = 15. Balance it to find x.',
      hints: [
        'What should you subtract from both sides?',
        'Subtract 7 from both sides: x = 15 - 7 = 8.',
      ],
      validationRule: { type: 'exact', answer: 8 },
      feedbackMatrix: {
        wrong_answer: 'Subtract 7 from both sides. x + 7 - 7 = 15 - 7, so x = 8.',
        unbalanced: 'Apply the operation to BOTH sides to keep the equation true.',
        empty: 'Choose an operation to solve.',
      },
      problemConfig: {
        scale: {
          leftItems: [
            { id: 'x', label: 'x', value: 8, isVariable: true },
            { id: 'w1', label: '7', value: 7 },
          ],
          rightItems: [
            { id: 'w2', label: '15', value: 15 },
          ],
          targetBalance: [
            { id: 'x', label: 'x', value: 8, isVariable: true },
          ],
          availableOperations: [
            { type: 'subtract', value: 7, label: 'Subtract 7' },
            { type: 'subtract', value: 15, label: 'Subtract 15' },
            { type: 'add', value: 7, label: 'Add 7' },
          ],
        },
      },
    },
    {
      id: 'balance-3',
      type: 'problem',
      interactionType: 'SCALE_BALANCE',
      prompt: 'The scale shows x - 6 = 2. What operation balances it?',
      hints: [
        'The variable has -6 with it. The inverse of subtracting is adding.',
        'Add 6 to both sides: x - 6 + 6 = 2 + 6, so x = 8.',
      ],
      validationRule: { type: 'exact', answer: 8 },
      feedbackMatrix: {
        wrong_answer: 'To undo -6, add 6 to both sides. x = 2 + 6 = 8.',
        unbalanced: 'Keep the scale balanced! Apply the same operation to both sides.',
        empty: 'Select an operation to apply.',
      },
      problemConfig: {
        scale: {
          leftItems: [
            { id: 'x', label: 'x', value: 8, isVariable: true },
            { id: 'w1', label: '-6', value: -6 },
          ],
          rightItems: [
            { id: 'w2', label: '2', value: 2 },
          ],
          targetBalance: [
            { id: 'x', label: 'x', value: 8, isVariable: true },
          ],
          availableOperations: [
            { type: 'add', value: 6, label: 'Add 6' },
            { type: 'subtract', value: 6, label: 'Subtract 6' },
            { type: 'add', value: 2, label: 'Add 2' },
          ],
        },
      },
    },
    {
      id: 'balance-synthesis',
      type: 'synthesis',
      prompt: 'You\'ve mastered the balance!',
      synthesisText: 'The balance scale shows the heart of algebra: an equation stays true only when you do the same thing to both sides. This principle works for any operation — adding, subtracting, multiplying, or dividing. Next, you\'ll tackle equations that require two steps!',
      hints: [],
      feedbackMatrix: {},
    },
  ],
};

export default lesson;
