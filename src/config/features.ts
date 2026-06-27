/**
 * Feature flags for dormant features — code that ships but is intentionally
 * hidden from the UI until we choose to turn it back on.
 *
 * The global leaderboard (cloud high scores) and the sign-in/accounts that feed
 * it are fully implemented (`pages/Leaderboard.tsx`, `stores/scoresStore.ts`,
 * `stores/authStore.ts`, `pages/Login.tsx`, `pages/Signup.tsx`, `firestore.rules`),
 * but currently switched OFF. Flip this to `true` to re-enable the leaderboard
 * link, the sign-in UI, and the `/leaderboard` `/login` `/signup` routes.
 */
export const LEADERBOARD_ENABLED = false;
