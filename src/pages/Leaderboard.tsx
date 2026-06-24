import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useScoresStore, GameUser } from '../stores/scoresStore';
import { isFirebaseConfigured } from '../firebase/config';

function medal(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
}

export function LeaderboardPage() {
  const { user } = useAuthStore();
  const { best, leaderboard, leaderboardLoading, leaderboardError, loadLeaderboard } =
    useScoresStore();

  const gameUser: GameUser | null = user
    ? { uid: user.uid, email: 'email' in user ? user.email : null }
    : null;

  useEffect(() => {
    loadLeaderboard(gameUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Leaderboard</h1>
        <Link
          to="/"
          className="text-sm bg-primary hover:bg-primary-dark text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          ← Play
        </Link>
      </div>

      <div className="bg-surface shadow-sm border border-black/10 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
        <span className="text-text-muted">Your personal best</span>
        <span className="text-2xl font-extrabold text-primary-light tabular-nums">
          {best.toLocaleString()}
        </span>
      </div>

      {!isFirebaseConfigured && (
        <p className="text-sm text-text-muted bg-surface border border-black/10 rounded-lg px-4 py-3">
          The global leaderboard needs Firebase configured. Your best score is saved locally on this
          device.
        </p>
      )}

      {isFirebaseConfigured && !user && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 text-center">
          <p className="text-text">Sign in to view the global leaderboard and post your scores.</p>
          <Link
            to="/login"
            className="inline-block mt-3 bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}

      {isFirebaseConfigured && user && (
        <>
          {leaderboardLoading && (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-4 border-primary-light border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!leaderboardLoading && leaderboardError && (
            <p className="text-sm text-error bg-error/10 border border-error/30 rounded-lg px-4 py-3">
              {leaderboardError}
            </p>
          )}

          {!leaderboardLoading && !leaderboardError && leaderboard.length === 0 && (
            <p className="text-sm text-text-muted bg-surface border border-black/10 rounded-lg px-4 py-3">
              No scores yet. Go set the first record!
            </p>
          )}

          {!leaderboardLoading && leaderboard.length > 0 && (
            <ol className="space-y-1.5">
              {leaderboard.map((row, i) => {
                const rank = i + 1;
                const isMe = row.uid === user.uid;
                return (
                  <li
                    key={row.uid}
                    className={`flex items-center justify-between rounded-lg px-4 py-2.5 border ${
                      isMe ? 'bg-primary/15 border-primary/40' : 'bg-surface border-black/10'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-right text-text-muted tabular-nums">{rank}</span>
                      <span className="font-medium truncate">
                        {row.name} {medal(rank)}
                        {isMe && <span className="text-primary-light text-xs ml-1">(you)</span>}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums text-primary-light">
                      {row.score.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
