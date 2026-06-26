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
// Taller scene (more sky) so the runner fills an immersive full-page stage
// instead of reading as a thin horizontal band. The ground keeps the same
// distance from the bottom, so the extra height is all sky above the action.
export const WORLD_HEIGHT = 300;

/** Y of the ground line — sprites rest their feet here. */
export const GROUND_Y = 268;

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
export const SPEED_START = 420;
export const SPEED_MAX = 1050;
/** How quickly the world accelerates (units/sec added per second). */
export const SPEED_ACCEL = 22;

// --- Scoring --------------------------------------------------------------
/** Points accrued per world-unit travelled. */
export const SCORE_PER_UNIT = 0.025;
export const MILESTONE_INTERVAL = 100;

// --- Obstacles ------------------------------------------------------------
/** Min/max horizontal gap to the next obstacle, expressed in seconds of travel. */
export const SPAWN_GAP_MIN_SEC = 0.7;
export const SPAWN_GAP_MAX_SEC = 1.45;
/** Birds only start appearing once the player reaches this score. */
export const BIRD_MIN_SCORE = 170;

// --- Day / night ----------------------------------------------------------
/** Score interval between day<->night flips. */
export const NIGHT_INTERVAL = 700;
/** Seconds for a full day<->night crossfade. */
export const NIGHT_FADE_SEC = 1.2;

// --- Game feel / juice ----------------------------------------------------
/** Fixed-size particle pool (dust, confetti, debris) — no per-frame allocs. */
export const PARTICLE_POOL_SIZE = 96;
export const DUST_JUMP_COUNT = 7;
export const DUST_LAND_COUNT = 9;
export const DEATH_DEBRIS_COUNT = 16;
export const MILESTONE_BURST_COUNT = 16;
export const CELEBRATION_BURST_COUNT = 26;

/** Squash & stretch: how fast the dino springs back to neutral (per second). */
export const SQUASH_DECAY = 9;
/** Negative = stretched tall/thin on takeoff; positive = squashed on landing. */
export const SQUASH_TAKEOFF = -0.45;
export const SQUASH_LAND = 0.6;
/** How strongly the squash value maps to vertical / horizontal scale. */
export const SQUASH_SCALE_Y = 0.3;
export const SQUASH_SCALE_X = 0.22;

// Death feedback.
export const SHAKE_DURATION = 0.42;
export const SHAKE_MAGNITUDE = 7;
export const DEATH_FLASH_DURATION = 0.5;
export const DEATH_FLASH_MAX_ALPHA = 0.5;

/** Seconds the celebratory milestone number "pops" near the score. */
export const MILESTONE_POP_DURATION = 0.95;

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

// Distant parallax layers — hazy mountains (far) and rolling hills (near).
export const COLOR_HILLS = {
  farDay: '#aebbe8',
  farNight: '#322a6b',
  nearDay: '#bce6c4',
  nearNight: '#356a5f',
};
