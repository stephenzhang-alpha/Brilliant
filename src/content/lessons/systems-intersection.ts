import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'systems-intersection',
  title: 'Systems: When Do They Meet?',
  description: 'Scrub two real-world lines until the gap closes — that meeting point solves the system.',
  prerequisiteIds: ['graphing-linear-equations'],
  strand: 'physics',
  mapPosition: { col: 3, row: 3 },
  xpReward: 125,
  steps: [
    {
      id: 'sys-concept',
      type: 'concept',
      prompt: 'Two Lines, One Answer',
      conceptText:
        'A system of equations is two lines on the same grid. The solution is the single x where they meet — where both models agree. Instead of guessing, slide x and watch the gap between the lines shrink to zero.',
    },
    {
      id: 'sys-scrub-1',
      type: 'problem',
      interactionType: 'INTERSECTION_SCRUB',
      prompt: 'Plan A costs 2x; Plan B costs x + 3. Slide x to the month where they cost the same.',
      hints: ['Drag x until the red gap disappears.', '2x = x + 3 happens at x = 3.'],
      validationRule: { type: 'range', answer: 3, tolerance: 0.4 },
      remediation: {
        wrong_answer: {
          kind: 'text',
          message: 'Keep sliding toward where the gap bar turns green — that is where 2x and x + 3 are equal.',
        },
      },
      problemConfig: {
        intersection: {
          lineA: { slope: 2, intercept: 0, label: 'Plan A' },
          lineB: { slope: 1, intercept: 3, label: 'Plan B' },
          xRange: [0, 6],
          yRange: [0, 12],
          answerX: 3,
          tolerance: 0.4,
          unitLabel: 'months',
        },
      },
    },
    {
      id: 'sys-scrub-2',
      type: 'problem',
      interactionType: 'INTERSECTION_SCRUB',
      prompt: 'Two hikers: one at y = x + 1, the other at y = -x + 5. Where do they meet?',
      hints: ['Slide until both dots overlap.', 'x + 1 = -x + 5 gives x = 2.'],
      validationRule: { type: 'range', answer: 2, tolerance: 0.4 },
      remediation: {
        wrong_answer: { kind: 'text', message: 'The meeting point is where the rising and falling lines cross. Watch the gap shrink to 0.' },
      },
      problemConfig: {
        intersection: {
          lineA: { slope: 1, intercept: 1, label: 'Hiker 1' },
          lineB: { slope: -1, intercept: 5, label: 'Hiker 2' },
          xRange: [0, 6],
          yRange: [0, 8],
          answerX: 2,
          tolerance: 0.4,
          unitLabel: 'hours',
        },
      },
    },
    {
      id: 'sys-synthesis',
      type: 'synthesis',
      prompt: 'You solved a system by feel!',
      synthesisText:
        'Finding where two lines meet is exactly solving a system of equations. The shrinking gap |f(x) - g(x)| is the same idea as setting the two expressions equal. You have now connected graphs, equations, and the real world.',
    },
  ],
};

export default lesson;
