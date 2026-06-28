import { create } from 'zustand';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { useOverallStore } from './overallStore';
import {
  generateGroupCode,
  normalizeGroupCode,
  isValidGroupCode,
  sanitizeGroupName,
  sanitizeHandle,
} from '../lib/groupCode';
import type { GameUser } from '../lib/gameUser';
import type { Group, GroupMember } from '../types';

const GROUPS = 'groups';
const MEMBERS = 'members';
const PROFILES = 'userProfiles';
const ROSTER_LIMIT = 100;
const SCORE_DEBOUNCE_MS = 1500;
/** localStorage key for the player's handle (legacy name kept so existing players keep theirs). */
const HANDLE_KEY = 'dino_name';

/** The locally-remembered handle used as the default before the cloud profile loads. */
function localHandle(): string {
  try {
    return sanitizeHandle(localStorage.getItem(HANDLE_KEY) || '') || 'Player';
  } catch {
    return 'Player';
  }
}

interface GroupState {
  /** True once the initial profile/group load has settled. */
  ready: boolean;
  /** The group the player currently belongs to, or null. */
  group: Group | null;
  /** Live leaderboard rows for the current group, sorted by score desc. */
  members: GroupMember[];
  membersLoading: boolean;
  /** The player's display handle (cross-device via userProfiles). */
  displayName: string;
  /** True while a create/join/leave action is in flight. */
  busy: boolean;
  error: string | null;

  /** Load the player's profile + current group on sign-in / identity change. */
  init: (user: GameUser | null) => Promise<void>;
  createGroup: (name: string) => Promise<void>;
  joinGroup: (codeRaw: string) => Promise<void>;
  leaveGroup: () => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
  clearError: () => void;
}

// --- Module-scoped subscription/identity lifecycle (kept out of state) -------
let currentUser: GameUser | null = null;
let membersUnsub: (() => void) | null = null;
let scoreUnsub: (() => void) | null = null;
let scoreTimer: ReturnType<typeof setTimeout> | null = null;

function tsToIso(value: unknown): string | undefined {
  return value instanceof Timestamp ? value.toDate().toISOString() : undefined;
}

function stopMembers() {
  membersUnsub?.();
  membersUnsub = null;
}

function teardown() {
  stopMembers();
  scoreUnsub?.();
  scoreUnsub = null;
  if (scoreTimer) {
    clearTimeout(scoreTimer);
    scoreTimer = null;
  }
}

/** Subscribe to the group's roster (the live leaderboard), ordered by score. */
function subscribeMembers(code: string) {
  stopMembers();
  if (!db) return;
  const q = query(
    collection(db, GROUPS, code, MEMBERS),
    orderBy('score', 'desc'),
    limit(ROSTER_LIMIT),
  );
  membersUnsub = onSnapshot(
    q,
    (snap) => {
      const rows: GroupMember[] = snap.docs.map((d) => {
        const m = d.data();
        return {
          uid: (m.uid as string) ?? d.id,
          name: (m.name as string) ?? 'Player',
          score: (m.score as number) ?? 0,
          updatedAt: tsToIso(m.updatedAt),
        };
      });
      useGroupStore.setState({ members: rows, membersLoading: false });
    },
    () => {
      useGroupStore.setState({
        membersLoading: false,
        error: 'Could not load the group leaderboard. Check your connection.',
      });
    },
  );
}

/** Keep the player's member row's score in sync with their overall quest score. */
function startScoreSync() {
  scoreUnsub?.();
  scoreUnsub = useOverallStore.subscribe((state, prev) => {
    if (state.overall === prev.overall) return;
    if (scoreTimer) clearTimeout(scoreTimer);
    const next = state.overall;
    scoreTimer = setTimeout(() => void writeScore(next), SCORE_DEBOUNCE_MS);
  });
}

