import { useEffect, useRef, useState, useCallback } from 'react';
import { GateRunner as Engine, GateStatus, RunPhase, GW, GH } from '../../game/gates/engine';

interface Props {
  /** Fired once when the run ends with the crowd surviving (count > 0). */
  onWin?: (count: number) => void;
  /** Fired once when the crowd is wiped out to 0 (a loss — replay required). */
  onLose?: (count: number) => void;
  /** The victory card's "continue" button — host navigates to the next page. */
  onAdvance?: () => void;
  /** When false (off-screen), the simulation freezes to save CPU. */
  active?: boolean;
}

// Snapshots captured from the engine when a pop-up opens, so the overlays render
// from React state (never by reading the engine ref during render).
interface TeachData {
  expr: string;
  coef: number;
  constant: number;
  steps: string[];
  example: number;
}
interface EvalData {
  expr: string;
  x: number;
  line: string;
  options: number[];
  answer: number;
  steps: string[];
}
interface Recap {
  expr: string;
  x: number;
  correct: boolean;
}

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const START_KEYS = new Set(['Space', 'Enter', 'ArrowUp', 'KeyW']);

// The neutral value the teach pop-up evaluates as a worked example. Kept apart
// from the assignment digits (4..9) so it never spoils the upcoming choice.
const TEACH_X = 2;

