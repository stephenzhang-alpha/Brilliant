// ---------------------------------------------------------------------------
// Gate Runner — engine (v2, pseudo-3D)
//
// A "math gates" runner rendered in the pseudo-3D, camera-behind-the-crowd style
// of mobile-game ads: a road recedes toward a horizon, gates/enemies grow as
// they rush toward you, and your crowd runs at the bottom of the screen.
//
// Algebra theming:
//   • You begin as the variable x (an unknown value).
//   • An ASSIGNMENT gate gives x a concrete value (x = 5 / x = 9 …).
//   • OPERATION gates transform your value (+n, ×n).
//   • ENEMY lanes subtract from your value — steer to the other side.
//   • A FINAL BOSS fights your crowd; the survivors are your score.
//
// Scoring is tuned so a strong run lands in the few-hundreds and breaking 1000
// is genuinely hard. The React layer runs the rAF loop, calls update(dt) +
// draw(ctx), forwards input, and reads status/count.
// ---------------------------------------------------------------------------

export type GateStatus = 'ready' | 'running' | 'complete';
export type ChoiceKind = 'assign' | 'add' | 'mul' | 'enemy';

interface Choice {
  kind: ChoiceKind;
  val: number;
  color: string;
  label: string;
}
interface GateRow {
  z: number; // distance from the camera (0 = at the player line)
  left: Choice;
  right: Choice;
  applied: boolean;
  flash: number;
}

export const GW = 430;
export const GH = 640;

// --- Pseudo-3D camera ------------------------------------------------------
const CENTER = GW / 2;
const HORIZON_Y = 150; // road vanishing height
const NEAR_Y = 545; // player line (bottom of the road)
const NEAR_HALF_W = 192; // half road width at the near edge
const CAM_D = 0.72; // camera distance — controls how fast things shrink

const Z_START = 3.6; // distance of the first gate at the start
const ROW_GAP_Z = 1.5; // z-distance between gate rows
const SPEED_Z = 1.18; // z-units travelled per second
const NUM_ROWS = 11; // row 0 = assignment, then ops / enemies
const KEY_LANE_SPEED = 2.6; // lane units per second from keyboard
const DOT_CAP = 80;
const GATE_NEAR_H = 96; // gate panel height at the near plane (s = 1)

const C = {
  assign: '#7c3aed',
  add: '#22c55e',
  mul: '#3b82f6',
  enemy: '#ef4444',
  boss: '#b91c1c',
};
const CROWD_COLORS = ['#fbbf24', '#ec4899', '#22c55e', '#06b6d4', '#8b5cf6', '#fb5b6b'];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function assignChoice(val: number): Choice {
  return { kind: 'assign', val, color: C.assign, label: `x = ${val}` };
}
function addChoice(val: number): Choice {
  return { kind: 'add', val, color: C.add, label: `+${val}` };
}
function mulChoice(val: number): Choice {
  return { kind: 'mul', val, color: C.mul, label: `×${val}` };
}
function enemyChoice(val: number): Choice {
  return { kind: 'enemy', val, color: C.enemy, label: `−${val}` };
}

function makeRow(index: number, z: number): GateRow {
  if (index === 0) {
    const a = randInt(4, 7);
    const b = a + randInt(2, 4);
    return Math.random() < 0.5
      ? { z, left: assignChoice(a), right: assignChoice(b), applied: false, flash: 0 }
      : { z, left: assignChoice(b), right: assignChoice(a), applied: false, flash: 0 };
  }
  const op = (): Choice => (Math.random() < 0.3 ? mulChoice(pick([2, 2, 3])) : addChoice(randInt(8, 22)));
  let left: Choice;
  let right: Choice;
  if (Math.random() < 0.42) {
    const enemy = enemyChoice(randInt(25, 70));
    const gain = addChoice(randInt(6, 16));
    [left, right] = Math.random() < 0.5 ? [enemy, gain] : [gain, enemy];
  } else {
    left = op();
    right = op();
    let guard = 0;
    while (right.label === left.label && guard++ < 6) right = op();
  }
  return { z, left, right, applied: false, flash: 0 };
}

function applyChoice(count: number, ch: Choice): number {
  switch (ch.kind) {
    case 'assign':
      return ch.val;
    case 'add':
      return count + ch.val;
    case 'mul':
      return count * ch.val;
    case 'enemy':
      return Math.max(0, count - ch.val);
  }
}

