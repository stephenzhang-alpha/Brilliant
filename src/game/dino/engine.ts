// ---------------------------------------------------------------------------
// Dino runner — game engine
//
// A framework-agnostic simulation. The React component owns the rAF loop and
// simply calls `update(dt)` then `draw(ctx)` every frame, forwards input, and
// reads the public `status` / `score` fields. All physics is integrated in
// units-per-second so behaviour is frame-rate independent.
// ---------------------------------------------------------------------------

import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  GROUND_Y,
  DINO_X,
  DINO_WIDTH,
  DINO_HEIGHT,
  DINO_DUCK_WIDTH,
  DINO_DUCK_HEIGHT,
  DINO_HITBOX_INSET,
  GRAVITY,
  FAST_FALL_GRAVITY,
  JUMP_VELOCITY,
  JUMP_CUTOFF_VELOCITY,
  SPEED_START,
  SPEED_MAX,
  SPEED_ACCEL,
  SCORE_PER_UNIT,
  MILESTONE_INTERVAL,
  SPAWN_GAP_MIN_SEC,
  SPAWN_GAP_MAX_SEC,
  BIRD_MIN_SCORE,
  NIGHT_INTERVAL,
  NIGHT_FADE_SEC,
  COLOR_DAY,
  COLOR_NIGHT,
} from './constants';
import {
  drawDino,
  drawCactus,
  drawBird,
  drawCloud,
  drawMoon,
  drawStar,
  CactusSpec,
} from './sprites';

export type GameStatus = 'ready' | 'running' | 'over';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CactusObstacle extends Box {
  kind: 'cactus';
  spec: CactusSpec;
}
interface BirdObstacle extends Box {
  kind: 'bird';
}
type Obstacle = CactusObstacle | BirdObstacle;

interface Cloud {
  x: number;
  y: number;
}
interface Star {
  x: number;
  y: number;
  phase: number;
}
interface Bump {
  x: number;
  w: number;
}

