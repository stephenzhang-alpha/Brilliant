// ---------------------------------------------------------------------------
// Number Tower — engine
//
// A colourful block-stacking tower of the kind that shows up in mobile-game
// ads: a block slides back and forth and you tap to drop it onto the stack.
// Whatever hangs over the block below is sliced off, so precise drops keep the
// tower wide. Each placed block is a numbered floor — reach the target floor to
// win. Shares the Gate Runner palette + gradient for a cohesive look.
//
// Same contract as the other engines: the React layer runs the rAF loop and
// calls update(dt) + draw(ctx), forwards input, and reads status / floor count.
// ---------------------------------------------------------------------------

export type TowerStatus = 'ready' | 'running' | 'complete' | 'over';

export const TW = 430;
export const TH = 640;
export const TARGET_FLOORS = 10;

const BLOCK_H = 32;
const BASE_W = 212;
const ACTIVE_Y = 150;
const START_SPEED = 165;
const SPEED_PER_FLOOR = 11;
const MAX_SPEED = 360;
const PERFECT_TOL = 7;

// Shared with Gate Runner: bright greens / blues / oranges / purples.
const PALETTE = [
  '#22c55e',
  '#3b82f6',
  '#f97316',
  '#a78bfa',
  '#fbbf24',
  '#f472b6',
  '#34d399',
  '#60a5fa',
  '#ef4444',
  '#06b6d4',
];

interface Block {
  x: number;
  w: number;
  color: string;
  floorNo: number;
}
interface Active {
  x: number;
  w: number;
  dir: number;
  color: string;
  floorNo: number;
}
interface Sliver {
  x: number;
  y: number;
  w: number;
  color: string;
  vy: number;
}

export class NumberTower {
  status: TowerStatus = 'ready';
  readonly target = TARGET_FLOORS;

  private floors: Block[] = [];
  private active: Active | null = null;
  private currentW = BASE_W;
  private moveSpeed = START_SPEED;
  private slivers: Sliver[] = [];
  private tick = 0;
  private perfectFlash = 0;
  combo = 0;

  onComplete: ((floors: number) => void) | null = null;
  onOver: ((floors: number) => void) | null = null;

  constructor() {
    this.reset();
  }

  get floorCount(): number {
    return this.floors.length;
  }

  reset() {
    this.status = 'ready';
    this.currentW = BASE_W;
    this.moveSpeed = START_SPEED;
    this.slivers = [];
    this.tick = 0;
    this.perfectFlash = 0;
    this.combo = 0;
    this.floors = [
      { x: (TW - BASE_W) / 2, w: BASE_W, color: PALETTE[0], floorNo: 1 },
    ];
    this.spawnActive();
  }

  private spawnActive() {
    const floorNo = this.floors.length + 1;
    this.active = {
      x: 0,
      w: this.currentW,
      dir: 1,
      color: PALETTE[(floorNo - 1) % PALETTE.length],
      floorNo,
    };
  }

  start() {
    if (this.status === 'complete' || this.status === 'over') this.reset();
    this.status = 'running';
  }

  /** Context-aware tap: start, drop, or restart. */
  primary() {
    if (this.status === 'ready') this.start();
    else if (this.status === 'running') this.drop();
    else if (this.status === 'over') this.start();
    // 'complete' is handled by the page's Next button.
  }

  drop() {
    if (this.status !== 'running' || !this.active) return;
    const top = this.floors[this.floors.length - 1];
    const a = this.active;
    const ovL = Math.max(a.x, top.x);
    const ovR = Math.min(a.x + a.w, top.x + top.w);
    const ov = ovR - ovL;

    if (ov <= 0) {
      // Missed the tower entirely.
      this.slivers.push({ x: a.x, y: ACTIVE_Y, w: a.w, color: a.color, vy: 20 });
      this.active = null;
      this.status = 'over';
      this.onOver?.(this.floors.length);
      return;
    }

    let placedX = ovL;
    let placedW = ov;
    const perfect = Math.abs(a.x - top.x) <= PERFECT_TOL;
    if (perfect) {
      placedX = top.x;
      placedW = Math.min(BASE_W, top.w + 6); // reward: grow back a little
      this.perfectFlash = 0.5;
      this.combo += 1;
    } else {
      this.combo = 0;
      if (a.x < ovL) {
        this.slivers.push({ x: a.x, y: ACTIVE_Y, w: ovL - a.x, color: a.color, vy: 10 });
      }
      if (a.x + a.w > ovR) {
        this.slivers.push({ x: ovR, y: ACTIVE_Y, w: a.x + a.w - ovR, color: a.color, vy: 10 });
      }
    }

    this.floors.push({ x: placedX, w: placedW, color: a.color, floorNo: this.floors.length + 1 });
    this.currentW = placedW;
    this.moveSpeed = Math.min(MAX_SPEED, START_SPEED + this.floors.length * SPEED_PER_FLOOR);

    if (this.floors.length >= TARGET_FLOORS) {
      this.active = null;
      this.status = 'complete';
      this.onComplete?.(this.floors.length);
      return;
    }
    this.spawnActive();
  }