async function writeScore(score: number) {
  const { group, displayName } = useGroupStore.getState();
  if (!group || !currentUser || !db) return;
  try {
    // updateDoc preserves joinedAt; the rules validate the full post-update doc.
    await updateDoc(doc(db, GROUPS, group.code, MEMBERS, currentUser.uid), {
      name: sanitizeHandle(displayName) || 'Player',
      score: Math.max(0, Math.floor(score)),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // best-effort; the next score change retries
  }
}

/** Write our member row + profile for `group`, then go live on its roster. */
async function joinExisting(group: Group) {
  if (!db || !currentUser) return;
  const name = sanitizeHandle(useGroupStore.getState().displayName) || 'Player';
  const score = Math.max(0, Math.floor(useOverallStore.getState().overall));
  await setDoc(doc(db, GROUPS, group.code, MEMBERS, currentUser.uid), {
    uid: currentUser.uid,
    name,
    score,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, PROFILES, currentUser.uid), {
    uid: currentUser.uid,
    name,
    groupCode: group.code,
    updatedAt: serverTimestamp(),
  });
  useGroupStore.setState({ group, displayName: name, membersLoading: true });
  subscribeMembers(group.code);
}

export const useGroupStore = create<GroupState>((set, get) => ({
  ready: false,
  group: null,
  members: [],
  membersLoading: false,
  displayName: localHandle(),
  busy: false,
  error: null,

  init: async (user) => {
    teardown();
    currentUser = user;
    set({
      ready: false,
      group: null,
      members: [],
      membersLoading: false,
      busy: false,
      error: null,
    });
    startScoreSync();

    if (!user || !isFirebaseConfigured || !db) {
      set({ ready: true });
      return;
    }

    try {
      const profileSnap = await getDoc(doc(db, PROFILES, user.uid));
      let name = localHandle();
      let groupCode: string | null = null;
      if (profileSnap.exists()) {
        const p = profileSnap.data();
        if (typeof p.name === 'string' && p.name) name = sanitizeHandle(p.name) || name;
        if (typeof p.groupCode === 'string' && p.groupCode) groupCode = p.groupCode;
      }
      set({ displayName: name });
      try {
        localStorage.setItem(HANDLE_KEY, name);
      } catch {
        // ignore — cloud profile remains the source of truth
      }

      if (groupCode) {
        const gSnap = await getDoc(doc(db, GROUPS, groupCode));
        if (gSnap.exists()) {
          const g = gSnap.data();
          set({
            group: {
              code: groupCode,
              name: (g.name as string) ?? 'Group',
              ownerUid: (g.ownerUid as string) ?? '',
            },
            membersLoading: true,
          });
          subscribeMembers(groupCode);
        }
        // If the group no longer exists, silently fall back to "no group".
      }
    } catch {
      // Offline / rules not deployed — show the no-group state.
    } finally {
      set({ ready: true });
    }
  },

  createGroup: async (rawName) => {
    const name = sanitizeGroupName(rawName);
    if (!name) {
      set({ error: 'Please enter a group name.' });
      return;
    }
    if (!currentUser || !isFirebaseConfigured || !db) {
      set({ error: 'Sign in to create a group.' });
      return;
    }
    set({ busy: true, error: null });
    try {
      // Find an unused code (collisions are very rare in a 31^6 space).
      let code = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateGroupCode();
        const existing = await getDoc(doc(db, GROUPS, candidate));
        if (!existing.exists()) {
          code = candidate;
          break;
        }
      }
      if (!code) {
        set({ busy: false, error: 'Could not create a group just now — please try again.' });
        return;
      }
      await setDoc(doc(db, GROUPS, code), {
        code,
        name,
        ownerUid: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      await leaveCurrentRow();
      await joinExisting({ code, name, ownerUid: currentUser.uid });
      set({ busy: false });
    } catch {
      set({ busy: false, error: 'Could not create the group. Check your connection and try again.' });
    }
  },

  joinGroup: async (raw) => {
    const code = normalizeGroupCode(raw);
    if (!isValidGroupCode(code)) {
      set({ error: 'That code doesn’t look right — it’s 6 letters and numbers.' });
      return;
    }
    if (!currentUser || !isFirebaseConfigured || !db) {
      set({ error: 'Sign in to join a group.' });
      return;
    }
    if (get().group?.code === code) {
      set({ error: 'You’re already in this group.' });
      return;
    }
    set({ busy: true, error: null });
    try {
      const gSnap = await getDoc(doc(db, GROUPS, code));
      if (!gSnap.exists()) {
        set({ busy: false, error: 'No group found with that code. Double-check it and try again.' });
        return;
      }
      const g = gSnap.data();
      await leaveCurrentRow();
      await joinExisting({
        code,
        name: (g.name as string) ?? 'Group',
        ownerUid: (g.ownerUid as string) ?? '',
      });
      set({ busy: false });
    } catch {
      set({ busy: false, error: 'Could not join that group. Check your connection and try again.' });
    }
  },

  leaveGroup: async () => {
    const { group } = get();
    if (!group || !currentUser || !db) {
      set({ group: null, members: [] });
      return;
    }
    set({ busy: true, error: null });
    // Stop the roster subscription FIRST — once we delete our own member row we
    // lose permission to read the roster, which would otherwise fire a spurious
    // "couldn't load" snapshot error.
    stopMembers();
    try {
      await deleteDoc(doc(db, GROUPS, group.code, MEMBERS, currentUser.uid));
      await setDoc(doc(db, PROFILES, currentUser.uid), {
        uid: currentUser.uid,
        name: sanitizeHandle(get().displayName) || 'Player',
        groupCode: null,
        updatedAt: serverTimestamp(),
      });
      set({ group: null, members: [], busy: false });
    } catch {
      set({ busy: false, error: 'Could not leave the group. Try again.' });
    }
  },

  setDisplayName: async (raw) => {
    const name = sanitizeHandle(raw) || 'Player';
    set({ displayName: name });
    try {
      localStorage.setItem(HANDLE_KEY, name);
    } catch {
      // ignore — handle still updates in memory + cloud
    }
    if (!currentUser || !isFirebaseConfigured || !db) return;
    try {
      await setDoc(doc(db, PROFILES, currentUser.uid), {
        uid: currentUser.uid,
        name,
        groupCode: get().group?.code ?? null,
        updatedAt: serverTimestamp(),
      });
      const { group } = get();
      if (group) {
        await updateDoc(doc(db, GROUPS, group.code, MEMBERS, currentUser.uid), {
          name,
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // best-effort; the local handle is already updated
    }
  },

  clearError: () => set({ error: null }),
}));

/** Remove our member row from whatever group we're currently in (for switching). */
async function leaveCurrentRow() {
  const { group } = useGroupStore.getState();
  if (!group || !currentUser || !db) return;
  stopMembers();
  try {
    await deleteDoc(doc(db, GROUPS, group.code, MEMBERS, currentUser.uid));
  } catch {
    // ignore — joining the new group will overwrite our profile pointer anyway
  }
}
