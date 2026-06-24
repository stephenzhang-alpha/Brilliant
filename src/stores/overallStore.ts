import { create } from 'zustand';

/**
 * The single "overall score" + progression that ties the three mini-games into
 * one learning journey. Every game contributes points to the same running
 * total, and practice games unlock only after the prior lesson is completed:
 *   - Dino Runner (variables)            -> always available; intro game
 *   - Gate Runner (expressions)          -> unlocks after a first Dino run ends
 *   - Algebra Tower (equations/inequalities) -> unlocks after finishing Gate Runner
 * Persisted to localStorage so the total + unlocks carry across sessions.
 */

const KEY = 'algebra_overall_score';

export type ScoreSource = 'dino' | 'gates' | 'tower';

interface Persisted {
  overall: number;
  contributions: Record<ScoreSource, number>;
  gatesUnlocked: boolean;
  towerUnlocked: boolean;
}

interface OverallState extends Persisted {
  lastGain: { source: ScoreSource; points: number; at: number } | null;
  /** A transient "Lesson X unlocked!" banner the UI can celebrate, then clear. */
  justUnlocked: 'gates' | 'tower' | null;
  add: (points: number, source: ScoreSource) => void;
  unlock: (game: 'gates' | 'tower') => void;
  clearJustUnlocked: () => void;
  reset: () => void;
}

const EMPTY: Persisted = {
  overall: 0,
  contributions: { dino: 0, gates: 0, tower: 0 },
  gatesUnlocked: false,
  towerUnlocked: false,
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      overall: typeof p.overall === 'number' ? p.overall : 0,
      contributions: {
        dino: p.contributions?.dino ?? 0,
        gates: p.contributions?.gates ?? 0,
        tower: p.contributions?.tower ?? 0,
      },
      gatesUnlocked: !!p.gatesUnlocked,
      towerUnlocked: !!p.towerUnlocked,
    };
  } catch {
    return EMPTY;
  }
}

function save(p: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // best-effort persistence
  }
}

const initial = load();

export const useOverallStore = create<OverallState>((set, get) => ({
  overall: initial.overall,
  contributions: initial.contributions,
  gatesUnlocked: initial.gatesUnlocked,
  towerUnlocked: initial.towerUnlocked,
  lastGain: null,
  justUnlocked: null,

  add: (points, source) => {
    const pts = Math.max(0, Math.round(points));
    if (pts <= 0) return;
    set((s) => {
      const contributions = { ...s.contributions, [source]: s.contributions[source] + pts };
      const next: Persisted = {
        overall: s.overall + pts,
        contributions,
        gatesUnlocked: s.gatesUnlocked,
        towerUnlocked: s.towerUnlocked,
      };
      save(next);
      return { ...next, lastGain: { source, points: pts, at: Date.now() } };
    });
  },

  unlock: (game) => {
    const s = get();
    if (game === 'gates' && s.gatesUnlocked) return;
    if (game === 'tower' && s.towerUnlocked) return;
    const next: Persisted = {
      overall: s.overall,
      contributions: s.contributions,
      gatesUnlocked: s.gatesUnlocked || game === 'gates',
      towerUnlocked: s.towerUnlocked || game === 'tower',
    };
    save(next);
    set({ ...next, justUnlocked: game });
  },

  clearJustUnlocked: () => set({ justUnlocked: null }),

  reset: () => {
    save(EMPTY);
    set({ ...EMPTY, lastGain: null, justUnlocked: null });
  },
}));
