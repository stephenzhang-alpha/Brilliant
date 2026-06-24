import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GamesLayout } from './components/layout/GamesLayout';
import { JourneyPage } from './pages/Journey';
import { LeaderboardPage } from './pages/Leaderboard';
import { LoginPage } from './pages/Login';
import { SignupPage } from './pages/Signup';
import { useAuthStore } from './stores/authStore';
import { useScoresStore } from './stores/scoresStore';

/**
 * Algebra Quest — the arcade. A standalone web app (its own entry point and
 * bundle) that shares only auth + styling with Project Equation. Uses a
 * HashRouter so its routes work as a secondary static entry without server
 * rewrites.
 */
export default function GamesApp() {
  const { initialize, user } = useAuthStore();
  const { init } = useScoresStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  useEffect(() => {
    const gameUser = user ? { uid: user.uid, email: 'email' in user ? user.email : null } : null;
    void init(gameUser);
  }, [user, init]);

  return (
    <HashRouter>
      <GamesLayout>
        <Routes>
          <Route path="/" element={<JourneyPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </GamesLayout>
    </HashRouter>
  );
}
