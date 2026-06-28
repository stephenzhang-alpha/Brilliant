import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useOverallStore } from '../../stores/overallStore';
import { STAGES } from '../../quest/stages';
import { ScoreChip } from '../score/ScoreChip';
import { AUTH_ENABLED, LEADERBOARD_ENABLED } from '../../config/features';
import { useAssistantStore } from '../../stores/assistantStore';
import pipIdle from '../../assets/assistant/pip-idle.webp';

/**
 * The slim quest top-bar shown on every page. It renders the seven stages as a
 * stepper: the current page is highlighted, earlier (unlocked) pages are live
 * links so the player can freely go back and replay, and any page beyond
 * `unlockedStage` is shown locked (🔒) and is NOT a link — this is what stops
 * the player from skipping forward before finishing the current task.
 */
export function QuestNav() {
  const { user, signOut } = useAuthStore();
  const unlockedStage = useOverallStore((s) => s.unlockedStage);
  const { pathname } = useLocation();
  // Pip is the logo; when she's down helping at a missed question her seat empties.
  const helping = useAssistantStore((s) => s.activeCount > 0);

  const pill =
    'flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-xs sm:text-sm font-display font-semibold whitespace-nowrap transition-colors';

  return (
    <nav className="sticky top-0 z-50 bg-surface/85 backdrop-blur-md border-b-2 border-primary/15 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.35)]">
      <div className="max-w-5xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-1.5 sm:gap-2">
        <Link to="/" className="flex items-center gap-2 shrink-0" title="Algebra Quest — start">
          <span aria-hidden className="relative grid h-9 w-9 shrink-0 place-items-center">
            <img
              src={pipIdle}
              alt=""
              className={`h-9 w-9 select-none object-contain transition-all duration-300 ${
                helping ? 'scale-50 opacity-0' : 'animate-bob scale-100 opacity-100'
              }`}
              draggable={false}
            />
            {/* Pip's empty seat while she's down helping at a question */}
            <span
              className={`pointer-events-none absolute text-base transition-opacity duration-300 ${
                helping ? 'animate-bob opacity-100' : 'opacity-0'
              }`}
            >
              ✨
            </span>
          </span>
          <span className="hidden lg:inline font-display font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Algebra Quest
          </span>
        </Link>

        <ol className="flex items-center gap-0.5 sm:gap-1 min-w-0 overflow-x-auto no-scrollbar">
          {STAGES.map((stage, i) => {
            const locked = stage.index > unlockedStage;
            const active = pathname === stage.path;
            const label = (
              <>
                <span aria-hidden className="text-sm leading-none">
                  {locked ? '🔒' : stage.icon}
                </span>
                <span className="hidden sm:inline">{stage.short}</span>
              </>
            );
            return (
              <li key={stage.path} className="flex items-center">
                {i > 0 && (
                  <span aria-hidden className="mx-0.5 text-text-muted/40 text-xs">
                    ›
                  </span>
                )}
                {locked ? (
                  <span
                    className={`${pill} text-text-muted/45 cursor-not-allowed`}
                    title="Locked — finish the current page to unlock"
                    aria-disabled
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    to={stage.path}
                    className={`${pill} ${
                      active
                        ? 'bg-primary text-white shadow'
                        : 'text-text hover:bg-primary/10'
                    }`}
                    title={stage.label}
                  >
                    {label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex items-center gap-2 shrink-0">
          {LEADERBOARD_ENABLED ? (
            <Link to="/leaderboard" className="shrink-0" title="Your rank & total score — leaderboard">
              <ScoreChip />
            </Link>
          ) : (
            <ScoreChip className="shrink-0" />
          )}
          {AUTH_ENABLED &&
            (user && !user.isAnonymous ? (
              <>
                <Link
                  to="/account"
                  title="Your account"
                  className="text-text-muted hover:text-text text-xs sm:text-sm whitespace-nowrap"
                >
                  Account
                </Link>
                <button
                  onClick={() => void signOut()}
                  className="text-text-muted hover:text-text text-xs sm:text-sm whitespace-nowrap"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-block text-text-muted hover:text-text text-xs sm:text-sm whitespace-nowrap"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="btn-pop bg-primary text-white text-xs sm:text-sm font-display font-bold rounded-xl px-3 py-1.5 whitespace-nowrap"
                >
                  Sign up
                </Link>
              </>
            ))}
        </div>
      </div>
    </nav>
  );
}
