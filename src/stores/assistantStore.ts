import { create } from 'zustand';

/**
 * Tracks whether Pip is currently "away" from her logo seat — i.e. a
 * `MagicAssistant` is mounted, helping at a missed question. The nav logo reads
 * this to show an empty sparkle seat while she's down at the problem, so she
 * reads as having flown down from the logo. A counter (not a bool) avoids
 * flicker if the assistant briefly remounts for a different wrong pick.
 */
interface AssistantState {
  activeCount: number;
  enter: () => void;
  leave: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  activeCount: 0,
  enter: () => set((s) => ({ activeCount: s.activeCount + 1 })),
  leave: () => set((s) => ({ activeCount: Math.max(0, s.activeCount - 1) })),
}));
