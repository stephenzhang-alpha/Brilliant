import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { getAuthErrorCode } from '../../lib/authErrors';

const inputClass =
  'w-full bg-surface border border-black/10 rounded-lg px-4 py-2.5 text-text focus:outline-none focus:border-primary-light transition-colors disabled:opacity-60';

export function ResetForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword, error, clearError } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      // Anti-enumeration: never reveal that no account exists for this email —
      // show the same neutral success message as a real send.
      if (getAuthErrorCode(err) === 'auth/user-not-found') {
        clearError();
        setSent(true);
      }
      // Any other error already has a friendly message set in the store.
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-3" aria-hidden>
            📬
          </div>
          <h1 className="text-2xl font-bold mb-2">Check your email</h1>
          <p className="text-text-muted text-sm mb-6">
            If an account exists for{' '}
            <span className="font-semibold text-text">{email}</span>, a password-reset link is on
            its way. Don't forget to peek in your spam folder.
          </p>
          <Link
            to="/login"
            className="inline-block w-full bg-primary hover:bg-primary-dark text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">Reset your password</h1>
        <p className="text-center text-sm text-text-muted mb-6">
          Enter your email and we'll send you a link to choose a new password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
          <div>
            <label htmlFor="reset-email" className="block text-sm text-text-muted mb-1">
              Email
            </label>
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              aria-invalid={!!error}
              className={inputClass}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <p className="text-center text-sm text-text-muted mt-4">
          Remembered it?{' '}
          <Link to="/login" className="text-primary-light hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