const BIRD_W = 46;
const BIRD_H = 30;
// Heights are relative to the ground so they stay fair regardless of world height.
const BIRD_TIERS = [GROUND_Y - 28, GROUND_Y - 62, GROUND_Y - 84]; // low (jump), mid (duck/jump), high (run under)

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function intersects(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export class DinoGame {
  status: GameStatus = 'ready';
  score = 0;
  highScore = 0;

  /** When false the world scrolls and the score ticks, but nothing spawns and
   *  nothing can kill the dino — used by the variables tutorial. */
  obstaclesEnabled = true;
  /** Draws an attention ring around the score / high score (tutorial). */
  highlightScore = false;

  // Dino state
  private dinoY = GROUND_Y - DINO_HEIGHT;
  private dinoVy = 0;
  private onGround = true;
  private duckHeld = false;
  private jumpHeld = false;

  // World
  private speed = SPEED_START;
  private distance = 0;
  private scoreFloat = 0;
  private nextSpawnDistance = 0;
  private obstacles: Obstacle[] = [];
  private tick = 0;

  // Day / night
  private nightT = 0;

  // Scenery
  private clouds: Cloud[] = [];
  private stars: Star[] = [];
  private bumps: Bump[] = [];

  // Effects / housekeeping
  private overLock = 0;
  private lastMilestone = 0;
  private flashTimer = 0;

  // Callbacks (wired by the React layer)
  onGameOver: ((score: number) => void) | null = null;
  onMilestone: ((score: number) => void) | null = null;

  constructor() {
    this.initScenery();
  }

  private initScenery() {
    this.clouds = [
      { x: 120, y: 28 },
      { x: 320, y: 18 },
      { x: 520, y: 40 },
    ];
    this.stars = [];
    for (let i = 0; i < 9; i++) {
      this.stars.push({ x: rand(0, WORLD_WIDTH), y: rand(8, 60), phase: rand(0, 1) });
    }
    this.bumps = [];
    for (let x = 0; x < WORLD_WIDTH; x += rand(40, 110)) {
      this.bumps.push({ x, w: rand(2, 12) });
    }
  }

  // --- Public lifecycle ----------------------------------------------------

  reset() {
    this.status = 'ready';
    this.score = 0;
    this.scoreFloat = 0;
    this.distance = 0;
    this.speed = SPEED_START;
    this.obstacles = [];
    this.dinoY = GROUND_Y - DINO_HEIGHT;
    this.dinoVy = 0;
    this.onGround = true;
    this.duckHeld = false;
    this.nightT = 0;
    this.tick = 0;
    this.lastMilestone = 0;
    this.flashTimer = 0;
    this.nextSpawnDistance = 280;
    this.highlightScore = false;
    this.initScenery();
  }

  start() {
    this.reset();
    this.status = 'running';
  }

  /**
   * Transition from the tutorial "run with no obstacles" phase into the real
   * game: re-enable obstacles and freshly restart scoring/difficulty while the
   * dino keeps running.
   */
  beginRealGame() {
    this.obstaclesEnabled = true;
    this.highlightScore = false;
    this.score = 0;
    this.scoreFloat = 0;
    this.distance = 0;
    this.speed = SPEED_START;
    this.obstacles = [];
    this.nextSpawnDistance = 280;
    this.lastMilestone = 0;
    this.nightT = 0;
    this.status = 'running';
  }

  /** Context-aware primary action: start, jump, or restart. */
  primary() {
    if (this.status === 'ready') {
      this.start();
    } else if (this.status === 'running') {
      this.jump();
    } else if (this.status === 'over' && this.overLock <= 0) {
      this.start();
    }
  }

  // --- Input ---------------------------------------------------------------

  jump() {
    if (this.status !== 'running') return;
    this.jumpHeld = true;
    if (this.onGround) {
      this.dinoVy = JUMP_VELOCITY;
      this.onGround = false;
    }
  }

  releaseJump() {
    this.jumpHeld = false;
    // Short hop: clip upward momentum when released early.
    if (!this.onGround && this.dinoVy < JUMP_CUTOFF_VELOCITY) {
      this.dinoVy = JUMP_CUTOFF_VELOCITY;
    }
  }

  setDuck(down: boolean) {
    this.duckHeld = down;
  }

  private get isDucking(): boolean {
    return this.duckHeld && this.onGround && this.status === 'running';
  }

  // --- Simulation ----------------------------------------------------------

  update(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05); // guard against huge steps (tab refocus)
    this.tick += dt * 60;

    if (this.overLock > 0) this.overLock = Math.max(0, this.overLock - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);

    // Scenery animates in every state so the title screen feels alive.
    this.updateScenery(dt, this.status === 'running' ? this.speed : SPEED_START * 0.0);

    if (this.status !== 'running') return;

    // Speed + score
    this.speed = Math.min(SPEED_MAX, this.speed + SPEED_ACCEL * dt);
    const move = this.speed * dt;
    this.distance += move;
    this.scoreFloat += move * SCORE_PER_UNIT;
    this.score = Math.floor(this.scoreFloat);

    // Milestone flash
    if (this.score >= this.lastMilestone + MILESTONE_INTERVAL) {
      this.lastMilestone = Math.floor(this.score / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
      this.flashTimer = 0.6;
      this.onMilestone?.(this.score);
    }

    // Day/night fade
    const nightTarget = Math.floor(this.score / NIGHT_INTERVAL) % 2 === 1 ? 1 : 0;
    const fadeStep = dt / NIGHT_FADE_SEC;
    if (this.nightT < nightTarget) this.nightT = Math.min(nightTarget, this.nightT + fadeStep);
    else if (this.nightT > nightTarget) this.nightT = Math.max(nightTarget, this.nightT - fadeStep);

    // Dino physics
    if (!this.onGround) {
      const g = this.duckHeld ? FAST_FALL_GRAVITY : GRAVITY;
      this.dinoVy += g * dt;
      this.dinoY += this.dinoVy * dt;
      const floor = GROUND_Y - DINO_HEIGHT;
      if (this.dinoY >= floor) {
        this.dinoY = floor;
        this.dinoVy = 0;
        this.onGround = true;
      }
    } else {
      this.dinoY = GROUND_Y - (this.isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT);
    }

    // Move obstacles + cull
    for (const o of this.obstacles) o.x -= move;
    this.obstacles = this.obstacles.filter((o) => o.x + o.w > -10);

    // Spawn + collision are skipped while obstacles are disabled (tutorial
    // "free run" phase) so the dino can run safely and the score can tick.
    if (this.obstaclesEnabled) {
      if (this.distance >= this.nextSpawnDistance) {
        this.spawnObstacle();
        const gap = Math.max(120, this.speed * rand(SPAWN_GAP_MIN_SEC, SPAWN_GAP_MAX_SEC));
        this.nextSpawnDistance = this.distance + gap;
      }

      const dinoBox = this.getDinoHitbox();
      for (const o of this.obstacles) {
        if (intersects(dinoBox, this.getObstacleHitbox(o))) {
          this.gameOver();
          break;
        }
      }
    }
  }

  private updateScenery(dt: number, worldSpeed: number) {
    // Clouds drift at ~half world speed; idle drift on the title screen.
    const cloudSpeed = worldSpeed > 0 ? worldSpeed * 0.45 : 14;
    for (const c of this.clouds) {
      c.x -= cloudSpeed * dt;
      if (c.x < -50) {
        c.x = WORLD_WIDTH + rand(20, 160);
        c.y = rand(10, 52);
      }
    }
    for (const s of this.stars) {
      s.x -= (worldSpeed > 0 ? worldSpeed * 0.15 : 4) * dt;
      if (s.x < -4) {
        s.x = WORLD_WIDTH + rand(0, 40);
        s.y = rand(8, 60);
      }
    }
    if (worldSpeed > 0) {
      for (const b of this.bumps) b.x -= worldSpeed * dt;
      this.bumps = this.bumps.filter((b) => b.x + b.w > -4);
      const rightmost = this.bumps.reduce((m, b) => Math.max(m, b.x), 0);
      if (rightmost < WORLD_WIDTH) {
        this.bumps.push({ x: rightmost + rand(40, 110), w: rand(2, 12) });
      }
    }
  }

  private spawnObstacle() {
    const canBird = this.score >= BIRD_MIN_SCORE;
    if (canBird && Math.random() < 0.28) {
      const tier = BIRD_TIERS[Math.floor(Math.random() * BIRD_TIERS.length)];
      this.obstacles.push({
        kind: 'bird',
        x: WORLD_WIDTH + 10,
        y: tier,
        w: BIRD_W,
        h: BIRD_H,
      });
      return;
    }
    const large = Math.random() < 0.45;
    const r = Math.random();
    const count = r < 0.5 ? 1 : r < 0.82 ? 2 : 3;
    const per = large ? 26 : 18;
    const w = per * count;
    const h = large ? 50 : 34;
    this.obstacles.push({
      kind: 'cactus',
      x: WORLD_WIDTH + 10,
      y: GROUND_Y - h,
      w,
      h,
      spec: { count, large },
    });
  }

  private getDinoHitbox(): Box {
    const ducking = this.isDucking;
    const w = ducking ? DINO_DUCK_WIDTH : DINO_WIDTH;
    const h = ducking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
    return {
      x: DINO_X + DINO_HITBOX_INSET.x,
      y: this.dinoY + DINO_HITBOX_INSET.y,
      w: w - DINO_HITBOX_INSET.x * 2,
      h: h - DINO_HITBOX_INSET.y * 2,
    };
  }

  private getObstacleHitbox(o: Obstacle): Box {
    if (o.kind === 'bird') {
      return { x: o.x + 8, y: o.y + 8, w: o.w - 16, h: o.h - 14 };
    }
    return { x: o.x + 4, y: o.y + 2, w: o.w - 8, h: o.h - 2 };
  }

  private gameOver() {
    this.status = 'over';
    this.overLock = 0.5;
    if (this.score > this.highScore) this.highScore = this.score;
    this.onGameOver?.(this.score);
  }

  // --- Rendering -----------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D) {
    const t = this.nightT;
    const skyTop = lerpColor(COLOR_DAY.skyTop, COLOR_NIGHT.skyTop, t);
    const skyBottom = lerpColor(COLOR_DAY.skyBottom, COLOR_NIGHT.skyBottom, t);
    const groundC = lerpColor(COLOR_DAY.ground, COLOR_NIGHT.ground, t);
    const dinoC = lerpColor(COLOR_DAY.dino, COLOR_NIGHT.dino, t);
    const cactusC = lerpColor(COLOR_DAY.cactus, COLOR_NIGHT.cactus, t);
    const birdC = lerpColor(COLOR_DAY.bird, COLOR_NIGHT.bird, t);
    const cloudC = lerpColor(COLOR_DAY.cloud, COLOR_NIGHT.cloud, t);
    const textC = lerpColor(COLOR_DAY.text, COLOR_NIGHT.text, t);
    const eyeC = lerpColor(COLOR_DAY.eye, COLOR_NIGHT.eye, t);

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(1, skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Stars + moon (night)
    if (t > 0.05) {
      const starColor = lerpColor('#ffffff', '#fff4c2', t);
      for (const s of this.stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(this.tick * 0.05 + s.phase * 7);
        if (twinkle > 0.45) drawStar(ctx, s.x, s.y, starColor);
      }
      drawMoon(ctx, WORLD_WIDTH - 70, 34, '#fff0a6', skyTop);
    }

    // Clouds
    for (const c of this.clouds) drawCloud(ctx, c.x, c.y, cloudC);

    // Ground
    ctx.fillStyle = groundC;
    ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, 2);
    for (const b of this.bumps) ctx.fillRect(Math.round(b.x), GROUND_Y + 4, Math.round(b.w), 2);

    // Obstacles — green cacti, pink pterodactyls
    for (const o of this.obstacles) {
      if (o.kind === 'cactus') drawCactus(ctx, o.x, GROUND_Y, o.w, o.spec, cactusC);
      else drawBird(ctx, o.x, o.y, o.w, o.h, birdC, this.tick);
    }

    // Dino (brand violet)
    const pose = this.poseForDraw();
    drawDino(ctx, DINO_X, this.dinoY, dinoC, eyeC, pose, this.tick);

    // Score + high score (top-right)
    this.drawScore(ctx, textC);
  }

  private poseForDraw(): 'idle' | 'run' | 'jump' | 'duck' | 'dead' {
    if (this.status === 'over') return 'dead';
    if (this.status === 'ready') return 'idle';
    if (!this.onGround) return 'jump';
    if (this.isDucking) return 'duck';
    return 'run';
  }

  private drawScore(ctx: CanvasRenderingContext2D, fg: string) {
    const showHi = this.highScore > 0 || this.highlightScore;

    // Tutorial: pulsing ring around the score / high score to point them out.
    if (this.highlightScore) {
      const pulse = 0.5 + 0.5 * Math.sin(this.tick * 0.12);
      const bx = WORLD_WIDTH - 156;
      ctx.fillStyle = `rgba(245, 158, 11, ${0.12 + 0.12 * pulse})`;
      ctx.fillRect(bx, 4, 150, 22);
      ctx.strokeStyle = `rgba(245, 158, 11, ${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, 4, 150, 22);
    }

    ctx.font = '700 13px "Courier New", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const pad = (n: number) => Math.min(99999, Math.floor(n)).toString().padStart(5, '0');

    let right = WORLD_WIDTH - 8;
    // Current score — blink during a milestone flash.
    const blink = this.flashTimer > 0 && Math.floor(this.flashTimer * 10) % 2 === 0;
    if (!blink) {
      ctx.fillStyle = fg;
      ctx.fillText(pad(this.score), right, 10);
    }
    right -= 52;
    if (showHi) {
      ctx.fillStyle = fg;
      ctx.globalAlpha = this.highlightScore ? 0.85 : 0.55;
      ctx.fillText(`HI ${pad(this.highScore)}`, right, 10);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
  }
}
