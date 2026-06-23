import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'balancing-equations',
  title: 'Balancing Equations',
  description: 'Drag weights on a real balance scale to discover why both sides must change together.',
  prerequisiteIds: ['one-step-equations'],
  strand: 'core',
  mapPosition: { col: 2, row: 0 },
  xpReward: 100,
  steps: [
    {
      id: 'balance-concept',
      type: 'concept',
      prompt: 'The Balance Principle',
      conceptText:
        'An equation is a balance scale: both sides weigh the same. The mystery weight x sits with some known weights. To find x, you peel away the known weights — but if you take weight off one pan, you must take the SAME weight off the other, or the scale tips.',
    },
    {
      id: 'balance-1',
      type: 'problem',
      interactionType: 'BALANCE_SCALE',
      prompt: 'The scale shows x + 4 = 9. Take the weights off until x is alone — keeping the scale level.',
      hints: [
        'Drag the 4 off the left pan into the bank.',
        'The scale tips! Now remove 4 from the right too. Tap the scissors to split 9 into 4 and 5 first.',
      ],
      validationRule: { type: 'exact', answer: 5 },
      problemConfig: {
        balance: {
          variable: 'x',
          left: [
            { kind: 'var', value: 1 },
            { kind: 'const', value: 4 },
          ],
          right: [{ kind: 'const', value: 9 }],
          targetValue: 5,
          goalText: 'Remove the +4 from both pans to leave x by itself.',
        },
      },
    },
    {
      id: 'balance-2',
      type: 'problem',
      interactionType: 'BALANCE_SCALE',
      prompt: 'Now solve x + 7 = 15 on the scale.',
      hints: [
        'Take the 7 off the left, then split the 15 to remove 7 from the right.',
        'After removing 7 from both sides, x sits alone opposite 8.',
      ],
      validationRule: { type: 'exact', answer: 8 },
      problemConfig: {
        balance: {
          variable: 'x',
          left: [
            { kind: 'var', value: 1 },
            { kind: 'const', value: 7 },
          ],
          right: [{ kind: 'const', value: 15 }],
          targetValue: 8,
          goalText: 'Strip the +7 off both pans to isolate x.',
        },
      },
    },
    {
      id: 'balance-3',
      type: 'problem',
      interactionType: 'BALANCE_SCALE',
      prompt: 'The scale shows 2x = 10. Split BOTH sides into equal groups to find one x.',
      hints: [
        'There are two x weights balancing 10. Use the "÷ 2" tool to split both pans into two equal groups.',
        'Half of 2x is x; half of 10 is 5. So x = 5.',
      ],
      validationRule: { type: 'exact', answer: 5 },
      problemConfig: {
        balance: {
          variable: 'x',
          left: [{ kind: 'var', value: 2 }],
          right: [{ kind: 'const', value: 10 }],
          divisors: [2],
          targetValue: 5,
          goalText: 'Divide both sides into 2 equal groups so a single x is left.',
        },
      },
    },
    {
      id: 'balance-synthesis',
      type: 'synthesis',
      prompt: "You've mastered the balance!",
      synthesisText:
        'The scale reveals the heart of algebra: an equation stays true only when you do the SAME thing to both sides — removing equal weights or splitting both sides equally. This single principle powers every equation you will ever solve. Next, two-step equations!',
    },
  ],
};

export default lesson;
