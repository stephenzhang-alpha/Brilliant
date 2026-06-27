import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GamesLayout } from './components/layout/GamesLayout';
import { IntroPage } from './pages/Intro';
import { DinoPage } from './pages/DinoPage';
import { ExpressionsPage } from './pages/Expressions';
import { GatesPage } from './pages/GatesPage';
import { PinsPage } from './pages/PinsPage';
import { ScalesPage } from './pages/Scales';
import { BalancePage } from './pages/BalancePage';
import { LeaderboardPage } from './pages/Leaderboard';
import { LoginPage } from './pages/Login';
import { SignupPage } from './pages/Signup';
import { StageGuard } from './quest/StageGuard';
import { useAuthStore } from './stores/authStore';
import { useScoresStore } from './stores/scoresStore';
import { LEADERBOARD_ENABLED } from './config/features';

/**
 * Algebra Quest — the root app. A single-page app served at the site root that
 * uses a HashRouter so its routes work as static files without server rewrites.
 *
 * The quest is seven gated pages (Intro → Dino → Expressions → Gate Runner →
 * Pull the Pins → Equations & Inequalities → Balance Game). Each page is wrapped
 * in a <StageGuard> so it can only be opened once the previous page's task is
 * complete; the player may always go back and replay earlier pages.
 *
 * The global leaderboard + sign-in are a dormant feature (see
 * `config/features.ts`); their routes and the auth/scores wiring stay off until
 * `LEADERBOARD_ENABLED` is flipped on.
 */
export default function GamesApp() {
  const { initialize, user } = useAuthStore();
  const { init } = useScoresStore();

  useEffect(() => {
    if (!LEADERBOARD_ENABLED) return;
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  useEffect(() => {
    if (!LEADERBOARD_ENABLED) return;
    const gameUser = user ? { uid: user.uid, email: 'email' in user ? user.email : null } : null;
    void init(gameUser);
  }, [user, init]);

  return (
    <HashRouter>
      <GamesLayout>
        <Routes>
          <Route path="/" element={<StageGuard index={0}><IntroPage /></StageGuard>} />
          <Route path="/dino" element={<StageGuard index={1}><DinoPage /></StageGuard>} />
          <Route
            path="/expressions"
            element={<StageGuard index={2}><ExpressionsPage /></StageGuard>}
          />
          <Route path="/gates" element={<StageGuard index={3}><GatesPage /></StageGuard>} />
          <Route path="/pins" element={<StageGuard index={4}><PinsPage /></StageGuard>} />
          <Route path="/scales" element={<StageGuard index={5}><ScalesPage /></StageGuard>} />
          <Route path="/balance" element={<StageGuard index={6}><BalancePage /></StageGuard>} />
          {/* Dormant feature: routes redirect home until LEADERBOARD_ENABLED is on. */}
          <Route
            path="/leaderboard"
            element={LEADERBOARD_ENABLED ? <LeaderboardPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/login"
            element={LEADERBOARD_ENABLED ? <LoginPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/signup"
            element={LEADERBOARD_ENABLED ? <SignupPage /> : <Navigate to="/" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </GamesLayout>
    </HashRouter>
  );
}
