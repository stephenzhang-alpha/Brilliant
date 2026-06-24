// ---------------------------------------------------------------------------
// Dino runner — tunable game constants
//
// The simulation runs in a fixed "world" coordinate space (WORLD_WIDTH x
// WORLD_HEIGHT). The canvas element is scaled with CSS to fit its container, so
// every value below is in world units and resolution-independent. Physics is
// integrated in units-per-second so the feel is identical regardless of frame
// rate.
// ---------------------------------------------------------------------------

export const WORLD_WIDTH = 600;
export const WORLD_HEIGHT = 160;

/** Y of the ground line — sprites rest their feet here. */
export const GROUND_Y = 128;

// --- Dino -----------------------------------------------------------------
export const DINO_X = 30;
export const DINO_WIDTH = 44;
export const DINO_HEIGHT = 47;
export const DINO_DUCK_WIDTH = 59;
export const DINO_DUCK_HEIGHT = 30;

/** Shrink applied to the dino's collision box for forgiving, fair hits. */
export const DINO_HITBOX_INSET = { x: 8, y: 6 };

// --- Physics (units per second) -------------------------------------------
export const GRAVITY = 3200;
export const JUMP_VELOCITY = -858;
/** Extra gravity while Down is held (fast-fall) or when a jump is released early. */
export const FAST_FALL_GRAVITY = 6400;
/** Upward velocity is clamped to this when the jump key is released ("short hop"). */
export const JUMP_CUTOFF_VELOCITY = -260;

// --- World speed ----------------------------------------------------------
export const SPEED_START = 348;
export const SPEED_MAX = 900;
/** How quickly the world accelerates (units/sec added per second). */
export const SPEED_ACCEL = 16;

// --- Scoring --------------------------------------------------------------
/** Points accrued per world-unit travelled. */
export const SCORE_PER_UNIT = 0.025;
export const MILESTONE_INTERVAL = 100;

// --- Obstacles ------------------------------------------------------------
/** Min/max horizontal gap to the next obstacle, expressed in seconds of travel. */
export const SPAWN_GAP_MIN_SEC = 0.9;
export const SPAWN_GAP_MAX_SEC = 1.8;
/** Birds only start appearing once the player reaches this score. */
export const BIRD_MIN_SCORE = 260;

// --- Day / night ----------------------------------------------------------
/** Score interval between day<->night flips. */
export const NIGHT_INTERVAL = 700;
/** Seconds for a full day<->night crossfade. */
export const NIGHT_FADE_SEC = 1.2;

// --- Palette --------------------------------------------------------------
// Vibrant, on-brand palette (shared family with Gate Runner + Tower).
export const COLOR_DAY = {
  skyTop: '#c8ecff',
  skyBottom: '#f4fbff',
  ground: '#2a2350',
  dino: '#7c3aed',
  cactus: '#16a34a',
  bird: '#ec4899',
  cloud: '#ffffff',
  text: '#2a2350',
  eye: '#f4fbff',
};
export const COLOR_NIGHT = {
  skyTop: '#3a2e78',
  skyBottom: '#241b54',
  ground: '#d6c7ff',
  dino: '#c4b5fd',
  cactus: '#5eead4',
  bird: '#f9a8d4',
  cloud: '#6b6391',
  text: '#ece8ff',
  eye: '#241b54',
};
