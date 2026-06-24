import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EquationLayout } from './components/layout/EquationLayout';
import { CoursePage } from './pages/Course';
import { LessonPage } from './pages/Lesson';
import { LoginPage } from './pages/Login';
import { SignupPage } from './pages/Signup';
import { useAuthStore } from './stores/authStore';
import { useProgressStore } from './stores/progressStore';

/**
 * Project Equation — the interactive Algebra course. This app is intentionally
 * independent from the arcade (see `GamesApp`); it only knows about the course
 * roadmap, lessons, and auth.
 */
export default function EquationApp() {
  const { initialize, user } = useAuthStore();
  const { loadProgress } = useProgressStore();

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  // Load roadmap progress for the signed-in user, or a local "guest" profile so
  // the course is fully usable before signing in.
  useEffect(() => {
    void loadProgress(user?.uid ?? 'guest');
  }, [user, loadProgress]);

  // Matches Vite's `base` so routes work under GitHub Pages' /<repo>/ subpath.
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

  return (
    <BrowserRouter basename={basename}>
      <EquationLayout>
        <Routes>
          <Route path="/" element={<CoursePage />} />
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </EquationLayout>
    </BrowserRouter>
  );
}
