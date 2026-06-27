import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOverallStore } from '../stores/overallStore';

const TOWER_BG = 'linear-gradient(180deg, #312e81 0%, #6d28d9 55%, #a21caf 100%)';

/**
 * Page 4 — Pull the Pins. A self-contained canvas game embedded via <iframe>
 * that talks back over postMessage (`atb:victory {power}` once, and `atb:reset`
 * on a fresh playthrough). Clearing it banks the score, unlocks the Fireboy &
 * Watergirl finale, and surfaces a "continue" button.
 */
export function PinsPage() {
  const navigate = useNavigate();
  const addOverall = useOverallStore((s) => s.add);
  const completeStage = useOverallStore((s) => s.completeStage);
  const overall = useOverallStore((s) => s.overall);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const bankedRef = useRef(false);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frameRef.current?.contentWindow) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'atb:victory' && typeof data.power === 'number') {
        if (bankedRef.current) return;
        bankedRef.current = true;
        addOverall(data.power, 'tower');
        completeStage(4); // unlock the Equations & Inequalities page
        setResult(data.power);
      } else if (data.type === 'atb:reset') {
        bankedRef.current = false;
        setResult(null);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [addOverall, completeStage]);

  const src = `${import.meta.env.BASE_URL}algebra-tower-battler.html`;

  const playAgain = () => {
    setResult(null);
    bankedRef.current = false;
    frameRef.current?.contentWindow?.location.reload();
  };

  return (
    <div className="flex-1 flex flex-col items-center px-3 py-6 sm:py-8" style={{ background: TOWER_BG }}>
      <div className="w-full" style={{ maxWidth: 1100 }}>
        <div className="text-center text-white">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur">
            Stage 5 · Pull the Pins
          </span>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl drop-shadow">
            📌 Pull the Pins
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/85">
            Tap a pin to answer an algebra question and release it. Guide the gems 💎 down to your
            hero and trap the hazards 🔥 in the drains. Clear all three levels to unlock the next
            challenge!
          </p>
        </div>

        <div className="relative mt-5 w-full">
          <iframe
            ref={frameRef}
            src={src}
            title="Pull the Pins"
            className="w-full block rounded-2xl border-2 border-white/15 shadow-2xl bg-[#1b1640]"
            style={{ height: 'calc(100dvh - 12rem)', minHeight: 520 }}
          />

          {result !== null && (
            <div className="absolute inset-0 flex items-center justify-center px-4 animate-fadein">
              <div className="bg-white rounded-3xl p-7 text-center shadow-2xl max-w-sm">
                <p className="text-4xl">🎉</p>
                <p className="font-display font-extrabold text-2xl mt-1">Pull the Pins cleared!</p>
                <p className="text-text-muted text-sm mt-2">
                  You banked{' '}
                  <span className="font-bold text-success">+{result.toLocaleString()}</span> into your
                  total (now <span className="font-bold text-primary">{overall.toLocaleString()}</span>).
                  Two stages to go — equations &amp; inequalities next!
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    onClick={() => navigate('/scales')}
                    className="btn-pop bg-primary text-white font-display font-bold px-7 py-3 rounded-xl animate-pulse"
                  >
                    Continue to Equations &amp; Inequalities →
                  </button>
                  <button
                    onClick={playAgain}
                    className="text-text-muted hover:text-text text-sm underline"
                  >
                    ↻ Play the finale again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
