import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOverallStore } from '../stores/overallStore';
import { LockedLesson } from '../components/LockedLesson';
import { GameShell } from '../components/GameShell';

const TOWER_BG = 'linear-gradient(180deg, #312e81 0%, #6d28d9 55%, #a21caf 100%)';

/**
 * Stage 3: "Algebra Tower Battler" (equations & inequalities). The self-contained
 * game lives in /public and is embedded here in a same-origin frame that fills the
 * immersive stage. A small postMessage bridge banks the hero's final power into the
 * shared overall score when the tower is conquered.
 */
export function TowerPage() {
  const navigate = useNavigate();
  const add = useOverallStore((s) => s.add);
  const overall = useOverallStore((s) => s.overall);
  const towerUnlocked = useOverallStore((s) => s.towerUnlocked);
  const gatesUnlocked = useOverallStore((s) => s.gatesUnlocked);

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const bankedRef = useRef(false); // dedup: only bank a victory once per run
  const [result, setResult] = useState<number | null>(null);

  const src = `${import.meta.env.BASE_URL}algebra-tower-battler.html`;

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return; // only our frame
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'atb:victory' && typeof data.power === 'number') {
        if (bankedRef.current) return; // guard duplicate victory messages
        bankedRef.current = true;
        add(data.power, 'tower');
        setResult(data.power);
      } else if (data.type === 'atb:reset') {
        bankedRef.current = false;
        setResult(null);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [add]);

  if (!towerUnlocked) {
    return (
      <GameShell bg={TOWER_BG} maxWidth={520}>
        <LockedLesson
          lessonLabel="Stage 3 · Equations & Inequalities"
          title="Algebra Tower is locked"
          requirement="Finish the Gate Runner (Stage 2) to unlock the Tower battle."
          ctaLabel={gatesUnlocked ? '→ Play Gate Runner' : '▶ Play Dino Runner'}
          ctaTo={gatesUnlocked ? '/gates' : '/'}
        />
      </GameShell>
    );
  }

  return (
    <GameShell bg={TOWER_BG} maxWidth={1100}>
      <div className="relative w-full">
        <iframe
          ref={frameRef}
          src={src}
          title="Algebra Tower Battler"
          className="w-full block rounded-2xl border-2 border-white/15 shadow-2xl bg-[#1b1640]"
          style={{ height: 'calc(100dvh - 5.5rem)' }}
        />

        {result !== null && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl p-6 text-center shadow-2xl max-w-sm">
              <p className="text-3xl">🏆</p>
              <p className="font-display font-extrabold text-xl mt-1">Tower conquered!</p>
              <p className="text-text-muted text-sm mt-1">
                You banked <span className="font-bold text-success">+{result.toLocaleString()}</span> hero
                power into your total (now{' '}
                <span className="font-bold text-primary">{overall.toLocaleString()}</span>).
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 bg-primary hover:bg-primary-dark text-white font-bold px-7 py-3 rounded-xl transition-colors"
              >
                Next → Back to Dino Runner
              </button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}
