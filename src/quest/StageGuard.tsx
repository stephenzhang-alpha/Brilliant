import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useOverallStore } from '../stores/overallStore';
import { stagePath } from './stages';

/**
 * Forward-navigation gate. Renders its page only when the stage is unlocked
 * (index <= unlockedStage); otherwise it bounces the player back to the
 * furthest page they have actually earned, so deep-linking or the browser
 * "forward" button can never skip a task.
 */
export function StageGuard({ index, children }: { index: number; children: ReactNode }) {
  const unlockedStage = useOverallStore((s) => s.unlockedStage);
  if (index > unlockedStage) {
    return <Navigate to={stagePath(unlockedStage)} replace />;
  }
  return <>{children}</>;
}
