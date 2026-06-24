import { useEffect, useRef, useState, useCallback } from 'react';
import { DinoGame as Engine, GameStatus } from '../../game/dino/engine';
import { WORLD_WIDTH, WORLD_HEIGHT, CHALLENGE_TARGET } from '../../game/dino/constants';
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

/** Steps of the one-time "introduce variables" onboarding. null = normal play. */
type TutorialStep = 'play' | 'welcome' | 'running' | 'intro' | 'challenge' | null;

const TUTORIAL_SEEN_KEY = 'dino_var_tutorial_seen';

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
    localStorage.getItem(TUTORIAL_SEEN_KEY) ? null : 'play',
  );
  const [liveScore, setLiveScore] = useState(0);
  // Interactive variables beat: the score the player jumped at (success), and a
  // gentle "not yet" hint shown while they wait for s to reach the target.
  const [challengeScore, setChallengeScore] = useState<number | null>(null);
  const [challengeHint, setChallengeHint] = useState(false);

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

  // Tutorial timers (run-a-bit delay + live score ticker).
  const introTimerRef = useRef<number | null>(null);
  const liveTimerRef = useRef<number | null>(null);
  const clearTutorialTimers = useCallback(() => {
    if (introTimerRef.current) window.clearTimeout(introTimerRef.current);
    if (liveTimerRef.current) window.clearInterval(liveTimerRef.current);
    introTimerRef.current = null;
    liveTimerRef.current = null;
  }, []);

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

    const isTyping = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping() || !activeRef.current) return;
      // During the Play/Welcome steps the buttons drive progression.
      const ts = tutorialStepRef.current;
      if (ts === 'play' || ts === 'welcome') return;
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

  useEffect(() => clearTutorialTimers, [clearTutorialTimers]);

  // --- Touch / pointer controls -------------------------------------------
  const onPlayfieldPointerDown = useCallback(() => {
    const ts = tutorialStepRef.current;
    if (ts === 'play' || ts === 'welcome') return;
    engineRef.current?.primary();
  }, []);
  const onPlayfieldPointerUp = useCallback(() => {
    engineRef.current?.releaseJump();
  }, []);

  const restart = useCallback(() => {
    setOffer(null);
    engineRef.current?.start();
  }, []);

  // --- Variables tutorial flow --------------------------------------------
  const onPlay = useCallback(() => setTutorialStep('welcome'), []);

  const onWelcomeNext = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.obstaclesEnabled = false; // free run, no danger yet
    engine.highlightScore = false;
    engine.start();
    setTutorialStep('running');
    clearTutorialTimers();
    // Let the dino run a bit, then introduce variables.
    introTimerRef.current = window.setTimeout(() => {
      const eng = engineRef.current;
      if (eng) eng.highlightScore = true;
      setTutorialStep('intro');
      liveTimerRef.current = window.setInterval(() => {
        setLiveScore(engineRef.current?.score ?? 0);
      }, 120);
    }, 2600);
  }, [clearTutorialTimers]);

  // After the read-only explanation, hand the player an actual task: keep the
  // dino in the safe free-run state and ask them to jump when the score
  // variable s reaches the target. The engine reports the result via callback.
  const onIntroNext = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    clearTutorialTimers();
    engine.armChallenge(CHALLENGE_TARGET);
    setChallengeScore(null);
    setChallengeHint(false);
    setLiveScore(0);
    setTutorialStep('challenge');
    liveTimerRef.current = window.setInterval(() => {
      setLiveScore(engineRef.current?.score ?? 0);
    }, 100);
  }, [clearTutorialTimers]);

  const onChallengeResult = useCallback((success: boolean, score: number) => {
    if (!success) {
      setChallengeHint(true);
      return;
    }
    setChallengeHint(false);
    setChallengeScore(score);
  }, []);

  // Wire the engine's challenge callback once (the handler is stable).
  useEffect(() => {
    const eng = engineRef.current;
    if (eng) eng.onChallengeResult = onChallengeResult;
  }, [onChallengeResult]);

  const onChallengeContinue = useCallback(() => {
    clearTutorialTimers();
    engineRef.current?.beginRealGame();
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
    setTutorialStep(null);
  }, [clearTutorialTimers]);

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

        {tutorialStep === 'intro' && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <div className="bg-warning/90 text-white text-xs font-bold rounded-full px-3 py-1 shadow-lg animate-bounce">
              variables ↗
            </div>
          </div>
        )}

        {tutorialStep === 'challenge' && challengeScore === null && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <div className="bg-primary/90 text-white text-xs font-bold rounded-full px-3 py-1 shadow-lg animate-bounce">
              jump at s = {CHALLENGE_TARGET} ↗
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

      {/* --- Variables tutorial --- */}
      {tutorialStep === 'play' && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            onClick={onPlay}
            className="bg-primary hover:bg-primary-dark text-white font-extrabold text-lg px-10 py-3.5 rounded-2xl shadow-lg transition-colors"
          >
            ▶ Play
          </button>
          <p className="text-text-muted text-sm">Learn Algebra 1 by playing — let's go!</p>
        </div>
      )}

      {tutorialStep === 'welcome' && (
        <div className="mt-4 bg-surface border border-black/10 rounded-2xl shadow-sm p-5 text-center">
          <p className="text-2xl">👋</p>
          <h3 className="font-extrabold text-lg mt-1">Welcome to Dino Algebra!</h3>
          <p className="text-text-muted mt-1.5 text-sm max-w-md mx-auto">
            You're going to learn Algebra 1 by playing. Let's start with the biggest idea in algebra:{' '}
            <span className="font-semibold text-text">variables</span>.
          </p>
          <button
            onClick={onWelcomeNext}
            className="mt-4 bg-primary hover:bg-primary-dark text-white font-bold px-7 py-2.5 rounded-xl transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {tutorialStep === 'running' && (
        <div className="mt-4 text-center text-text-muted text-sm py-2">
          Off it goes! 🦖 Keep your eye on the <span className="font-semibold text-text">score</span> in the
          top-right…
        </div>
      )}

      {tutorialStep === 'intro' && (
        <div className="mt-4 bg-surface border border-black/10 rounded-2xl shadow-sm p-5">
          <h3 className="font-extrabold text-lg">What's a variable? 🔢</h3>
          <p className="text-text-muted mt-1.5 text-sm">
            In algebra, a <span className="font-semibold text-text">variable</span> is a symbol — like{' '}
            <span className="font-mono font-bold text-primary">x</span> — that stands for a value that can{' '}
            <span className="italic">change</span>.
          </p>
          <p className="text-text-muted mt-2 text-sm">
            See the <span className="font-semibold text-warning">score</span> and{' '}
            <span className="font-semibold text-warning">high score</span> in the top-right of the game?
            Each one is a variable — its value changes as you play. We could call the score{' '}
            <span className="font-mono font-bold text-primary">s</span> and your high score{' '}
            <span className="font-mono font-bold text-primary">h</span>.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-1.5 text-sm">
            <span className="text-text-muted">right now</span>
            <span className="font-mono font-bold text-text tabular-nums">s = {liveScore}</span>
          </div>
          <div className="mt-4">
            <button
              onClick={onIntroNext}
              className="bg-primary hover:bg-primary-dark text-white font-bold px-7 py-2.5 rounded-xl transition-colors"
            >
              Got it — my turn! →
            </button>
          </div>
        </div>
      )}

      {tutorialStep === 'challenge' && (
        <div className="mt-4 bg-surface border border-black/10 rounded-2xl shadow-sm p-5">
          {challengeScore === null ? (
            <>
              <h3 className="font-extrabold text-lg">Your turn! 🎯</h3>
              <p className="text-text-muted mt-1.5 text-sm">
                Keep your eye on the score{' '}
                <span className="font-mono font-bold text-primary">s</span> in the top-right — it's a
                variable, so its value keeps changing as you run.{' '}
                <span className="font-semibold text-text">
                  Jump the moment it reaches{' '}
                  <span className="font-mono text-primary">{CHALLENGE_TARGET}</span>!
                </span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-3 py-1.5 text-sm">
                  <span className="font-mono font-bold text-text tabular-nums">s = {liveScore}</span>
                  <span className="text-text-muted">/ {CHALLENGE_TARGET}</span>
                </div>
                <span className="text-text-muted text-xs">Press Space or tap to jump</span>
              </div>
              {challengeHint && (
                <p className="text-warning text-xs font-semibold mt-2">
                  Not yet — wait for <span className="font-mono">s</span> to reach {CHALLENGE_TARGET}.
                  Keep watching it climb!
                </p>
              )}
            </>
          ) : (
            <div className="text-center">
              <p className="text-2xl">🎉</p>
              <h3 className="font-extrabold text-lg mt-1">
                Nice! You jumped at <span className="font-mono text-primary">s = {challengeScore}</span>
              </h3>
              <p className="text-text-muted mt-1.5 text-sm max-w-md mx-auto">
                That's algebra in action — you read a variable's value and acted on it. Ready for the
                real run?
              </p>
              <button
                onClick={onChallengeContinue}
                className="mt-4 bg-primary hover:bg-primary-dark text-white font-bold px-7 py-2.5 rounded-xl transition-colors"
              >
                Play for real! →
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