export function GateRunner({ onWin, onLose, onAdvance, active = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const [status, setStatus] = useState<GateStatus>('ready');
  const [phase, setPhase] = useState<RunPhase>('run');
  const [teachData, setTeachData] = useState<TeachData | null>(null);
  const [evalData, setEvalData] = useState<EvalData | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [pickedCorrect, setPickedCorrect] = useState<boolean | null>(null);
  const [finalCount, setFinalCount] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [won, setWon] = useState(false);
  const activeRef = useRef(active);
  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  useEffect(() => {
    activeRef.current = active;
    onWinRef.current = onWin;
    onLoseRef.current = onLose;
  }, [active, onWin, onLose]);

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
      setBestCombo(engine.bestCombo);
      setWon(engine.won);
      setRecap({ expr: engine.exprLabel(), x: engine.assignedX, correct: engine.evalCorrect });
      if (engine.won) onWinRef.current?.(count);
      else onLoseRef.current?.(count);
    };

    let raf = 0;
    let last = performance.now();
    let lastStatus: GateStatus = engine.status;
    let lastPhase: RunPhase = engine.phase;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (activeRef.current) {
        engine.update(dt);
        engine.draw(ctx);
        if (engine.status !== lastStatus) {
          lastStatus = engine.status;
          setStatus(engine.status);
        }
        if (engine.phase !== lastPhase) {
          lastPhase = engine.phase;
          // Mirror the data each pop-up needs the moment it opens.
          if (engine.phase === 'teach') {
            setTeachData({
              expr: engine.exprLabel(),
              coef: engine.coef,
              constant: engine.constant,
              steps: engine.evalSteps(TEACH_X),
              example: engine.evalValue(TEACH_X),
            });
          } else if (engine.phase === 'eval') {
            // Fresh challenge: clear any prior pick before showing the choices.
            setPicked(null);
            setPickedCorrect(null);
            setEvalData({
              expr: engine.exprLabel(),
              x: engine.assignedX,
              line: engine.evalLine(engine.assignedX),
              options: engine.evalOptions.slice(),
              answer: engine.evalAnswer,
              steps: engine.evalSteps(engine.assignedX),
            });
          }
          setPhase(engine.phase);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const isTyping = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };
    // Steering is locked while a teach/evaluate pop-up owns the screen.
    const isPaused = () => engine.status === 'running' && engine.phase !== 'run';
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping() || !activeRef.current || isPaused()) return;
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
      if (!activeRef.current) return;
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
  }, []);

  const worldXFromEvent = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * GW;
  };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    // Don't steer through the pop-ups — let the overlay buttons handle taps.
    if (engine.status === 'running' && engine.phase !== 'run') return;
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

  const handlePick = useCallback((opt: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const correct = engine.submitEvaluation(opt);
    setPicked(opt);
    setPickedCorrect(correct);
  }, []);

  // Replay: reset the engine to a fresh run and clear the finish-card state so
  // the completion overlay closes and the run starts over.
  const handlePlayAgain = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.reset();
    engine.start();
    setStatus('running');
    setPhase('run');
    setTeachData(null);
    setEvalData(null);
    setPicked(null);
    setPickedCorrect(null);
    setRecap(null);
    setFinalCount(0);
    setBestCombo(0);
    setWon(false);
  }, []);

  const headline =
    finalCount >= 210
      ? 'Incredible!'
      : finalCount >= 145
        ? 'Huge run!'
        : finalCount >= 80
          ? 'Nice run!'
          : 'You survived!';
  const headlineEmoji = finalCount >= 210 ? '🚀' : '🎉';

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
              <p className="font-display text-white font-extrabold text-2xl">Gate Runner</p>
              <p className="text-white/85 mt-2 text-[15px] leading-snug">
                You <b>are</b> the expression <b className="text-primary-light">ax + b</b>! Grow your{' '}
                <b className="text-lime">+x</b> and <b className="text-cyan">+number</b> gates to build
                something like <b>3x + 5</b>.
              </p>
              <p className="text-white/85 mt-2 text-[15px] leading-snug">
                ⚠️ The monsters are <b className="text-coral">unavoidable</b> — both lanes bite, so
                steer toward the <b>smaller</b> one. Build big, evaluate right, and survive a{' '}
                <b className="text-coral">brutal boss</b>.
              </p>
              <p className="text-white/70 text-sm mt-3">Drag, or use ← → · Tap to start</p>
            </div>
          </div>
        )}

        {status === 'running' && phase === 'teach' && teachData && (
          <div className="absolute inset-0 flex items-center justify-center px-4 animate-fadein bg-black/70 backdrop-blur-lg">
            <div className="bg-white rounded-2xl px-6 py-5 text-center shadow-2xl w-full max-w-[330px]">
              <p className="text-2xl">🧮</p>
              <p className="font-display tracking-[0.2em] text-text-muted text-[11px] font-bold mt-1">EVALUATE TIME</p>
              <p className="text-text text-[15px] mt-2 leading-snug">
                You built <b className="text-primary font-display">{teachData.expr}</b>! Next, <b>x</b> gets a value.
              </p>
              <div className="mt-3 bg-surface-light rounded-xl px-4 py-3 text-left">
                <p className="text-text text-[13px] font-bold">How to evaluate:</p>
                <ol className="text-text-muted text-[13px] mt-1 leading-relaxed list-decimal list-inside">
                  <li>
                    Put the number in for <b>x</b>
                  </li>
                  <li>
                    <b className="text-primary">Multiply {teachData.coef} × x first</b>
                  </li>
                  <li>
                    {teachData.constant === 0 ? (
                      <>No constant to add — done!</>
                    ) : teachData.constant > 0 ? (
                      <>
                        Then <b className="text-cyan">add the {teachData.constant}</b>
                      </>
                    ) : (
                      <>
                        Then <b className="text-amber">subtract the {Math.abs(teachData.constant)}</b>
                      </>
                    )}
                  </li>
                </ol>
              </div>
              <div className="mt-3 text-left">
                <p className="text-text-muted text-[12px] font-bold">For example, if x = {TEACH_X}:</p>
                <ul className="mt-1 space-y-0.5">
                  {teachData.steps.map((s, i) => (
                    <li key={i} className="text-text text-[13px]">
                      • {s}
                    </li>
                  ))}
                </ul>
                <p className="font-display text-primary font-bold text-[15px] mt-1">
                  {teachData.expr} when x = {TEACH_X} → {teachData.example}
                </p>
              </div>
              <button
                onClick={() => engineRef.current?.continueFromTeach()}
                className="mt-4 w-full bg-primary hover:bg-primary-dark text-white font-display font-bold px-6 py-3 rounded-xl transition-colors"
              >
                Got it! Pick my x →
              </button>
            </div>
          </div>
        )}

        {status === 'running' && phase === 'eval' && evalData && (
          <div className="absolute inset-0 flex items-center justify-center px-4 animate-fadein bg-black/70 backdrop-blur-lg">
            <div className="bg-white rounded-2xl px-6 py-5 text-center shadow-2xl w-full max-w-[340px]">
              {picked === null ? (
                <>
                  <p className="font-display tracking-[0.2em] text-text-muted text-[11px] font-bold">YOUR TURN!</p>
                  <p className="text-text text-[15px] mt-2 leading-snug">
                    You built <b className="text-primary font-display">{evalData.expr}</b> and now <b>x = {evalData.x}</b>.
                  </p>
                  <p className="font-display text-text font-bold text-lg mt-3">
                    What is <b className="text-primary">{evalData.expr}</b> when x = {evalData.x}?
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {evalData.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handlePick(opt)}
                        className="font-display text-xl font-bold text-primary bg-surface-light hover:bg-primary/10 border-2 border-primary/20 rounded-xl py-3 active:scale-95 transition-transform tabular-nums"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              ) : pickedCorrect ? (
                <>
                  <p className="text-3xl">🎉</p>
                  <p className="font-display text-lime font-extrabold text-xl mt-1">Correct!</p>
                  <p className="text-text text-[15px] mt-2">
                    <b className="text-primary font-display">{evalData.expr}</b> when x = {evalData.x} is{' '}
                    <b className="tabular-nums">{evalData.answer}</b>
                  </p>
                  <p className="text-text-muted text-[13px] mt-1">
                    {evalData.line} = {evalData.answer} — you evaluated it yourself! 🌟
                  </p>
                  <button
                    onClick={() => engineRef.current?.continueFromEval()}
                    className="mt-5 w-full bg-primary hover:bg-primary-dark text-white font-display font-bold px-6 py-3 rounded-xl transition-colors"
                  >
                    Face the boss! 👹
                  </button>
                </>
              ) : (
                <>
                  <p className="text-2xl">📘</p>
                  <p className="font-display text-primary font-extrabold text-lg mt-1">Let's check it together</p>
                  <p className="text-text-muted text-[13px] mt-1">
                    You picked <b className="text-coral tabular-nums">{picked}</b>. Here's the step-by-step:
                  </p>
                  <ul className="mt-2 text-left space-y-1 bg-surface-light rounded-xl px-4 py-3">
                    {evalData.steps.map((s, i) => (
                      <li key={i} className="text-text text-[13px]">
                        • {s}
                      </li>
                    ))}
                  </ul>
                  <p className="font-display text-text font-bold text-[15px] mt-2">
                    So <b className="text-primary font-display">{evalData.expr}</b> when x = {evalData.x} is{' '}
                    <b className="text-lime tabular-nums">{evalData.answer}</b>
                  </p>
                  <button
                    onClick={() => engineRef.current?.continueFromEval()}
                    className="mt-4 w-full bg-primary hover:bg-primary-dark text-white font-display font-bold px-6 py-3 rounded-xl transition-colors"
                  >
                    Got it — face the boss! 👹
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {status === 'complete' && won && (
          <div className="absolute inset-0 flex items-center justify-center px-6 animate-fadein">
            <div className="bg-white rounded-2xl px-8 py-6 text-center shadow-2xl">
              <p className="text-3xl">{headlineEmoji}</p>
              <p className="font-display tracking-[0.25em] text-text-muted text-xs font-bold mt-1">{headline}</p>
              <p className="text-text text-sm mt-2">Your crowd survived the boss with</p>
              <p className="font-display text-primary text-5xl font-extrabold tabular-nums leading-none mt-1">
                {finalCount.toLocaleString()}
              </p>
              {recap && (
                <p className="text-text-muted text-[13px] mt-2">
                  You were <b className="text-primary font-display">{recap.expr}</b> · x = {recap.x}
                </p>
              )}
              {recap?.correct && (
                <p className="mt-2 inline-block bg-lime/15 text-lime font-display font-bold text-sm rounded-full px-3 py-1">
                  ✅ You evaluated it yourself!
                </p>
              )}
              {bestCombo >= 2 && (
                <p className="mt-3 inline-block bg-amber/15 text-amber font-display font-bold text-sm rounded-full px-3 py-1">
                  🔥 Best combo ×{bestCombo}
                </p>
              )}
              <button
                onClick={() => onAdvance?.()}
                className="mt-5 w-full bg-primary hover:bg-primary-dark text-white font-display font-bold px-6 py-3 rounded-xl transition-colors animate-pulse"
              >
                Continue to Pull the Pins →
              </button>
              <button
                onClick={handlePlayAgain}
                className="mt-2 text-text-muted hover:text-text text-xs underline"
              >
                or play again
              </button>
            </div>
          </div>
        )}

        {status === 'complete' && !won && (
          <div className="absolute inset-0 flex items-center justify-center px-6 animate-fadein">
            <div className="bg-white rounded-2xl px-8 py-6 text-center shadow-2xl">
              <p className="text-3xl">💀</p>
              <p className="font-display tracking-[0.25em] text-coral text-xs font-bold mt-1">WIPED OUT</p>
              <p className="text-text text-sm mt-2 leading-snug">
                The boss crushed your crowd to <b className="tabular-nums">0</b>. Build a{' '}
                <b>bigger</b> expression and evaluate it right to survive!
              </p>
              {recap && (
                <p className="text-text-muted text-[13px] mt-2">
                  You were <b className="text-primary font-display">{recap.expr}</b> · x = {recap.x}
                  {recap.correct ? '' : ' — and the evaluation slipped'}
                </p>
              )}
              <button
                onClick={handlePlayAgain}
                className="mt-5 w-full bg-primary hover:bg-primary-dark text-white font-display font-bold px-6 py-3 rounded-xl transition-colors animate-pulse"
              >
                ↻ Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Steering controls */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          aria-label="Move left"
          className="font-display bg-surface border border-black/10 rounded-2xl py-5 text-2xl font-bold text-primary shadow-sm active:bg-surface-light active:scale-95 transition-transform"
          onPointerDown={(e) => {
            e.preventDefault();
            engineRef.current?.primary();
            engineRef.current?.setMove('left', true);
          }}
          onPointerUp={() => engineRef.current?.setMove('left', false)}
          onPointerLeave={() => engineRef.current?.setMove('left', false)}
        >
          ◀
        </button>
        <button
          aria-label="Move right"
          className="font-display bg-surface border border-black/10 rounded-2xl py-5 text-2xl font-bold text-primary shadow-sm active:bg-surface-light active:scale-95 transition-transform"
          onPointerDown={(e) => {
            e.preventDefault();
            engineRef.current?.primary();
            engineRef.current?.setMove('right', true);
          }}
          onPointerUp={() => engineRef.current?.setMove('right', false)}
          onPointerLeave={() => engineRef.current?.setMove('right', false)}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
