import { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'variables-and-expressions',
  title: 'Variables & Expressions',
  description: 'Learn what variables represent and how to evaluate simple expressions.',
  prerequisiteIds: [],
  xpReward: 50,
  steps: [
    {
      id: 'var-intro-concept',
      type: 'concept',
      prompt: 'What is a Variable?',
      conceptText: 'A variable is a letter that stands for a number we don\'t know yet. Think of it as a box that holds a mystery value. In algebra, we use letters like x, y, and n as variables.',
      hints: [],
      feedbackMatrix: {},
    },
    {
      id: 'var-match-1',
      type: 'problem',
      interactionType: 'MULTIPLE_CHOICE',
      prompt: 'If x = 3, what is x + 5?',
      hints: ['Substitute the value of x into the expression.', 'Replace x with 3, then add 5.'],
      validationRule: { type: 'exact', answer: '8' },
      feedbackMatrix: {
        wrong_answer: 'Remember: substitute the value of x into the expression. If x = 3, then x + 5 = 3 + 5.',
        sign_error: 'Check your signs! x is positive here.',
        empty: 'Pick an answer to continue.',
      },
      problemConfig: {
        choices: {
          options: [
            { id: 'a', text: '8', isCorrect: true },
            { id: 'b', text: '5', isCorrect: false },
            { id: 'c', text: '3', isCorrect: false },
            { id: 'd', text: '15', isCorrect: false },
          ],
        },
      },
    },
    {
      id: 'var-match-2',
      type: 'problem',
      interactionType: 'MULTIPLE_CHOICE',
      prompt: 'If y = 4, what is 2y?',
      hints: ['2y means 2 times y.', 'Replace y with 4: 2 × 4 = ?'],
      validationRule: { type: 'exact', answer: '8' },
      feedbackMatrix: {
        wrong_answer: '2y means "2 times y". If y = 4, that\'s 2 × 4.',
        sign_error: 'The coefficient is positive, so 2y is a positive number.',
        empty: 'Select an answer.',
      },
      problemConfig: {
        choices: {
          options: [
            { id: 'a', text: '8', isCorrect: true },
            { id: 'b', text: '6', isCorrect: false },
            { id: 'c', text: '24', isCorrect: false },
            { id: 'd', text: '2', isCorrect: false },
          ],
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
      feedbackMatrix: {
        wrong_answer: 'Follow the order: first multiply 3 × x, then subtract 2.',
        off_by_one: 'Very close! Double-check your subtraction.',
        sign_error: 'Watch your signs. 3x is positive when x is positive.',
        empty: 'Type a number to answer.',
      },
      problemConfig: {
        numberInput: { correctAnswer: 13, placeholder: 'Enter your answer' },
      },
    },
    {
      id: 'var-synthesis',
      type: 'synthesis',
      prompt: 'Great work!',
      synthesisText: 'You now know that variables stand for unknown numbers, and expressions combine variables with operations. Evaluating an expression means plugging in the value and computing the result. Next, we\'ll learn how to solve for the unknown!',
      hints: [],
      feedbackMatrix: {},
    },
  ],
};

export default lesson;
