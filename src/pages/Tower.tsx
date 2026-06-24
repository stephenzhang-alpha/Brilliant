import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOverallStore } from '../stores/overallStore';
import { LockedLesson } from '../components/LockedLesson';

/**
 * The third game in the journey: "Algebra Tower Battler" (equations &
 * inequalities). The verified game lives as a self-contained file in /public
 * and is embedded here in a same-origin frame. A small postMessage bridge
 * reports its rendered height (for seamless sizing) and the final hero power
 * when the Dragon is defeated, which we add to the shared overall score.
 */
export function TowerPage() {
  const navigate = useNavigate();
  const add = useOverallStore((s) => s.add);
  const overall = useOverallStore((s) => s.overall);
  const towerUnlocked = useOverallStore((s) => s.towerUnlocked);
  const gatesUnlocked = useOverallStore((s) => s.gatesUnlocked);

  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const src = `${import.meta.env.BASE_URL}algebra-tower-battler.html`;

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return; // only our frame
      const data = e.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'atb:height' && typeof data.height === 'number' && frameRef.current) {
        frameRef.current.style.height = `${Math.max(560, data.height + 6)}px`;
      } else if (data.type === 'atb:victory' && typeof data.power === 'number') {
        // Defeating the Dragon contributes the hero's final power to the total.
        add(data.power, 'tower');
        setResult(data.power);
      } else if (data.type === 'atb:reset') {
        setResult(null);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [add]);

  if (!towerUnlocked) {
    return (
      <LockedLesson
        lessonLabel="Stage 3 · Equations & Inequalities"
        title="Algebra Tower is locked"
        requirement="Finish the Gate Runner (Stage 2) to unlock the Tower battle."
        ctaLabel={gatesUnlocked ? '→ Play Gate Runner' : '▶ Play Dino Runner'}
        ctaTo={gatesUnlocked ? '/gates' : '/'}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
      <div className="text-center mb-5">
        <p className="text-xs font-bold tracking-[0.25em] text-text-muted uppercase">
          Stage 3 · Equations &amp; Inequalities
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
          Algebra <span className="text-primary">Tower Battler</span>
        </h1>
        <p className="text-text-muted mt-2 max-w-xl mx-auto">
          Solve gate equations, evaluate enemy expressions, and win each battle by proving an
          inequality. Beat the Dragon to bank your hero power into your total score.
        </p>
      </div>

      {result !== null && (
        <div className="mb-5 bg-success/10 border border-success/40 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-2xl">🏆</p>
          <p className="font-bold text-lg mt-1">Tower conquered!</p>
          <p className="text-text-muted text-sm mt-1">
            You banked <span className="font-bold text-success">+{result.toLocaleString()}</span> hero
            power into your total score (now{' '}
            <span className="font-bold text-primary">{overall.toLocaleString()}</span>).
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-primary hover:bg-primary-dark text-white font-bold px-7 py-3 rounded-xl transition-colors"
          >
            Next → Back to Dino Runner
          </button>
        </div>
      )}

      <iframe
        ref={frameRef}
        src={src}
        title="Algebra Tower Battler"
        className="w-full rounded-2xl border-2 border-primary/15 shadow-2xl bg-surface-light"
        style={{ height: 860 }}
      />
    </div>
  );
}
