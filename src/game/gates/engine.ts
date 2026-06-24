// ---------------------------------------------------------------------------
// Gate Runner — engine
//
// A colourful "math gates" runner of the kind that shows up constantly in
// mobile-game ads: a crowd runs forward, the player steers left/right to pass
// through one of two gates, and each gate applies a math operation (×, +, −, ÷)
// to the crowd size. Clear all the gate rows and cross the finish line to win.
//
// Same contract as the Dino engine: the React layer runs the rAF loop and calls
// update(dt) + draw(ctx), forwards input, and reads the public status/count.
// ---------------------------------------------------------------------------

export type GateStatus = 'ready' | 'running' | 'complete';
export type OpKind = '+' | 'x' | '-' | '/';

interface Op {
  kind: OpKind;
  val: number;
  color: string;
  label: string;
}
interface GateRow {
  y: number;
  left: Op;
  right: Op;
  applied: boolean;
  flash: number; // brief highlight after being passed
}

export const GW = 430;
export const GH = 640;

const PLAYER_Y = GH - 110;
const TRACK_MARGIN = 26;
const TRACK_LEFT = TRACK_MARGIN;
const TRACK_RIGHT = GW - TRACK_MARGIN;
const CENTER = GW / 2;
const GATE_H = 66;

const SPEED = 188; // px/s downward scroll
const ROW_GAP = 232;
const NUM_ROWS = 9;
const KEY_SPEED = 540;
const START_COUNT = 1;
const DOT_CAP = 60;

const COLORS = {
  add: '#22c55e',
  mul: '#06b6d4',
  sub: '#ef4444',
  div: '#f59e0b',
};
const CROWD_COLORS = ['#fbbf24', '#ec4899', '#22c55e', '#06b6d4', '#8b5cf6', '#fb5b6b'];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function makeOp(): Op {
  const r = Math.random();
  if (r < 0.4) {
    const val = randInt(8, 30);
    return { kind: '+', val, color: COLORS.add, label: `+${val}` };
  } else if (r < 0.68) {
    const val = randInt(2, 3);
    return { kind: 'x', val, color: COLORS.mul, label: `×${val}` };
  } else if (r < 0.86) {
    const val = randInt(5, 18);
    return { kind: '-', val, color: COLORS.sub, label: `−${val}` };
  }
  const val = 2;
  return { kind: '/', val, color: COLORS.div, label: `÷${val}` };
}

function makeRow(y: number): GateRow {
  const left = makeOp();
  let right = makeOp();
  // Avoid two identical gates so there's always a real choice.
  let guard = 0;
  while (right.label === left.label && guard++ < 6) right = makeOp();
  return { y, left, right, applied: false, flash: 0 };
}

