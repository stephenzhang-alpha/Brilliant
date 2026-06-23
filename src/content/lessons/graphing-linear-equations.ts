import type { Lesson } from '../../types';

const lesson: Lesson = {
  id: 'graphing-linear-equations',
  title: 'Graphing Linear Equations',
  description: 'Plot lines on a coordinate grid and understand slope and intercept visually.',
  prerequisiteIds: ['linear-functions'],
  strand: 'physics',
  mapPosition: { col: 2, row: 3 },
  xpReward: 125,
  steps: [
    {
      id: 'graph-concept',
      type: 'concept',
      prompt: 'Lines on a Grid',
      conceptText: 'Every linear equation like y = mx + b draws a straight line on a coordinate grid. The letter m is the slope (how steep the line is), and b is the y-intercept (where the line crosses the y-axis). By changing m and b, you change how the line looks.',
      hints: [],
      remediation: {},
    },
    {
      id: 'graph-plot-1',
      type: 'problem',
      interactionType: 'GRAPH_PLOT',
      prompt: 'Drag the line to match y = x + 1. The slope should be 1 and the y-intercept should be 1.',
      hints: [
        'Slope of 1 means the line goes up 1 unit for every 1 unit right.',
        'Y-intercept of 1 means the line crosses the y-axis at (0, 1).',
      ],
      validationRule: { type: 'exact', answer: { slope: 1, intercept: 1 } },
      remediation: {
        wrong_answer: 'Adjust the line so it passes through (0, 1) and rises at 45 degrees.',
        slope_wrong: 'The slope should be 1 — the line goes up one unit for each unit to the right.',
        intercept_wrong: 'The y-intercept should be 1 — the line should cross the y-axis at y = 1.',
        empty: 'Drag the points on the line to adjust its slope and position.',
      },
      problemConfig: {
        graph: {
          targetSlope: 1,
          targetIntercept: 1,
          xRange: [-5, 5],
          yRange: [-5, 5],
          snapToGrid: true,
        },
      },
    },
    {
      id: 'graph-plot-2',
      type: 'problem',
      interactionType: 'GRAPH_PLOT',
      prompt: 'Drag the line to match y = 2x - 1. Slope is 2, y-intercept is -1.',
      hints: [
        'A slope of 2 means the line rises 2 units for every 1 unit to the right.',
        'The line should cross the y-axis at (0, -1).',
      ],
      validationRule: { type: 'exact', answer: { slope: 2, intercept: -1 } },
      remediation: {
        wrong_answer: 'The line should be steeper (slope 2) and cross the y-axis below zero at -1.',
        slope_wrong: 'Slope of 2 means it rises twice as fast. For every 1 right, go 2 up.',
        intercept_wrong: 'The y-intercept is -1, meaning the line crosses the y-axis at (0, -1).',
        empty: 'Drag the line to set the right slope and intercept.',
      },
      problemConfig: {
        graph: {
          targetSlope: 2,
          targetIntercept: -1,
          xRange: [-5, 5],
          yRange: [-5, 5],
          snapToGrid: true,
        },
      },
    },
    {
      id: 'graph-plot-3',
      type: 'problem',
      interactionType: 'GRAPH_PLOT',
      prompt: 'Drag the line to match y = -x + 3. Slope is -1, y-intercept is 3.',
      hints: [
        'A negative slope means the line goes DOWN as you move right.',
        'It should cross the y-axis at (0, 3) and go down at 45 degrees.',
      ],
      validationRule: { type: 'exact', answer: { slope: -1, intercept: 3 } },
      remediation: {
        wrong_answer: 'This line goes downward (slope -1) and crosses y-axis at 3.',
        slope_wrong: 'Negative slope means the line falls. It should go down 1 for each 1 to the right.',
        intercept_wrong: 'The y-intercept is 3 — the line crosses the y-axis at y = 3.',
        empty: 'Adjust the line on the graph.',
      },
      problemConfig: {
        graph: {
          targetSlope: -1,
          targetIntercept: 3,
          xRange: [-5, 5],
          yRange: [-5, 5],
          snapToGrid: true,
        },
      },
    },
    {
      id: 'graph-synthesis',
      type: 'synthesis',
      prompt: 'You can read and draw lines!',
      synthesisText: 'You now understand that y = mx + b is a line where m controls steepness and b controls position. Positive slopes go up, negative slopes go down. You can graph any linear equation by knowing just these two numbers. Congratulations — you\'ve completed the Algebra 1 fundamentals course!',
      hints: [],
      remediation: {},
    },
  ],
};

export default lesson;
