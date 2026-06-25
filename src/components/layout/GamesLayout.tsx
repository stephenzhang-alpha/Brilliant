import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RANKS, useOverallStore } from '../../stores/overallStore';
import { STAGES } from '../../quest/stages';
import { Confetti } from '../score/Confetti';
import { QuestNav } from './QuestNav';

export function GamesLayout({ children }: { children: ReactNode }) {
  const justUnlockedStage = useOverallStore((s) => s.justUnlockedStage);
  const clearJustUnlocked = useOverallStore((s) => s.clearJustUnlocked);
  const justRankedUp = useOverallStore((s) => s.justRankedUp);
  const clearRankUp = useOverallStore((s) => s.clearRankUp);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Auto-dismiss the "stage unlocked!" celebration (scheduled, not a sync setState).
  useEffect(() => {
    if (justUnlockedStage === null) return;
    const t = setTimeout(() => clearJustUnlocked(), 4500);
    return () => clearTimeout(t);
  }, [justUnlockedStage, clearJustUnlocked]);

  // Auto-dismiss the rank-up celebration.
  useEffect(() => {
    if (justRankedUp === null) return;
    const t = setTimeout(() => clearRankUp(), 4200);
    return () => clearTimeout(t);
  }, [justRankedUp, clearRankUp]);

  const unlockedStage = justUnlockedStage !== null ? STAGES[justUnlockedStage] : null;

  return (
    <div className="min-h-screen flex flex-col">
      <QuestNav />

      <Confetti token={justUnlockedStage} />
      <Confetti token={justRankedUp} />

      {unlockedStage && (
        <button
          key={`stage-${justUnlockedStage}`}
          onClick={() => {
            clearJustUnlocked();
            navigate(unlockedStage.path);
          }}
          className="animate-toast fixed left-1/2 top-20 z-[60] max-w-[92vw] bg-gradient-to-r from-primary to-accent text-white font-display font-semibold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-left"
        >
          <span aria-hidden className="text-xl shrink-0">
            🎉
          </span>
          <span>
            New page unlocked: {unlockedStage.icon} {unlockedStage.label} — tap to play!
          </span>
        </button>
      )}

      {justRankedUp !== null && (
        <button
          key={`rank-${justRankedUp}`}
          onClick={() => clearRankUp()}
          className="animate-toast fixed left-1/2 bottom-6 z-[60] max-w-[92vw] flex items-center gap-3 rounded-2xl px-5 py-3 text-white shadow-2xl"
          style={{ background: `linear-gradient(90deg, ${RANKS[justRankedUp].color}, #7c3aed)` }}
        >
          <span aria-hidden className="animate-rankpop text-3xl shrink-0">
            {RANKS[justRankedUp].icon}
          </span>
          <span className="text-left">
            <span className="block font-display font-extrabold leading-tight">Rank up!</span>
            <span className="block text-sm text-white/90">
              You reached {RANKS[justRankedUp].name}
            </span>
          </span>
        </button>
      )}

      <main className="flex-1 flex flex-col">
        <div key={pathname} className="animate-fadein flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
