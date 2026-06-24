// ---------------------------------------------------------------------------
// Gate Runner — engine (v2)
//
// A "math gates" runner in the mobile-ad style, re-themed around variables:
//   • You begin as the variable x (an unknown value).
//   • An ASSIGNMENT gate gives x a concrete value (x = 5 / x = 9 …).
//   • OPERATION gates then transform your value (+n, ×n).
//   • ENEMY lanes subtract from your value — steer around them.
//   • A FINAL BOSS at the end fights your crowd; the survivors are your score.
//
// Scoring is tuned so a strong run lands in the few-hundreds and breaking 1000
// is genuinely hard. Same contract as before: the React layer runs the rAF
// loop, calls update(dt) + draw(ctx), forwards input, and reads status/count.
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
  y: number;
  left: Choice;
  right: Choice;
  applied: boolean;
  flash: number;
}

export const GW = 430;
export const GH = 640;

const PLAYER_Y = GH - 120;
const TRACK_MARGIN = 26;
const TRACK_LEFT = TRACK_MARGIN;
const TRACK_RIGHT = GW - TRACK_MARGIN;
const CENTER = GW / 2;
const GATE_H = 70;

const SPEED = 196; // px/s downward scroll
const ROW_GAP = 220;
const NUM_ROWS = 11; // row 0 = assignment, then ops / enemies
const KEY_SPEED = 560;
const DOT_CAP = 80;

