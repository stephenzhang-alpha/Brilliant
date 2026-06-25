import { useEffect, useRef, useState, useCallback } from 'react';
import { DinoGame as Engine, GameStatus } from '../../game/dino/engine';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../../game/dino/constants';
import { useAuthStore } from '../../stores/authStore';
import { useScoresStore, GameUser } from '../../stores/scoresStore';
import { ConceptCheck } from '../quiz/ConceptCheck';
import { VARIABLE_QUESTIONS, type Quiz } from '../../content/quizQuestions';

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

/** A "play this other game" prompt surfaced on a Dino death. */
export interface DeathOffer {
  label: string;
  note: string;
  onNext: () => void;
}

interface DinoGameProps {
  /**
   * Called once per death. Return an offer to surface a "Next" button that
   * transitions to another page, or null for a normal game-over screen.
   */
  getDeathOffer?: () => DeathOffer | null;
  /** Called with the run's score each time the player dies (feeds overall score). */
  onRunScore?: (score: number) => void;
  /** When false (scrolled off-screen), the simulation freezes to save CPU. */
  active?: boolean;
}

/** A reinforcement checkpoint shown every 1000 points. */
interface Reinforcement {
  quiz: Quiz;
  at: number;
}

/**
 * The Dino runner — starts at will, exactly like the classic game (press Space /
 * tap to begin, jump and duck to survive). Every time the score crosses a new
 * multiple of 1000 the run freezes and a quick variables question pops up; a
 * correct answer resumes the run. On death the host can offer a "continue"
 * button via `getDeathOffer` to move on to the next page.
 */
export function DinoGame({ getDeathOffer, onRunScore, active = true }: DinoGameProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const [status, setStatus] = useState<GameStatus>('ready');
  const [lastScore, setLastScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [offer, setOffer] = useState<DeathOffer | null>(null);
  const [reinforce, setReinforce] = useState<Reinforcement | null>(null);

  const best = useScoresStore((s) => s.best);

  // Latest values readable from the stable game-over / input closures.
  const getDeathOfferRef = useRef(getDeathOffer);
  const onRunScoreRef = useRef(onRunScore);
  const activeRef = useRef(active);
  const reinforceRef = useRef(reinforce);
  // Highest 1000-point milestone already quizzed this run (0 = none yet).
  const kiloRef = useRef(0);

  useEffect(() => {
    getDeathOfferRef.current = getDeathOffer;
    onRunScoreRef.current = onRunScore;
    activeRef.current = active;
    reinforceRef.current = reinforce;
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

    // Every 1000 points: freeze the run and pop a variables reinforcement check.
    engine.onMilestone = (score) => {
      const kilo = Math.floor(score / 1000);
      if (kilo <= kiloRef.current) return;
      kiloRef.current = kilo;
      engine.paused = true;
      const quiz = VARIABLE_QUESTIONS[(kilo - 1) % VARIABLE_QUESTIONS.length];
      setReinforce({ quiz, at: kilo * 1000 });
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
          // A fresh run starts the milestone counter over.
          if (engine.status === 'running') kiloRef.current = 0;
          setStatus(engine.status);
        }
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
      // While a reinforcement question owns the screen, controls are inert.
      if (reinforceRef.current) return;
      if (isJumpEvent(e)) {
        e.preventDefault();
        if (!e.repeat) engine.primary(); // start, jump, or restart (context-aware)
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

  // --- Touch / pointer controls -------------------------------------------
  const onPlayfieldPointerDown = useCallback(() => {
    if (reinforceRef.current) return;
    engineRef.current?.primary();
  }, []);
  const onPlayfieldPointerUp = useCallback(() => {
    engineRef.current?.releaseJump();
  }, []);

  // Correct reinforcement answer: dismiss the pop-up and resume the run.
  const onReinforceCorrect = useCallback(() => {
    setReinforce(null);
    const eng = engineRef.current;
    if (eng) eng.paused = false;
  }, []);

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
          className={[
            'block w-full h-full transition duration-300 ease-out',
            reinforce ? 'opacity-[0.18] blur-[2px] saturate-50' : 'opacity-100',
          ].join(' ')}
          style={{ imageRendering: 'pixelated' }}
        />

        {status === 'ready' && !reinforce && (
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
                      engineRef.current?.start();
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
                    engineRef.current?.start();
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

      {/* Reinforcement checkpoint: a centered modal over the frozen, dimmed run.
          Correct answer resumes; wrong answers just nudge and let them retry. */}
      {reinforce && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadein"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dino-reinforce-title"
        >
          <div className="absolute inset-0 bg-[#160f38]/85 backdrop-blur-2xl" aria-hidden />
          <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl bg-surface shadow-2xl shadow-primary/40 ring-1 ring-white/50">
            <div className="flex items-center gap-3 bg-gradient-to-r from-primary via-accent to-cyan px-5 py-4 sm:px-6">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 text-2xl animate-bob"
                aria-hidden
              >
                🏁
              </span>
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  {reinforce.at.toLocaleString()} points!
                </span>
                <p
                  id="dino-reinforce-title"
                  className="font-display text-xl font-extrabold leading-tight text-white"
                >
                  Variables checkpoint
                </p>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <ConceptCheck
                question={reinforce.quiz.question}
                prompt={reinforce.quiz.prompt}
                options={reinforce.quiz.options}
                columns={reinforce.quiz.columns}
                ctaLabel="Keep running →"
                onCorrect={onReinforceCorrect}
              />
            </div>
          </div>
        </div>
      )}

      {/* On-screen controls for touch devices */}
      <div className="mt-3 flex gap-3 sm:hidden">
        <button
          className="flex-1 bg-surface border border-black/10 rounded-xl py-4 font-semibold text-text active:bg-surface-light"
          onPointerDown={(e) => {
            e.preventDefault();
            if (reinforceRef.current) return;
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
            if (reinforceRef.current) return;
            engineRef.current?.setDuck(true);
          }}
          onPointerUp={() => engineRef.current?.setDuck(false)}
          onPointerLeave={() => engineRef.current?.setDuck(false)}
        >
          Duck
        </button>
      </div>
    </div>
  );
}
