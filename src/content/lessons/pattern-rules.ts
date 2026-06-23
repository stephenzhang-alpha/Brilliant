import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'pattern-rules',
  title: 'Pattern Rules',
  description: 'Spot the rule behind a growing pattern and write it as an expression.',
  prerequisiteIds: [],
  strand: 'patterns',
  entryPoint: true,
  mapPosition: { col: 0, row: 1 },
  xpReward: 50,
  steps: [
    {
      id: 'pattern-concept',
      type: 'concept',
      prompt: 'Every Pattern Hides a Rule',
      conceptText:
        'Patterns grow by a rule. The sequence 2, 4, 6, 8 grows by adding 2 each step — the rule for the n-th term is 2n. Finding the rule lets you jump to ANY term without listing them all. That rule is your first algebraic expression.',
    },
    {
      id: 'pattern-next',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'The pattern is 5, 8, 11, 14, ... Each step adds 3. What is the 6th term?',
      hints: ['Start at 5 and add 3 five more times.', '5 + 3 × 5 = 5 + 15.'],
      validationRule: { type: 'exact', answer: 20 },
      remediation: {
        wrong_answer: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: 'Count the steps: the 6th term is 5 hops of +3 above the first term.',
          params: { min: 5, max: 23, answer: 20, caption: 'Five hops of 3 from 5' },
        },
        off_by_one: { kind: 'text', message: 'Careful: the 1st term is 5 (zero hops). The 6th term is 5 hops later.' },
      },
      problemConfig: { numberInput: { correctAnswer: 20, placeholder: '6th term' } },
    },
    {
      id: 'pattern-rule',
      type: 'problem',
      interactionType: 'EXPRESSION_BUILDER',
      prompt: 'A pattern follows the rule 3n. Build the value of the 4th term (n = 4).',
      hints: ['3n means 3 times n.', 'Three groups of 4 is 12.'],
      validationRule: { type: 'exact', answer: 12 },
      remediation: {
        wrong_answer: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: '3n means 3 times n. With n = 4, count three groups of 4.',
          params: { min: 0, max: 16, answer: 12, caption: 'Three groups of 4' },
        },
      },
      problemConfig: {
        expressionBuilder: {
          expression: [{ id: 'n', coefficient: 3, variable: 'n', isConstant: false }],
          variable: 'n',
          substituteValue: 4,
          answer: 12,
          maxValue: 16,
        },
      },
    },
    {
      id: 'pattern-synthesis',
      type: 'synthesis',
      prompt: 'You think in rules now!',
      synthesisText:
        'Turning a pattern into a rule like 3n or 3 + 2n is exactly what algebra does: it captures infinitely many cases in one expression. Next, feed numbers through a function machine to see rules in action.',
    },
  ],
};

export default lesson;
