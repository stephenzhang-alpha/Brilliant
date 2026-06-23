import variablesAndExpressions from './lessons/variables-and-expressions';
import oneStepEquations from './lessons/one-step-equations';
import balancingEquations from './lessons/balancing-equations';
import twoStepEquations from './lessons/two-step-equations';
import inequalities from './lessons/inequalities';
import patternRules from './lessons/pattern-rules';
import functionMachines from './lessons/function-machines';
import areaModelTiles from './lessons/area-model-tiles';
import distributiveAsArea from './lessons/distributive-as-area';
import ratesAndMotion from './lessons/rates-and-motion';
import linearFunctions from './lessons/linear-functions';
import graphingLinearEquations from './lessons/graphing-linear-equations';
import systemsIntersection from './lessons/systems-intersection';
import type { Lesson } from '../types';

export const lessons: Lesson[] = [
  // Core spine
  variablesAndExpressions,
  oneStepEquations,
  balancingEquations,
  twoStepEquations,
  inequalities,
  // Patterns strand
  patternRules,
  functionMachines,
  // Visual / geometry strand
  areaModelTiles,
  distributiveAsArea,
  // Real-world / physics strand
  ratesAndMotion,
  linearFunctions,
  graphingLinearEquations,
  systemsIntersection,
];

export const lessonMap: Record<string, Lesson> = Object.fromEntries(
  lessons.map((l) => [l.id, l]),
);

export function getLessonById(id: string): Lesson | undefined {
  return lessonMap[id];
}

/**
 * In a branching curriculum "next" is the first lesson that lists the current
 * one as a prerequisite; falls back to the next lesson in reading order.
 */
export function getNextLesson(currentId: string): Lesson | undefined {
  const child = lessons.find((l) => l.prerequisiteIds.includes(currentId));
  if (child) return child;
  const idx = lessons.findIndex((l) => l.id === currentId);
  if (idx === -1 || idx >= lessons.length - 1) return undefined;
  return lessons[idx + 1];
}