interface Dot {
  ox: number;
  oy: number;
  color: string;
  phase: number;
}

export class GateRunner {
  status: GateStatus = 'ready';
  count = 0;
  assigned = false;
  rowsCleared = 0;
  readonly totalRows = NUM_ROWS;
  bossPower = 0;
  bossDefeated = false;

  private lane = 0; // -1 (left) .. 1 (right)
  private targetLane = 0;
  private moveLeft = false;
  private moveRight = false;
  private pointerLane: number | null = null;

  private rows: GateRow[] = [];
  private bossZ = 0;
  private tick = 0;
  private dots: Dot[] = [];
  private lastDelta: { text: string; color: string; t: number } | null = null;

  onComplete: ((count: number) => void) | null = null;

  constructor() {
    this.buildDots();
    this.reset();
  }

  private buildDots() {
    this.dots = [];
    for (let i = 0; i < DOT_CAP; i++) {
      const a = i * 2.399963;
      const r = 4 + Math.sqrt(i) * 6.4;
      this.dots.push({
        ox: Math.cos(a) * r,
        oy: Math.sin(a) * r * 0.6,
        color: CROWD_COLORS[i % CROWD_COLORS.length],
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  reset() {
    this.status = 'ready';
    this.count = 0;
    this.assigned = false;
    this.rowsCleared = 0;
    this.bossDefeated = false;
    this.lane = 0;
    this.targetLane = 0;
    this.moveLeft = false;
    this.moveRight = false;
    this.pointerLane = null;
    this.tick = 0;
    this.lastDelta = null;
    this.rows = [];
    for (let i = 0; i < NUM_ROWS; i++) {
      this.rows.push(makeRow(i, Z_START + i * ROW_GAP_Z));
    }
    this.bossZ = Z_START + NUM_ROWS * ROW_GAP_Z + 1.1;
    this.bossPower = randInt(110, 160);
  }

  start() {
    if (this.status === 'complete') this.reset();
    this.status = 'running';
  }
  primary() {
    if (this.status === 'ready') this.start();
  }

  setMove(dir: 'left' | 'right', down: boolean) {
    if (dir === 'left') this.moveLeft = down;
    else this.moveRight = down;
  }
  /** Pointer X in canvas/world space (0..GW); converted to a lane internally. */
  setPointerX(x: number | null) {
    this.pointerLane = x == null ? null : Math.max(-1, Math.min(1, (x - CENTER) / NEAR_HALF_W));
  }

  // --- Perspective projection ----------------------------------------------
  private scaleAt(z: number): number {
    return CAM_D / (CAM_D + Math.max(0, z));
  }
  private project(lane: number, z: number): { x: number; y: number; s: number; halfW: number } {
    const s = this.scaleAt(z);
    const halfW = NEAR_HALF_W * s;
    return { x: CENTER + lane * halfW, y: HORIZON_Y + (NEAR_Y - HORIZON_Y) * s, s, halfW };
  }

  // --- Simulation ----------------------------------------------------------
  update(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);
    this.tick += dt * 60;
    if (this.lastDelta) {
      this.lastDelta.t -= dt;
      if (this.lastDelta.t <= 0) this.lastDelta = null;
    }
    for (const r of this.rows) if (r.flash > 0) r.flash = Math.max(0, r.flash - dt);

    if (this.status !== 'running') return;

    if (this.pointerLane != null) {
      this.targetLane = this.pointerLane;
    } else {
      if (this.moveLeft) this.targetLane -= KEY_LANE_SPEED * dt;
      if (this.moveRight) this.targetLane += KEY_LANE_SPEED * dt;
    }
    this.targetLane = Math.max(-1, Math.min(1, this.targetLane));
    this.lane += (this.targetLane - this.lane) * Math.min(1, dt * 14);

    const dz = SPEED_Z * dt;
    for (const r of this.rows) {
      r.z -= dz;
      if (!r.applied && r.z <= 0) {
        const ch = this.lane < 0 ? r.left : r.right;
        this.count = applyChoice(this.assigned ? this.count : 0, ch);
        if (ch.kind === 'assign') this.assigned = true;
        r.applied = true;
        r.flash = 0.5;
        this.rowsCleared++;
        this.lastDelta = { text: ch.label, color: ch.color, t: 0.95 };
      }
    }

    this.bossZ -= dz;
    if (!this.bossDefeated && this.bossZ <= 0) {
      this.bossDefeated = true;
      this.count = Math.max(0, this.count - this.bossPower);
      this.lastDelta = { text: `boss −${this.bossPower}`, color: C.boss, t: 1.4 };
      this.status = 'complete';
      this.onComplete?.(this.count);
    }
  }

  // --- Rendering -----------------------------------------------------------
  draw(ctx: CanvasRenderingContext2D) {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 60);
    sky.addColorStop(0, '#7dd3fc');
    sky.addColorStop(1, '#c4b5fd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, GW, HORIZON_Y + 60);

    // Distant sun + hills for depth
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(CENTER, HORIZON_Y - 6, 40, 0, Math.PI * 2);
    ctx.fill();

    // Ground plane below the horizon
    const ground = ctx.createLinearGradient(0, HORIZON_Y, 0, GH);
    ground.addColorStop(0, '#a78bfa');
    ground.addColorStop(1, '#f0abfc');
    ctx.fillStyle = ground;
    ctx.fillRect(0, HORIZON_Y, GW, GH - HORIZON_Y);

    // Road trapezoid (near wide -> horizon point)
    const nearL = this.project(-1, 0);
    const nearR = this.project(1, 0);
    const farL = this.project(-1, 60);
    const farR = this.project(1, 60);
    ctx.fillStyle = '#eef2f7';
    ctx.beginPath();
    ctx.moveTo(nearL.x, nearL.y);
    ctx.lineTo(nearR.x, nearR.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.lineTo(farL.x, farL.y);
    ctx.closePath();
    ctx.fill();

    // Side rails
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(nearL.x, nearL.y);
    ctx.lineTo(farL.x, farL.y);
    ctx.moveTo(nearR.x, nearR.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.stroke();

    // Flowing centre dashes (speed)
    const STRIPE_GAP = 1.0;
    const phase = (this.tick * 0.018) % STRIPE_GAP;
    ctx.fillStyle = '#dbe2ec';
    for (let k = 0; k < 26; k++) {
      const z0 = k * STRIPE_GAP - phase;
      if (z0 <= 0.02) continue;
      const a = this.project(0, z0);
      const b = this.project(0, z0 + 0.42);
      const wa = Math.max(1, 7 * a.s);
      const wb = Math.max(1, 7 * b.s);
      ctx.beginPath();
      ctx.moveTo(a.x - wa, a.y);
      ctx.lineTo(a.x + wa, a.y);
      ctx.lineTo(b.x + wb, b.y);
      ctx.lineTo(b.x - wb, b.y);
      ctx.closePath();
      ctx.fill();
    }

    // Rows + boss, far to near (painter's algorithm)
    const drawables = this.rows
      .filter((r) => r.z > 0.02 && r.z < 60 && !r.applied)
      .sort((p, q) => q.z - p.z);
    for (const r of drawables) {
      this.drawChoice(ctx, r, true);
      this.drawChoice(ctx, r, false);
    }
    this.drawBoss(ctx);

    // Player crowd (nearest, on top)
    this.drawCrowd(ctx);

    if (this.lastDelta) {
      ctx.globalAlpha = Math.min(1, this.lastDelta.t * 2);
      ctx.fillStyle = this.lastDelta.color;
      ctx.font = '800 34px Fredoka, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.lastDelta.text, CENTER + this.lane * NEAR_HALF_W, NEAR_Y - 96 - (0.95 - this.lastDelta.t) * 26);
      ctx.globalAlpha = 1;
    }

    this.drawHud(ctx);
  }

  private drawChoice(ctx: CanvasRenderingContext2D, r: GateRow, isLeft: boolean) {
    const ch = isLeft ? r.left : r.right;
    // Lane span for each half (small gap at the centre divider).
    const laneCenter = isLeft ? -0.52 : 0.52;
    const laneSpan = 0.9;
    const p = this.project(laneCenter, r.z);
    const w = laneSpan * NEAR_HALF_W * p.s;
    const h = GATE_NEAR_H * p.s;
    const x0 = p.x - w / 2;
    const top = p.y - h;
    if (h < 2) return;

    if (ch.kind === 'enemy') {
      ctx.fillStyle = ch.color;
      ctx.globalAlpha = r.flash > 0 ? 1 : 0.92;
      this.roundRect(ctx, x0 + w * 0.16, top + h * 0.12, w * 0.68, h * 0.8, 12 * p.s);
      ctx.fill();
      ctx.globalAlpha = 1;
      // angry eyes
      ctx.fillStyle = '#fff';
      const ey = p.y - h * 0.62;
      ctx.fillRect(p.x - 12 * p.s, ey, 6 * p.s, 6 * p.s);
      ctx.fillRect(p.x + 6 * p.s, ey, 6 * p.s, 6 * p.s);
      this.label(ctx, ch.label, p.x, p.y - h * 0.28, p.s, '#fff');
      return;
    }

    // translucent column + solid header bar
    ctx.fillStyle = ch.color;
    ctx.globalAlpha = r.flash > 0 ? 0.9 : 0.46;
    this.roundRect(ctx, x0, top, w, h, 12 * p.s);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = ch.color;
    this.roundRect(ctx, x0, top, w, Math.max(3, 16 * p.s), 8 * p.s);
    ctx.fill();
    this.label(ctx, ch.label, p.x, p.y - h * 0.42, p.s, '#fff');
  }

  private label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, s: number, color: string) {
    const size = Math.max(9, Math.round(34 * s));
    ctx.fillStyle = color;
    ctx.font = `800 ${size}px Fredoka, Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  private drawBoss(ctx: CanvasRenderingContext2D) {
    if (this.bossDefeated || this.bossZ <= 0.02 || this.bossZ > 60) return;
    const p = this.project(0, this.bossZ);
    const w = 1.7 * NEAR_HALF_W * p.s;
    const h = 150 * p.s;
    if (h < 3) return;
    ctx.fillStyle = C.boss;
    this.roundRect(ctx, p.x - w / 2, p.y - h, w, h * 0.9, 16 * p.s);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(p.x - 22 * p.s, p.y - h * 0.66, 14 * p.s, 12 * p.s);
    ctx.fillRect(p.x + 8 * p.s, p.y - h * 0.66, 14 * p.s, 12 * p.s);
    this.label(ctx, '👹', p.x, p.y - h * 0.95, p.s * 1.2, '#fff');
    this.label(ctx, String(this.bossPower), p.x, p.y - h * 0.3, p.s * 1.1, '#fff');
  }

  private drawCrowd(ctx: CanvasRenderingContext2D) {
    const px = CENTER + this.lane * NEAR_HALF_W;
    if (!this.assigned) {
      ctx.fillStyle = C.assign;
      ctx.font = '800 76px Fredoka, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('x', px, NEAR_Y - 28);
      ctx.textBaseline = 'alphabetic';
      this.drawBubble(ctx, px, 'x');
      return;
    }
    const shown = Math.max(1, Math.min(DOT_CAP, this.count));
    const scale = 1.15 + Math.min(1.5, this.count / 140);
    for (let i = 0; i < shown; i++) {
      const d = this.dots[i];
      const bob = Math.sin(this.tick * 0.2 + d.phase) * 2;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(px + d.ox * scale, NEAR_Y + d.oy * scale + bob, 5.6, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawBubble(ctx, px, this.count.toLocaleString());
  }

  private drawBubble(ctx: CanvasRenderingContext2D, px: number, label: string) {
    ctx.font = '800 28px Fredoka, Inter, sans-serif';
    const w = Math.max(50, ctx.measureText(label).width + 28);
    const bx = px - w / 2;
    const by = NEAR_Y - 70 - Math.min(60, Math.sqrt(Math.max(1, this.count)) * 3);
    ctx.fillStyle = '#111827';
    this.roundRect(ctx, bx, by, w, 36, 18);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px, by + 19);
    ctx.textBaseline = 'alphabetic';
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    const pad = 14;
    const barW = GW - pad * 2;
    const progress = Math.max(0, Math.min(1, this.rowsCleared / (this.totalRows + 1)));
    ctx.fillStyle = 'rgba(17,24,39,0.18)';
    this.roundRect(ctx, pad, 16, barW, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#7c3aed';
    this.roundRect(ctx, pad, 16, Math.max(10, barW * progress), 10, 5);
    ctx.fill();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  debugSnapshot() {
    return {
      s: this.status,
      c: this.count,
      assigned: this.assigned,
      lane: Number(this.lane.toFixed(2)),
      boss: this.bossPower,
      rows: this.rows
        .filter((r) => !r.applied && r.z > 0 && r.z < 14)
        .map((r) => [Number(r.z.toFixed(1)), r.left.label, r.right.label]),
      bz: Number(this.bossZ.toFixed(1)),
    };
  }
}
