/**
 * The seven Algebra Quest pages, in order. The player walks them left-to-right;
 * `useOverallStore.unlockedStage` is the index of the furthest page they may
 * open. Backward navigation and replay are always allowed (any index <=
 * unlockedStage); forward is blocked until the current page's task is done.
 */
export interface Stage {
  /** 0-based position in the journey (also the gate the previous page unlocks). */
  index: number;
  /** HashRouter path for this page. */
  path: string;
  /** Full label (nav + toasts). */
  label: string;
  /** Compact label for the narrow step pills. */
  short: string;
  icon: string;
}

export const STAGES: Stage[] = [
  { index: 0, path: '/', label: 'Variables', short: 'Intro', icon: '🔢' },
  { index: 1, path: '/dino', label: 'Dino Run', short: 'Dino', icon: '🦖' },
  { index: 2, path: '/expressions', label: 'Expressions', short: 'Expr', icon: '🧩' },
  { index: 3, path: '/gates', label: 'Gate Runner', short: 'Gates', icon: '🚪' },
  { index: 4, path: '/pins', label: 'Pull the Pins', short: 'Pins', icon: '📌' },
  { index: 5, path: '/scales', label: 'Equations & Inequalities', short: 'Scales', icon: '⚖️' },
  { index: 6, path: '/balance', label: 'Balance Game', short: 'Balance', icon: '🎯' },
];

/** Path of a stage by index, clamped to the valid range. */
export function stagePath(index: number): string {
  const i = Math.max(0, Math.min(STAGES.length - 1, index));
  return STAGES[i].path;
}
