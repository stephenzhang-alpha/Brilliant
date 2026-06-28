import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { VerifyBanner } from './VerifyBanner';

export function AccountPanel() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const navigate = useNavigate();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  // Guest (anonymous) or no user: nudge them to make a real account. The `from`
  // state lets the login flow bring them right back here afterwards.
  if (!user || user.isAnonymous) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-3" aria-hidden>
            🎒
          </div>
          <h1 className="text-2xl font-bold mb-2">You're playing as a guest</h1>
          <p className="text-text-muted text-sm mb-6">
            Create an account to save your progress across devices. Your guest progress will come
            with you.
          </p>
          <div className="space-y-2">
            <Link
              to="/signup"
              state={{ from: '/account' }}
              className="block w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Create account
            </Link>
            <Link
              to="/login"
              state={{ from: '/account' }}
              className="block w-full bg-surface border border-black/10 hover:bg-black/5 text-text font-medium py-2.5 rounded-lg transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
      navigate('/', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteAccount();
      navigate('/', { replace: true });
    } catch {
      // Friendly message (e.g. "please sign in again") is set in the store.
      setConfirmingDelete(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <h1 className="text-2xl font-bold">Your account</h1>

        <VerifyBanner />

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-error/10 border border-error/30 text-error text-sm rounded-lg p-3"
          >
            {error}
            <button type="button" onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-black/10 bg-surface p-5 space-y-3">
          {user.displayName && (
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">Name</p>
              <p className="font-medium text-text">{user.displayName}</p>
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Email</p>
            <p className="font-medium text-text break-all">{user.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-text-muted">Status</p>
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                <span aria-hidden>✓</span> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
                <span aria-hidden>•</span> Not verified yet
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={busy}
          className="w-full bg-surface border border-black/10 hover:bg-black/5 disabled:opacity-50 text-text font-medium py-2.5 rounded-lg transition-colors"
        >
          Sign out
        </button>

        <div className="rounded-2xl border border-error/30 bg-error/5 p-5">
          <p className="font-semibold text-text mb-1">Delete account</p>
          <p className="text-sm text-text-muted mb-3">
            This permanently removes your account. This can't be undone.
          </p>
          {confirmingDelete ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="flex-1 min-w-[8rem] bg-error hover:opacity-90 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-opacity"
              >
                {busy ? 'Deleting...' : 'Yes, delete it'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className="flex-1 min-w-[8rem] bg-surface border border-black/10 hover:bg-black/5 disabled:opacity-50 text-text font-medium py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                clearError();
                setConfirmingDelete(true);
              }}
              className="text-error font-semibold underline underline-offset-2"
            >
              Delete my account
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
