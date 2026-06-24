import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useOverallStore } from '../stores/overallStore';

interface GameShellProps {
  /** Full-bleed background (CSS) — match the game's sky/track so it feels endless. */
  bg: string;
  /** Max width of the centered play column. */
  maxWidth: number;
  /** The game itself (fills the column width). */
  children: ReactNode;
  /** Optional content rendered under the game (legends, tutorial panels). */
  footer?: ReactNode;
}

/**
 * Full-viewport, immersive frame shared by every game. The standard site nav is
 * hidden on game routes (see GamesLayout); this slim floating bar carries the
 * lesson switcher, the overall score, and auth — so the game itself fills the
 * entire page edge to edge.
 */
export function GameShell({ bg, maxWidth, children, footer }: GameShellProps) {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const overall = useOverallStore((s) => s.overall);
  const lastGain = useOverallStore((s) => s.lastGain);
  const gatesUnlocked = useOverallStore((s) => s.gatesUnlocked);
  const towerUnlocked = useOverallStore((s) => s.towerUnlocked);

  const tab = (to: string, label: string, locked = false) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        title={locked ? 'Locked — finish the previous game to unlock' : undefined}
        className={`text-xs sm:text-sm rounded-full px-2.5 py-1 font-display font-semibold transition-colors whitespace-nowrap ${
          active
            ? 'bg-white text-violet-700 shadow'
            : locked
              ? 'text-white/50'
              : 'text-white/85 hover:bg-white/20'
        }`}
      >
        {locked ? <span aria-hidden>🔒 </span> : null}
        {label}
      </Link>
    );
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto" style={{ background: bg }}>
      {/* Slim floating top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 px-2 sm:px-3 py-2 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
          <Link to="/" aria-label="Algebra Quest home" className="text-xl mr-0.5 sm:mr-1 shrink-0 animate-bob">
            🦖
          </Link>
          {tab('/', 'Dino')}
          {tab('/gates', 'Gates', !gatesUnlocked)}
          {tab('/tower', 'Tower', !towerUnlocked)}
          {tab('/leaderboard', 'Ranks')}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="relative flex items-center gap-1 bg-amber-400 text-amber-950 rounded-full px-2.5 sm:px-3 py-1 font-display font-bold tabular-nums shadow"
            title="Your total score across all three games"
          >
            <span aria-hidden>⭐</span>
            <span key={lastGain?.at ?? 'init'} className={lastGain ? 'animate-pop' : ''}>
              {overall.toLocaleString()}
            </span>
            {lastGain && (
              <span
                key={`gain-${lastGain.at}`}
                className="animate-floatup pointer-events-none absolute -top-4 right-2 text-success font-display font-bold text-sm"
              >
                +{lastGain.points.toLocaleString()}
              </span>
            )}
          </div>
          {user ? (
            <button
              onClick={() => {
                void signOut();
                navigate('/');
              }}
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
      </div>

      {/* Centered play column */}
      <div className="min-h-[calc(100dvh-3.25rem)] flex flex-col items-center justify-center px-2 py-3">
        <div className="w-full" style={{ maxWidth }}>
          {children}
        </div>
        {footer ? (
          <div className="w-full mt-3" style={{ maxWidth }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
