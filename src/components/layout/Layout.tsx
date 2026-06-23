import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useProgressStore } from '../../stores/progressStore';

export function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuthStore();
  const { progress } = useProgressStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-surface/80 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-primary-light">eq</span>
            <span className="text-text">Project Equation</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {user && progress && (
              <>
                <Link to="/course" className="text-sm text-text-muted hover:text-text transition-colors">
                  Course
                </Link>
                <div className="flex items-center gap-1 text-warning text-sm font-medium">
                  <span>🔥</span>
                  <span>{progress.streak.current}</span>
                </div>
                <div className="text-sm text-primary-light font-medium hidden sm:block">
                  {progress.totalXp} XP
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-text-muted hover:text-text transition-colors"
                >
                  Sign Out
                </button>
              </>
            )}
            {!user && (
              <>
                <Link to="/login" className="text-sm text-text-muted hover:text-text transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-sm bg-primary hover:bg-primary-dark px-4 py-1.5 rounded-lg transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}
