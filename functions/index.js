// ---------------------------------------------------------------------------
// Algebra Quest — Cloud Functions
//
// On account deletion, remove the user's per-user Firestore data so nothing is
// orphaned after they delete their account (privacy / data-minimization). The
// client (authStore.deleteAccount) only removes the Firebase Auth user; this
// server-side trigger cleans up the data that the client is not allowed to
// delete directly (the security rules set `allow delete: if false` on both
// collections, and the Admin SDK used here bypasses those rules).
//
// Deploy requires the Blaze (pay-as-you-go) plan:
//   npx -y firebase-tools@latest deploy --only functions
// ---------------------------------------------------------------------------

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

/** Top-level collections that hold one document keyed by the user's uid. */
const USER_DOC_COLLECTIONS = ['algebraQuestProgress', 'userProfiles'];

/**
 * Auth onDelete trigger: remove ALL of a deleted user's per-user data so nothing
 * is orphaned (privacy / data-minimization):
 *   - their save (algebraQuestProgress) and profile (userProfiles) — top-level
 *     docs keyed by uid; and
 *   - every group-leaderboard membership row (groups/{code}/members/{uid}),
 *     found via a collection-group query so peers stop seeing their row.
 * The client (authStore.deleteAccount) leaves its group first as a best-effort
 * fast path; this trigger is the authoritative, complete cleanup. Each delete is
 * independent (Promise.allSettled) so one failure can't block the rest.
 */
exports.cleanupUserData = functions.auth.user().onDelete(async (user) => {
  const db = admin.firestore();
  const { uid } = user;

  const deletions = USER_DOC_COLLECTIONS.map((c) => db.collection(c).doc(uid).delete());

  // Group leaderboard rows live in subcollections; find them by the uid field.
  try {
    const memberRows = await db.collectionGroup('members').where('uid', '==', uid).get();
    memberRows.forEach((d) => deletions.push(d.ref.delete()));
  } catch (err) {
    functions.logger.error(`Failed to query group member rows for ${uid}`, err);
  }

  const results = await Promise.allSettled(deletions);
  results.forEach((result) => {
    if (result.status === 'rejected') {
      functions.logger.error(`Cleanup delete failed for ${uid}`, result.reason);
    }
  });

  functions.logger.info(`Cleaned up per-user data for deleted account ${uid}`);
});
