import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'area-model-tiles',
  title: 'Area Model with Tiles',
  description: 'See multiplication and variables as the area of a rectangle.',
  prerequisiteIds: [],
  strand: 'visual',
  entryPoint: true,
  mapPosition: { col: 0, row: 2 },
  xpReward: 50,
  steps: [
    {
      id: 'area-concept',
      type: 'concept',
      prompt: 'Multiplication is Area',
      conceptText:
        'The area of a rectangle is width × height. If a rectangle is 5 wide and 3 tall, its area is 15. When one side is an unknown length x, the area becomes an expression like 3x — a tile that is 3 tall and x wide.',
    },
    {
      id: 'area-numeric',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'A rectangle is 5 wide and 3 tall. What is its area?',
      hints: ['Area = width × height.', '5 × 3 = ?'],
      validationRule: { type: 'exact', answer: 15 },
      remediation: {
        wrong_answer: { kind: 'text', message: 'Area is width times height: 5 × 3.' },
      },
      problemConfig: { numberInput: { correctAnswer: 15, placeholder: 'area' } },
    },
    {
      id: 'area-variable',
      type: 'problem',
      interactionType: 'EXPRESSION_BUILDER',
      prompt: 'A tile is 3 tall and x wide, so its area is 3x. Build the area when x = 4.',
      hints: ['3x means 3 times x.', '3 × 4 = 12.'],
      validationRule: { type: 'exact', answer: 12 },
      remediation: {
        wrong_answer: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: 'The tile is 3 rows of x. With x = 4, that is three groups of 4.',
          params: { min: 0, max: 16, answer: 12, caption: 'Three rows of 4' },
        },
      },
      problemConfig: {
        expressionBuilder: {
          expression: [{ id: 'x', coefficient: 3, variable: 'x', isConstant: false }],
          variable: 'x',
          substituteValue: 4,
          answer: 12,
          maxValue: 16,
        },
      },
    },
    {
      id: 'area-synthesis',
      type: 'synthesis',
      prompt: 'Tiles make algebra visible!',
      synthesisText:
        'A coefficient like the 3 in 3x is just how many rows of x you have. Seeing expressions as areas makes the distributive property obvious — which is exactly what you will build next.',
    },
  ],
};

export default lesson;
