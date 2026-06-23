import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../firebase/config';

interface LocalUser {
  uid: string;
  email: string;
}

interface AuthState {
  user: User | LocalUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  initialize: () => () => void;
}

function getLocalUsers(): Record<string, { email: string; password: string }> {
  const raw = localStorage.getItem('eq_local_users');
  return raw ? JSON.parse(raw) : {};
}

function saveLocalUsers(users: Record<string, { email: string; password: string }>) {
  localStorage.setItem('eq_local_users', JSON.stringify(users));
}

function hashUid(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0;
  }
  return 'local-' + Math.abs(hash).toString(36);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  signIn: async (email, password) => {
    set({ error: null, loading: true });

    if (!isFirebaseConfigured) {
      const users = getLocalUsers();
      const uid = hashUid(email);
      const existing = users[uid];
      if (!existing) {
        set({ error: 'No account found with this email. Sign up first.', loading: false });
        throw new Error('No account found');
      }
      if (existing.password !== password) {
        set({ error: 'Incorrect password.', loading: false });
        throw new Error('Incorrect password');
      }
      const localUser: LocalUser = { uid, email };
      localStorage.setItem('eq_current_user', JSON.stringify(localUser));
      set({ user: localUser, loading: false });
      return;
    }

    try {
      await signInWithEmailAndPassword(auth!, email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      set({ error: message, loading: false });
      throw err;
    }
  },

  signUp: async (email, password) => {
    set({ error: null, loading: true });

    if (!isFirebaseConfigured) {
      const users = getLocalUsers();
      const uid = hashUid(email);
      if (users[uid]) {
        set({ error: 'An account with this email already exists.', loading: false });
        throw new Error('Account exists');
      }
      users[uid] = { email, password };
      saveLocalUsers(users);
      const localUser: LocalUser = { uid, email };
      localStorage.setItem('eq_current_user', JSON.stringify(localUser));
      set({ user: localUser, loading: false });
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth!, email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      set({ error: message, loading: false });
      throw err;
    }
  },

  signOut: async () => {
    if (!isFirebaseConfigured) {
      localStorage.removeItem('eq_current_user');
      set({ user: null });
      return;
    }
    await firebaseSignOut(auth!);
    set({ user: null });
  },

  clearError: () => set({ error: null }),

  initialize: () => {
    if (!isFirebaseConfigured) {
      const saved = localStorage.getItem('eq_current_user');
      if (saved) {
        set({ user: JSON.parse(saved), loading: false });
      } else {
        set({ user: null, loading: false });
      }
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      set({ user, loading: false });
    });
    return unsubscribe;
  },
}));
