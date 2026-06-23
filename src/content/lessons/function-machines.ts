import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'function-machines',
  title: 'Function Machines',
  description: 'Feed inputs through a rule machine, then run it backwards to find the input.',
  prerequisiteIds: ['pattern-rules'],
  strand: 'patterns',
  mapPosition: { col: 1, row: 1 },
  xpReward: 75,
  steps: [
    {
      id: 'fm-concept',
      type: 'concept',
      prompt: 'Inputs In, Outputs Out',
      conceptText:
        'A function machine takes an input, applies a rule, and produces an output. If the rule is "double, then add 1", an input of 3 becomes 2 × 3 + 1 = 7. Reversing the machine — going from output back to input — is the same as solving an equation.',
    },
    {
      id: 'fm-forward',
      type: 'problem',
      interactionType: 'EXPRESSION_BUILDER',
      prompt: 'The machine rule is 2n + 1. Build the output when the input n = 3.',
      hints: ['Double the input, then add 1.', '2 × 3 = 6, then + 1 = 7.'],
      validationRule: { type: 'exact', answer: 7 },
      remediation: {
        wrong_answer: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: 'Apply the rule in order: double 3 to get 6, then step +1.',
          params: { min: 0, max: 12, answer: 7, caption: 'Double 3, then +1' },
        },
      },
      problemConfig: {
        expressionBuilder: {
          expression: [
            { id: 'n', coefficient: 2, variable: 'n', isConstant: false },
            { id: 'c', coefficient: 1, isConstant: true },
          ],
          variable: 'n',
          substituteValue: 3,
          answer: 7,
          maxValue: 12,
        },
      },
    },
    {
      id: 'fm-reverse',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'The machine rule is n + 4 and it output 10. What input went in?',
      hints: ['Undo the rule: subtract 4 from the output.', '10 - 4 = 6.'],
      validationRule: { type: 'exact', answer: 6 },
      remediation: {
        wrong_answer: { kind: 'text', message: 'To reverse "+4", subtract 4 from the output: 10 - 4.' },
        off_by_one: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: 'Step back 4 from 10 on the line.',
          params: { min: 0, max: 12, answer: 6, caption: '10 minus 4' },
        },
      },
      problemConfig: { numberInput: { correctAnswer: 6, placeholder: 'input' } },
    },
    {
      id: 'fm-synthesis',
      type: 'synthesis',
      prompt: 'You can run machines both ways!',
      synthesisText:
        'Running a machine forward evaluates an expression; running it backward solves an equation. That two-way thinking is the engine of algebra and leads straight into linear functions.',
    },
  ],
};

export default lesson;
