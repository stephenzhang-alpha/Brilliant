import { useNavigate } from 'react-router-dom';
import { GateRunner } from '../components/gates/GateRunner';
import { useOverallStore } from '../stores/overallStore';

const GATE_BG = 'linear-gradient(180deg, #7dd3fc 0%, #a78bfa 50%, #f0abfc 100%)';

/**
 * Page 3 — Gate Runner. A long, brutal gauntlet: enemies are unavoidable (both
 * lanes bite) and the final boss is sized to wipe a weak crowd. Surviving the
 * boss with crowd > 0 banks the score, unlocks the finale, and surfaces a
 * "continue" button; getting wiped to 0 keeps you here to try again.
 */
export function GatesPage() {
  const navigate = useNavigate();
  const addOverall = useOverallStore((s) => s.add);
  const completeStage = useOverallStore((s) => s.completeStage);

  return (
    <div className="flex-1 flex flex-col items-center px-3 py-6 sm:py-8" style={{ background: GATE_BG }}>
      <div className="w-full max-w-[460px]">
        <div className="text-center text-white">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur">
            Stage 4 · Gate Runner
          </span>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl drop-shadow">
            🚪 Gate Runner
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/90">
            Build the biggest <b>ax + b</b> you can — the monsters are unavoidable, so pick the
            smaller hit and keep growing. Evaluate your expression, then survive the boss to reach the
            finale.
          </p>
        </div>

        <div className="mt-5">
          <GateRunner
            onWin={(count) => {
              addOverall(count, 'gates');
              completeStage(3);
            }}
            onAdvance={() => navigate('/pins')}
          />
        </div>
      </div>
    </div>
  );
}
