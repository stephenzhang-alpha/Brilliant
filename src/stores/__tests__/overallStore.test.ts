import { describe, it, expect } from 'vitest';
import {
  coercePersisted,
  mergeProgress,
  rankInfo,
  RANKS,
  STAGE_COUNT,
  type Persisted,
} from '../overallStore';

describe('rankInfo', () => {
  it('starts at Rookie with progress toward the next rank', () => {
    const r = rankInfo(0);
    expect(r.rank.name).toBe('Rookie');
    expect(r.isMax).toBe(false);
    expect(r.toNext).toBe(RANKS[1].min);
    expect(r.progress).toBeCloseTo(0);
  });

  it('promotes at each threshold (inclusive minimum)', () => {
    expect(rankInfo(249).rank.name).toBe('Rookie');
    expect(rankInfo(250).rank.name).toBe('Apprentice');
    expect(rankInfo(749).rank.name).toBe('Apprentice');
    expect(rankInfo(750).rank.name).toBe('Pro');
  });

  it('caps at the top rank with no next', () => {
    const r = rankInfo(99999);
    expect(r.rank.name).toBe('Algebra Legend');
    expect(r.isMax).toBe(true);
    expect(r.next).toBeNull();
    expect(r.toNext).toBe(0);
    expect(r.progress).toBe(1);
  });
});

describe('coercePersisted (save migration)', () => {
  it('returns a zeroed save for empty/invalid input', () => {
    const p = coercePersisted(undefined);
    expect(p.overall).toBe(0);
    expect(p.unlockedStage).toBe(0);
    expect(p.questComplete).toBe(false);
    expect(p.version).toBe(4);
  });

  it('recomputes overall as the sum of the three bests', () => {
    const p = coercePersisted({ bests: { dino: 100, gates: 50, tower: 10 } });
    expect(p.overall).toBe(160);
    expect(p.contributions).toEqual({ dino: 100, gates: 50, tower: 10 });
  });

  it('seeds bests from a legacy v1 contributions map when bests is absent', () => {
    const p = coercePersisted({ contributions: { dino: 5, gates: 0, tower: 0 } });
    expect(p.bests.dino).toBe(5);
    expect(p.overall).toBe(5);
  });

  it('migrates legacy unlock booleans to a stage index', () => {
    expect(coercePersisted({ gatesUnlocked: true }).unlockedStage).toBe(3);
    expect(coercePersisted({ towerUnlocked: true }).unlockedStage).toBe(4);
  });

  it('clamps an out-of-range unlockedStage into the valid window', () => {
    expect(coercePersisted({ unlockedStage: 99 }).unlockedStage).toBe(STAGE_COUNT - 1);
    expect(coercePersisted({ unlockedStage: -5 }).unlockedStage).toBe(0);
  });

  it('preserves an explicit questComplete flag', () => {
    expect(coercePersisted({ questComplete: true }).questComplete).toBe(true);
    expect(coercePersisted({}).questComplete).toBe(false);
  });

  it('ignores negative / non-finite scores', () => {
    const p = coercePersisted({ bests: { dino: -10, gates: NaN, tower: 7 } });
    expect(p.bests).toEqual({ dino: 0, gates: 0, tower: 7 });
    expect(p.overall).toBe(7);
  });
});

describe('mergeProgress (cross-device merge)', () => {
  /** Build a normalized Persisted (bestRank already at/above its floor). */
  function mk(over: {
    bests?: Partial<Record<'dino' | 'gates' | 'tower', number>>;
    unlockedStage?: number;
    bestRank?: number;
    questComplete?: boolean;
  }): Persisted {
    const bests = { dino: 0, gates: 0, tower: 0, ...(over.bests ?? {}) };
    const overall = bests.dino + bests.gates + bests.tower;
    return {
      version: 4,
      overall,
      bests,
      contributions: { ...bests },
      unlockedStage: over.unlockedStage ?? 0,
      bestRank: over.bestRank ?? 0,
      questComplete: over.questComplete ?? false,
    };
  }

  it('is commutative', () => {
    const a = mk({ bests: { dino: 100, tower: 5 }, unlockedStage: 3, questComplete: false });
    const b = mk({ bests: { gates: 200 }, unlockedStage: 1, questComplete: true });
    expect(mergeProgress(a, b)).toEqual(mergeProgress(b, a));
  });

  it('is idempotent on a normalized save', () => {
    const a = mk({ bests: { dino: 100, gates: 50 }, unlockedStage: 2 });
    expect(mergeProgress(a, a)).toEqual(a);
  });

  it('takes field-wise max / OR and recomputes overall', () => {
    const a = mk({ bests: { dino: 100, gates: 0, tower: 5 }, unlockedStage: 4, questComplete: false });
    const b = mk({ bests: { dino: 80, gates: 90, tower: 5 }, unlockedStage: 2, questComplete: true });
    const m = mergeProgress(a, b);
    expect(m.bests).toEqual({ dino: 100, gates: 90, tower: 5 });
    expect(m.overall).toBe(195);
    expect(m.unlockedStage).toBe(4); // furthest wins
    expect(m.questComplete).toBe(true); // OR
    expect(m.contributions).toEqual(m.bests); // mirror invariant
  });

  it('never lets bestRank fall below the rank the merged overall earns', () => {
    const a = mk({ bests: { dino: 800 }, bestRank: 0 }); // 800 -> Pro
    const m = mergeProgress(a, a);
    expect(m.bestRank).toBe(rankInfo(800).index);
    expect(m.bestRank).toBeGreaterThanOrEqual(2);
  });

  it('survives garbage remote data via coercePersisted', () => {
    const local = mk({ bests: { dino: 120 }, unlockedStage: 3, questComplete: true });
    const remote = coercePersisted({
      bests: { dino: 'oops', gates: -5, tower: NaN },
      unlockedStage: 999,
    });
    const m = mergeProgress(local, remote);
    expect(m.bests.dino).toBe(120); // local wins over garbage
    expect(m.unlockedStage).toBe(STAGE_COUNT - 1); // remote 999 clamped to 6, then wins
    expect(m.questComplete).toBe(true);
  });
});
