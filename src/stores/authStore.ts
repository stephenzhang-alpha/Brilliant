import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithPopup,
  linkWithCredential,
  linkWithPopup,
  deleteUser,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';
import { friendlyAuthError, getAuthErrorCode } from '../lib/authErrors';
import { useGroupStore } from './groupStore';

/**
 * Thrown (and surfaced) when an account action is attempted with no Firebase
 * project configured. The auth UI is gated behind `AUTH_ENABLED`
 * (= `isFirebaseConfigured`), so this is purely defensive — without Firebase the
 * app runs as a pure local guest experience and accounts simply don't exist.
 */
const ACCOUNTS_REQUIRE_FIREBASE =
  'Accounts require Firebase. This game is running in local guest mode.';

interface AuthState {
  /** The signed-in Firebase user, an anonymous guest, or null (no Firebase). */
  user: User | null;
  loading: boolean;
  error: string | null;

  /** Email/password sign-in. `remember` picks local (default) vs session persistence. */
  signIn: (email: string, password: string, remember?: boolean) => Promise<void>;
  /**
   * Create an account. If the visitor is currently an anonymous guest, their
   * progress is preserved by LINKING the credential onto the existing uid rather
   * than minting a fresh account; an optional `displayName` is saved and a
   * verification email is sent.
   */
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  /** Google popup sign-in, linking an anonymous guest when possible. */
  signInWithGoogle: (remember?: boolean) => Promise<void>;
  /** Send a password-reset email. */
  resetPassword: (email: string) => Promise<void>;
  /** Re-send the email-verification link to the current user. */
  resendVerification: () => Promise<void>;
  /** Permanently delete the current account (handles `requires-recent-login`). */
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  /** Start the auth listener + anonymous-guest bootstrap. Returns an unsubscribe. */
  initialize: () => () => void;
}

