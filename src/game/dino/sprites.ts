// ---------------------------------------------------------------------------
// Dino runner — sprite rendering
//
// Everything is drawn with crisp axis-aligned rectangles (image smoothing is
// disabled on the context) so the art keeps the chunky, pixel feel of the
// original Chrome offline game while staying fully parametric and resolution
// independent. Colours are passed in so the same sprites work in both the day
// and night palettes.
// ---------------------------------------------------------------------------

import { WORLD_WIDTH } from './constants';

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

  // A simpler, more iconic silhouette: a chunky tail, one solid body, a big
  // head with a single eye, a stubby arm, and two simple legs.

  // Tail (one stubby block pointing back-left)
  rect(ctx, x + 0, y + 22, 13, 6);

  // Body / back — a single solid mass
  rect(ctx, x + 10, y + 13, 22, 21);
  rect(ctx, x + 14, y + 32, 13, 6); // belly

  // Neck + big head (top-right)
  rect(ctx, x + 22, y + 9, 9, 8);
  rect(ctx, x + 26, y + 0, 18, 15);

  // Mouth line + tiny arm (carve / add)
  ctx.fillStyle = bg;
  rect(ctx, x + 31, y + 12, 11, 2); // mouth
  ctx.fillStyle = fg;
  rect(ctx, x + 30, y + 21, 6, 3); // arm

  // Eye
  if (pose === 'dead') {
    ctx.fillStyle = bg;
    rect(ctx, x + 35, y + 3, 6, 6);
    ctx.fillStyle = fg;
    rect(ctx, x + 36, y + 4, 4, 1);
    rect(ctx, x + 36, y + 6, 4, 1);
  } else {
    ctx.fillStyle = bg;
    rect(ctx, x + 37, y + 4, 3, 3);
  }
  ctx.fillStyle = fg;

  // Legs — two stubby legs; run alternates one up / one down.
  const downLeg = (lx: number) => {
    rect(ctx, lx, y + 38, 7, 9);
    rect(ctx, lx - 1, y + 45, 9, 2);
  };
  const upLeg = (lx: number) => {
    rect(ctx, lx, y + 38, 7, 5);
    rect(ctx, lx - 1, y + 41, 9, 2);
  };
  const step = Math.floor(tick / 6) % 2;
  if (pose === 'run') {
    if (step === 0) {
      downLeg(x + 13);
      upLeg(x + 26);
    } else {
      upLeg(x + 13);
      downLeg(x + 26);
    }
  } else if (pose === 'jump') {
    rect(ctx, x + 13, y + 38, 7, 6);
    rect(ctx, x + 26, y + 38, 7, 6);
  } else {
    downLeg(x + 13);
    downLeg(x + 26);
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

// ---------------------------------------------------------------------------
// Parallax hills / mountains
// ---------------------------------------------------------------------------

/**
 * Fills a layer of seamless rolling hills built from summed sine waves.
 * `offset` scrolls the silhouette horizontally for parallax; because the waves
 * are periodic the layer wraps with no visible seam. The shape is filled from
 * its crest line down to `bottomY`.
 */
export function drawHills(
  ctx: CanvasRenderingContext2D,
  offset: number,
  crestY: number,
  amp: number,
  wavelength: number,
  bottomY: number,
  color: string,
) {
  const k = (Math.PI * 2) / wavelength;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, bottomY);
  for (let x = 0; x <= WORLD_WIDTH; x += 12) {
    const wx = (x + offset) * k;
    const y = crestY + Math.sin(wx) * amp + Math.sin(wx * 0.5 + 1.3) * amp * 0.5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WORLD_WIDTH, bottomY);
  ctx.closePath();
  ctx.fill();
}