const C = {
  assign: '#7c3aed', // violet — variable assignment
  add: '#22c55e', // green
  mul: '#3b82f6', // blue
  enemy: '#ef4444', // red — subtracts
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

/** Build one row given its index (0 = assignment row). */
function makeRow(index: number, y: number): GateRow {
  if (index === 0) {
    // Assignment: two starting values for x.
    const a = randInt(4, 7);
    const b = a + randInt(2, 4);
    return Math.random() < 0.5
      ? { y, left: assignChoice(a), right: assignChoice(b), applied: false, flash: 0 }
      : { y, left: assignChoice(b), right: assignChoice(a), applied: false, flash: 0 };
  }

  // Later rows: a positive operation paired against either another operation
  // or an enemy. Multipliers are rarer (they're the only path to big numbers).
  const op = (): Choice => (Math.random() < 0.3 ? mulChoice(pick([2, 2, 3])) : addChoice(randInt(8, 22)));

  let left: Choice;
  let right: Choice;
  if (Math.random() < 0.42) {
    // Enemy row: one lane subtracts a lot, the other is a modest gain.
    const enemy = enemyChoice(randInt(25, 70));
    const gain = addChoice(randInt(6, 16));
    [left, right] = Math.random() < 0.5 ? [enemy, gain] : [gain, enemy];
  } else {
    left = op();
    right = op();
    let guard = 0;
    while (right.label === left.label && guard++ < 6) right = op();
  }
  return { y, left, right, applied: false, flash: 0 };
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

  private x = CENTER;
  private targetX = CENTER;
  private moveLeft = false;
  private moveRight = false;
  private pointerX: number | null = null;

  private rows: GateRow[] = [];
  private bossY = 0;
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
      const a = i * 2.399963; // golden angle spiral
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
    this.count = 0;
    this.assigned = false;
    this.rowsCleared = 0;
    this.bossDefeated = false;
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
      this.rows.push(makeRow(i, y));
      y -= ROW_GAP;
    }
    this.bossY = y - ROW_GAP * 0.5;
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

    if (this.pointerX != null) {
      this.targetX = this.pointerX;
    } else {
      if (this.moveLeft) this.targetX -= KEY_SPEED * dt;
      if (this.moveRight) this.targetX += KEY_SPEED * dt;
    }
    this.targetX = Math.max(TRACK_LEFT + 14, Math.min(TRACK_RIGHT - 14, this.targetX));
    this.x += (this.targetX - this.x) * Math.min(1, dt * 14);

    const move = SPEED * dt;
    for (const r of this.rows) r.y += move;
    this.bossY += move;

    for (const r of this.rows) {
      if (!r.applied && r.y >= PLAYER_Y) {
        const ch = this.x < CENTER ? r.left : r.right;
        this.count = applyChoice(this.assigned ? this.count : 0, ch);
        if (ch.kind === 'assign') this.assigned = true;
        r.applied = true;
        r.flash = 0.5;
        this.rowsCleared++;
        this.lastDelta = { text: ch.label, color: ch.color, t: 0.95 };
      }
    }

    // Final boss fight at the end.
    if (!this.bossDefeated && this.bossY >= PLAYER_Y) {
      this.bossDefeated = true;
      const before = this.count;
      this.count = Math.max(0, this.count - this.bossPower);
      this.lastDelta = { text: `boss −${this.bossPower}`, color: C.boss, t: 1.2 };
      void before;
      this.status = 'complete';
      this.onComplete?.(this.count);
    }
  }

  // --- Rendering -----------------------------------------------------------
  draw(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, 0, GH);
    grad.addColorStop(0, '#7dd3fc');
    grad.addColorStop(0.5, '#a78bfa');
    grad.addColorStop(1, '#f0abfc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GW, GH);

    ctx.fillStyle = '#eef2f7';
    ctx.fillRect(TRACK_LEFT, 0, TRACK_RIGHT - TRACK_LEFT, GH);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(TRACK_LEFT - 6, 0, 6, GH);
    ctx.fillRect(TRACK_RIGHT, 0, 6, GH);

    ctx.fillStyle = '#dbe2ec';
    const stripeH = 46;
    const offset = (this.tick * 3.1) % (stripeH * 2);
    for (let y = -stripeH * 2 + offset; y < GH; y += stripeH * 2) {
      ctx.fillRect(CENTER - 3, y, 6, stripeH);
    }

    for (const r of this.rows) {
      if (r.y < -GATE_H || r.y > GH + GATE_H) continue;
      this.drawChoice(ctx, r, true);
      this.drawChoice(ctx, r, false);
    }

    this.drawBoss(ctx);
    this.drawCrowd(ctx);

    if (this.lastDelta) {
      ctx.globalAlpha = Math.min(1, this.lastDelta.t * 2);
      ctx.fillStyle = this.lastDelta.color;
      ctx.font = '800 30px Fredoka, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.lastDelta.text, this.x, PLAYER_Y - 64 - (0.95 - this.lastDelta.t) * 26);
      ctx.globalAlpha = 1;
    }

    this.drawHud(ctx);
  }

  private drawChoice(ctx: CanvasRenderingContext2D, r: GateRow, isLeft: boolean) {
    const ch = isLeft ? r.left : r.right;
    const x0 = isLeft ? TRACK_LEFT + 4 : CENTER + 4;
    const x1 = isLeft ? CENTER - 4 : TRACK_RIGHT - 4;
    const w = x1 - x0;
    const top = r.y - GATE_H / 2;

    if (ch.kind === 'enemy') {
      // Enemy: a solid red blob with little angry eyes.
      ctx.fillStyle = ch.color;
      ctx.globalAlpha = r.flash > 0 ? 0.95 : 0.9;
      this.roundRect(ctx, x0 + w * 0.2, top + 6, w * 0.6, GATE_H - 12, 14);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      const cy = r.y - 4;
      ctx.fillRect((x0 + x1) / 2 - 10, cy, 4, 4);
      ctx.fillRect((x0 + x1) / 2 + 6, cy, 4, 4);
      ctx.fillStyle = '#fff';
      ctx.font = '800 24px Fredoka, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch.label, (x0 + x1) / 2, r.y + 14);
      ctx.textBaseline = 'alphabetic';
      return;
    }

    ctx.fillStyle = ch.color;
    ctx.globalAlpha = r.flash > 0 ? 0.85 : 0.42;
    this.roundRect(ctx, x0, top, w, GATE_H, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = ch.color;
    this.roundRect(ctx, x0, top, w, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px Fredoka, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch.label, (x0 + x1) / 2, r.y + 6);
    ctx.textBaseline = 'alphabetic';
  }

  private drawBoss(ctx: CanvasRenderingContext2D) {
    const y = this.bossY;
    if (y < -80 || y > GH + 40) return;
    const w = TRACK_RIGHT - TRACK_LEFT - 20;
    const h = 78;
    ctx.fillStyle = C.boss;
    this.roundRect(ctx, TRACK_LEFT + 10, y - h, w, h, 16);
    ctx.fill();
    // angry eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(CENTER - 26, y - h + 22, 12, 10);
    ctx.fillRect(CENTER + 14, y - h + 22, 12, 10);
    ctx.fillStyle = '#fff';
    ctx.font = '800 16px Fredoka, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👹 BOSS', CENTER, y - h - 8);
    ctx.font = '800 26px Fredoka, Inter, sans-serif';
    ctx.fillText(String(this.bossPower), CENTER, y - 18);
  }

  private drawCrowd(ctx: CanvasRenderingContext2D) {
    if (!this.assigned) {
      // Before assignment we are literally the variable "x".
      ctx.fillStyle = C.assign;
      ctx.font = '800 64px Fredoka, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('x', this.x, PLAYER_Y);
      ctx.textBaseline = 'alphabetic';
      this.drawBubble(ctx, 'x');
      return;
    }
    const shown = Math.max(1, Math.min(DOT_CAP, this.count));
    const scale = 1 + Math.min(1.3, this.count / 150);
    for (let i = 0; i < shown; i++) {
      const d = this.dots[i];
      const bob = Math.sin(this.tick * 0.2 + d.phase) * 2;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(this.x + d.ox * scale, PLAYER_Y + d.oy * scale + bob, 5.2, 0, Math.PI * 2);
      ctx.fill();
    }
    this.drawBubble(ctx, this.count.toLocaleString());
  }

  private drawBubble(ctx: CanvasRenderingContext2D, label: string) {
    ctx.font = '800 26px Fredoka, Inter, sans-serif';
    const w = Math.max(46, ctx.measureText(label).width + 26);
    const bx = this.x - w / 2;
    const by = PLAYER_Y - 44 - Math.min(64, Math.sqrt(Math.max(1, this.count)) * 3.5);
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
      x: Math.round(this.x),
      boss: this.bossPower,
      rows: this.rows
        .filter((r) => r.y > -GATE_H && r.y < GH)
        .map((r) => [Math.round(r.y), r.left.label, r.right.label, r.applied ? 1 : 0]),
      by: Math.round(this.bossY),
    };
  }
}
