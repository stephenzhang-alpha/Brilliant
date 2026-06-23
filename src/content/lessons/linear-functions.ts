import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'linear-functions',
  title: 'Linear Functions: y = mx + b',
  description: 'Drag the slope and intercept sliders to feel how a line transforms.',
  prerequisiteIds: ['rates-and-motion'],
  strand: 'physics',
  mapPosition: { col: 1, row: 3 },
  xpReward: 100,
  steps: [
    {
      id: 'lin-concept',
      type: 'concept',
      prompt: 'Two Dials Control Every Line',
      conceptText:
        'A line is set by just two numbers: m, the slope (its steepness and direction), and b, the y-intercept (where it crosses the y-axis). Changing m rotates the line; changing b slides it up or down. Master these two dials and you can draw any line.',
    },
    {
      id: 'lin-slider-1',
      type: 'problem',
      interactionType: 'SLIDER_GRAPH',
      prompt: 'Move the sliders until your line matches the dashed target y = 2x + 1.',
      hints: ['Slope 2 means up 2 for every 1 across.', 'Set b so the line crosses the y-axis at 1.'],
      validationRule: { type: 'exact', answer: { slope: 2, intercept: 1 } },
      remediation: {
        slope_wrong: {
          kind: 'visual',
          visual: 'rise-run',
          message: 'Slope is rise over run. For slope 2, the line climbs 2 each time it moves 1 right.',
          params: { rise: 2, run: 1 },
        },
        intercept_wrong: { kind: 'text', message: 'The intercept b is the height where the line meets the y-axis. Aim for 1.' },
      },
      problemConfig: {
        sliderGraph: {
          targetSlope: 2,
          targetIntercept: 1,
          xRange: [-5, 5],
          yRange: [-5, 5],
          slopeRange: [-4, 4],
          interceptRange: [-5, 5],
          step: 0.5,
        },
      },
    },
    {
      id: 'lin-slider-2',
      type: 'problem',
      interactionType: 'SLIDER_GRAPH',
      prompt: 'Now match y = -x + 3 (a falling line).',
      hints: ['A negative slope falls as you move right.', 'It should cross the y-axis at 3.'],
      validationRule: { type: 'exact', answer: { slope: -1, intercept: 3 } },
      remediation: {
        slope_wrong: { kind: 'text', message: 'A negative slope goes downhill. Try m = -1.' },
        intercept_wrong: { kind: 'text', message: 'Slide b until the crossing point sits at y = 3.' },
      },
      problemConfig: {
        sliderGraph: {
          targetSlope: -1,
          targetIntercept: 3,
          xRange: [-5, 5],
          yRange: [-5, 5],
          slopeRange: [-4, 4],
          interceptRange: [-5, 5],
          step: 0.5,
        },
      },
    },
    {
      id: 'lin-synthesis',
      type: 'synthesis',
      prompt: 'You command the line!',
      synthesisText:
        'Slope and intercept are the only two dials a line has. With them you can model any constant rate and read any graph. Next, plot points yourself, then find where two lines meet.',
    },
  ],
};

export default lesson;