/** Choose how long the session survives: local persists across restarts; session clears on close. */
async function applyPersistence(remember: boolean): Promise<void> {
  if (!auth) return;
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  } catch {
    // Non-fatal: fall back to whatever persistence Firebase defaults to.
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  signIn: async (email, password, remember = true) => {
    set({ error: null, loading: true });
    if (!isFirebaseConfigured || !auth) {
      set({ error: ACCOUNTS_REQUIRE_FIREBASE, loading: false });
      throw new Error(ACCOUNTS_REQUIRE_FIREBASE);
    }
    try {
      await applyPersistence(remember);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      set({ user: cred.user, loading: false });
    } catch (err) {
      set({ error: friendlyAuthError(err), loading: false });
      throw err;
    }
  },

  signUp: async (email, password, displayName) => {
    set({ error: null, loading: true });
    if (!isFirebaseConfigured || !auth) {
      set({ error: ACCOUNTS_REQUIRE_FIREBASE, loading: false });
      throw new Error(ACCOUNTS_REQUIRE_FIREBASE);
    }
    try {
      const current = auth.currentUser;
      let cred: UserCredential;
      if (current?.isAnonymous) {
        // Upgrade the guest in place so their progress (and uid) carry over.
        const credential = EmailAuthProvider.credential(email, password);
        try {
          cred = await linkWithCredential(current, credential);
        } catch (linkErr) {
          const code = getAuthErrorCode(linkErr);
          if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
            // The email already belongs to a real account: sign in to it instead.
            // (Local progress still merges in via the persistence layer on init.)
            cred = await signInWithEmailAndPassword(auth, email, password);
          } else {
            throw linkErr;
          }
        }
      } else {
        cred = await createUserWithEmailAndPassword(auth, email, password);
      }

      const trimmedName = displayName?.trim();
      if (trimmedName) {
        await updateProfile(cred.user, { displayName: trimmedName });
      }
      if (!cred.user.emailVerified) {
        // Best-effort: a verification-send hiccup shouldn't fail the sign-up.
        await sendEmailVerification(cred.user).catch(() => {});
      }
      set({ user: cred.user, loading: false });
    } catch (err) {
      set({ error: friendlyAuthError(err), loading: false });
      throw err;
    }
  },

  signInWithGoogle: async (remember = true) => {
    set({ error: null, loading: true });
    if (!isFirebaseConfigured || !auth) {
      set({ error: ACCOUNTS_REQUIRE_FIREBASE, loading: false });
      throw new Error(ACCOUNTS_REQUIRE_FIREBASE);
    }
    try {
      await applyPersistence(remember);
      const provider = new GoogleAuthProvider();
      const current = auth.currentUser;
      let cred: UserCredential;
      if (current?.isAnonymous) {
        try {
          cred = await linkWithPopup(current, provider);
        } catch (linkErr) {
          const code = getAuthErrorCode(linkErr);
          if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
            cred = await signInWithPopup(auth, provider);
          } else {
            throw linkErr;
          }
        }
      } else {
        cred = await signInWithPopup(auth, provider);
      }
      set({ user: cred.user, loading: false });
    } catch (err) {
      set({ error: friendlyAuthError(err), loading: false });
      throw err;
    }
  },

  resetPassword: async (email) => {
    set({ error: null });
    if (!isFirebaseConfigured || !auth) {
      set({ error: ACCOUNTS_REQUIRE_FIREBASE });
      throw new Error(ACCOUNTS_REQUIRE_FIREBASE);
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    }
  },

  resendVerification: async () => {
    set({ error: null });
    if (!isFirebaseConfigured || !auth) {
      set({ error: ACCOUNTS_REQUIRE_FIREBASE });
      throw new Error(ACCOUNTS_REQUIRE_FIREBASE);
    }
    const current = auth.currentUser;
    if (!current) {
      const message = 'You need to be signed in to resend a verification email.';
      set({ error: message });
      throw new Error(message);
    }
    try {
      await sendEmailVerification(current);
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    }
  },

  deleteAccount: async () => {
    set({ error: null });
    if (!isFirebaseConfigured || !auth) {
      set({ error: ACCOUNTS_REQUIRE_FIREBASE });
      throw new Error(ACCOUNTS_REQUIRE_FIREBASE);
    }
    const current = auth.currentUser;
    if (!current) {
      const message = 'There is no account to delete.';
      set({ error: message });
      throw new Error(message);
    }
    try {
      // Best-effort: leave any group first (removes our roster row + profile
      // pointer) so peers stop seeing us even if the server-side cleanup
      // function isn't deployed. Non-fatal if it fails.
      try {
        await useGroupStore.getState().leaveGroup();
      } catch {
        // ignore — the Cloud Function cleanup is the authoritative path
      }
      await deleteUser(current);
      // onAuthStateChanged will fire null and re-bootstrap a fresh guest.
      set({ user: null });
    } catch (err) {
      set({ error: friendlyAuthError(err) });
      throw err;
    }
  },

  signOut: async () => {
    set({ error: null });
    if (!isFirebaseConfigured || !auth) {
      set({ user: null });
      return;
    }
    await firebaseSignOut(auth);
    set({ user: null });
  },

  clearError: () => set({ error: null }),

  initialize: () => {
    if (!isFirebaseConfigured || !auth) {
      // Pure local guest mode: no accounts, `user` stays null.
      set({ user: null, loading: false });
      return () => {};
    }

    const activeAuth = auth;
    const unsubscribeAuth = onAuthStateChanged(activeAuth, (user) => {
      set({ user, loading: false });
      // Guest bootstrap: give every visitor a stable uid to attach progress to,
      // so guest play can be linked to a real account on sign-up without losing
      // data. Best-effort — if Anonymous auth is disabled in the console this
      // simply leaves `user` null and the app stays local-only.
      if (!user) {
        signInAnonymously(activeAuth).catch(() => {});
      }
    });

    // Firebase mutates the SAME user object in place on link / profile / token
    // refresh (so anonymous→permanent keeps the uid). Mirroring id-token changes
    // into the store guarantees subscribers re-read the freshened user even when
    // its reference is unchanged.
    const unsubscribeToken = onIdTokenChanged(activeAuth, (user) => {
      set({ user });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  },
}));
