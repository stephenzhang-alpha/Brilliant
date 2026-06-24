import { useEffect, useRef, useState, useCallback } from 'react';
import { GateRunner as Engine, GateStatus, GW, GH } from '../../game/gates/engine';

interface Props {
  /** Called once when the player crosses the finish line. */
  onFinish?: (count: number) => void;
  /** Action for the "Next" button on the completion screen. */
  onNext: () => void;
  nextLabel?: string;
}

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const START_KEYS = new Set(['Space', 'Enter', 'ArrowUp', 'KeyW']);

export function GateRunner({ onFinish, onNext, nextLabel = 'Next →' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const [status, setStatus] = useState<GateStatus>('ready');
  const [finalCount, setFinalCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.width = GW * dpr;
    canvas.height = GH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const engine = new Engine();
    engineRef.current = engine;
    engine.onComplete = (count) => {
      setFinalCount(count);
      onFinish?.(count);
    };

    let raf = 0;
    let last = performance.now();
    let lastStatus: GateStatus = engine.status;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      engine.update(dt);
      engine.draw(ctx);
      if (engine.status !== lastStatus) {
        lastStatus = engine.status;
        setStatus(engine.status);
      }
      if (import.meta.env.DEV) {
        canvas.dataset.gates = JSON.stringify(engine.debugSnapshot());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const isTyping = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;
      if (LEFT_KEYS.has(e.code)) {
        e.preventDefault();
        engine.primary();
        engine.setMove('left', true);
      } else if (RIGHT_KEYS.has(e.code)) {
        e.preventDefault();
        engine.primary();
        engine.setMove('right', true);
      } else if (START_KEYS.has(e.code)) {
        e.preventDefault();
        engine.primary();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (LEFT_KEYS.has(e.code)) engine.setMove('left', false);
      else if (RIGHT_KEYS.has(e.code)) engine.setMove('right', false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const worldXFromEvent = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * GW;
  };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.primary();
    e.currentTarget.setPointerCapture(e.pointerId);
    engine.setPointerX(worldXFromEvent(e));
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const engine = engineRef.current;
    if (!engine || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    engine.setPointerX(worldXFromEvent(e));
  }, []);
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    engineRef.current?.setPointerX(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return (
    <div className="w-full max-w-[430px] mx-auto">
      <div
        className="relative w-full select-none rounded-2xl overflow-hidden shadow-2xl border border-black/10"
        style={{ aspectRatio: `${GW} / ${GH}`, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {status === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none px-6 text-center">
            <div className="bg-black/55 backdrop-blur-sm rounded-2xl px-6 py-5">
              <p className="text-white font-extrabold text-2xl">Gate Runner</p>
              <p className="text-white/85 mt-2">
                You start as the variable <b>x</b>. Pick an <b>assignment gate</b> to give x a value,
                grow it through <b>+</b> and <b>×</b> gates, dodge the <b>red enemies</b> that subtract,
                then beat the <b>boss</b> at the end!
              </p>
              <p className="text-white/70 text-sm mt-3">Drag, or use ← → · Tap to start</p>
            </div>
          </div>
        )}

        {status === 'complete' && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="bg-white rounded-2xl px-8 py-6 text-center shadow-2xl">
              <p className="text-3xl">🎉</p>
              <p className="tracking-[0.25em] text-text-muted text-xs font-bold mt-1">FINISH</p>
              <p className="text-text text-sm mt-2">Your crowd</p>
              <p className="text-primary text-5xl font-extrabold tabular-nums leading-none mt-1">
                {finalCount.toLocaleString()}
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

      {/* Steering controls */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          aria-label="Move left"
          className="bg-surface border border-black/10 rounded-2xl py-5 text-2xl font-bold shadow-sm active:bg-surface-light"
          onPointerDown={(e) => {
            e.preventDefault();
            engineRef.current?.primary();
            engineRef.current?.setMove('left', true);
          }}
          onPointerUp={() => engineRef.current?.setMove('left', false)}
          onPointerLeave={() => engineRef.current?.setMove('left', false)}
        >
          ←
        </button>
        <button
          aria-label="Move right"
          className="bg-surface border border-black/10 rounded-2xl py-5 text-2xl font-bold shadow-sm active:bg-surface-light"
          onPointerDown={(e) => {
            e.preventDefault();
            engineRef.current?.primary();
            engineRef.current?.setMove('right', true);
          }}
          onPointerUp={() => engineRef.current?.setMove('right', false)}
          onPointerLeave={() => engineRef.current?.setMove('right', false)}
        >
          →
        </button>
      </div>
    </div>
  );
}
