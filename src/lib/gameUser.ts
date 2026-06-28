/** Minimal shape we need from whatever auth user is signed in. */
export interface GameUser {
  uid: string;
  email?: string | null;
}

/**
 * Normalize whatever auth user is signed in (a Firebase `User`, a local guest
 * profile, or `null`) into the minimal `{ uid, email }` shape the score and
 * progress stores need. Centralized here so the mapping isn't re-implemented in
 * `GamesApp`, `Leaderboard`, and `DinoGame`.
 */
export function toGameUser(
  user: { uid: string; email?: string | null } | null | undefined,
): GameUser | null {
  if (!user) return null;
  return { uid: user.uid, email: user.email ?? null };
}
