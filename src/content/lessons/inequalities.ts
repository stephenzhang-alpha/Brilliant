import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'inequalities',
  title: 'Inequalities',
  description: 'Solve inequalities like equations — and learn the one twist that flips the sign.',
  prerequisiteIds: ['two-step-equations'],
  strand: 'core',
  mapPosition: { col: 4, row: 0 },
  xpReward: 100,
  steps: [
    {
      id: 'ineq-concept',
      type: 'concept',
      prompt: 'Ranges, Not Just Points',
      conceptText:
        'An inequality like x + 3 < 7 has many solutions, not one. You isolate x the same way as an equation. The boundary value (where it would be equal) marks the edge of the solution range. One twist: multiplying or dividing by a negative flips the inequality sign.',
    },
    {
      id: 'ineq-1',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'Solve x + 3 < 7. The solution is x < ___. Enter the boundary value.',
      hints: ['Subtract 3 from both sides.', '7 - 3 = 4, so x < 4.'],
      validationRule: { type: 'exact', answer: 4 },
      remediation: {
        wrong_answer: { kind: 'text', message: 'Isolate x by subtracting 3 from both sides: x < 7 - 3.' },
        off_by_one: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: 'Step back 3 from 7 to find the boundary.',
          params: { min: 0, max: 10, answer: 4, caption: '7 minus 3' },
        },
      },
      problemConfig: { numberInput: { correctAnswer: 4, placeholder: 'boundary' } },
    },
    {
      id: 'ineq-2',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'Solve 2x ≤ 10. The solution is x ≤ ___.',
      hints: ['Divide both sides by 2.', '10 ÷ 2 = 5.'],
      validationRule: { type: 'exact', answer: 5 },
      remediation: {
        wrong_answer: { kind: 'text', message: 'Divide both sides by 2 (positive, so the sign stays): x ≤ 10 ÷ 2.' },
      },
      problemConfig: { numberInput: { correctAnswer: 5, placeholder: 'boundary' } },
    },
    {
      id: 'ineq-flip',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'Solve -x < 3. Multiplying by -1 flips the sign to x > ___. Enter the boundary.',
      hints: ['Multiply both sides by -1 and FLIP the sign.', '-x < 3 becomes x > -3.'],
      validationRule: { type: 'exact', answer: -3 },
      remediation: {
        wrong_answer: {
          kind: 'visual',
          visual: 'sign-flip',
          message: 'When you multiply or divide by a negative, the inequality sign flips direction.',
          params: { value: 3 },
        },
        sign_error: {
          kind: 'visual',
          visual: 'sign-flip',
          message: 'The boundary is -3, and the sign flips from < to >.',
          params: { value: 3 },
        },
      },
      problemConfig: { numberInput: { correctAnswer: -3, placeholder: 'boundary' } },
    },
    {
      id: 'ineq-synthesis',
      type: 'synthesis',
      prompt: 'Inequalities mastered!',
      synthesisText:
        'Inequalities solve just like equations, producing a range of answers. The one rule to remember: flip the sign whenever you multiply or divide by a negative. That completes your core algebra toolkit.',
    },
  ],
};

export default lesson;
