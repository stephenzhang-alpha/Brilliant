/**
 * Friendly, kid-appropriate translations of Firebase `auth/*` error codes.
 *
 * SECURITY — anti-enumeration: `auth/wrong-password`, `auth/user-not-found`, and
 * `auth/invalid-credential` ALL collapse to one identical generic message so an
 * attacker can't tell "no such account" apart from "wrong password" and probe
 * which emails are registered. Never surface a Firebase `err.message` directly
 * (those leak codes/details) — route everything through `friendlyAuthError`.
 */

/** Shown for every credential mismatch so accounts can't be enumerated. */
export const GENERIC_CREDENTIAL_MESSAGE =
  "That email and password don't match. Give it another try!";

/** Fallback for unknown/unmapped codes. */
export const DEFAULT_AUTH_MESSAGE = 'Something went wrong. Please try again in a moment.';

const MESSAGES: Record<string, string> = {
  // --- Enumeration-sensitive: keep these three identical. ---
  'auth/wrong-password': GENERIC_CREDENTIAL_MESSAGE,
  'auth/user-not-found': GENERIC_CREDENTIAL_MESSAGE,
  'auth/invalid-credential': GENERIC_CREDENTIAL_MESSAGE,

  // --- Sign up / input validation ---
  'auth/invalid-email': "Hmm, that doesn't look like an email address.",
  'auth/missing-email': 'Please type your email address.',
  'auth/missing-password': "Don't forget to type a password!",
  'auth/email-already-in-use': "There's already an account with this email. Try signing in!",
  'auth/weak-password': 'Your password is too short — use at least 6 characters.',

  // --- Rate limiting / connectivity ---
  'auth/too-many-requests': 'Too many tries! Take a short break and try again soon.',
  'auth/network-request-failed': "We couldn't connect. Check your internet and try again.",

  // --- Popup (Google) sign-in ---
  'auth/popup-closed-by-user': 'The sign-in window closed early. Want to try again?',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and try again.',
  'auth/cancelled-popup-request': 'Just one sign-in window at a time, please.',
  'auth/account-exists-with-different-credential':
    'You already have an account with this email. Try a different sign-in method.',
  'auth/credential-already-in-use': 'This login is already connected to another account.',

  // --- Account management ---
  'auth/requires-recent-login': 'For your safety, please sign in again, then try once more.',
  'auth/user-disabled': 'This account is turned off. Ask a grown-up for help.',
  'auth/operation-not-allowed': "That sign-in method isn't turned on right now.",
};

/** Pure code → message lookup (used directly by tests and by `friendlyAuthError`). */
export function authErrorMessage(code: string | null | undefined): string {
  if (code && Object.prototype.hasOwnProperty.call(MESSAGES, code)) {
    return MESSAGES[code];
  }
  return DEFAULT_AUTH_MESSAGE;
}

/** Best-effort extraction of a Firebase `code` from an unknown thrown value. */
export function getAuthErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** Map any thrown auth error to a safe, friendly message. */
export function friendlyAuthError(err: unknown): string {
  return authErrorMessage(getAuthErrorCode(err));
}
