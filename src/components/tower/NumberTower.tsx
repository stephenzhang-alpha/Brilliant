import { useEffect, useRef, useState, useCallback } from 'react';
import { NumberTower as Engine, TowerStatus, TW, TH, TARGET_FLOORS } from '../../game/tower/engine';

interface Props {
  onFinish?: (floors: number) => void;
  onNext: () => void;
  nextLabel?: string;
}

const DROP_KEYS = new Set(['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'KeyW']);

export function NumberTower({ onFinish, onNext, nextLabel = 'Next →' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const [status, setStatus] = useState<TowerStatus>('ready');
  const [finalFloors, setFinalFloors] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.width = TW * dpr;
    canvas.height = TH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const engine = new Engine();
    engineRef.current = engine;
    engine.onComplete = (floors) => {
      setFinalFloors(floors);
      onFinish?.(floors);
    };
    engine.onOver = (floors) => setFinalFloors(floors);

    let raf = 0;
    let last = performance.now();
    let lastStatus: TowerStatus = engine.status;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      engine.update(dt);
      engine.draw(ctx);
      if (engine.status !== lastStatus) {
        lastStatus = engine.status;
        setStatus(engine.status);
      }
      if (import.meta.env.DEV) canvas.dataset.tower = JSON.stringify(engine.debugSnapshot());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const isTyping = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if (DROP_KEYS.has(e.code)) {
        e.preventDefault();
        if (!e.repeat) engine.primary();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = useCallback(() => engineRef.current?.primary(), []);
  const restart = useCallback(() => engineRef.current?.start(), []);

  return (
    <div className="w-full max-w-[430px] mx-auto">
      <div
        className="relative w-full select-none rounded-2xl overflow-hidden shadow-2xl border border-black/10"
        style={{ aspectRatio: `${TW} / ${TH}`, touchAction: 'none' }}
        onPointerDown={(e) => {
          // Let the overlay buttons handle their own clicks.
          if ((e.target as HTMLElement).tagName === 'BUTTON') return;
          tap();
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {status === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none px-6 text-center">
            <div className="bg-black/55 backdrop-blur-sm rounded-2xl px-6 py-5">
              <p className="text-white font-extrabold text-2xl">Number Tower</p>
              <p className="text-white/85 mt-2">
                Tap to drop each block — stack neatly and build up to floor {TARGET_FLOORS}!
              </p>
              <p className="text-white/70 text-sm mt-3">Space / tap to drop</p>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="bg-white rounded-2xl px-8 py-6 text-center shadow-2xl">
              <p className="text-3xl">🧱</p>
              <p className="text-text font-bold mt-2">Tower toppled!</p>
              <p className="text-text-muted text-sm mt-1">
                You reached floor <span className="font-bold text-text">{finalFloors}</span> of {TARGET_FLOORS}
              </p>
              <button
                onClick={restart}
                className="mt-5 w-full bg-primary hover:bg-primary-dark text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {status === 'complete' && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="bg-white rounded-2xl px-8 py-6 text-center shadow-2xl">
              <p className="text-3xl">🎉</p>
              <p className="tracking-[0.25em] text-text-muted text-xs font-bold mt-1">TOWER COMPLETE</p>
              <p className="text-text text-sm mt-2">You reached</p>
              <p className="text-primary text-5xl font-extrabold tabular-nums leading-none mt-1">
                Floor {finalFloors}
              </p>
              <button
                onClick={onNext}
                className="mt-5 w-full bg-primary hover:bg-primary-dark text-white font-bold px-6 py-3 rounded-xl transition-colors"
              >
                {nextLabel}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drop control */}
      <button
        className="mt-4 w-full bg-surface border border-black/10 rounded-2xl py-5 text-xl font-extrabold shadow-sm active:bg-surface-light disabled:opacity-50"
        disabled={status === 'complete'}
        onPointerDown={(e) => {
          e.preventDefault();
          tap();
        }}
      >
        {status === 'running' ? 'DROP' : status === 'over' ? 'Try again' : 'Start'}
      </button>
    </div>
  );
}
