// ---------------------------------------------------------------------------
// Dino runner — sprite rendering
//
// Everything is drawn with crisp axis-aligned rectangles (image smoothing is
// disabled on the context) so the art keeps the chunky, pixel feel of the
// original Chrome offline game while staying fully parametric and resolution
// independent. Colours are passed in so the same sprites work in both the day
// and night palettes.
// ---------------------------------------------------------------------------

import {
  DINO_WIDTH,
  DINO_HEIGHT,
  DINO_DUCK_WIDTH,
  DINO_DUCK_HEIGHT,
} from './constants';

export type DinoPose = 'idle' | 'run' | 'jump' | 'duck' | 'dead';

function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

// ---------------------------------------------------------------------------
// Dino
// ---------------------------------------------------------------------------

/**
 * Draws the T-Rex with its top-left at (x, y).
 * `tick` is a monotonically increasing counter used to alternate run frames.
 */
export function drawDino(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fg: string,
  bg: string,
  pose: DinoPose,
  tick: number,
) {
  ctx.fillStyle = fg;

  if (pose === 'duck') {
    drawDinoDuck(ctx, x, y, fg, bg, tick);
    return;
  }

  // --- Tail (steps pointing back-left) ---
  rect(ctx, x + 0, y + 18, 6, 5);
  rect(ctx, x + 3, y + 13, 8, 6);

  // --- Back / neck ramp up to the head ---
  rect(ctx, x + 8, y + 11, 22, 8);

  // --- Body mass ---
  rect(ctx, x + 12, y + 16, 22, 17);
  rect(ctx, x + 16, y + 31, 15, 7);

  // --- Little arm ---
  rect(ctx, x + 30, y + 25, 7, 4);

  // --- Head ---
  rect(ctx, x + 26, y + 0, 18, 15);
  rect(ctx, x + 26, y + 15, 13, 4); // jaw
  // Mouth slot (carved out of the jaw)
  ctx.fillStyle = bg;
  rect(ctx, x + 31, y + 15, 7, 2);
  // Eye
  ctx.fillStyle = pose === 'dead' ? fg : bg;
  if (pose === 'dead') {
    // little "x" eye
    rect(ctx, x + 36, y + 4, 5, 1);
    rect(ctx, x + 36, y + 6, 5, 1);
    rect(ctx, x + 38, y + 5, 1, 1);
  } else {
    rect(ctx, x + 37, y + 4, 3, 3);
  }
  ctx.fillStyle = fg;

  // --- Legs ---
  const step = Math.floor(tick / 6) % 2; // toggle every 6 ticks
  if (pose === 'run') {
    if (step === 0) {
      // left planted, right lifted
      rect(ctx, x + 15, y + 38, 6, 9);
      rect(ctx, x + 14, y + 45, 8, 2);
      rect(ctx, x + 27, y + 38, 6, 5);
      rect(ctx, x + 27, y + 41, 8, 2);
    } else {
      // right planted, left lifted
      rect(ctx, x + 27, y + 38, 6, 9);
      rect(ctx, x + 27, y + 45, 8, 2);
      rect(ctx, x + 15, y + 38, 6, 5);
      rect(ctx, x + 14, y + 41, 8, 2);
    }
  } else if (pose === 'jump') {
    rect(ctx, x + 15, y + 38, 6, 7);
    rect(ctx, x + 14, y + 44, 8, 2);
    rect(ctx, x + 27, y + 38, 6, 7);
    rect(ctx, x + 27, y + 44, 8, 2);
  } else {
    // idle / dead — both legs planted
    rect(ctx, x + 15, y + 38, 6, 9);
    rect(ctx, x + 14, y + 45, 8, 2);
    rect(ctx, x + 27, y + 38, 6, 9);
    rect(ctx, x + 27, y + 45, 8, 2);
  }
}

