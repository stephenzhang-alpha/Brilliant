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
 * One-time onboarding that introduces variables using the live score as the
 * concrete example:
 *   • 'lesson' — the dino is already running (no obstacles); explain that the
 *     live score & high score ARE variables (their values change).
 *   • 'quiz'   — a multiple-choice check; the player must answer correctly to
 *     unlock the real game.
 *   • null     — lesson done (or already seen): play normally, with obstacles.
 */
type TutorialStep = 'lesson' | 'quiz' | null;

const TUTORIAL_SEEN_KEY = 'dino_var_tutorial_seen';

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
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>(() =>
    localStorage.getItem(TUTORIAL_SEEN_KEY) ? null : 'lesson',
  );
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
  useEffect(() => {
    getDeathOfferRef.current = getDeathOffer;
    onRunScoreRef.current = onRunScore;
    tutorialStepRef.current = tutorialStep;
    activeRef.current = active;
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

    // New players: kick off the variables free-run immediately so the dino is
    // already running (animated, world scrolling, score ticking) with NO
    // obstacles while the lesson plays. Obstacles only switch on once the quiz
    // is answered correctly (beginRealGame). Returning players keep today's
    // "press to start" behaviour, so the engine is left in its 'ready' state.
    if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) {
      engine.startTutorial();
    }

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
        if (!e.repeat) engine.primary();
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

  const restart = useCallback(() => {
    setOffer(null);
    engineRef.current?.start();
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
    // Correct! Mark the lesson seen, celebrate, then reveal the "play" gate.
    setWrongPick(null);
    setQuizDone(true);
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    engineRef.current?.celebrate();
  }, []);

  // Enable obstacles + real scoring ONLY after the correct answer.
  const onFinish = useCallback(() => {
    engineRef.current?.beginRealGame();
    setTutorialStep(null);
  }, []);

  const wrongOption = wrongPick ? VARIABLE_OPTIONS.find((o) => o.id === wrongPick) : null;

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

        {/* Callout pointing at the live score / high-score HUD during the lesson. */}
        {tutorialStep !== null && !quizDone && (
          <div className="absolute right-2 pointer-events-none" style={{ top: '11%' }}>
            <div className="bg-amber text-[#2a2350] text-[11px] font-extrabold rounded-full px-2.5 py-1 shadow-lg animate-bob flex items-center gap-1">
              <span aria-hidden>↑</span> these are variables
            </div>
          </div>
        )}

        {status === 'over' && (
          <div className="absolute inset-0 flex items-center justify-center px-4">
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

      {/* --- Variables onboarding --- */}
      {tutorialStep === 'lesson' && (
        <div className="mt-4 bg-surface border border-black/10 rounded-2xl shadow-sm p-5 animate-fadein">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>🔢</span>
            <h3 className="font-display font-extrabold text-xl text-text">Meet your first variable</h3>
          </div>
          <p className="text-text-muted mt-2 text-sm leading-relaxed">
            A <span className="font-bold text-primary">variable</span> is a quantity whose value can{' '}
            <span className="italic font-semibold text-text">change</span>. See the{' '}
            <span className="font-semibold text-amber">score</span> and{' '}
            <span className="font-semibold text-amber">high score</span> in the top-right corner of the
            game? Each one is a variable — watch the score climb as your dino runs!
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-xl px-3 py-2">
              <span className="font-display font-bold text-primary">score</span>
              <span className="text-text-muted">=</span>
              <span className="font-mono font-extrabold text-text tabular-nums text-lg">{liveScore}</span>
              <span className="text-text-muted text-xs">…and counting</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/25 rounded-xl px-3 py-2">
              <span className="font-display font-bold text-accent">high score</span>
              <span className="text-text-muted">=</span>
              <span className="font-mono font-extrabold text-text tabular-nums text-lg">{liveHigh}</span>
            </div>
          </div>
          <p className="text-text-muted mt-3 text-xs">
            Those changing numbers are exactly what algebra means by a variable.
          </p>
          <button
            onClick={onLessonNext}
            className="btn-pop mt-4 bg-primary text-white font-display font-bold px-7 py-2.5 rounded-xl"
          >
            Got it — quiz me! →
          </button>
        </div>
      )}

      {tutorialStep === 'quiz' && (
        <div className="mt-4 bg-surface border border-black/10 rounded-2xl shadow-sm p-5 animate-fadein">
          {!quizDone ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>🎯</span>
                <h3 className="font-display font-extrabold text-xl text-text">{VARIABLE_QUESTION}</h3>
              </div>
              <p className="text-text-muted mt-1 text-sm">
                Remember: a variable&apos;s value can change. Your score{' '}
                <span className="font-mono font-bold text-primary">= {liveScore}</span> keeps changing as
                the dino runs.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {VARIABLE_OPTIONS.map((opt) => {
                  const isWrongPick = wrongPick === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => onPickOption(opt)}
                      className={[
                        'btn-pop text-left rounded-xl border-2 px-4 py-3 transition-colors',
                        isWrongPick
                          ? 'border-coral bg-coral/10'
                          : 'border-black/10 bg-surface-light hover:border-primary hover:bg-primary/5',
                      ].join(' ')}
                    >
                      <span className="font-display font-bold text-text block">{opt.label}</span>
                      <span className="text-text-muted text-xs block mt-0.5">{opt.hint}</span>
                      {isWrongPick && (
                        <span className="text-coral text-xs font-semibold block mt-1">not this one</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {wrongOption && (
                <div className="mt-3 flex items-start gap-2 bg-coral/10 border border-coral/30 rounded-xl px-3 py-2 animate-fadein">
                  <span className="text-lg leading-none" aria-hidden>💡</span>
                  <p className="text-sm text-text">
                    {wrongOption.feedback}{' '}
                    <span className="text-text-muted font-semibold">Give it another try!</span>
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="text-3xl" aria-hidden>🎉</p>
              <h3 className="font-display font-extrabold text-xl mt-1 text-text">
                Yes! Your score is a variable.
              </h3>
              <p className="text-text-muted mt-1.5 text-sm max-w-md mx-auto">
                Its value changes as you play — that&apos;s exactly what a variable is. Now for the real
                run: the obstacles are coming, so get ready to jump!
              </p>
              <button
                onClick={onFinish}
                className="btn-pop mt-4 bg-primary text-white font-display font-extrabold text-lg px-9 py-3 rounded-2xl animate-pulse"
              >
                ▶ Play for real!
              </button>
            </div>
          )}
        </div>
      )}

      {/* On-screen controls for touch devices (normal play only) */}
      {tutorialStep === null && (
        <div className="mt-3 flex gap-3 sm:hidden">
          <button
            className="flex-1 bg-surface border border-black/10 rounded-xl py-4 font-semibold text-text active:bg-surface-light"
            onPointerDown={(e) => {
              e.preventDefault();
              engineRef.current?.primary();
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
