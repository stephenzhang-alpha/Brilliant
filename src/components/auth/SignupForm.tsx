import { useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/** Inline Google "G" mark so the provider button reads as official at a glance. */
function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const inputClass =
  'w-full bg-surface border border-black/10 rounded-lg px-4 py-2.5 text-text focus:outline-none focus:border-primary-light transition-colors disabled:opacity-60';

export function SignupForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [created, setCreated] = useState(false);
  const { signUp, signInWithGoogle, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // If a guest was sent here from a gated page, return them there afterwards.
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const busy = submitting || googleLoading;
  const displayError = localError || error;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email, password, displayName);
      // Don't whisk them away — show the verify-your-email guidance first.
      setCreated(true);
    } catch {
      // Friendly message is set in the store.
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setLocalError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate(from, { replace: true });
    } catch {
      // Friendly message is set in the store.
    } finally {
      setGoogleLoading(false);
    }
  };

  if (created) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-3" aria-hidden>
            ✉️
          </div>
          <h1 className="text-2xl font-bold mb-2">You're all set!</h1>
          <p className="text-text-muted text-sm mb-6">
            We sent a verification link to <span className="font-semibold text-text">{email}</span>.
            Open it when you can to confirm your email — you can keep playing in the meantime, and
            your guest progress came with you.
          </p>
          <button
            type="button"
            onClick={() => navigate(from, { replace: true })}
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Start the quest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {displayError && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-error/10 border border-error/30 text-error text-sm rounded-lg p-3"
            >
              {displayError}
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setLocalError('');
                }}
                className="ml-2 underline"
              >
                Dismiss
              </button>
            </div>
          )}
          <div>
            <label htmlFor="signup-name" className="block text-sm text-text-muted mb-1">
              Display name <span className="text-text-muted/60">(optional)</span>
            </label>
            <input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={busy}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="block text-sm text-text-muted mb-1">
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              aria-invalid={!!displayError}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="block text-sm text-text-muted mb-1">
              Password
            </label>
            <input
              id="signup-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              aria-invalid={!!displayError}
              className={inputClass}
              required
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="signup-confirm" className="block text-sm text-text-muted mb-1">
              Confirm password
            </label>
            <input
              id="signup-confirm"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={busy}
              aria-invalid={!!displayError}
              className={inputClass}
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {submitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4" aria-hidden>
          <span className="h-px flex-1 bg-black/10" />
          <span className="text-xs text-text-muted uppercase tracking-wide">or</span>
          <span className="h-px flex-1 bg-black/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-surface border border-black/10 hover:bg-black/5 disabled:opacity-50 text-text font-medium py-2.5 rounded-lg transition-colors"
        >
          <GoogleIcon />
          {googleLoading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <p className="text-center text-sm text-text-muted mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-light hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
