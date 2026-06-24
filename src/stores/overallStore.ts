import { create } from 'zustand';

/**
 * The single "overall score" + progression that ties the three mini-games into
 * one learning journey. Every game contributes points to the same running
 * total, and practice games unlock only after the prior lesson is completed:
 *   - Dino Runner (variables)            -> always available; intro game
 *   - Gate Runner (expressions)          -> unlocks after a first Dino run ends
 *   - Algebra Tower (equations/inequalities) -> unlocks after finishing Gate Runner
 *
 * Layered on top of the raw total is a five-tier RANK ladder (Rookie ->
 * Algebra Legend). Crossing into a new rank fires a one-shot celebration that
 * the UI can pick up via `justRankedUp`.
 *
 * Persisted to localStorage so the total + unlocks + best rank carry across
 * sessions.
 */

const KEY = 'algebra_overall_score';

export type ScoreSource = 'dino' | 'gates' | 'tower';

export interface Rank {
  name: string;
  /** Inclusive minimum overall score required to hold this rank. */
  min: number;
  icon: string;
  /** Accent color (hex) used for chips, glows, and progress fills. */
  color: string;
}

/**
 * The five-tier progression ladder, ordered lowest -> highest. Thresholds are
 * tuned to the games' payouts (Dino ~hundreds/run, Gate Runner a few hundred,
 * Tower tens-to-hundreds): the first promotion lands after a run or two, then
 * each tier roughly doubles to keep the climb meaningful.
 */
export const RANKS: Rank[] = [
  { name: 'Rookie', min: 0, icon: '🌱', color: '#22c55e' },
  { name: 'Apprentice', min: 500, icon: '⚡', color: '#06b6d4' },
  { name: 'Pro', min: 2000, icon: '🔥', color: '#f59e0b' },
  { name: 'Master', min: 5000, icon: '👑', color: '#ec4899' },
  { name: 'Algebra Legend', min: 12000, icon: '🏆', color: '#7c3aed' },
];

/** Index (into RANKS) of the rank held at a given overall score. */
export function rankIndexFor(overall: number): number {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (overall >= RANKS[i].min) idx = i;
    else break;
  }
  return idx;
}

export interface RankInfo {
  index: number;
  rank: Rank;
  /** The next rank up, or null when already at the top. */
  next: Rank | null;
  /** Score at which the current rank begins. */
  floor: number;
  /** Score at which the next rank begins (== floor at max rank). */
  ceil: number;
  /** Points earned inside the current tier. */
  into: number;
  /** Width of the current tier in points (0 at max rank). */
  span: number;
  /** Points still needed to reach the next rank (0 at max rank). */
  toNext: number;
  /** Progress through the current tier, 0..1 (1 at max rank). */
  progress: number;
  isMax: boolean;
}

/** Everything the HUD needs to render the rank + progress-to-next for a score. */
export function rankInfo(overall: number): RankInfo {
  const index = rankIndexFor(overall);
  const rank = RANKS[index];
  const next = index < RANKS.length - 1 ? RANKS[index + 1] : null;
  const floor = rank.min;
  const ceil = next ? next.min : rank.min;
  const span = next ? ceil - floor : 0;
  const into = overall - floor;
  const toNext = next ? Math.max(0, ceil - overall) : 0;
  const progress = next && span > 0 ? Math.min(1, Math.max(0, into / span)) : 1;
  return { index, rank, next, floor, ceil, into, span, toNext, progress, isMax: !next };
}

interface Persisted {
  overall: number;
  contributions: Record<ScoreSource, number>;
  gatesUnlocked: boolean;
  towerUnlocked: boolean;
  /** Highest rank index ever reached, so promotions only celebrate once. */
  bestRank: number;
}

interface OverallState extends Persisted {
  lastGain: { source: ScoreSource; points: number; at: number } | null;
  /** A transient "Lesson X unlocked!" banner the UI can celebrate, then clear. */
  justUnlocked: 'gates' | 'tower' | null;
  /** Transient rank index the player JUST climbed into (for confetti), or null. */
  justRankedUp: number | null;
  /** Points earned since this tab loaded (not persisted) — drives a session tally. */
  sessionGain: number;
  add: (points: number, source: ScoreSource) => void;
  unlock: (game: 'gates' | 'tower') => void;
  clearJustUnlocked: () => void;
  clearRankUp: () => void;
  reset: () => void;
}

const EMPTY: Persisted = {
  overall: 0,
  contributions: { dino: 0, gates: 0, tower: 0 },
  gatesUnlocked: false,
  towerUnlocked: false,
  bestRank: 0,
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<Persisted>;
    const overall = typeof p.overall === 'number' ? p.overall : 0;
    return {
      overall,
      contributions: {
        dino: p.contributions?.dino ?? 0,
        gates: p.contributions?.gates ?? 0,
        tower: p.contributions?.tower ?? 0,
      },
      gatesUnlocked: !!p.gatesUnlocked,
      towerUnlocked: !!p.towerUnlocked,
      // Saves predating ranks have no bestRank — seed it from the current score
      // so we never replay promotions the player already earned.
      bestRank: Math.max(typeof p.bestRank === 'number' ? p.bestRank : 0, rankIndexFor(overall)),
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
  bestRank: initial.bestRank,
  lastGain: null,
  justUnlocked: null,
  justRankedUp: null,
  sessionGain: 0,

  add: (points, source) => {
    const pts = Math.max(0, Math.round(points));
    if (pts <= 0) return;
    set((s) => {
      const overall = s.overall + pts;
      const contributions = { ...s.contributions, [source]: s.contributions[source] + pts };
      const reached = rankIndexFor(overall);
      const rankedUp = reached > s.bestRank;
      const next: Persisted = {
        overall,
        contributions,
        gatesUnlocked: s.gatesUnlocked,
        towerUnlocked: s.towerUnlocked,
        bestRank: Math.max(s.bestRank, reached),
      };
      save(next);
      return {
        ...next,
        lastGain: { source, points: pts, at: Date.now() },
        sessionGain: s.sessionGain + pts,
        // Keep any pending promotion if this gain didn't trigger a new one.
        justRankedUp: rankedUp ? reached : s.justRankedUp,
      };
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
      bestRank: s.bestRank,
    };
    save(next);
    set({ ...next, justUnlocked: game });
  },

  clearJustUnlocked: () => set({ justUnlocked: null }),
  clearRankUp: () => set({ justRankedUp: null }),

  reset: () => {
    save(EMPTY);
    set({ ...EMPTY, lastGain: null, justUnlocked: null, justRankedUp: null, sessionGain: 0 });
  },
}));
