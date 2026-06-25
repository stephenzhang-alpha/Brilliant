import { useNavigate } from 'react-router-dom';
import { DinoGame, type DeathOffer } from '../components/dino/DinoGame';
import { useOverallStore } from '../stores/overallStore';

const SKY_BG = 'linear-gradient(180deg, #9fdcff 0%, #cfeeff 55%, #f4fbff 100%)';

/**
 * Page 1 — the Dino run. Starts at will like the classic game; every 1000
 * points pops a variables reinforcement question (handled inside DinoGame).
 * Finishing a run (dying) banks the score and unlocks the Expressions page,
 * surfacing a "continue" button on the game-over card.
 */
export function DinoPage() {
  const navigate = useNavigate();
  const addOverall = useOverallStore((s) => s.add);
  const completeStage = useOverallStore((s) => s.completeStage);

  // Called on every death: a finished run opens the next page (idempotent).
  const getDeathOffer = (): DeathOffer => {
    completeStage(1);
    return {
      label: 'Continue to Expressions →',
      note: '🎉 Nice run! Expressions is unlocked.',
      onNext: () => navigate('/expressions'),
    };
  };

  return (
    <div className="flex-1 flex flex-col items-center px-3 py-6 sm:py-8" style={{ background: SKY_BG }}>
      <div className="w-full" style={{ maxWidth: 920 }}>
        <div className="text-center text-slate-800">
          <span className="inline-block rounded-full bg-slate-900/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-700">
            Stage 2 · Dino Run
          </span>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">🦖 Dino Run</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-700 sm:text-base">
            Press <b>Space</b> or tap to start. Jump the cacti and duck the birds. Every{' '}
            <b>1,000 points</b> the run pauses for a quick variables check — answer it to keep going.
            When you finally crash, you&apos;ll move on to Expressions.
          </p>
        </div>

        <div className="mt-5">
          <DinoGame onRunScore={(s) => addOverall(s, 'dino')} getDeathOffer={getDeathOffer} />
        </div>
      </div>
    </div>
  );
}
