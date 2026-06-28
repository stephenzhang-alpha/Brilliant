import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

/**
 * A slim, dismissible "please verify your email" nudge. Renders nothing unless a
 * real (non-anonymous) account is signed in and still unverified, so it stays
 * out of the way for guests and verified players. Drop it at the top of an auth
 * page or the account panel.
 */
export function VerifyBanner() {
  const user = useAuthStore((s) => s.user);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (dismissed || !user || user.isAnonymous || user.emailVerified) return null;

  const handleResend = async () => {
    setStatus('sending');
    try {
      await resendVerification();
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 py-2.5 text-sm text-amber-900"
    >
      <span aria-hidden>✉️</span>
      <span className="flex-1 min-w-[12rem]">
        {status === 'sent'
          ? 'Verification email sent — check your inbox!'
          : status === 'error'
            ? "Couldn't send the email just now. Try again in a moment."
            : 'Please verify your email to secure your account.'}
      </span>
      {status !== 'sent' && (
        <button
          type="button"
          onClick={handleResend}
          disabled={status === 'sending'}
          className="font-semibold underline underline-offset-2 disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending...' : 'Resend'}
        </button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-amber-900/70 hover:text-amber-900"
      >
        ✕
      </button>
    </div>
  );
}
