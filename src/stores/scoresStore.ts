import { create } from 'zustand';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { LeaderboardEntry } from '../types';

const BEST_KEY = 'dino_best';
const NAME_KEY = 'dino_name';
const SCORES_COLLECTION = 'dinoScores';
const LEADERBOARD_SIZE = 20;
const MAX_NAME_LEN = 20;

/** Minimal shape we need from whatever auth user is signed in. */
export interface GameUser {
  uid: string;
  email?: string | null;
}

function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, MAX_NAME_LEN);
  return cleaned;
}

function defaultNameFromEmail(email?: string | null): string {
  if (!email) return 'Guest';
  const local = email.split('@')[0] || 'Player';
  return sanitizeName(local) || 'Player';
}

function readLocalBest(): number {
  const raw = localStorage.getItem(BEST_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function tsToIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return undefined;
}

interface ScoresState {
  best: number;
  playerName: string;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string | null;

  /** Load personal best + display name; merge with the cloud record when signed in. */
  init: (user: GameUser | null) => Promise<void>;
  setPlayerName: (name: string, user: GameUser | null) => Promise<void>;
  /** Record a finished run; updates the personal best and (if signed in) the cloud. */
  submitScore: (score: number, user: GameUser | null) => Promise<void>;
  loadLeaderboard: (user: GameUser | null) => Promise<void>;
}

export const useScoresStore = create<ScoresState>((set, get) => ({
  best: readLocalBest(),
  playerName: localStorage.getItem(NAME_KEY) || 'Guest',
  leaderboard: [],
  leaderboardLoading: false,
  leaderboardError: null,

  init: async (user) => {
    const localBest = readLocalBest();
    let name = localStorage.getItem(NAME_KEY) || '';
    if (!name) {
      name = defaultNameFromEmail(user?.email);
      localStorage.setItem(NAME_KEY, name);
    }
    set({ best: localBest, playerName: name });

    if (!isFirebaseConfigured || !db || !user) return;

    try {
      const snap = await getDoc(doc(db, SCORES_COLLECTION, user.uid));
      if (snap.exists()) {
        const data = snap.data();
        const remoteBest = typeof data.score === 'number' ? data.score : 0;
        const merged = Math.max(localBest, remoteBest);
        if (merged !== localBest) localStorage.setItem(BEST_KEY, String(merged));
        set({ best: merged });
      }
    } catch {
      // Offline / rules not deployed yet — local best already applied.
    }
  },

  setPlayerName: async (raw, user) => {
    const name = sanitizeName(raw) || 'Player';
    localStorage.setItem(NAME_KEY, name);
    set({ playerName: name });

    // Keep the leaderboard label in sync if the player already has a record.
    if (!isFirebaseConfigured || !db || !user) return;
    try {
      const ref = doc(db, SCORES_COLLECTION, user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const score = (snap.data().score as number) ?? 0;
        await setDoc(ref, { uid: user.uid, name, score, updatedAt: serverTimestamp() });
        await get().loadLeaderboard(user);
      }
    } catch {
      // Non-fatal: the name is saved locally regardless.
    }
  },

  submitScore: async (score, user) => {
    const floored = Math.max(0, Math.floor(score));
    const prevBest = get().best;
    if (floored > prevBest) {
      set({ best: floored });
      localStorage.setItem(BEST_KEY, String(floored));
    }

    if (!isFirebaseConfigured || !db || !user) return;

    try {
      const ref = doc(db, SCORES_COLLECTION, user.uid);
      const snap = await getDoc(ref);
      const remoteBest = snap.exists() ? ((snap.data().score as number) ?? 0) : 0;
      if (floored > remoteBest) {
        await setDoc(ref, {
          uid: user.uid,
          name: (get().playerName || 'Player').slice(0, MAX_NAME_LEN),
          score: floored,
          updatedAt: serverTimestamp(),
        });
        await get().loadLeaderboard(user);
      }
    } catch {
      set({ leaderboardError: 'Could not reach the global leaderboard. Your best is saved on this device.' });
    }
  },

  loadLeaderboard: async (user) => {
    if (!isFirebaseConfigured || !db || !user) {
      set({ leaderboard: [], leaderboardLoading: false, leaderboardError: null });
      return;
    }
    set({ leaderboardLoading: true, leaderboardError: null });
    try {
      const q = query(
        collection(db, SCORES_COLLECTION),
        orderBy('score', 'desc'),
        limit(LEADERBOARD_SIZE),
      );
      const snap = await getDocs(q);
      const rows: LeaderboardEntry[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: (data.uid as string) ?? d.id,
          name: (data.name as string) ?? 'Player',
          score: (data.score as number) ?? 0,
          updatedAt: tsToIso(data.updatedAt),
        };
      });
      set({ leaderboard: rows, leaderboardLoading: false });
    } catch {
      set({
        leaderboard: [],
        leaderboardLoading: false,
        leaderboardError: 'Leaderboard unavailable. Check your connection or that scores are enabled.',
      });
    }
  },
}));
