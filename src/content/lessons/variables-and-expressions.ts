import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'variables-and-expressions',
  title: 'Variables & Expressions',
  description: 'Discover what variables represent by substituting values and building results by hand.',
  prerequisiteIds: [],
  strand: 'core',
  entryPoint: true,
  mapPosition: { col: 0, row: 0 },
  xpReward: 50,
  steps: [
    {
      id: 'var-intro-concept',
      type: 'concept',
      prompt: 'What is a Variable?',
      conceptText:
        "A variable is a letter that stands for a number we don't know yet. Think of it as a box that holds a mystery value. In algebra, we use letters like x, y, and n as variables.",
    },
    {
      id: 'var-build-1',
      type: 'problem',
      interactionType: 'EXPRESSION_BUILDER',
      prompt: 'If x = 3, build the value of x + 5.',
      hints: ['Drop 3 into the box, then count 5 more along the line.', 'Start at 3 and hop forward 5 to reach 8.'],
      validationRule: { type: 'exact', answer: 8 },
      remediation: {
        wrong_answer: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: 'Substituting means replacing x with its value. Place 3, then move 5 steps right.',
          params: { min: 0, max: 12, answer: 8, caption: 'Land on 3 + 5' },
        },
        off_by_one: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: 'So close — recount the hops from 3.',
          params: { min: 0, max: 12, answer: 8, caption: 'Exactly 5 steps past 3' },
        },
      },
      problemConfig: {
        expressionBuilder: {
          expression: [
            { id: 'x', coefficient: 1, variable: 'x', isConstant: false },
            { id: 'c', coefficient: 5, isConstant: true },
          ],
          variable: 'x',
          substituteValue: 3,
          answer: 8,
          maxValue: 12,
        },
      },
    },
    {
      id: 'var-build-2',
      type: 'problem',
      interactionType: 'EXPRESSION_BUILDER',
      prompt: 'If y = 4, build the value of 2y.',
      hints: ['2y means 2 groups of y.', 'Two groups of 4 is 8.'],
      validationRule: { type: 'exact', answer: 8 },
      remediation: {
        wrong_answer: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: '2y means 2 times y. With y = 4, that is two hops of 4.',
          params: { min: 0, max: 16, answer: 8, caption: 'Two groups of 4' },
        },
      },
      problemConfig: {
        expressionBuilder: {
          expression: [{ id: 'y', coefficient: 2, variable: 'y', isConstant: false }],
          variable: 'y',
          substituteValue: 4,
          answer: 8,
          maxValue: 16,
        },
      },
    },
    {
      id: 'var-expression-eval',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'If x = 5, evaluate the expression: 3x - 2',
      hints: ['First multiply: 3 × 5 = 15', 'Then subtract: 15 - 2 = ?'],
      validationRule: { type: 'exact', answer: 13 },
      remediation: {
        wrong_answer: {
          kind: 'text',
          message: 'Follow the order: first multiply 3 × x, then subtract 2.',
        },
        off_by_one: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: 'Very close — start at 15 (which is 3 × 5) and step back 2.',
          params: { min: 8, max: 18, answer: 13, caption: '15 minus 2' },
        },
        sign_error: { kind: 'text', message: 'Watch your signs. 3x is positive when x is positive.' },
        empty: { kind: 'text', message: 'Type a number to answer.' },
      },
      problemConfig: {
        numberInput: { correctAnswer: 13, placeholder: 'Enter your answer' },
      },
    },
    {
      id: 'var-build-3',
      type: 'problem',
      interactionType: 'EXPRESSION_BUILDER',
      prompt: 'If n = 2, build the value of 3n.',
      hints: ['3n means 3 groups of n.', 'Three groups of 2 is 6.'],
      validationRule: { type: 'exact', answer: 6 },
      remediation: {
        wrong_answer: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: '3n means 3 times n. With n = 2, that is three hops of 2.',
          params: { min: 0, max: 12, answer: 6, caption: 'Three groups of 2' },
        },
      },
      problemConfig: {
        expressionBuilder: {
          expression: [{ id: 'n', coefficient: 3, variable: 'n', isConstant: false }],
          variable: 'n',
          substituteValue: 2,
          answer: 6,
          maxValue: 12,
        },
      },
    },
    {
      id: 'var-eval-2',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'If x = 4, evaluate the expression: 5x - 3',
      hints: ['First multiply: 5 × 4 = 20', 'Then subtract: 20 - 3 = ?'],
      validationRule: { type: 'exact', answer: 17 },
      remediation: {
        wrong_answer: { kind: 'text', message: 'Order of operations: multiply 5 × x first, then subtract 3.' },
        off_by_one: {
          kind: 'microActivity',
          activity: 'number-line-hop',
          message: 'Very close — start at 20 (which is 5 × 4) and step back 3.',
          params: { min: 12, max: 22, answer: 17, caption: '20 minus 3' },
        },
        empty: { kind: 'text', message: 'Type a number to answer.' },
      },
      problemConfig: {
        numberInput: { correctAnswer: 17, placeholder: 'Enter your answer' },
      },
    },
    {
      id: 'var-synthesis',
      type: 'synthesis',
      prompt: 'Great work!',
      synthesisText:
        "You now know that variables stand for unknown numbers, and expressions combine variables with operations. Evaluating an expression means plugging in the value and computing the result. Next, we'll learn how to solve for the unknown!",
    },
  ],
};

export default lesson;
