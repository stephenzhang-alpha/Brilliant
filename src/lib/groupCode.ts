// Join-code helpers for group leaderboards. A group's 6-character code is both
// its identity (the Firestore doc id) and the "verification": you can only join
// a group if you know its code. Pure + dependency-free so it's easy to unit test.

/** Unambiguous uppercase charset — no 0/O/1/I — so codes are easy to read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 31 chars
export const GROUP_CODE_LENGTH = 6;
const MAX_GROUP_NAME_LEN = 40;
const MAX_HANDLE_LEN = 20;

/** Generate a random join code. `rng` is injectable for deterministic tests. */
export function generateGroupCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < GROUP_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Normalize a user-entered code: uppercase, drop non-alphanumerics, clamp length. */
export function normalizeGroupCode(raw: string): string {
  return (raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, GROUP_CODE_LENGTH);
}

/** True when `code` is exactly a well-formed join code (length + charset). */
export function isValidGroupCode(code: string): boolean {
  return code.length === GROUP_CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

/** Collapse whitespace, trim, and clamp a group name to its max length. */
export function sanitizeGroupName(raw: string): string {
  return (raw || '').replace(/\s+/g, ' ').trim().slice(0, MAX_GROUP_NAME_LEN);
}

/** Sanitize a display handle to a safe, bounded, leaderboard-friendly string. */
export function sanitizeHandle(raw: string): string {
  return (raw || '').replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_HANDLE_LEN);
}
