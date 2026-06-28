/**
 * Feature flags.
 *
 * `LEADERBOARD_ENABLED` gates the group-leaderboard UI (the `/leaderboard`
 * route + the nav score-chip link). It needs a signed-in user, so it follows
 * Firebase configuration.
 *
 * `AUTH_ENABLED` and `CLOUD_SYNC_ENABLED` turn on accounts (sign in / sign up /
 * password reset / account management) and cross-device progress sync whenever a
 * real Firebase project is configured. With no Firebase the app still runs fully
 * as a local guest experience (progress persists in localStorage, Pip uses
 * authored fallbacks) — there are simply no accounts.
 */
import { isFirebaseConfigured } from '../firebase/config';

/** Group leaderboard UI (join/create a group, see your group's rankings). */
export const LEADERBOARD_ENABLED = isFirebaseConfigured;

/** Accounts (sign in/up, reset, account page) — on when Firebase is configured. */
export const AUTH_ENABLED = isFirebaseConfigured;

/** Cross-device progress sync to `userProgress/{uid}` — follows the same gate. */
export const CLOUD_SYNC_ENABLED = isFirebaseConfigured;
