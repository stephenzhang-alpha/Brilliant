import { useEffect, useRef, useState, useCallback } from 'react';
import { DinoGame as Engine, GameStatus } from '../../game/dino/engine';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../../game/dino/constants';
import { useAuthStore } from '../../stores/authStore';
import { useScoresStore, GameUser } from '../../stores/scoresStore';

function currentGameUser(): GameUser | null {
  const u = useAuthStore.getState().user;
  if (!u) return null;
  return { uid: u.uid, email: 'email' in u ? u.email : null };
}

// Match on both `code` (physical key, layout-independent) and `key` (some
// synthetic events / layouts only populate one of the two).
function isJumpEvent(e: KeyboardEvent): boolean {
  return (
    e.code === 'Space' ||
    e.code === 'ArrowUp' ||
    e.code === 'KeyW' ||
    e.key === ' ' ||
    e.key === 'Spacebar' ||
    e.key === 'ArrowUp' ||
    e.key === 'w' ||
    e.key === 'W'
  );
}
function isDuckEvent(e: KeyboardEvent): boolean {
  return (
    e.code === 'ArrowDown' ||
    e.code === 'KeyS' ||
    e.key === 'ArrowDown' ||
    e.key === 's' ||
    e.key === 'S'
  );
}

// DEV-only: mirror the live game state onto a DOM attribute so automated
// playtests (which run in an isolated JS world) can read it. Stripped from
// production builds via the import.meta.env.DEV guard at the call site.
function publishDebugState(canvas: HTMLCanvasElement, engine: Engine) {
  const e = engine as unknown as {
    status: string;
    score: number;
    speed: number;
    dinoY: number;
    onGround: boolean;
    nightT: number;
    obstacles: { x: number; w: number; y: number; h: number; kind: string }[];
  };
  canvas.dataset.game = JSON.stringify({
    s: e.status,
    sc: e.score,
    sp: Math.round(e.speed),
    n: Number(e.nightT.toFixed(2)),
    o: e.obstacles.map((o) => [Math.round(o.x), o.w, Math.round(o.y), o.h, o.kind === 'bird' ? 1 : 0]),
  });
}

/** A "play this other game" prompt surfaced on a Dino death. */
export interface DeathOffer {
  label: string;
  note: string;
  onNext: () => void;
}

/**
 * The variables intro: a centered modal pop-up shown BEFORE obstacles start —
 * on the very first load AND again before every replay, so the lesson gates
 * every run (it is intentionally NOT a once-per-player gate). The dino
 * free-runs (no obstacles) behind the dimmed pop-up so the scene stays alive,
 * and the live score & high score are used as the two concrete example
 * variables (the player's first lesson in algebra):
 *   • 'lesson' — explain what a variable is, pointing at the live score &
 *     high score (their values change as you play). Shown on the first run.
 *   • 'quiz'   — a must-pass multiple-choice check; answer correctly to start.
 *     Replays open straight here so the recap stays quick.
 *   • null     — pop-up complete: play normally, obstacles on.
 */
type TutorialStep = 'lesson' | 'quiz' | null;

interface QuizOption {
  id: string;
  label: string;
  /** A short tag shown under the label. */
  hint: string;
  correct: boolean;
  /** Gentle, encouraging re-explanation shown when this wrong option is picked. */
  feedback?: string;
}

const VARIABLE_QUESTION = 'Which of these is a variable?';
const VARIABLE_OPTIONS: QuizOption[] = [
  {
    id: 'score',
    label: 'Your score',
    hint: 'it keeps changing as you run',
    correct: true,
  },
  {
    id: 'seven',
    label: 'The number 7',
    hint: 'it is always exactly 7',
    correct: false,
    feedback:
      'Close! 7 is always 7 — its value never changes, so it is a constant, not a variable. A variable is a value that CAN change… like your score climbing right now.',
  },
  {
    id: 'red',
    label: 'The color red',
    hint: 'a color, not a changing amount',
    correct: false,
    feedback:
      'Not quite! A color is not an amount that changes. A variable is a quantity whose value can change — like your score going up as you play.',
  },
];

interface DinoGameProps {
  /**
   * Called once per death. Return an offer to surface a "Next" button that
   * transitions to another game, or null for a normal game-over screen.
   */
  getDeathOffer?: () => DeathOffer | null;
  /** Called with the run's score each time the player dies (feeds overall score). */
  onRunScore?: (score: number) => void;
  /** When false (scrolled off-screen), the simulation freezes to save CPU. */
  active?: boolean;
}

