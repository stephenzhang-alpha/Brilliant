import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BalanceGame } from '../components/balance/BalanceGame';
import { useOverallStore } from '../stores/overallStore';
import { LEADERBOARD_ENABLED } from '../config/features';

/** Soft, light gradient so the light-styled balance scale and dark text pop. */
const BALANCE_BG = 'linear-gradient(180deg, #ede9fe 0%, #f7e6ff 52%, #ffe7f3 100%)';

/**
 * Page 7 (stage index 6) — the Balance Game, and the TERMINAL page of the
 * Algebra Quest. It hosts the run of weight-balancing puzzles and, once the
 * final puzzle is solved, completes the quest (`completeStage(6)`) and swaps in
 * an "Algebra Quest complete!" celebration.
 */
export function BalancePage() {
  const completeStage = useOverallStore((s) => s.completeStage);
  const overall = useOverallStore((s) => s.overall);
  // The finale is driven by the PERSISTED quest-complete flag (not local state),
  // so it survives a reload / remount once the last puzzle is solved.
  const questComplete = useOverallStore((s) => s.questComplete);
  // After the quest is finished the persisted finale shows by default; "Play
  // again" drops back into a fresh run, and finishing it returns to the finale.
  const [replaying, setReplaying] = useState(false);

  const handleComplete = () => {
    completeStage(6);
    setReplaying(false);
  };

  return (
    <div
      className="flex-1 flex flex-col items-center px-3 py-6 sm:py-8"
      style={{ background: BALANCE_BG }}
    >
      <div className="w-full max-w-[600px]">
        {/* Hero */}
        <div className="text-center text-text">
          <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">
            Stage 7 · Balance Game
          </span>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">🎯 Balance Game</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Set <b className="font-mono">x</b> so the scale balances — assign a value to the variable
            and watch the weights change.
          </p>
        </div>

        {questComplete && !replaying ? (
          <div className="mt-6 animate-fadein">
            <div className="mx-auto max-w-sm rounded-3xl bg-surface p-7 text-center shadow-2xl ring-1 ring-primary/20 animate-pop">
              <p className="text-5xl">🏆</p>
              <p className="mt-1 font-display text-2xl font-black text-text">
                Algebra Quest complete!
              </p>
              <p className="mt-2 text-sm text-text-muted">
                You balanced every scale — even with x on both pans — and tipped the inequalities
                your way, finishing all seven stages from variables to equations. You&apos;re an{' '}
                <b className="text-primary">Algebra Legend</b> in the making!
              </p>
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-surface-light px-4 py-1.5">
                <span className="text-sm text-text-muted">Your total</span>
                <span className="font-mono text-xl font-black tabular-nums text-primary">
                  {overall.toLocaleString()}
                </span>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {LEADERBOARD_ENABLED ? (
                  <Link
                    to="/leaderboard"
                    className="btn-pop animate-pulse rounded-xl bg-primary px-7 py-3 font-display font-bold text-white"
                  >
                    See your rank on the leaderboard →
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className="btn-pop animate-pulse rounded-xl bg-primary px-7 py-3 font-display font-bold text-white"
                  >
                    Back to the start →
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setReplaying(true)}
                  className="btn-pop rounded-xl border-2 border-primary/30 bg-surface px-7 py-3 font-display font-bold text-primary"
                >
                  Play the balance game again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <BalanceGame onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}
