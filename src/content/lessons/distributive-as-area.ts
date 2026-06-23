import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'distributive-as-area',
  title: 'Distributive Property as Area',
  description: 'Split a rectangle to see why 3(x + 2) becomes 3x + 6.',
  prerequisiteIds: ['area-model-tiles'],
  strand: 'visual',
  mapPosition: { col: 1, row: 2 },
  xpReward: 75,
  steps: [
    {
      id: 'dist-concept',
      type: 'concept',
      prompt: 'Cut the Rectangle',
      conceptText:
        'A rectangle 3 tall and (x + 2) wide can be cut into two pieces: one 3 by x, and one 3 by 2. Their areas are 3x and 6. So 3(x + 2) = 3x + 6. Distributing is just adding up the pieces of a split rectangle.',
    },
    {
      id: 'dist-expand',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: '3(x + 2) expands to 3x + ?. What constant fills the blank?',
      hints: ['Multiply the 3 by the 2.', '3 × 2 = 6.'],
      validationRule: { type: 'exact', answer: 6 },
      remediation: {
        wrong_answer: {
          kind: 'visual',
          visual: 'rise-run',
          message: 'The second piece is 3 tall and 2 wide, so its area is 3 × 2 = 6.',
          params: { rise: 3, run: 2 },
        },
      },
      problemConfig: { numberInput: { correctAnswer: 6, placeholder: 'constant' } },
    },
    {
      id: 'dist-evaluate',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'Using 3(x + 2) with x = 4, what is the total area?',
      hints: ['x + 2 = 6, then 3 × 6.', 'Or 3x + 6 = 12 + 6.'],
      validationRule: { type: 'exact', answer: 18 },
      remediation: {
        wrong_answer: { kind: 'text', message: 'Either compute 3 × (4 + 2) or 3·4 + 6 — both give 18.' },
        off_by_one: { kind: 'text', message: 'Re-add the two pieces: 12 and 6.' },
      },
      problemConfig: { numberInput: { correctAnswer: 18, placeholder: 'total area' } },
    },
    {
      id: 'dist-synthesis',
      type: 'synthesis',
      prompt: 'Distribution, decoded!',
      synthesisText:
        'The distributive property is not a rule to memorize — it is the area of a split rectangle. This visual unlocks expanding and factoring throughout Algebra 1.',
    },
  ],
};

export default lesson;
