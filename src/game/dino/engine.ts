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
  COLOR_HILLS,
  PARTICLE_POOL_SIZE,
  DUST_JUMP_COUNT,
  DUST_LAND_COUNT,
  DEATH_DEBRIS_COUNT,
  MILESTONE_BURST_COUNT,
  CELEBRATION_BURST_COUNT,
  SQUASH_DECAY,
  SQUASH_TAKEOFF,
  SQUASH_LAND,
  SQUASH_SCALE_X,
  SQUASH_SCALE_Y,
  SHAKE_DURATION,
  SHAKE_MAGNITUDE,
  DEATH_FLASH_DURATION,
  DEATH_FLASH_MAX_ALPHA,
  MILESTONE_POP_DURATION,
} from './constants';
import {
  drawDino,
  drawCactus,
  drawBird,
  drawCloud,
  drawMoon,
  drawStar,
  drawHills,
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

/** A pooled particle (dust / confetti / debris). Reused — never re-allocated. */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  grav: number;
  drag: number;
  /** Index into PARTICLE_PALETTE. */
  color: number;
  /** 0 = solid square, 1 = spark (shrinks as it fades). */
  shape: number;
  active: boolean;
}

// Brand palette (violet/pink/cyan/green/amber/coral) + two dust tones. Cached
// as opaque strings; particle fade is applied via ctx.globalAlpha so drawing
// never allocates a colour string per frame.
const PARTICLE_PALETTE = [
  '#7c3aed', // 0 violet
  '#ec4899', // 1 pink
  '#06b6d4', // 2 cyan
  '#22c55e', // 3 green
  '#f59e0b', // 4 amber
  '#fb5b6b', // 5 coral
  '#a99fce', // 6 dust (mid)
  '#d8cff0', // 7 dust (light)
];

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

