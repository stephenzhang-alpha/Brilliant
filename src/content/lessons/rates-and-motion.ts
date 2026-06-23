import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'rates-and-motion',
  title: 'Rates and Motion',
  description: 'Model real-world speed as a constant rate — the seed of a linear function.',
  prerequisiteIds: [],
  strand: 'physics',
  entryPoint: true,
  mapPosition: { col: 0, row: 3 },
  xpReward: 50,
  steps: [
    {
      id: 'rates-concept',
      type: 'concept',
      prompt: 'Steady Speed, Steady Growth',
      conceptText:
        'When something moves at a constant speed, distance grows by the same amount every hour. At 60 miles per hour, after 1 hour you have gone 60 miles, after 2 hours 120 miles. That steady rate is the slope of a line: distance = speed × time.',
    },
    {
      id: 'rates-distance',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'A car drives at 60 mph. How far does it travel in 3 hours?',
      hints: ['Distance = speed × time.', '60 × 3 = ?'],
      validationRule: { type: 'exact', answer: 180 },
      remediation: {
        wrong_answer: { kind: 'text', message: 'Multiply the rate by the time: 60 × 3.' },
      },
      problemConfig: { numberInput: { correctAnswer: 180, placeholder: 'miles' } },
    },
    {
      id: 'rates-time',
      type: 'problem',
      interactionType: 'NUMBER_INPUT',
      prompt: 'Walking at 4 mph, how many hours to cover 12 miles?',
      hints: ['Time = distance ÷ speed.', '12 ÷ 4 = ?'],
      validationRule: { type: 'exact', answer: 3 },
      remediation: {
        wrong_answer: { kind: 'text', message: 'Divide distance by speed: 12 ÷ 4.' },
      },
      problemConfig: { numberInput: { correctAnswer: 3, placeholder: 'hours' } },
    },
    {
      id: 'rates-synthesis',
      type: 'synthesis',
      prompt: 'You are modeling the world!',
      synthesisText:
        'A constant rate is the slope of a straight line. Next you will grab the slope and intercept directly and watch the line move — the heart of linear functions.',
    },
  ],
};

export default lesson;