function drawDinoDuck(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fg: string,
  bg: string,
  tick: number,
) {
  // The duck sprite is shorter and longer; (x, y) is the top-left of its box.
  ctx.fillStyle = fg;

  // Tail
  rect(ctx, x + 0, y + 8, 8, 6);
  // Long crouched body
  rect(ctx, x + 4, y + 6, 42, 14);
  // Head + jaw
  rect(ctx, x + 40, y + 2, 19, 13);
  rect(ctx, x + 40, y + 15, 12, 3);
  // Mouth slot
  ctx.fillStyle = bg;
  rect(ctx, x + 45, y + 15, 7, 2);
  // Eye
  rect(ctx, x + 52, y + 6, 3, 3);
  ctx.fillStyle = fg;

  // Two short running legs
  const step = Math.floor(tick / 6) % 2;
  if (step === 0) {
    rect(ctx, x + 16, y + 20, 6, 10);
    rect(ctx, x + 30, y + 20, 6, 7);
  } else {
    rect(ctx, x + 16, y + 20, 6, 7);
    rect(ctx, x + 30, y + 20, 6, 10);
  }
}

// ---------------------------------------------------------------------------
// Cactus
// ---------------------------------------------------------------------------

/** One cactus column with two arms, sized to (w, h), base sitting on baseY. */
function drawSingleCactus(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  h: number,
) {
  const trunkW = Math.max(4, Math.round(w * 0.34));
  const cx = x + w / 2 - trunkW / 2;
  // Trunk
  rect(ctx, cx, baseY - h, trunkW, h);
  // Left arm
  const armH = Math.round(h * 0.3);
  rect(ctx, cx - trunkW, baseY - h * 0.62, trunkW - 1, armH);
  rect(ctx, cx - trunkW, baseY - h * 0.62, trunkW + 2, Math.max(3, trunkW - 1));
  // Right arm
  rect(ctx, cx + trunkW, baseY - h * 0.5, trunkW - 1, Math.round(h * 0.26));
  rect(ctx, cx + trunkW - 1, baseY - h * 0.5, trunkW + 2, Math.max(3, trunkW - 1));
}

export interface CactusSpec {
  /** Number of cactus columns clustered together. */
  count: number;
  large: boolean;
}

export function drawCactus(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  w: number,
  spec: CactusSpec,
  fg: string,
) {
  ctx.fillStyle = fg;
  const h = spec.large ? 50 : 34;
  const per = w / spec.count;
  for (let i = 0; i < spec.count; i++) {
    // Slight height variation between members of a cluster.
    const jitter = spec.count > 1 ? (i % 2 === 0 ? 0 : -6) : 0;
    drawSingleCactus(ctx, x + i * per, baseY, per, h + jitter);
  }
}

// ---------------------------------------------------------------------------
// Pterodactyl
// ---------------------------------------------------------------------------

export function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fg: string,
  tick: number,
) {
  ctx.fillStyle = fg;
  const wingsUp = Math.floor(tick / 12) % 2 === 0;

  // Body
  rect(ctx, x + w * 0.2, y + h * 0.45, w * 0.5, h * 0.22);
  // Head + beak
  rect(ctx, x + w * 0.62, y + h * 0.36, w * 0.22, h * 0.26);
  rect(ctx, x + w * 0.82, y + h * 0.44, w * 0.18, h * 0.12);

  // Wing
  if (wingsUp) {
    rect(ctx, x + w * 0.18, y + h * 0.05, w * 0.42, h * 0.18);
    rect(ctx, x + w * 0.32, y - h * 0.12 + h * 0.18, w * 0.3, h * 0.2);
  } else {
    rect(ctx, x + w * 0.18, y + h * 0.6, w * 0.42, h * 0.18);
    rect(ctx, x + w * 0.32, y + h * 0.66, w * 0.3, h * 0.22);
  }
}

// ---------------------------------------------------------------------------
// Scenery
// ---------------------------------------------------------------------------

export function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) {
  ctx.fillStyle = color;
  rect(ctx, x + 6, y + 6, 30, 8);
  rect(ctx, x + 12, y + 2, 18, 8);
  rect(ctx, x + 0, y + 9, 46, 5);
}

export function drawMoon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  bg: string,
) {
  // Crescent: a disc with a bg disc punched out of it.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x + 5, y - 2, 10, 0, Math.PI * 2);
  ctx.fill();
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) {
  ctx.fillStyle = color;
  rect(ctx, x, y + 1, 3, 1);
  rect(ctx, x + 1, y, 1, 3);
}

// Re-export box dimensions so callers don't import constants twice.
export const DINO_BOX = { w: DINO_WIDTH, h: DINO_HEIGHT };
export const DINO_DUCK_BOX = { w: DINO_DUCK_WIDTH, h: DINO_DUCK_HEIGHT };
