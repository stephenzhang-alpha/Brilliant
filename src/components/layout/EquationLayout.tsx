import { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

// Full-page link to the separate arcade app (its own entry point / bundle).
const GAMES_URL = `${import.meta.env.BASE_URL}games/`;

export function EquationLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const onRoadmap = pathname === '/';

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-surface/85 backdrop-blur-md border-b-2 border-primary/15 sticky top-0 z-50 shadow-[0_4px_20px_-8px_rgba(124,58,237,0.35)]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span aria-hidden className="text-2xl">➗</span>
            <span className="font-display font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Project Equation
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              to="/"
              className={`text-sm rounded-full px-3 py-1.5 transition-colors ${
                onRoadmap
                  ? 'bg-primary/15 text-primary font-bold'
                  : 'text-text-muted hover:text-text hover:bg-primary/5'
              }`}
            >
              Roadmap
            </Link>

            <a
              href={GAMES_URL}
              className="text-sm rounded-full px-3 py-1.5 text-text-muted hover:text-text hover:bg-primary/5 transition-colors"
              title="Open the Algebra Quest arcade"
            >
              Games <span aria-hidden>↗</span>
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

      <main className="flex-1">
        <div key={pathname} className="animate-fadein">
          {children}
        </div>
      </main>
    </div>
  );
}
