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

/** Inclusive integer in [a, b]. */
function randInt(a: number, b: number): number {
  return Math.floor(a + Math.random() * (b - a + 1));
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

/** A reinforcement checkpoint shown every 300-500 points. */
interface Reinforcement {
  quiz: Quiz;
  at: number;
}

/**
 * The Dino runner — starts at will, exactly like the classic game (press Space /
 * tap to begin, jump and duck to survive). Every 300-500 points the run freezes
 * and a quick variables question pops up; answering correctly resumes the run
 * with a brief immunity window. On death the host can offer a "continue" button
 * via `getDeathOffer` to move on to the next page.
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
  // Score at which the next reinforcement checkpoint fires (a fresh random gap
  // of 300-500 points after each), and how many have fired this run.
  const nextCheckRef = useRef(0);
  const checkCountRef = useRef(0);
  // Reinforcement dialog focus management: the modal element to trap focus in,
  // and the control that had focus before it opened (restored on close).
  const reinforceDialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

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
          // A fresh run arms the first checkpoint 300-500 points in.
          if (engine.status === 'running') {
            nextCheckRef.current = randInt(300, 500);
            checkCountRef.current = 0;
          }
          setStatus(engine.status);
        }
        // Reinforcement checkpoint: when the score crosses the next threshold,
        // freeze the run and pop a variables question. `engine.paused` is set
        // immediately so this never re-fires before the player answers.
        if (
          engine.status === 'running' &&
          !engine.paused &&
          engine.score >= nextCheckRef.current
        ) {
          engine.paused = true;
          const quiz = VARIABLE_QUESTIONS[checkCountRef.current % VARIABLE_QUESTIONS.length];
          checkCountRef.current += 1;
          setReinforce({ quiz, at: engine.score });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const isTyping = () => {
      const el = document.activeElement;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
    };
    // Focus sitting on a button/link (e.g. the game-over "Play again" button)
    // means that control owns Space/Enter — the global jump key must stand down
    // so it doesn't fire alongside the control's own activation and restart or
    // navigate twice (double-trigger).
    const isOnControl = () => {
      const el = document.activeElement as HTMLElement | null;
      return (
        !!el &&
        (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button')
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping() || isOnControl() || !activeRef.current) return;
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

  // Correct reinforcement answer: dismiss the pop-up, resume the run with a 2s
  // immunity window, and schedule the next checkpoint 300-500 points later.
  const onReinforceCorrect = useCallback(() => {
    setReinforce(null);
    const eng = engineRef.current;
    if (eng) {
      eng.paused = false;
      eng.immuneTimer = 2;
      nextCheckRef.current = eng.score + randInt(300, 500);
    }
  }, []);

  // Accessibility: trap focus within the reinforcement dialog while it is open.
  // Move focus into it on open, keep Tab / Shift+Tab cycling inside it, and
  // restore focus to the previously focused control when it closes.
  useEffect(() => {
    if (!reinforce) return;
    const dialog = reinforceDialogRef.current;
    if (!dialog) return;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);

    // Move focus into the dialog: its first focusable control, else the dialog.
    (focusable()[0] ?? dialog).focus();

    const onTrapKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      const first = items[0] ?? dialog;
      const last = items[items.length - 1] ?? dialog;
      const active = document.activeElement;
      // Focus escaped the dialog (e.g. a control unmounted) — pull it back in.
      if (!active || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey) {
        if (active === first || active === dialog) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onTrapKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onTrapKeyDown, true);
      lastFocusedRef.current?.focus?.();
    };
  }, [reinforce]);

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
          ref={reinforceDialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadein"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dino-reinforce-title"
        >
          <div className="absolute inset-0 bg-[#160f38]/85 backdrop-blur-2xl" aria-hidden />
          <div className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-3xl bg-surface shadow-2xl shadow-primary/40 ring-1 ring-white/50">
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
                topic="variables"
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
