import variablesAndExpressions from './lessons/variables-and-expressions';
import oneStepEquations from './lessons/one-step-equations';
import balancingEquations from './lessons/balancing-equations';
import twoStepEquations from './lessons/two-step-equations';
import graphingLinearEquations from './lessons/graphing-linear-equations';
import { Lesson } from '../types';

export const lessons: Lesson[] = [
  variablesAndExpressions,
  oneStepEquations,
  balancingEquations,
  twoStepEquations,
  graphingLinearEquations,
];

export const lessonMap: Record<string, Lesson> = Object.fromEntries(
  lessons.map((l) => [l.id, l])
);

export function getLessonById(id: string): Lesson | undefined {
  return lessonMap[id];
}

export function getNextLesson(currentId: string): Lesson | undefined {
  const idx = lessons.findIndex((l) => l.id === currentId);
  if (idx === -1 || idx >= lessons.length - 1) return undefined;
  return lessons[idx + 1];
}
