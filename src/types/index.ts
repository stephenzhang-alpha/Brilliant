// ---------------------------------------------------------------------------
// Group leaderboards
// ---------------------------------------------------------------------------

/** A group the player can belong to; its `code` is the join code + doc id. */
export interface Group {
  code: string;
  name: string;
  /** uid of the member who created the group. */
  ownerUid: string;
}

/** One row in a group's leaderboard (`groups/{code}/members/{uid}`). */
export interface GroupMember {
  uid: string;
  /** Public display handle within the group. */
  name: string;
  /** The member's overall quest score (sum of best runs). */
  score: number;
  /** ISO timestamp of the member's last score update. */
  updatedAt?: string;
}