  update(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);
    this.tick += dt;
    if (this.perfectFlash > 0) this.perfectFlash = Math.max(0, this.perfectFlash - dt);

    // Falling trimmed pieces
    for (const s of this.slivers) {
      s.vy += 900 * dt;
      s.y += s.vy * dt;
    }
    this.slivers = this.slivers.filter((s) => s.y < TH + 60);

    if (this.status === 'running' && this.active) {
      const a = this.active;
      a.x += a.dir * this.moveSpeed * dt;
      if (a.x <= 0) {
        a.x = 0;
        a.dir = 1;
      } else if (a.x + a.w >= TW) {
        a.x = TW - a.w;
        a.dir = -1;
      }
    }
  }

  // --- Rendering -----------------------------------------------------------
  draw(ctx: CanvasRenderingContext2D) {
    const grad = ctx.createLinearGradient(0, 0, 0, TH);
    grad.addColorStop(0, '#7dd3fc');
    grad.addColorStop(0.5, '#a5b4fc');
    grad.addColorStop(1, '#c4b5fd');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, TW, TH);

    const screenY = (level: number) => ACTIVE_Y + (this.floors.length - level) * BLOCK_H;

    // Placed floors (top-most first is near the active row)
    for (let i = 0; i < this.floors.length; i++) {
      const b = this.floors[i];
      const y = screenY(i);
      if (y > TH + BLOCK_H) continue;
      this.drawBlock(ctx, b.x, y, b.w, b.color, b.floorNo);
    }

    // Falling slivers
    for (const s of this.slivers) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = s.color;
      this.roundRect(ctx, s.x, s.y, s.w, BLOCK_H, 5);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Active moving block
    if (this.active && this.status === 'running') {
      const a = this.active;
      // alignment guide above the top block
      const top = this.floors[this.floors.length - 1];
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(top.x, ACTIVE_Y - 4);
      ctx.lineTo(top.x, screenY(this.floors.length - 1));
      ctx.moveTo(top.x + top.w, ACTIVE_Y - 4);
      ctx.lineTo(top.x + top.w, screenY(this.floors.length - 1));
      ctx.stroke();
      ctx.setLineDash([]);
      this.drawBlock(ctx, a.x, ACTIVE_Y, a.w, a.color, a.floorNo);
    }

    // Perfect! flash
    if (this.perfectFlash > 0) {
      ctx.globalAlpha = Math.min(1, this.perfectFlash * 2.5);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 26px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.combo > 1 ? `PERFECT ×${this.combo}` : 'PERFECT!', TW / 2, ACTIVE_Y - 26);
      ctx.globalAlpha = 1;
    }

    this.drawHud(ctx);
  }

  private drawBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    color: string,
    floorNo: number,
  ) {
    ctx.fillStyle = color;
    this.roundRect(ctx, x, y, w, BLOCK_H - 3, 6);
    ctx.fill();
    // top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    this.roundRect(ctx, x, y, w, 7, 5);
    ctx.fill();
    // floor number
    if (w > 26) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 15px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(floorNo), x + w / 2, y + (BLOCK_H - 3) / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    const pad = 14;
    const barW = TW - pad * 2;
    const progress = Math.max(0, Math.min(1, this.floors.length / this.target));
    ctx.fillStyle = 'rgba(17,24,39,0.18)';
    this.roundRect(ctx, pad, 16, barW, 10, 5);
    ctx.fill();
    ctx.fillStyle = '#4f46e5';
    this.roundRect(ctx, pad, 16, Math.max(10, barW * progress), 10, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(17,24,39,0.65)';
    ctx.font = '800 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`FLOOR ${this.floors.length} / ${this.target}`, TW / 2, 46);
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

  // DEV-only mirror for automated playtests.
  debugSnapshot() {
    const top = this.floors[this.floors.length - 1];
    return {
      s: this.status,
      floors: this.floors.length,
      target: this.target,
      ax: this.active ? Math.round(this.active.x) : null,
      aw: this.active ? Math.round(this.active.w) : null,
      tx: top ? Math.round(top.x) : null,
      tw: top ? Math.round(top.w) : null,
    };
  }
}