/** Smoothstep easing — softens the linear day<->night progress into an S-curve. */
function smoothstep(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
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
  /** When true the running simulation freezes (used for the +1000 reinforcement
   *  question): particles keep animating but the world, score, and obstacles
   *  hold until the React layer clears it. */
  paused = false;

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

  // Juice: particle pool, squash & stretch, screen shake, flashes, score pop.
  private particles: Particle[] = [];
  private partCursor = 0;
  private squash = 0;
  private shakeTimer = 0;
  private deathFlash = 0;
  private milestonePopTimer = 0;
  private milestonePopValue = 0;

  // Extra parallax layers (distant mountains + near hills) scroll offsets.
  private hillOffsetFar = 0;
  private hillOffsetNear = 0;

  // Callbacks (wired by the React layer)
  onGameOver: ((score: number) => void) | null = null;
  onMilestone: ((score: number) => void) | null = null;

  constructor() {
    this.initParticles();
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
    this.paused = false;
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
    this.squash = 0;
    this.shakeTimer = 0;
    this.deathFlash = 0;
    this.milestonePopTimer = 0;
    this.milestonePopValue = 0;
    this.deactivateParticles();
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

  /**
   * Begin the variables "free run": the dino runs and the score ticks up, but
   * no obstacles spawn and nothing can hurt it. The score / high-score HUD is
   * highlighted so the variables pop-up can point straight at it. Re-armed
   * before every run (not just once); beginRealGame() then switches obstacles
   * on once the player answers the variables question correctly.
   */
  startTutorial() {
    this.reset();
    this.obstaclesEnabled = false;
    this.highlightScore = true;
    this.status = 'running';
  }

  /**
   * A quick celebratory flourish (confetti burst + score pop). Played when the
   * player answers the variables question correctly, right before obstacles are
   * switched on by beginRealGame().
   */
  celebrate() {
    this.spawnCelebration();
    this.milestonePopTimer = MILESTONE_POP_DURATION;
    this.milestonePopValue = this.score;
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
      this.squash = SQUASH_TAKEOFF; // stretch up off the line
      this.spawnDust('jump');
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

    // Effect timers + particles + squash animate in every state so death
    // debris keeps flying and the shake/flash finish even after game over.
    if (this.overLock > 0) this.overLock = Math.max(0, this.overLock - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.deathFlash > 0) this.deathFlash = Math.max(0, this.deathFlash - dt);
    if (this.milestonePopTimer > 0) this.milestonePopTimer = Math.max(0, this.milestonePopTimer - dt);
    this.squash += (0 - this.squash) * Math.min(1, dt * SQUASH_DECAY);
    this.updateParticles(dt);

    // Scenery animates in every state so the title screen feels alive. While
    // paused for a reinforcement question the world holds, so feed it 0 speed.
    this.updateScenery(dt, this.status === 'running' && !this.paused ? this.speed : 0);

    if (this.status !== 'running') return;
    // Frozen for a reinforcement question: particles above keep flying, but the
    // world, score, and obstacles hold until the React layer clears `paused`.
    if (this.paused) return;

    // Speed + score
    this.speed = Math.min(SPEED_MAX, this.speed + SPEED_ACCEL * dt);
    const move = this.speed * dt;
    this.distance += move;
    this.scoreFloat += move * SCORE_PER_UNIT;
    this.score = Math.floor(this.scoreFloat);

    // Milestone: flash the score, pop a celebratory number, burst confetti.
    if (this.score >= this.lastMilestone + MILESTONE_INTERVAL) {
      this.lastMilestone = Math.floor(this.score / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
      this.flashTimer = 0.6;
      this.milestonePopTimer = MILESTONE_POP_DURATION;
      this.milestonePopValue = this.lastMilestone;
      this.spawnMilestoneBurst();
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
        this.squash = SQUASH_LAND; // squash down on impact
        this.spawnDust('land');
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
    // Parallax: far mountains crawl, near hills roll a touch quicker. They keep
    // a gentle idle drift on the title screen so the scene always breathes.
    // Offsets wrap at 2400 — a common multiple of both layers' 2x-wavelength
    // periods (480 + 300, see draw()) — so the loop is perfectly seamless.
    const hillFarSpeed = worldSpeed > 0 ? worldSpeed * 0.08 : 3;
    const hillNearSpeed = worldSpeed > 0 ? worldSpeed * 0.22 : 7;
    this.hillOffsetFar = (this.hillOffsetFar + hillFarSpeed * dt) % 2400;
    this.hillOffsetNear = (this.hillOffsetNear + hillNearSpeed * dt) % 2400;

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
    this.squash = 0;
    this.shakeTimer = SHAKE_DURATION;
    this.deathFlash = DEATH_FLASH_DURATION;
    this.spawnDeathDebris();
    if (this.score > this.highScore) this.highScore = this.score;
    this.onGameOver?.(this.score);
  }

  // --- Rendering -----------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D) {
    // Smoothstep the linear night progress into an eased S-curve crossfade.
    const t = smoothstep(this.nightT);
    const skyTop = lerpColor(COLOR_DAY.skyTop, COLOR_NIGHT.skyTop, t);
    const skyBottom = lerpColor(COLOR_DAY.skyBottom, COLOR_NIGHT.skyBottom, t);
    const groundC = lerpColor(COLOR_DAY.ground, COLOR_NIGHT.ground, t);
    const dinoC = lerpColor(COLOR_DAY.dino, COLOR_NIGHT.dino, t);
    const cactusC = lerpColor(COLOR_DAY.cactus, COLOR_NIGHT.cactus, t);
    const birdC = lerpColor(COLOR_DAY.bird, COLOR_NIGHT.bird, t);
    const cloudC = lerpColor(COLOR_DAY.cloud, COLOR_NIGHT.cloud, t);
    const textC = lerpColor(COLOR_DAY.text, COLOR_NIGHT.text, t);
    const eyeC = lerpColor(COLOR_DAY.eye, COLOR_NIGHT.eye, t);
    const hillFarC = lerpColor(COLOR_HILLS.farDay, COLOR_HILLS.farNight, t);
    const hillNearC = lerpColor(COLOR_HILLS.nearDay, COLOR_HILLS.nearNight, t);

    // Screen shake (death). Eases out; only the world layer is translated —
    // the HUD stays rock-steady so the numbers remain readable.
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTimer > 0) {
      const k = this.shakeTimer / SHAKE_DURATION;
      const mag = SHAKE_MAGNITUDE * k * k;
      shakeX = (Math.random() * 2 - 1) * mag;
      shakeY = (Math.random() * 2 - 1) * mag;
    }

    ctx.save();
    ctx.translate(Math.round(shakeX), Math.round(shakeY));

    // Sky gradient — over-filled so the shake never exposes a bare edge.
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(1, skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(-16, -16, WORLD_WIDTH + 32, WORLD_HEIGHT + 32);

    // Stars + moon fade in with the night for a smooth crossfade.
    if (t > 0.001) {
      ctx.globalAlpha = Math.min(1, t * 1.4);
      const starColor = lerpColor('#ffffff', '#fff4c2', t);
      for (const s of this.stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(this.tick * 0.05 + s.phase * 7);
        if (twinkle > 0.45) drawStar(ctx, s.x, s.y, starColor);
      }
      drawMoon(ctx, WORLD_WIDTH - 70, 34, '#fff0a6', skyTop);
      ctx.globalAlpha = 1;
    }

    // Parallax depth: distant hazy mountains (slow) behind the clouds…
    drawHills(ctx, this.hillOffsetFar, GROUND_Y - 54, 24, 240, GROUND_Y, hillFarC);
    for (const c of this.clouds) drawCloud(ctx, c.x, c.y, cloudC);
    // …and nearer rolling hills (faster) in front of them.
    drawHills(ctx, this.hillOffsetNear, GROUND_Y - 22, 12, 150, GROUND_Y, hillNearC);

    // Ground
    ctx.fillStyle = groundC;
    ctx.fillRect(-16, GROUND_Y, WORLD_WIDTH + 32, 2);
    for (const b of this.bumps) ctx.fillRect(Math.round(b.x), GROUND_Y + 4, Math.round(b.w), 2);

    // Obstacles — green cacti, pink pterodactyls
    for (const o of this.obstacles) {
      if (o.kind === 'cactus') drawCactus(ctx, o.x, GROUND_Y, o.w, o.spec, cactusC);
      else drawBird(ctx, o.x, o.y, o.w, o.h, birdC, this.tick);
    }

    // Dino (brand violet) with squash & stretch anchored at its feet.
    const pose = this.poseForDraw();
    const q = this.squash;
    if (Math.abs(q) > 0.002) {
      const spriteW = pose === 'duck' ? DINO_DUCK_WIDTH : DINO_WIDTH;
      const spriteH = pose === 'duck' ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
      const anchorX = DINO_X + spriteW / 2;
      const anchorY = this.dinoY + spriteH;
      ctx.save();
      ctx.translate(anchorX, anchorY);
      ctx.scale(1 + q * SQUASH_SCALE_X, 1 - q * SQUASH_SCALE_Y);
      ctx.translate(-anchorX, -anchorY);
      drawDino(ctx, DINO_X, this.dinoY, dinoC, eyeC, pose, this.tick);
      ctx.restore();
    } else {
      drawDino(ctx, DINO_X, this.dinoY, dinoC, eyeC, pose, this.tick);
    }

    // Particles (dust, confetti, debris) ride on top of the world layer.
    this.drawParticles(ctx);

    ctx.restore();

    // HUD — drawn outside the shake transform so it stays crisp.
    this.drawScore(ctx, textC);
    this.drawMilestonePop(ctx);

    // Death red flash, full-screen above everything.
    if (this.deathFlash > 0) {
      ctx.globalAlpha = (this.deathFlash / DEATH_FLASH_DURATION) * DEATH_FLASH_MAX_ALPHA;
      ctx.fillStyle = '#fb5b6b';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.globalAlpha = 1;
    }
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

  // --- Juice: particle pool + score pop ------------------------------------

  private initParticles() {
    this.particles = new Array(PARTICLE_POOL_SIZE);
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles[i] = {
        x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1,
        size: 2, grav: 0, drag: 0, color: 6, shape: 0, active: false,
      };
    }
  }

  private deactivateParticles() {
    for (let i = 0; i < this.particles.length; i++) this.particles[i].active = false;
    this.partCursor = 0;
  }

  /** Reuse the next slot in the ring buffer — never allocates a new object. */
  private spawnParticle(
    x: number, y: number, vx: number, vy: number,
    life: number, size: number, grav: number, drag: number,
    color: number, shape: number,
  ) {
    const p = this.particles[this.partCursor];
    this.partCursor = (this.partCursor + 1) % PARTICLE_POOL_SIZE;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.maxLife = life; p.size = size;
    p.grav = grav; p.drag = drag; p.color = color; p.shape = shape;
    p.active = true;
  }

  private updateParticles(dt: number) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      if (p.drag > 0) {
        const f = Math.max(0, 1 - p.drag * dt);
        p.vx *= f;
        p.vy *= f;
      }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      const k = p.life / p.maxLife;
      ctx.globalAlpha = k < 0 ? 0 : k > 1 ? 1 : k;
      ctx.fillStyle = PARTICLE_PALETTE[p.color];
      const s = p.shape === 1 ? p.size * (0.4 + 0.6 * k) : p.size;
      const hs = s / 2;
      ctx.fillRect(Math.round(p.x - hs), Math.round(p.y - hs), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
    }
    ctx.globalAlpha = 1;
  }

  private spawnDust(kind: 'jump' | 'land') {
    const baseX = DINO_X + DINO_WIDTH / 2;
    const baseY = GROUND_Y - 1;
    const n = kind === 'jump' ? DUST_JUMP_COUNT : DUST_LAND_COUNT;
    for (let i = 0; i < n; i++) {
      let vx: number;
      let vy: number;
      if (kind === 'jump') {
        vx = -rand(30, 140); // kicked back as the dino leaps forward
        vy = -rand(20, 70);
      } else {
        const dir = i % 2 === 0 ? -1 : 1; // sprays both ways on impact
        vx = dir * rand(40, 160);
        vy = -rand(30, 95);
      }
      this.spawnParticle(
        baseX + rand(-6, 6),
        baseY - rand(0, 4),
        vx, vy,
        rand(0.26, 0.5),
        rand(2, 4),
        560, 2.2,
        Math.random() < 0.5 ? 6 : 7,
        0,
      );
    }
  }

  private spawnMilestoneBurst() {
    const x = WORLD_WIDTH - 30;
    const y = 16;
    for (let i = 0; i < MILESTONE_BURST_COUNT; i++) {
      this.spawnParticle(
        x + rand(-10, 10),
        y + rand(-4, 8),
        rand(-130, 130),
        -rand(40, 180),
        rand(0.6, 1.0),
        rand(2, 4),
        360, 0.5,
        Math.floor(rand(0, 6)),
        Math.random() < 0.45 ? 1 : 0,
      );
    }
  }

  private spawnCelebration() {
    const x = DINO_X + DINO_WIDTH / 2;
    const y = this.dinoY + DINO_HEIGHT / 2;
    for (let i = 0; i < CELEBRATION_BURST_COUNT; i++) {
      const ang = rand(0, Math.PI * 2);
      const sp = rand(70, 240);
      this.spawnParticle(
        x, y,
        Math.cos(ang) * sp,
        Math.sin(ang) * sp - 60,
        rand(0.7, 1.2),
        rand(2, 5),
        330, 0.5,
        Math.floor(rand(0, 6)),
        Math.random() < 0.5 ? 1 : 0,
      );
    }
  }

  private spawnDeathDebris() {
    const x = DINO_X + DINO_WIDTH / 2;
    const y = this.dinoY + DINO_HEIGHT / 2;
    for (let i = 0; i < DEATH_DEBRIS_COUNT; i++) {
      const ang = rand(-Math.PI, 0); // upward hemisphere
      const sp = rand(80, 240);
      this.spawnParticle(
        x, y,
        Math.cos(ang) * sp,
        Math.sin(ang) * sp,
        rand(0.4, 0.75),
        rand(2, 4),
        720, 0.8,
        i % 3 === 0 ? 5 : i % 3 === 1 ? 0 : 1, // coral / violet / pink
        0,
      );
    }
  }

  private drawMilestonePop(ctx: CanvasRenderingContext2D) {
    if (this.milestonePopTimer <= 0) return;
    const k = this.milestonePopTimer / MILESTONE_POP_DURATION; // 1 -> 0
    const appear = 1 - k;
    const x = WORLD_WIDTH - 34;
    const y = 40 - appear * 18;
    const scale = 0.7 + appear * 0.6;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.font = '800 18px "Fredoka", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`${this.milestonePopValue}!`, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }
}
