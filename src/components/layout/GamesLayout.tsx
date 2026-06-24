import { ReactNode, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { RANKS, useOverallStore } from '../../stores/overallStore';
import { Confetti } from '../score/Confetti';
import { ScoreChip } from '../score/ScoreHud';

const UNLOCK_INFO: Record<'gates' | 'tower', { label: string }> = {
  gates: { label: 'Gate Runner (Expressions)' },
  tower: { label: 'Pull the Pin (Variables & Expressions)' },
};

// Full-page link back to the separate Project Equation course app.
const EQUATION_URL = import.meta.env.BASE_URL;

export function GamesLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuthStore();
  const justUnlocked = useOverallStore((s) => s.justUnlocked);
  const clearJustUnlocked = useOverallStore((s) => s.clearJustUnlocked);
  const justRankedUp = useOverallStore((s) => s.justRankedUp);
  const clearRankUp = useOverallStore((s) => s.clearRankUp);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Auto-dismiss the "lesson unlocked!" celebration (scheduled, not a sync setState).
  useEffect(() => {
    if (!justUnlocked) return;
    const t = setTimeout(() => clearJustUnlocked(), 4500);
    return () => clearTimeout(t);
  }, [justUnlocked, clearJustUnlocked]);

  // Auto-dismiss the rank-up celebration.
  useEffect(() => {
    if (justRankedUp === null) return;
    const t = setTimeout(() => clearRankUp(), 4200);
    return () => clearTimeout(t);
  }, [justRankedUp, clearRankUp]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // The journey ("/") renders full-screen immersive with its own floating bar,
  // so the standard site nav is hidden there.
  const isGameRoute = pathname === '/';

  const navLink = (to: string, label: string, locked = false) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`text-sm rounded-full px-3 py-1.5 transition-colors ${
          active
            ? 'bg-primary/15 text-primary font-bold'
            : locked
              ? 'text-text-muted/50 hover:text-text-muted'
              : 'text-text-muted hover:text-text hover:bg-primary/5'
        }`}
        title={locked ? 'Locked — complete the previous game to unlock' : undefined}
      >
        {locked ? <span aria-hidden className="mr-0.5">🔒</span> : null}
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {!isGameRoute && (
      <nav className="bg-surface/85 backdrop-blur-md border-b-2 border-primary/15 sticky top-0 z-50 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.35)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span aria-hidden className="text-2xl animate-bob">🦖</span>
              <span className="hidden md:inline font-display font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Algebra Quest
              </span>
            </Link>
            <Link to="/leaderboard" className="shrink-0" title="Your rank & total score — view the leaderboard">
              <ScoreChip />
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {navLink('/', 'Play')}
            {navLink('/leaderboard', 'Ranks')}
            <a
              href={EQUATION_URL}
              className="hidden sm:inline text-sm rounded-full px-3 py-1.5 text-text-muted hover:text-text hover:bg-primary/5 transition-colors"
              title="Back to the Project Equation course"
            >
              <span aria-hidden>↗</span> Course
            </a>
            {user ? (
              <button
                onClick={handleSignOut}
                className="text-sm text-text-muted hover:text-text transition-colors px-2"
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/signup"
                className="btn-pop text-sm font-display font-semibold bg-primary text-white px-4 py-1.5 rounded-xl ml-1"
              >
                Sign Up
              </Link>
            )}
          </div>
        </div>
      </nav>
      )}

      <Confetti token={justUnlocked} />
      <Confetti token={justRankedUp} />

      {justUnlocked && (
        <button
          key={justUnlocked}
          onClick={() => {
            const id = justUnlocked;
            clearJustUnlocked();
            document.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="animate-toast fixed left-1/2 top-20 z-[60] max-w-[92vw] bg-gradient-to-r from-primary to-accent text-white font-display font-semibold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-left"
        >
          <span aria-hidden className="text-xl shrink-0">🎉</span>
          <span>New game unlocked: {UNLOCK_INFO[justUnlocked].label} — tap to play!</span>
        </button>
      )}

      {justRankedUp !== null && (
        <button
          key={`rank-${justRankedUp}`}
          onClick={() => clearRankUp()}
          className="animate-toast fixed left-1/2 bottom-6 z-[60] max-w-[92vw] flex items-center gap-3 rounded-2xl px-5 py-3 text-white shadow-2xl"
          style={{ background: `linear-gradient(90deg, ${RANKS[justRankedUp].color}, #7c3aed)` }}
        >
          <span aria-hidden className="animate-rankpop text-3xl shrink-0">
            {RANKS[justRankedUp].icon}
          </span>
          <span className="text-left">
            <span className="block font-display font-extrabold leading-tight">Rank up!</span>
            <span className="block text-sm text-white/90">
              You reached {RANKS[justRankedUp].name}
            </span>
          </span>
        </button>
      )}

      {isGameRoute ? (
        children
      ) : (
        <main className="flex-1">
          <div key={pathname} className="animate-fadein">
            {children}
          </div>
        </main>
      )}
    </div>
  );
}
