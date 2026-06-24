import { create } from 'zustand';

/**
 * The single "overall score" + progression that ties the three mini-games into
 * one learning journey.
 *
 * OVERALL = SUM OF PERSONAL BESTS. Each game tracks the player's best single run
 * (their record), and the overall score is simply the sum of those three bests:
 *
 *     overall = best.dino + best.gates + best.tower
 *
 * Replaying a game only moves the needle when you beat your own record, so the
 * total is a clean, monotonic non-decreasing "show me your three best runs"
 * number rather than an ever-growing grind tally. Each game still calls
 * `add(runScore, source)` once per finished run; the store decides whether that
 * run set a new best and, if so, by how much the overall rose.
 *
 *   - Dino Runner (variables)                  -> always available; intro game
 *   - Gate Runner (expressions)                -> unlocks after a first Dino run ends
 *   - Pull the Pin / 'tower' (variables/expr)  -> unlocks after finishing Gate Runner
 *
 * Layered on top of the total is a five-tier RANK ladder (Rookie -> Algebra
 * Legend), tuned to the bounded sum-of-bests range. Crossing into a new rank
 * fires a one-shot celebration the UI can pick up via `justRankedUp`.
 *
 * Persisted to localStorage (versioned + migrated) so the per-game bests, the
 * unlocks, and the best rank carry across sessions.
 */

const KEY = 'algebra_overall_score';
/** Persisted-schema version. Bump + migrate in `load` — never silently wipe saves. */
const STORAGE_VERSION = 2;

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
 * The five-tier progression ladder, ordered lowest -> highest.
 *
 * Thresholds are tuned to the *sum of personal bests*, which is bounded (one
 * great run per game) rather than the old unbounded grind total. A single
 * strong game pays a few hundred points, so the first promotion lands after a
 * run or two, each tier roughly doubles, and "Algebra Legend" requires a great
 * run in all three games — aspirational but reachable.
 */
export const RANKS: Rank[] = [
  { name: 'Rookie', min: 0, icon: '🌱', color: '#22c55e' },
  { name: 'Apprentice', min: 250, icon: '⚡', color: '#06b6d4' },
  { name: 'Pro', min: 750, icon: '🔥', color: '#f59e0b' },
  { name: 'Master', min: 1500, icon: '👑', color: '#ec4899' },
  { name: 'Algebra Legend', min: 3000, icon: '🏆', color: '#7c3aed' },
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
  /** Schema version of this saved blob (for migrations). */
  version: number;
  overall: number;
  /** Per-game personal best (max single-run score) — the source of truth. */
  bests: Record<ScoreSource, number>;
  /**
   * Per-game value the HUD breakdown reads. Mirrors `bests` exactly; kept as a
   * named field for backward compatibility with older saves and existing UI.
   */
  contributions: Record<ScoreSource, number>;
  gatesUnlocked: boolean;
  towerUnlocked: boolean;
  /** Highest rank index ever reached, so promotions only celebrate once. */
  bestRank: number;
}

interface OverallState extends Persisted {
  /**
   * The most recent run submitted via `add`. `points` is the *increase in
   * overall* it produced (0 when the run didn't beat that game's best), so the
   * HUD can show a "+N / new best!" float-up or a subtle "no new best" note.
   */
  lastGain: {
    source: ScoreSource;
    /** Increase in overall from this run (newOverall - oldOverall); 0 if no new best. */
    points: number;
    at: number;
    /** True when this run set a new personal best for its game (points > 0). */
    isBest: boolean;
    /** The raw run score that was submitted. */
    runScore: number;
  } | null;
  /** A transient "Lesson X unlocked!" banner the UI can celebrate, then clear. */
  justUnlocked: 'gates' | 'tower' | null;
  /** Transient rank index the player JUST climbed into (for confetti), or null. */
  justRankedUp: number | null;
  /** Total overall increase since this tab loaded (not persisted) — a session tally. */
  sessionGain: number;
  add: (points: number, source: ScoreSource) => void;
  unlock: (game: 'gates' | 'tower') => void;
  clearJustUnlocked: () => void;
  clearRankUp: () => void;
  reset: () => void;
}

