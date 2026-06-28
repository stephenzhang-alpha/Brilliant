import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GamesLayout } from './components/layout/GamesLayout';
import { StageGuard } from './quest/StageGuard';

// Route-level code splitting: each page (and its canvas engine / embedded game)
// loads on demand, so the initial bundle only pays for the layout + stage 0.
const IntroPage = lazy(() => import('./pages/Intro').then((m) => ({ default: m.IntroPage })));
const DinoPage = lazy(() => import('./pages/DinoPage').then((m) => ({ default: m.DinoPage })));
const ExpressionsPage = lazy(() =>
  import('./pages/Expressions').then((m) => ({ default: m.ExpressionsPage })),
);
const GatesPage = lazy(() => import('./pages/GatesPage').then((m) => ({ default: m.GatesPage })));
const PinsPage = lazy(() => import('./pages/PinsPage').then((m) => ({ default: m.PinsPage })));
const ScalesPage = lazy(() => import('./pages/Scales').then((m) => ({ default: m.ScalesPage })));
const BalancePage = lazy(() =>
  import('./pages/BalancePage').then((m) => ({ default: m.BalancePage })),
);
const LeaderboardPage = lazy(() =>
  import('./pages/Leaderboard').then((m) => ({ default: m.LeaderboardPage })),
);
const LoginPage = lazy(() => import('./pages/Login').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/Signup').then((m) => ({ default: m.SignupPage })));
const ResetPage = lazy(() => import('./pages/Reset').then((m) => ({ default: m.ResetPage })));
const AccountPage = lazy(() => import('./pages/Account').then((m) => ({ default: m.AccountPage })));
import { useAuthStore } from './stores/authStore';
import { useOverallStore } from './stores/overallStore';
import { useGroupStore } from './stores/groupStore';
import { startProgressSync } from './firebase/progressSync';
import { toGameUser } from './lib/gameUser';
import { AUTH_ENABLED, CLOUD_SYNC_ENABLED, LEADERBOARD_ENABLED } from './config/features';

/**
 * Algebra Quest — the root app. A single-page app served at the site root that
 * uses a HashRouter so its routes work as static files without server rewrites.
 *
 * The quest is seven gated pages (Intro → Dino → Expressions → Gate Runner →
 * Pull the Pins → Equations & Inequalities → Balance Game). Each page is wrapped
 * in a <StageGuard> so it can only be opened once the previous page's task is
 * complete; the player may always go back and replay earlier pages.
 *
 * Accounts, cross-device progress sync, and the group leaderboard turn on
 * whenever Firebase is configured (`AUTH_ENABLED` / `CLOUD_SYNC_ENABLED` /
 * `LEADERBOARD_ENABLED`); with no Firebase the quest runs fully as a local guest.
 */
export default function GamesApp() {
  const initializeAuth = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);
  const initOverall = useOverallStore((s) => s.init);
  const initGroup = useGroupStore((s) => s.init);

  // Start the auth listener (which also bootstraps an anonymous guest session)
  // once, when accounts are enabled.
  useEffect(() => {
    if (!AUTH_ENABLED) return;
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  // Whenever the signed-in identity changes, (re)hydrate the cloud-backed stores
  // and (re)start the live progress-sync subscription. Cleanup tears the prior
  // subscription down so a sign-out/in swap can't leak listeners or cross wires.
  useEffect(() => {
    const gameUser = toGameUser(user);
    void initOverall(gameUser);
    void initGroup(gameUser);
    if (!CLOUD_SYNC_ENABLED) return;
    const handle = startProgressSync(gameUser);
    return handle.unsubscribe;
  }, [user, initOverall, initGroup]);

  return (
    <HashRouter>
      <GamesLayout>
        <Suspense
          fallback={
            <div className="grid min-h-[60vh] place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          }
        >
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
          {/* Public leaderboard stays gated by its own flag. */}
          <Route
            path="/leaderboard"
            element={LEADERBOARD_ENABLED ? <LeaderboardPage /> : <Navigate to="/" replace />}
          />
          {/* Auth routes follow AUTH_ENABLED (on when Firebase is configured). */}
          <Route
            path="/login"
            element={AUTH_ENABLED ? <LoginPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/signup"
            element={AUTH_ENABLED ? <SignupPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/reset"
            element={AUTH_ENABLED ? <ResetPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/account"
            element={AUTH_ENABLED ? <AccountPage /> : <Navigate to="/" replace />}
          />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </GamesLayout>
    </HashRouter>
  );
}
