import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { DinoGame } from '../components/dino/DinoGame';
import { GateRunner } from '../components/gates/GateRunner';
import { LockedLesson } from '../components/LockedLesson';
import { ScoreHud } from '../components/score/ScoreHud';
import { useAuthStore } from '../stores/authStore';
import { useOverallStore } from '../stores/overallStore';

type SectionId = 'dino' | 'gates' | 'tower';

const SKY_BG = 'linear-gradient(180deg, #9fdcff 0%, #cfeeff 55%, #f4fbff 100%)';
const GATE_BG = 'linear-gradient(180deg, #7dd3fc 0%, #a78bfa 50%, #f0abfc 100%)';
const TOWER_BG = 'linear-gradient(180deg, #312e81 0%, #6d28d9 55%, #a21caf 100%)';

/**
 * The whole arcade as ONE scrollable journey: the Dino game fills the first
 * screen, and you scroll down to the practice games (Gate Runner, then the
 * Tower), each a full-height section. Locked games show their locked state in
 * place until earned. Off-screen games freeze (via the `active` prop) to save CPU.
 */
export function JourneyPage() {
  const { user, signOut } = useAuthStore();
  const addOverall = useOverallStore((s) => s.add);
  const unlock = useOverallStore((s) => s.unlock);
  const overall = useOverallStore((s) => s.overall);
  const gatesUnlocked = useOverallStore((s) => s.gatesUnlocked);
  const towerUnlocked = useOverallStore((s) => s.towerUnlocked);

  const scrollRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const dinoRef = useRef<HTMLElement>(null);
  const gatesRef = useRef<HTMLElement>(null);
  const towerRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<SectionId>('dino');

  const scrollTo = useCallback((id: SectionId) => {
    const map: Record<SectionId, RefObject<HTMLElement | null>> = {
      dino: dinoRef,
      gates: gatesRef,
      tower: towerRef,
    };
    const el = map[id].current;
    const root = scrollRef.current;
    // Scroll the journey container directly using measured positions (robust
    // regardless of offsetParent / scroll-snap) so every "Next" button reliably
    // sends the player down to the next game.
    if (el && root) {
      const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
      root.scrollTo({ top: Math.max(0, Math.round(top)), behavior: 'smooth' });
    } else {
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Track the in-view section so off-screen games can pause.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.section as SectionId);
        });
      },
      { root, threshold: 0.55 },
    );
    [dinoRef, gatesRef, towerRef].forEach((r) => r.current && obs.observe(r.current));
    return () => obs.disconnect();
  }, []);

  // Paint the journey scroll-progress line + bar elevation directly (no React
  // re-render per frame, so the running games aren't disturbed while scrolling).
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = root.scrollHeight - root.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
      if (barRef.current) barRef.current.classList.toggle('is-scrolled', root.scrollTop > 6);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Dino: the first finished run unlocks Gate Runner.
  const getDeathOffer = () => {
    const st = useOverallStore.getState();
    if (!st.gatesUnlocked) {
      st.unlock('gates');
      return {
        label: 'Scroll down to Gate Runner ↓',
        note: '🎉 Stage 2 unlocked — Expressions!',
        onNext: () => scrollTo('gates'),
      };
    }
    if (!st.towerUnlocked) {
      return {
        label: 'Practice Gate Runner ↓',
        note: 'Finish Gate Runner to unlock Stage 3!',
        onNext: () => scrollTo('gates'),
      };
    }
    return null;
  };

  // Tower iframe bridge — bank the hero's final power once on victory.
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const bankedRef = useRef(false);
  const [towerResult, setTowerResult] = useState<number | null>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'atb:victory' && typeof data.power === 'number') {
        if (bankedRef.current) return;
        bankedRef.current = true;
        addOverall(data.power, 'tower');
        setTowerResult(data.power);
      } else if (data.type === 'atb:reset') {
        bankedRef.current = false;
        setTowerResult(null);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [addOverall]);

  const towerSrc = `${import.meta.env.BASE_URL}algebra-tower-battler.html`;

  const tab = (id: SectionId, label: string, locked = false) => (
    <button
      onClick={() => scrollTo(id)}
      title={locked ? 'Locked — finish the previous game to unlock' : undefined}
      className={`text-xs sm:text-sm rounded-full px-2.5 py-1 font-display font-semibold transition-colors whitespace-nowrap ${
        active === id
          ? 'bg-white text-violet-700 shadow'
          : locked
            ? 'text-white/50'
            : 'text-white/85 hover:bg-white/20'
      }`}
    >
      {locked ? <span aria-hidden>🔒 </span> : null}
      {label}
    </button>
  );

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-40 overflow-y-auto"
      style={{ scrollSnapType: 'y proximity', scrollPaddingTop: '3.5rem' }}
    >
      {/* Slim floating bar that follows the scroll */}
      <div
        ref={barRef}
        className="journey-bar sticky top-0 z-30 flex items-center justify-between gap-2 px-2 sm:px-3 py-2 bg-black/25 backdrop-blur-md"
      >
        <div className="flex items-center gap-0.5 sm:gap-1 min-w-0 overflow-x-auto no-scrollbar">
          <span className="text-xl mr-0.5 sm:mr-1 animate-bob" aria-hidden>🧮</span>
          {tab('dino', 'Dino')}
          {tab('gates', 'Gates', !gatesUnlocked)}
          {tab('tower', 'Pull the Pin', !towerUnlocked)}
          <Link
            to="/leaderboard"
            className="text-xs sm:text-sm rounded-full px-2.5 py-1 font-display font-semibold text-white/85 hover:bg-white/20 whitespace-nowrap"
          >
            Ranks
          </Link>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ScoreHud />
          {user ? (
            <button
              onClick={() => void signOut()}
              className="text-white/75 hover:text-white text-xs whitespace-nowrap"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/signup"
              className="bg-white text-violet-700 text-xs font-display font-bold rounded-full px-3 py-1 whitespace-nowrap"
            >
              Sign up
            </Link>
          )}
        </div>
        {/* Continuous journey scroll-progress line */}
        <div
          ref={progressRef}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-cyan via-accent to-amber"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {/* Stage 1 — Dino (intro: variables) */}
      <section
        ref={dinoRef}
        data-section="dino"
        className="min-h-[100dvh] flex flex-col items-center justify-center px-2 py-6"
        style={{ background: SKY_BG, scrollSnapAlign: 'start' }}
      >
        <div className="w-full" style={{ maxWidth: 920 }}>
          <DinoGame
            active={active === 'dino'}
            getDeathOffer={getDeathOffer}
            onRunScore={(s) => addOverall(s, 'dino')}
          />
        </div>
        <button
          onClick={() => scrollTo('gates')}
          className="mt-6 text-slate-700/80 hover:text-slate-900 text-sm font-display font-semibold animate-bob"
        >
          ↓ practice games below
        </button>
      </section>

      {/* Stage 2 — Gate Runner (practice: expressions) */}
      <section
        ref={gatesRef}
        data-section="gates"
        className="min-h-[100dvh] flex flex-col items-center justify-center px-2 py-6"
        style={{ background: GATE_BG, scrollSnapAlign: 'start' }}
      >
        {gatesUnlocked ? (
          <>
            <div className="w-full" style={{ maxWidth: 460 }}>
              <GateRunner
                active={active === 'gates'}
                onFinish={(c) => {
                  addOverall(c, 'gates');
                  unlock('tower');
                }}
                onNext={() => scrollTo('tower')}
              />
            </div>
            <button
              onClick={() => scrollTo('tower')}
              className="mt-6 text-white/90 hover:text-white text-sm font-display font-semibold animate-bob"
            >
              ↓ practice games below
            </button>
          </>
        ) : (
          <LockedLesson
            lessonLabel="Stage 2 · Expressions"
            title="Gate Runner is locked"
            requirement="Play Dino Runner above and finish a run to unlock this game."
            ctaLabel="↑ Back to Dino Runner"
            onCta={() => scrollTo('dino')}
          />
        )}
      </section>

      {/* Stage 3 — Pull the Pin (practice: variables & evaluating expressions) */}
      <section
        ref={towerRef}
        data-section="tower"
        className="min-h-[100dvh] flex flex-col items-center justify-center px-2 py-6"
        style={{ background: TOWER_BG, scrollSnapAlign: 'start' }}
      >
        {towerUnlocked ? (
          <div className="relative w-full" style={{ maxWidth: 1100 }}>
            <iframe
              ref={frameRef}
              src={towerSrc}
              title="Pull the Pin"
              className="w-full block rounded-2xl border-2 border-white/15 shadow-2xl bg-[#1b1640]"
              style={{ height: 'calc(100dvh - 6.5rem)' }}
            />
            {towerResult !== null && (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <div className="bg-white rounded-2xl p-6 text-center shadow-2xl max-w-sm">
                  <p className="text-3xl">🏆</p>
                  <p className="font-display font-extrabold text-xl mt-1">Pull the Pin cleared!</p>
                  <p className="text-text-muted text-sm mt-1">
                    You banked <span className="font-bold text-success">+{towerResult.toLocaleString()}</span>{' '}
                    points into your total (now{' '}
                    <span className="font-bold text-primary">{overall.toLocaleString()}</span>).
                  </p>
                  <button
                    onClick={() => scrollTo('dino')}
                    className="mt-4 bg-primary hover:bg-primary-dark text-white font-bold px-7 py-3 rounded-xl transition-colors"
                  >
                    ↑ Back to the top
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <LockedLesson
            lessonLabel="Stage 3 · Variables & Expressions"
            title="Pull the Pin is locked"
            requirement="Finish the Gate Runner above to unlock the Pull the Pin puzzle."
            ctaLabel={gatesUnlocked ? '↑ Back to Gate Runner' : '↑ Back to Dino Runner'}
            onCta={() => scrollTo(gatesUnlocked ? 'gates' : 'dino')}
          />
        )}
      </section>
    </div>
  );
}
