// ---------------------------------------------------------------------------
// Cross-device progress sync — live layer
//
// `overallStore.init` performs the one-time read -> merge -> push on sign-in.
// This module keeps the save LIVE afterward: an `onSnapshot` subscription folds
// remote changes (another device) into the local store, and a debounced,
// merge-before-write `setDoc` pushes local changes up. The merge
// (`mergeProgress`) is a max/OR lattice join, so it's idempotent — re-applying a
// device's own echoed write is a no-op, which is how the snapshot<->write loop
// terminates. Remote applies are guarded so they never re-trigger a write.
// ---------------------------------------------------------------------------

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import {
  useOverallStore,
  mergeProgress,
  coercePersisted,
  toCloudDoc,
  PROGRESS_COLLECTION,
  type Persisted,
} from '../stores/overallStore';
import type { GameUser } from '../lib/gameUser';

export interface ProgressSyncHandle {
  /** Tear down the live subscription + flush/cancel any pending writes. */
  unsubscribe: () => void;
}

/** Debounce window for coalescing rapid local changes into one cloud write. */
const DEBOUNCE_MS = 1200;

/** Compare only the persisted fields (overall is derived from bests). */
function persistedEqual(a: Persisted, b: Persisted): boolean {
  return (
    a.unlockedStage === b.unlockedStage &&
    a.bestRank === b.bestRank &&
    a.questComplete === b.questComplete &&
    a.bests.dino === b.bests.dino &&
    a.bests.gates === b.bests.gates &&
    a.bests.tower === b.bests.tower
  );
}

/**
 * Begin syncing local quest progress with `userProgress/{uid}` for the signed-in
 * user. Returns a handle whose `unsubscribe` MUST be called when the user
 * changes or the app unmounts. A `null` user (guest / no Firebase) is a no-op.
 */
export function startProgressSync(user: GameUser | null): ProgressSyncHandle {
  if (!user || !isFirebaseConfigured || !db) {
    return { unsubscribe: () => {} };
  }

  const ref = doc(db, PROGRESS_COLLECTION, user.uid);
  let lastRemote: Persisted | null = null;
  let hydrated = false;
  let applyingRemote = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const pushNow = () => {
    timer = null;
    if (disposed) return;
    const local = useOverallStore.getState();
    // Merge-before-write so a stale local snapshot can never clobber a higher
    // remote value; mergeProgress is the lattice join either way.
    const merged = lastRemote ? mergeProgress(local, lastRemote) : mergeProgress(local, local);
    lastRemote = merged;
    void setDoc(ref, toCloudDoc(merged, user.uid)).catch(() => {});
  };

  // Live: fold remote changes into the local store. Guarded so applying a remote
  // snapshot never schedules a write (no echo loop). Idempotent merge means our
  // own writes that bounce back here resolve to `merged === local` -> no-op.
  const unsubSnap = onSnapshot(
    ref,
    (snap) => {
      // Mark hydrated on the FIRST snapshot (even a missing doc) so the writer
      // below never pushes a stale local snapshot before the cloud state is known
      // (avoids a startup race with the async init reconcile).
      hydrated = true;
      const remote = snap.exists() ? coercePersisted(snap.data()) : coercePersisted({});
      lastRemote = remote;
      if (!snap.exists()) return; // no cloud doc yet; local creates it on the next push/init
      const local = useOverallStore.getState();
      const merged = mergeProgress(local, remote);
      if (!persistedEqual(merged, local)) {
        applyingRemote = true;
        useOverallStore.getState().applyCloud(merged);
        applyingRemote = false;
      }
    },
    () => {
      // permission / network error — local persistence still holds
    },
  );

  // Local changes -> debounced merge-before-write push.
  const unsubStore = useOverallStore.subscribe((state, prev) => {
    if (applyingRemote) return; // change came from a remote snapshot
    if (!hydrated) return; // wait for the first cloud snapshot before pushing
    if (persistedEqual(state, prev)) return; // only a transient/non-persisted field changed
    if (timer) clearTimeout(timer);
    timer = setTimeout(pushNow, DEBOUNCE_MS);
  });

  return {
    unsubscribe: () => {
      disposed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      unsubSnap();
      unsubStore();
    },
  };
}
