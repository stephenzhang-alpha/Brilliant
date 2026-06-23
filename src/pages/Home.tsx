import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function HomePage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-2xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Learn Algebra by <span className="text-primary-light">Doing</span>
          </h1>
          <p className="text-lg text-text-muted max-w-md mx-auto">
            No videos. No memorization. Drag equations, balance scales, and plot lines until algebra clicks.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link
              to="/course"
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-8 py-3 rounded-xl transition-colors text-lg"
            >
              Continue Learning
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="bg-primary hover:bg-primary-dark text-white font-semibold px-8 py-3 rounded-xl transition-colors text-lg"
              >
                Start Learning Free
              </Link>
              <Link
                to="/login"
                className="border border-white/20 hover:border-white/40 text-text-muted hover:text-text font-medium px-8 py-3 rounded-xl transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-12">
          <div className="bg-surface/50 border border-white/10 rounded-xl p-5 text-left">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold mb-1">Drag to Solve</h3>
            <p className="text-sm text-text-muted">Move terms across equations and watch signs flip in real time.</p>
          </div>
          <div className="bg-surface/50 border border-white/10 rounded-xl p-5 text-left">
            <div className="text-2xl mb-2">⚖️</div>
            <h3 className="font-semibold mb-1">Visual Balance</h3>
            <p className="text-sm text-text-muted">See equations as a scale that tilts when unbalanced.</p>
          </div>
          <div className="bg-surface/50 border border-white/10 rounded-xl p-5 text-left">
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-semibold mb-1">Plot Lines</h3>
            <p className="text-sm text-text-muted">Drag points on a grid to build linear equations visually.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
