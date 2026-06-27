// ---------------------------------------------------------------------------
// Dino runner — leaderboard
// ---------------------------------------------------------------------------

/** One row in the global high-score leaderboard (`dinoScores/{uid}`). */
export interface LeaderboardEntry {
  uid: string;
  /** Public display handle (never the user's email). */
  name: string;
  score: number;
  /** ISO timestamp of when the best score was last updated. */
  updatedAt?: string;
}
