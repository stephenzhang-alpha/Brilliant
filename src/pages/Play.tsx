import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DinoGame } from '../components/dino/DinoGame';
import { useAuthStore } from '../stores/authStore';
import { useScoresStore, GameUser } from '../stores/scoresStore';
import { useOverallStore } from '../stores/overallStore';

export function PlayPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const addOverall = useOverallStore((s) => s.add);

  // Progression gating: practice games appear only after the prior lesson.
  //   First Dino run that ends -> unlock Gate Runner (Lesson 2: Expressions)
  //   (Algebra Tower / Lesson 3 unlocks when Gate Runner is finished.)
  const getDeathOffer = () => {
    const { gatesUnlocked, towerUnlocked, unlock } = useOverallStore.getState();
    if (!gatesUnlocked) {
      unlock('gates');
      return {
        label: 'Play Gate Runner →',
        note: '🎉 Stage 2 unlocked — Expressions!',
        onNext: () => navigate('/gates'),
      };
    }
    if (!towerUnlocked) {
      return {
        label: 'Practice Gate Runner →',
        note: 'Finish Gate Runner to unlock Stage 3!',
        onNext: () => navigate('/gates'),
      };
    }
    return null;
  };
  const {
    best,
    playerName,
    leaderboard,
    setPlayerName,
    loadLeaderboard,
  } = useScoresStore();

  const gameUser: GameUser | null = user
    ? { uid: user.uid, email: 'email' in user ? user.email : null }
    : null;

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(playerName);

  useEffect(() => {
    if (user) loadLeaderboard(gameUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openNameEditor = () => {
    setNameDraft(playerName);
    setEditingName(true);
  };

  const saveName = async () => {
    await setPlayerName(nameDraft, gameUser);
    setEditingName(false);
  };

  const topRows = leaderboard.slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-6">
        <p className="text-xs font-bold tracking-[0.25em] text-text-muted uppercase">
          Stage 1 · Variables
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
          Dino <span className="text-primary-light">Runner</span>
        </h1>
        <p className="text-text-muted mt-2">
          Jump the cacti, duck the pterodactyls, and chase a new high score.
        </p>
      </div>

      {/* Stat bar */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-5 text-sm">
        <div className="bg-surface shadow-sm border border-black/10 rounded-full px-4 py-1.5">
          <span className="text-text-muted">Best</span>{' '}
          <span className="font-bold text-primary-light tabular-nums">{best.toLocaleString()}</span>
        </div>

        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={20}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveName();
                if (e.key === 'Escape') setEditingName(false);
              }}
              className="bg-surface border border-black/10 rounded-full px-4 py-1.5 text-text focus:outline-none focus:border-primary-light w-40"
              placeholder="Your handle"
            />
            <button
              onClick={saveName}
              className="bg-primary hover:bg-primary-dark text-white rounded-full px-4 py-1.5 font-medium"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={openNameEditor}
            className="bg-surface shadow-sm border border-black/10 rounded-full px-4 py-1.5 hover:border-black/20 transition-colors"
            title="Change your leaderboard handle"
          >
            <span className="text-text-muted">Playing as</span>{' '}
            <span className="font-semibold">{playerName}</span>
            <span className="text-text-muted ml-1">✎</span>
          </button>
        )}
      </div>

      <DinoGame
        getDeathOffer={getDeathOffer}
        onRunScore={(score) => addOverall(score, 'dino')}
      />

      {/* Keyboard legend (desktop) */}
      <div className="hidden sm:flex items-center justify-center gap-6 mt-4 text-sm text-text-muted">
        <span><kbd className="px-2 py-0.5 bg-surface rounded border border-black/10">Space</kbd> / <kbd className="px-2 py-0.5 bg-surface rounded border border-black/10">↑</kbd> Jump</span>
        <span><kbd className="px-2 py-0.5 bg-surface rounded border border-black/10">↓</kbd> Duck</span>
      </div>

      {!user && (
        <div className="mt-6 bg-primary/10 border border-primary/30 rounded-xl p-4 text-center text-sm">
          <Link to="/login" className="text-primary-light font-semibold hover:underline">Sign in</Link>{' '}
          to save your scores to the global leaderboard and sync across devices.
        </div>
      )}

      {/* Mini leaderboard */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Top runners</h2>
          <Link to="/leaderboard" className="text-sm text-primary-light hover:underline">
            View all →
          </Link>
        </div>
        {user && topRows.length > 0 ? (
          <ol className="space-y-1.5">
            {topRows.map((row, i) => (
              <li
                key={row.uid}
                className={`flex items-center justify-between rounded-lg px-4 py-2 border ${
                  row.uid === user.uid
                    ? 'bg-primary/15 border-primary/40'
                    : 'bg-surface border-black/10'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-5 text-right text-text-muted tabular-nums">{i + 1}</span>
                  <span className="font-medium truncate max-w-[12rem]">{row.name}</span>
                </span>
                <span className="font-bold tabular-nums text-primary-light">
                  {row.score.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-text-muted bg-surface border border-black/10 rounded-lg px-4 py-3">
            {user
              ? 'No scores yet — be the first to set a record!'
              : 'Sign in to see the global leaderboard.'}
          </p>
        )}
      </div>
    </div>
  );
}