export function DinoGame({ getDeathOffer, onRunScore, active = true }: DinoGameProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const [status, setStatus] = useState<GameStatus>('ready');
  const [lastScore, setLastScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [offer, setOffer] = useState<DeathOffer | null>(null);
  // The variables pop-up gates every run, so it always opens: the full lesson
  // on the first run, and straight to the quick check on replays.
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>('lesson');
  // Live mirror of the two example variables, polled while the lesson is up.
  const [liveScore, setLiveScore] = useState(0);
  const [liveHigh, setLiveHigh] = useState(0);
  // Quiz state: the last wrong option (for retry feedback) and whether the
  // player has answered correctly (celebration + "play for real" gate).
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [quizDone, setQuizDone] = useState(false);

  const best = useScoresStore((s) => s.best);

  // Latest values readable from the stable game-over / input closures.
  const getDeathOfferRef = useRef(getDeathOffer);
  const onRunScoreRef = useRef(onRunScore);
  const tutorialStepRef = useRef(tutorialStep);
  const activeRef = useRef(active);
  const restartRef = useRef<(() => void) | null>(null);

  // "Play again" after a death. The variables pop-up gates EVERY run, so this
  // re-opens it (streamlined straight to the quick check) and starts a fresh
  // free-run with NO obstacles. beginRealGame() — fired once the player answers
  // — is the only thing that switches obstacles back on, so they never resume
  // until the pop-up is completed. Defined before the sync effect below so the
  // keyboard handler can reach it through restartRef.
  const restart = useCallback(() => {
    setOffer(null);
    setWrongPick(null);
    setQuizDone(false);
    setTutorialStep('quiz');
    engineRef.current?.startTutorial();
  }, []);

  useEffect(() => {
    getDeathOfferRef.current = getDeathOffer;
    onRunScoreRef.current = onRunScore;
    tutorialStepRef.current = tutorialStep;
    activeRef.current = active;
    restartRef.current = restart;
  });

  // Keep the canvas HI counter in sync with the loaded personal best.
  useEffect(() => {
    if (engineRef.current) engineRef.current.highScore = Math.max(engineRef.current.highScore, best);
  }, [best]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.width = WORLD_WIDTH * dpr;
    canvas.height = WORLD_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const engine = new Engine();
    engine.highScore = useScoresStore.getState().best;
    engineRef.current = engine;

    engine.onGameOver = (score) => {
      const prevBest = useScoresStore.getState().best;
      setLastScore(score);
      setIsNewBest(score > prevBest && score > 0);
      void useScoresStore.getState().submitScore(score, currentGameUser());
      onRunScoreRef.current?.(score);

      setOffer(getDeathOfferRef.current?.() ?? null);
    };

    let raf = 0;
    let last = performance.now();
    let lastStatus: GameStatus = engine.status;

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (activeRef.current) {
        engine.highScore = Math.max(engine.highScore, useScoresStore.getState().best);
        engine.update(dt);
        engine.draw(ctx);
        if (engine.status !== lastStatus) {
          lastStatus = engine.status;
          setStatus(engine.status);
        }
        if (import.meta.env.DEV) publishDebugState(canvas, engine);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Open with the variables free-run immediately so the dino is already
    // running (animated, world scrolling, score ticking) with NO obstacles
    // while the pop-up plays. Obstacles only switch on once the quiz is
    // answered correctly (beginRealGame). This fires on every fresh mount;
    // each later replay re-arms the same free-run via restart() above.
    engine.startTutorial();

    const isTyping = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping() || !activeRef.current) return;
      // During onboarding the dino auto-runs and the panel buttons drive
      // progression, so keyboard control is ignored until normal play begins.
      if (tutorialStepRef.current !== null) return;
      if (isJumpEvent(e)) {
        e.preventDefault();
        // After a death the dino can't restart straight into obstacles: every
        // run is gated by the variables pop-up, so route the replay through
        // restart() (which re-opens it). Otherwise this is a normal jump.
        if (!e.repeat) {
          if (engine.status === 'over') restartRef.current?.();
          else engine.primary();
        }
      } else if (isDuckEvent(e)) {
        e.preventDefault();
        engine.setDuck(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (isJumpEvent(e)) engine.releaseJump();
      else if (isDuckEvent(e)) engine.setDuck(false);
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

  // Poll the live variable values while the lesson / quiz are on screen so the
  // panels can show the score (and high score) changing in real time.
  useEffect(() => {
    if (tutorialStep === null) return;
    const id = window.setInterval(() => {
      const eng = engineRef.current;
      if (!eng) return;
      setLiveScore(eng.score);
      setLiveHigh(eng.highScore);
    }, 120);
    return () => window.clearInterval(id);
  }, [tutorialStep]);

  // --- Touch / pointer controls -------------------------------------------
  const onPlayfieldPointerDown = useCallback(() => {
    if (tutorialStepRef.current !== null) return;
    engineRef.current?.primary();
  }, []);
  const onPlayfieldPointerUp = useCallback(() => {
    engineRef.current?.releaseJump();
  }, []);

  // --- Variables onboarding flow ------------------------------------------
  const onLessonNext = useCallback(() => {
    setWrongPick(null);
    setTutorialStep('quiz');
  }, []);

  const onPickOption = useCallback((opt: QuizOption) => {
    if (!opt.correct) {
      // No penalty — show a gentle nudge and let them try again.
      setWrongPick(opt.id);
      return;
    }
    // Correct! Celebrate, then reveal the "play for real" gate.
    setWrongPick(null);
    setQuizDone(true);
    engineRef.current?.celebrate();
  }, []);

  // Enable obstacles + real scoring ONLY after the correct answer.
  const onFinish = useCallback(() => {
    engineRef.current?.beginRealGame();
    setTutorialStep(null);
  }, []);

  const wrongOption = wrongPick ? VARIABLE_OPTIONS.find((o) => o.id === wrongPick) : null;

  // The centered modal pop-up walks through three phases over the dimmed,
  // still-running scene: explain → check → celebrate, then starts the game.
  const tutorialPhase: 'lesson' | 'quiz' | 'done' = quizDone
    ? 'done'
    : tutorialStep === 'quiz'
      ? 'quiz'
      : 'lesson';

  return (
    <div className="w-full">
      <div
        className="relative w-full select-none rounded-xl overflow-hidden border border-black/10 shadow-2xl"
        style={{ aspectRatio: `${WORLD_WIDTH} / ${WORLD_HEIGHT}`, touchAction: 'none' }}
        onPointerDown={onPlayfieldPointerDown}
        onPointerUp={onPlayfieldPointerUp}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />

        {tutorialStep === null && status === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <div className="bg-black/55 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
              <p className="text-white font-semibold text-lg">Press Space / Tap to start</p>
              <p className="text-white/70 text-sm mt-1">↑ or tap to jump · ↓ to duck</p>
            </div>
          </div>
        )}

        {status === 'over' && (
          <div
            className="absolute inset-0 flex items-center justify-center px-4"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <div className="bg-black/65 backdrop-blur-sm rounded-xl px-6 py-3 sm:px-8 sm:py-4 text-center flex flex-col items-center gap-1.5 max-w-[92%]">
              <p className="text-white/80 tracking-[0.3em] text-xs sm:text-sm font-bold">GAME OVER</p>
              <p className="text-white text-2xl sm:text-3xl font-extrabold leading-none tabular-nums">
                {lastScore.toLocaleString()}
              </p>
              {isNewBest && (
                <p className="text-success text-xs sm:text-sm font-semibold">★ New personal best!</p>
              )}

              {offer ? (
                <>
                  <p className="text-white/90 text-sm mt-1">{offer.note}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      offer.onNext();
                    }}
                    className="mt-1 bg-primary hover:bg-primary-dark text-white font-bold px-6 py-2.5 rounded-lg transition-colors text-sm animate-pulse"
                  >
                    {offer.label}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      restart();
                    }}
                    className="text-white/60 hover:text-white text-xs underline mt-0.5"
                  >
                    or play again
                  </button>
                </>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    restart();
                  }}
                  className="mt-1.5 bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
                >
                  Play again
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- Variables intro: a centered modal pop-up shown BEFORE obstacles ---
          Shown on the first load AND before every replay (it gates each run).
          The dino free-runs (no obstacles) behind the dimmed scrim so the
          scene stays alive, and the live score / high score are the two
          concrete example variables. Obstacles only switch on once the
          must-pass quiz is answered. */}
      {tutorialStep !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadein"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dino-var-title"
        >
          {/* Dim + blur the scene, but keep the running dino alive behind it. */}
          <div className="absolute inset-0 bg-[#2a2350]/55 backdrop-blur-sm" aria-hidden />

          <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl bg-surface shadow-2xl shadow-primary/40 ring-1 ring-white/50">
            {/* Header ribbon */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-primary via-accent to-cyan px-5 py-4 sm:px-6">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 text-2xl animate-bob"
                aria-hidden
              >
                🔢
              </span>
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  Stage 1 · Algebra
                </span>
                <p
                  id="dino-var-title"
                  className="font-display text-xl font-extrabold leading-tight text-white"
                >
                  Meet your first variable
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {/* Live readouts of the two example variables — always on screen,
                  updating in real time, so the lesson can point right at them. */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border-2 border-primary/25 bg-primary/5 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-primary">score</span>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary">
                      variable
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-extrabold tabular-nums text-text">{liveScore}</span>
                    <span className="text-xs font-semibold text-success">▲ climbing</span>
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-accent/25 bg-accent/5 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-accent">highScore</span>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-accent">
                      variable
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-extrabold tabular-nums text-text">{liveHigh}</span>
                    <span className="text-xs font-semibold text-text-muted">
                      {liveHigh > 0 ? 'your best' : 'set a record!'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phase body swaps beneath the persistent readouts. */}
              <div key={tutorialPhase} className="animate-fadein">
                {tutorialPhase === 'lesson' && (
                  <>
                    <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">
                      Welcome to algebra! A <span className="font-bold text-primary">variable</span> is a{' '}
                      <span className="font-semibold text-text">named quantity whose value can change</span>. Your
                      game already has two: <span className="font-mono font-bold text-primary">score</span> climbs
                      every step your dino runs, and{' '}
                      <span className="font-mono font-bold text-accent">highScore</span> jumps up the moment you beat
                      your record. Same name, new value — that&apos;s a variable! Watch the numbers above change as
                      your dino runs.
                    </p>
                    <button
                      onClick={onLessonNext}
                      className="btn-pop mt-5 w-full rounded-2xl bg-primary px-7 py-3 font-display text-lg font-bold text-white sm:w-auto"
                    >
                      Got it — quiz me! →
                    </button>
                  </>
                )}

                {tutorialPhase === 'quiz' && (
                  <>
                    <h4 className="mt-5 flex items-center gap-2 font-display text-lg font-extrabold text-text">
                      <span aria-hidden>🎯</span> {VARIABLE_QUESTION}
                    </h4>
                    <p className="mt-1 text-sm text-text-muted">
                      Remember: a variable&apos;s value can change — like{' '}
                      <span className="font-mono font-bold text-primary">score = {liveScore}</span> climbing right
                      now.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {VARIABLE_OPTIONS.map((opt) => {
                        const isWrongPick = wrongPick === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => onPickOption(opt)}
                            className={[
                              'btn-pop rounded-xl border-2 px-4 py-3 text-left transition-colors',
                              isWrongPick
                                ? 'border-coral bg-coral/10'
                                : 'border-black/10 bg-surface-light hover:border-primary hover:bg-primary/5',
                            ].join(' ')}
                          >
                            <span className="block font-display font-bold text-text">{opt.label}</span>
                            <span className="mt-0.5 block text-xs text-text-muted">{opt.hint}</span>
                            {isWrongPick && (
                              <span className="mt-1 block text-xs font-semibold text-coral">not this one</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {wrongOption && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 px-3 py-2 animate-fadein">
                        <span className="text-lg leading-none" aria-hidden>💡</span>
                        <p className="text-sm text-text">
                          {wrongOption.feedback}{' '}
                          <span className="font-semibold text-text-muted">Give it another try!</span>
                        </p>
                      </div>
                    )}
                  </>
                )}

                {tutorialPhase === 'done' && (
                  <div className="mt-5 text-center">
                    <p className="text-4xl" aria-hidden>🎉</p>
                    <h4 className="mt-1 font-display text-xl font-extrabold text-text">
                      Yes! <span className="font-mono text-primary">score</span> is a variable.
                    </h4>
                    <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-muted">
                      Its value keeps changing as you play — exactly what a variable is. Time for the real run:
                      the obstacles are coming, so get ready to jump!
                    </p>
                    <button
                      onClick={onFinish}
                      className="btn-pop mt-5 rounded-2xl bg-primary px-9 py-3.5 font-display text-lg font-extrabold text-white animate-pulse"
                    >
                      ▶ Start the game!
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* On-screen controls for touch devices (normal play only) */}
      {tutorialStep === null && (
        <div className="mt-3 flex gap-3 sm:hidden">
          <button
            className="flex-1 bg-surface border border-black/10 rounded-xl py-4 font-semibold text-text active:bg-surface-light"
            onPointerDown={(e) => {
              e.preventDefault();
              // On a death this button replays — gate it through the variables
              // pop-up (restart) instead of starting straight into obstacles.
              const eng = engineRef.current;
              if (eng?.status === 'over') restart();
              else eng?.primary();
            }}
            onPointerUp={() => engineRef.current?.releaseJump()}
          >
            Jump
          </button>
          <button
            className="flex-1 bg-surface border border-black/10 rounded-xl py-4 font-semibold text-text active:bg-surface-light"
            onPointerDown={(e) => {
              e.preventDefault();
              engineRef.current?.setDuck(true);
            }}
            onPointerUp={() => engineRef.current?.setDuck(false)}
            onPointerLeave={() => engineRef.current?.setDuck(false)}
          >
            Duck
          </button>
        </div>
      )}
    </div>
  );
}
