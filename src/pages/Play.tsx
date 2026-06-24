import { Link, useNavigate } from 'react-router-dom';
import { DinoGame } from '../components/dino/DinoGame';
import { useAuthStore } from '../stores/authStore';
import { useOverallStore } from '../stores/overallStore';
import { GameShell } from '../components/GameShell';

const SKY_BG = 'linear-gradient(180deg, #9fdcff 0%, #cfeeff 55%, #f4fbff 100%)';

export function PlayPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const addOverall = useOverallStore((s) => s.add);

  // Progression gating: practice games appear only after the prior lesson.
  //   First Dino run that ends -> unlock Gate Runner (Stage 2: Expressions)
  //   (Algebra Tower / Stage 3 unlocks when Gate Runner is finished.)
  const getDeathOffer = () => {
    const { gatesUnlocked, towerUnlocked, unlock } = useOverallStore.getState();
    if (!gatesUnlocked) {
      unlock('gates');
      return {
        label: 'Play Gate Runner →',
        note: '🎉 Stage 2 unlocked — Expressions!',
        onNext: () => navigate('/gates'),
      };
    }
    if (!towerUnlocked) {
      return {
        label: 'Practice Gate Runner →',
        note: 'Finish Gate Runner to unlock Stage 3!',
        onNext: () => navigate('/gates'),
      };
    }
    return null;
  };

  return (
    <GameShell
      bg={SKY_BG}
      maxWidth={920}
      footer={
        <div className="flex flex-col items-center gap-3">
          <div className="hidden sm:flex items-center justify-center gap-6 text-sm text-slate-700">
            <span>
              <kbd className="px-2 py-0.5 bg-white/70 rounded border border-black/10">Space</kbd> /{' '}
              <kbd className="px-2 py-0.5 bg-white/70 rounded border border-black/10">↑</kbd> Jump
            </span>
            <span>
              <kbd className="px-2 py-0.5 bg-white/70 rounded border border-black/10">↓</kbd> Duck
            </span>
          </div>
          {!user && (
            <p className="text-sm text-slate-700 bg-white/60 rounded-full px-4 py-1.5">
              <Link to="/login" className="text-violet-700 font-semibold hover:underline">
                Sign in
              </Link>{' '}
              to save scores to the global leaderboard.
            </p>
          )}
        </div>
      }
    >
      <DinoGame getDeathOffer={getDeathOffer} onRunScore={(score) => addOverall(score, 'dino')} />
    </GameShell>
  );
}