/** A fresh zeroed save (new nested objects each call — never share references). */
function emptyPersisted(): Persisted {
  return {
    version: STORAGE_VERSION,
    overall: 0,
    bests: { dino: 0, gates: 0, tower: 0 },
    contributions: { dino: 0, gates: 0, tower: 0 },
    gatesUnlocked: false,
    towerUnlocked: false,
    bestRank: 0,
  };
}

/** Coerce arbitrary persisted JSON into a finite, non-negative score. */
function safeScore(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyPersisted();
    const p = JSON.parse(raw) as Partial<Persisted> & {
      bests?: Partial<Record<ScoreSource, number>>;
      contributions?: Partial<Record<ScoreSource, number>>;
    };

    // Seed the per-game bests from `bests` (v2+) when present, else fall back to
    // the legacy `contributions` map (v1 stored accumulated totals there — the
    // best available seed), else 0. v1 saves satisfy overall == sum(contributions),
    // so recomputing overall from these seeds preserves the player's number
    // across the upgrade rather than dropping it.
    const seed: Partial<Record<ScoreSource, number>> = p.bests ?? p.contributions ?? {};
    const bests: Record<ScoreSource, number> = {
      dino: safeScore(seed.dino),
      gates: safeScore(seed.gates),
      tower: safeScore(seed.tower),
    };
    const overall = bests.dino + bests.gates + bests.tower;

    return {
      version: STORAGE_VERSION,
      overall,
      bests,
      contributions: { ...bests },
      gatesUnlocked: !!p.gatesUnlocked,
      towerUnlocked: !!p.towerUnlocked,
      // Seed bestRank from the (recomputed) overall so we never replay a promotion
      // the player already earned — and, after the re-tuned thresholds, never
      // demote them below the rank their score now qualifies for.
      bestRank: Math.max(typeof p.bestRank === 'number' ? p.bestRank : 0, rankIndexFor(overall)),
    };
  } catch {
    return emptyPersisted();
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
  version: initial.version,
  overall: initial.overall,
  bests: initial.bests,
  contributions: initial.contributions,
  gatesUnlocked: initial.gatesUnlocked,
  towerUnlocked: initial.towerUnlocked,
  bestRank: initial.bestRank,
  lastGain: null,
  justUnlocked: null,
  justRankedUp: null,
  sessionGain: 0,

  // Submit a finished run's score for `source`. Keeps only the best (max) per
  // game and recomputes overall = sum of the three bests, so a run that doesn't
  // beat your record leaves the total untouched (a "no new best"). `lastGain`
  // carries the resulting overall increase (0 when no record fell).
  add: (points, source) => {
    const runScore = Math.max(0, Math.round(points));
    set((s) => {
      const newBest = Math.max(s.bests[source] ?? 0, runScore);
      const bests = { ...s.bests, [source]: newBest };
      const overall = bests.dino + bests.gates + bests.tower;
      const delta = overall - s.overall; // >= 0: overall is monotonic non-decreasing
      const isBest = delta > 0;
      const reached = rankIndexFor(overall);
      const rankedUp = reached > s.bestRank;
      const next: Persisted = {
        version: STORAGE_VERSION,
        overall,
        bests,
        contributions: { ...bests },
        gatesUnlocked: s.gatesUnlocked,
        towerUnlocked: s.towerUnlocked,
        bestRank: Math.max(s.bestRank, reached),
      };
      save(next);
      return {
        ...next,
        lastGain: { source, points: delta, at: Date.now(), isBest, runScore },
        sessionGain: s.sessionGain + delta,
        // Keep any pending promotion if this run didn't trigger a new one.
        justRankedUp: rankedUp ? reached : s.justRankedUp,
      };
    });
  },

  unlock: (game) => {
    const s = get();
    if (game === 'gates' && s.gatesUnlocked) return;
    if (game === 'tower' && s.towerUnlocked) return;
    const next: Persisted = {
      version: STORAGE_VERSION,
      overall: s.overall,
      bests: s.bests,
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
    const empty = emptyPersisted();
    save(empty);
    set({ ...empty, lastGain: null, justUnlocked: null, justRankedUp: null, sessionGain: 0 });
  },
}));