function applyOp(count: number, op: Op): number {
  switch (op.kind) {
    case '+':
      return count + op.val;
    case 'x':
      return count * op.val;
    case '-':
      return Math.max(0, count - op.val);
    case '/':
      return Math.floor(count / op.val);
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
  count = START_COUNT;
  rowsCleared = 0;
  readonly totalRows = NUM_ROWS;

  private x = CENTER;
  private targetX = CENTER;
  private moveLeft = false;
  private moveRight = false;
  private pointerX: number | null = null;

  private rows: GateRow[] = [];
  private finishY = 0;
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
      // Cluster in a rough disc using a spiral so growth looks organic.
      const a = i * 2.399963; // golden angle
      const r = 4 + Math.sqrt(i) * 6.2;
      this.dots.push({
        ox: Math.cos(a) * r,
        oy: Math.sin(a) * r * 0.7,
        color: CROWD_COLORS[i % CROWD_COLORS.length],
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  reset() {
    this.status = 'ready';
    this.count = START_COUNT;
    this.rowsCleared = 0;
    this.x = CENTER;
    this.targetX = CENTER;
    this.moveLeft = false;
    this.moveRight = false;
    this.pointerX = null;
    this.tick = 0;
    this.lastDelta = null;
    this.rows = [];
    let y = -ROW_GAP;
    for (let i = 0; i < NUM_ROWS; i++) {
      this.rows.push(makeRow(y));
      y -= ROW_GAP;
    }
    this.finishY = y - ROW_GAP * 0.4;
  }

  start() {
    if (this.status === 'complete') this.reset();
    this.status = 'running';
  }

  primary() {
    if (this.status === 'ready') this.start();
  }

  // --- Input ---------------------------------------------------------------
  setMove(dir: 'left' | 'right', down: boolean) {
    if (dir === 'left') this.moveLeft = down;
    else this.moveRight = down;
  }
  setPointerX(x: number | null) {
    this.pointerX = x;
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

    // Steering
    if (this.pointerX != null) {
      this.targetX = this.pointerX;
    } else {
      if (this.moveLeft) this.targetX -= KEY_SPEED * dt;
      if (this.moveRight) this.targetX += KEY_SPEED * dt;
    }
    this.targetX = Math.max(TRACK_LEFT + 14, Math.min(TRACK_RIGHT - 14, this.targetX));
    this.x += (this.targetX - this.x) * Math.min(1, dt * 14);

    // Scroll the world toward the player
    const move = SPEED * dt;
    for (const r of this.rows) r.y += move;
    this.finishY += move;

    // Apply gates as they reach the player line
    for (const r of this.rows) {
      if (!r.applied && r.y >= PLAYER_Y) {
        const op = this.x < CENTER ? r.left : r.right;
        this.count = applyOp(this.count, op);
        r.applied = true;
        r.flash = 0.5;
        this.rowsCleared++;
        this.lastDelta = { text: op.label, color: op.color, t: 0.9 };
      }
    }

    // Finish
    if (this.finishY >= PLAYER_Y) {
      this.status = 'complete';
      this.onComplete?.(this.count);
    }
  }

  // --- Rendering -----------------------------------------------------------
  draw(ctx: CanvasRenderingContext2D) {
    // Background gradient (sky -> horizon)
    const grad = ctx.createLinearGradient(0, 0, 0, GH);
    grad.addColorStop(0, '#7dd3fc');
    grad.addColorStop(0.5, '#a78bfa');
    grad.addColorStop(1, '#f0abfc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GW, GH);

    // Track
    ctx.fillStyle = '#eef2f7';
    this.roundRect(ctx, TRACK_LEFT, 0, TRACK_RIGHT - TRACK_LEFT, GH, 0);
    ctx.fill();
    // Side rails
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(TRACK_LEFT - 6, 0, 6, GH);
    ctx.fillRect(TRACK_RIGHT, 0, 6, GH);

    // Moving lane stripes for a sense of speed
    ctx.fillStyle = '#dbe2ec';
    const stripeH = 46;
    const offset = (this.tick * 3.1) % (stripeH * 2);
    for (let y = -stripeH * 2 + offset; y < GH; y += stripeH * 2) {
      ctx.fillRect(CENTER - 3, y, 6, stripeH);
    }

    // Gate rows
    for (const r of this.rows) {
      if (r.y < -GATE_H || r.y > GH + GATE_H) continue;
      this.drawGate(ctx, r, true);
      this.drawGate(ctx, r, false);
    }

    // Finish banner
    this.drawFinish(ctx);

    // Player crowd
    this.drawCrowd(ctx);

    // Floating op feedback
    if (this.lastDelta) {
      ctx.globalAlpha = Math.min(1, this.lastDelta.t * 2);
      ctx.fillStyle = this.lastDelta.color;
      ctx.font = '800 30px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.lastDelta.text, this.x, PLAYER_Y - 56 - (0.9 - this.lastDelta.t) * 30);
      ctx.globalAlpha = 1;
    }

    // HUD progress bar
    this.drawHud(ctx);
  }

  private drawGate(ctx: CanvasRenderingContext2D, r: GateRow, isLeft: boolean) {
    const op = isLeft ? r.left : r.right;
    const x0 = isLeft ? TRACK_LEFT + 4 : CENTER + 4;
    const x1 = isLeft ? CENTER - 4 : TRACK_RIGHT - 4;
    const w = x1 - x0;
    const top = r.y - GATE_H / 2;

    // translucent colored panel
    ctx.fillStyle = op.color;
    ctx.globalAlpha = r.flash > 0 ? 0.85 : 0.42;
    this.roundRect(ctx, x0, top, w, GATE_H, 12);
    ctx.fill();
    ctx.globalAlpha = 1;

    // solid header bar
    ctx.fillStyle = op.color;
    this.roundRect(ctx, x0, top, w, 16, 8);
    ctx.fill();

    // label
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 30px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(op.label, (x0 + x1) / 2, r.y + 6);
    ctx.textBaseline = 'alphabetic';
  }

  private drawFinish(ctx: CanvasRenderingContext2D) {
    const y = this.finishY;
    if (y < -40 || y > GH + 40) return;
    const sq = 16;
    for (let i = 0; i * sq < TRACK_RIGHT - TRACK_LEFT; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#111827' : '#ffffff';
      ctx.fillRect(TRACK_LEFT + i * sq, y - sq, sq, sq);
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#111827';
      ctx.fillRect(TRACK_LEFT + i * sq, y, sq, sq);
    }
    ctx.fillStyle = '#111827';
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FINISH', CENTER, y - sq - 10);
  }

  private drawCrowd(ctx: CanvasRenderingContext2D) {
    const shown = Math.max(1, Math.min(DOT_CAP, this.count));
    const scale = 1 + Math.min(1.1, this.count / 120);
    for (let i = 0; i < shown; i++) {
      const d = this.dots[i];
      const bob = Math.sin(this.tick * 0.2 + d.phase) * 2;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(this.x + d.ox * scale, PLAYER_Y + d.oy * scale + bob, 5.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Count bubble
    const label = this.count.toLocaleString();
    ctx.font = '800 26px Inter, system-ui, sans-serif';
    const w = Math.max(46, ctx.measureText(label).width + 26);
    const bx = this.x - w / 2;
    const by = PLAYER_Y - 38 - Math.min(60, Math.sqrt(this.count) * 3.5);
    ctx.fillStyle = '#111827';
    this.roundRect(ctx, bx, by, w, 34, 17);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, this.x, by + 18);
    ctx.textBaseline = 'alphabetic';
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    const pad = 14;
    const barW = GW - pad * 2;
    const progress = Math.max(0, Math.min(1, this.rowsCleared / (this.totalRows + 1)));
    ctx.fillStyle = 'rgba(17,24,39,0.18)';
    this.roundRect(ctx, pad, 14, barW, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#4f46e5';
    this.roundRect(ctx, pad, 14, Math.max(10, barW * progress), 10, 5);
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

  // DEV-only state mirror for automated playtests.
  debugSnapshot() {
    return {
      s: this.status,
      c: this.count,
      x: Math.round(this.x),
      rows: this.rows
        .filter((r) => r.y > -GATE_H && r.y < GH)
        .map((r) => [Math.round(r.y), r.left.label, r.right.label, r.applied ? 1 : 0]),
      fy: Math.round(this.finishY),
    };
  }
}
