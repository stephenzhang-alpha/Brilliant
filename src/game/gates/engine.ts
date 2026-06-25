// ---------------------------------------------------------------------------
// Gate Runner — engine (v4, juicy pseudo-3D)
//
// A "math gates" runner rendered in the pseudo-3D, camera-behind-the-crowd style
// of mobile-game ads: a road recedes toward a horizon, gates grow as they rush
// toward you, and your crowd runs at the bottom of the screen.
//
// Algebra theming (Stage 2 — Expressions). YOU ARE AN EXPRESSION of the form
// ax + b, and you BUILD it as you run:
//   • You begin as the variable x (coefficient a = 1, constant b = 0) — a crowd
//     of "x" runners.
//   • COEFFICIENT gates add or subtract a MULTIPLE OF x ("+2x", "−x", …) and
//     COMBINE LIKE TERMS into a (3x then "+2x" → 5x). They are green (add) or a
//     coral monster (subtract — avoid).
//   • CONSTANT gates add or subtract a plain NUMBER ("+5", "−3") and combine
//     into b (constants are like terms too). They are cyan (add) or an amber
//     monster (subtract). Both gate families are mixed across the rows, so you
//     reach the end having built a real ax + b (shown as "3x + 5", "2x − 4", …).
//   • The LAST gate is the variable ASSIGNMENT (x = 6 / x = 8). Just before it a
//     pop-up TEACHES how to evaluate (substitute, multiply a×x first, then add
//     b) using your own a and b. After you pick x, YOU evaluate ax + b yourself
//     in a quick multiple-choice beat — right celebrates, wrong shows the steps.
//   • A FINAL BOSS subtracts its power from your evaluated value; the survivors
//     are your score.
//
// Pedagogy: variable → combining like terms (coefficients AND constants, building
// ax + b) → learning to evaluate → evaluating it yourself once x is assigned.
//
// Juice: pooled particle bursts on every gate, a crowd "pop" on growth, a combo
// streak for consecutive good picks, speed lines that intensify with the combo,
// dodge sparks at subtract gates, a satisfying boss clash, and a camera that
// leans/pans with your steering. All integration is in units-per-second so it is
// frame-rate independent, and the hot draw loops avoid per-frame allocations.
//
// Scoring is tuned so a strong run lands in the low hundreds (a·x + b, minus the
// boss) and breaking 1000 is effectively impossible. The React layer runs the
// rAF loop, calls update(dt) + draw(ctx), forwards input, reads status/phase/
// count, and renders the teach + evaluate pop-ups as overlays.
// ---------------------------------------------------------------------------

export type GateStatus = 'ready' | 'running' | 'complete';
// Sub-phase within a 'running' game, read by the React layer to drive overlays:
//   'run'   → normal steering;
//   'teach' → frozen at the assignment gate while the "how to evaluate" pop-up
//             is shown; resumed via continueFromTeach();
//   'eval'  → frozen just after the assignment gate while the player evaluates
//             their own expression; resumed via continueFromEval().
export type RunPhase = 'run' | 'teach' | 'eval';
// 'addx'/'subx' add or subtract a MULTIPLE OF x (changes the coefficient a);
// 'addc'/'subc' add or subtract a plain CONSTANT (changes the constant b);
// 'assign' gives the variable x a concrete single-digit value (last gate).
type ChoiceKind = 'assign' | 'addx' | 'subx' | 'addc' | 'subc';

interface Choice {
  kind: ChoiceKind;
  // addx/subx → the multiple of x (1..5); addc/subc → the constant (1..8);
  // assign → the digit value (4..9).
  val: number;
  color: string;
  label: string;
}
interface GateRow {
  z: number; // distance from the camera (0 = at the player line)
  left: Choice;
  right: Choice;
  applied: boolean;
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
const OP_ROWS = 16; // operation rows, mixing coefficient (±kx) and constant (±n) gates — a long gauntlet
/** Chance a post-opener row is an UNAVOIDABLE hazard (both lanes are monsters). */
const HAZARD_P = 0.5;
const NUM_ROWS = OP_ROWS + 1; // total gate rows: ops + the final assignment gate
const ASSIGN_GAP_Z = 2.8; // extra gap before the assignment gate (room for the teach beat + steering)
const ASSIGN_Z = Z_START + (OP_ROWS - 1) * ROW_GAP_Z + ASSIGN_GAP_Z; // the assignment gate sits last
const BOSS_GAP_Z = 2.4; // gap after assignment — lets the EVALUATE beat land first
const TEACH_TRIGGER_Z = 2.4; // < ASSIGN_GAP_Z, so every op gate is resolved before the teach pop-up
const KEY_LANE_SPEED = 2.6; // lane units per second from keyboard
const DOT_CAP = 80;
const GATE_NEAR_H = 100; // gate panel height at the near plane (s = 1)

const CAM_FOLLOW = 24; // px the camera pans opposite to your lane (lean into turns)
const BOSS_CLASH_T = 0.62; // seconds the clash plays before the finish card

// Palette — the shared Algebra Quest design language.
const C = {
  assign: '#7c3aed', // violet — the variable / assignment gate + evaluate beat
  add: '#22c55e', // green — add-a-multiple-of-x gate (coefficient, good lane)
  addc: '#06b6d4', // cyan — add-a-constant gate (constant term, good lane)
  enemy: '#fb5b6b', // coral — subtract-a-multiple-of-x monster (avoid)
  subc: '#f59e0b', // amber — subtract-a-constant monster (avoid)
  boss: '#b91c1c', // deep red boss
  combo: '#f59e0b', // amber
  combo2: '#ec4899', // pink (hot streak)
};
const CROWD_COLORS = ['#fbbf24', '#ec4899', '#22c55e', '#06b6d4', '#8b5cf6', '#fb5b6b'];
const CONFETTI = ['#fbbf24', '#ec4899', '#22c55e', '#06b6d4', '#8b5cf6', '#fb5b6b', '#ffffff'];

const PCAP = 170; // particle pool size
const CUE_CAP = 6; // floating-cue pool size

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
const byZDesc = (a: GateRow, b: GateRow) => b.z - a.z;

// A term in x: 0 → "0", 1 → "x", k → "kx". Keeps cues reading like real algebra.
function termX(n: number): string {
  return n === 0 ? '0' : n === 1 ? 'x' : `${n}x`;
}

// The full expression ax + b, formatted like a textbook: a = 1 hides the
// coefficient ("x"), b = 0 hides the constant ("3x"), and a negative constant
// reads with a minus ("2x − 4"). a = 0 collapses to just the constant.
function fmtExpr(a: number, b: number): string {
  if (a === 0) return b === 0 ? '0' : b > 0 ? `${b}` : `−${Math.abs(b)}`;
  const ax = a === 1 ? 'x' : `${a}x`;
  if (b === 0) return ax;
  return b > 0 ? `${ax} + ${b}` : `${ax} − ${Math.abs(b)}`;
}

function assignChoice(val: number): Choice {
  return { kind: 'assign', val, color: C.assign, label: `x = ${val}` };
}
function addxChoice(val: number): Choice {
  return { kind: 'addx', val, color: C.add, label: `+${termX(val)}` };
}
function subxChoice(val: number): Choice {
  return { kind: 'subx', val, color: C.enemy, label: `−${termX(val)}` };
}
function addcChoice(val: number): Choice {
  return { kind: 'addc', val, color: C.addc, label: `+${val}` };
}
function subcChoice(val: number): Choice {
  return { kind: 'subc', val, color: C.subc, label: `−${val}` };
}

// Combine a coefficient gate into the current coefficient a (like terms). a is
// clamped at 0 so a subtract gate can never take you negative.
function combineCoef(coef: number, ch: Choice): number {
  return ch.kind === 'subx' ? Math.max(0, coef - ch.val) : coef + ch.val;
}
// Combine a constant gate into the running constant b. Constants combine with
// constants — the same like-terms lesson — and b may dip below zero ("2x − 4").
function combineConst(b: number, ch: Choice): number {
  return ch.kind === 'subc' ? b - ch.val : b + ch.val;
}

interface Dot {
  ox: number;
  oy: number;
  color: string;
  phase: number;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  size: number;
  color: string;
  grav: number;
  rot: number;
  spin: number;
  shape: number; // 0 = circle, 1 = square confetti
  active: boolean;
}
interface Cue {
  main: string; // "3x + 2x = 5x" (like terms) or "x = 7: 3x + 5 = 26" (evaluation)
  tag: string; // "" | "BIGGER!" | "DODGED!" | "OUCH!" | "EVALUATE!" | "BOSS!"
  color: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  ttl: number;
  active: boolean;
}

export class GateRunner {
  status: GateStatus = 'ready';
  phase: RunPhase = 'run'; // sub-phase within a running game (read by the UI)
  count = 0; // current numeric value: 0 while still an expression, set on evaluation
  coef = 1; // coefficient a of x while building ax + b (you start as 1·x)
  constant = 0; // constant term b while building ax + b (you start with no constant)
  assigned = false; // x has been given a value at the assignment gate
  assignedX = 0; // the single-digit value x is given at the assignment gate
  evaluated = false; // the player has evaluated ax + b into a number
  // The interactive "evaluate it yourself" challenge, built at the assignment gate.
  evalAnswer = 0; // the correct value of a·x + b
  evalOptions: number[] = []; // multiple-choice answers (shuffled, includes the answer)
  evalAnswered = false; // the player has submitted an answer
  evalCorrect = false; // whether that submitted answer was right
  evalPicked: number | null = null; // the value the player chose
  private taught = false; // the teach pop-up has fired (once per run)
  rowsCleared = 0;
  readonly totalRows = NUM_ROWS;
  bossPower = 0;
  bossDefeated = false;
  /** True once the boss is resolved with crowd > 0 (a win); false = wiped out. */
  won = false;
  combo = 0;
  bestCombo = 0;

  private lane = 0; // -1 (left) .. 1 (right)
  private targetLane = 0;
  private prevLane = 0;
  private laneVel = 0;
  private moveLeft = false;
  private moveRight = false;
  private pointerLane: number | null = null;

  private rows: GateRow[] = [];
  private scratch: GateRow[] = [];
  private bossZ = 0;
  private tick = 0;
  private clashT = 0;

  private dots: Dot[] = [];
  private particles: Particle[] = [];
  private pIdx = 0;
  private cues: Cue[] = [];
  private cIdx = 0;

  // transient visual state
  private crowdPop = 0;
  private comboPulse = 0;
  private shake = 0;
  private hitFlash = 0;
  private whiteFlash = 0;
  private camX = 0;

  // cached gradients (allocation-free steady state)
  private skyGrad: CanvasGradient | null = null;
  private groundGrad: CanvasGradient | null = null;
  private barGrad: CanvasGradient | null = null;
  private redVignette: CanvasGradient | null = null;

  onComplete: ((count: number) => void) | null = null;

  constructor() {
    this.buildDots();
    this.buildPools();
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

  private buildPools() {
    this.particles = [];
    for (let i = 0; i < PCAP; i++) {
      this.particles.push({
        x: 0, y: 0, vx: 0, vy: 0, life: 0, ttl: 1, size: 1,
        color: '#fff', grav: 0, rot: 0, spin: 0, shape: 0, active: false,
      });
    }
    this.cues = [];
    for (let i = 0; i < CUE_CAP; i++) {
      this.cues.push({ main: '', tag: '', color: '#fff', x: 0, y: 0, vy: 0, life: 0, ttl: 1, active: false });
    }
  }

  reset() {
    this.status = 'ready';
    this.phase = 'run';
    this.count = 0;
    this.coef = 1;
    this.constant = 0;
    this.assigned = false;
    this.assignedX = 0;
    this.evaluated = false;
    this.evalAnswer = 0;
    this.evalOptions = [];
    this.evalAnswered = false;
    this.evalCorrect = false;
    this.evalPicked = null;
    this.taught = false;
    this.rowsCleared = 0;
    this.bossDefeated = false;
    this.won = false;
    this.combo = 0;
    this.bestCombo = 0;
    this.lane = 0;
    this.targetLane = 0;
    this.prevLane = 0;
    this.laneVel = 0;
    this.moveLeft = false;
    this.moveRight = false;
    this.pointerLane = null;
    this.tick = 0;
    this.clashT = 0;
    this.crowdPop = 0;
    this.comboPulse = 0;
    this.shake = 0;
    this.hitFlash = 0;
    this.whiteFlash = 0;
    this.camX = 0;
    for (const p of this.particles) p.active = false;
    for (const cu of this.cues) cu.active = false;
    this.buildRows();
    this.bossZ = ASSIGN_Z + BOSS_GAP_Z;
    // The boss is now a serious threat sized to your evaluated crowd — computed
    // in submitEvaluation() once `count` is known. 0 here means "not set yet".
    this.bossPower = 0;
  }

  // Generate the gate rows for a run. Each operation row belongs to one of two
  // families: COEFFICIENT rows change a (±kx) and CONSTANT rows change b (±n).
  // Row 0 is a coefficient opener and row 1 a constant opener — both are two
  // adds, so whatever lane you take you leave with a > 1 and b > 0 and are
  // genuinely building an ax + b. The remaining rows are an even mix, shuffled,
  // with ~HALF being UNAVOIDABLE hazard rows where BOTH lanes are monsters —
  // there is no safe lane, you only get to choose the smaller bite. Surviving
  // with a big expression then evaluating it correctly is the only way past the
  // tough final boss. The ASSIGNMENT gate is placed LAST, offering two
  // single-digit values to steer between (bigger is better).
  private buildRows() {
    this.rows = [];

    const families: ('coef' | 'const')[] = ['coef', 'const'];
    const rest: ('coef' | 'const')[] = [];
    for (let i = 0; i < OP_ROWS - 2; i++) rest.push(i % 2 === 0 ? 'coef' : 'const');
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    families.push(...rest);

    for (let i = 0; i < OP_ROWS; i++) {
      const z = Z_START + i * ROW_GAP_Z;
      const [left, right] = families[i] === 'const' ? this.buildConstRow(i) : this.buildCoefRow(i);
      this.rows.push({ z, left, right, applied: false });
    }

    // Final gate: assign x a single digit. Two distinct choices keep it a real
    // steering decision (and the bigger digit is the better pick).
    const a = randInt(4, 9);
    let b = randInt(4, 9);
    while (b === a) b = randInt(4, 9);
    const [aL, aR] = Math.random() < 0.5 ? [a, b] : [b, a];
    this.rows.push({ z: ASSIGN_Z, left: assignChoice(aL), right: assignChoice(aR), applied: false });
  }

  // A coefficient row (±kx). The opener (i <= 1) is always two adds; later rows
  // are ~HALF unavoidable hazards — BOTH lanes are "−kx" monsters, so you cannot
  // dodge the damage, only steer toward the smaller bite. The rest are two adds.
  private buildCoefRow(i: number): [Choice, Choice] {
    if (i > 1 && Math.random() < HAZARD_P) {
      const a = randInt(1, 3);
      const b = randInt(1, 3);
      return [subxChoice(a), subxChoice(b)];
    }
    const small = randInt(2, 3);
    const big = randInt(small + 1, 5);
    return Math.random() < 0.5 ? [addxChoice(small), addxChoice(big)] : [addxChoice(big), addxChoice(small)];
  }

  // A constant row (±n). Mirrors the coefficient row but folds into b. Hazard
  // rows put a "−n" monster in BOTH lanes (unavoidable); the rest are two adds.
  private buildConstRow(i: number): [Choice, Choice] {
    if (i > 1 && Math.random() < HAZARD_P) {
      const a = randInt(1, 4);
      const b = randInt(1, 4);
      return [subcChoice(a), subcChoice(b)];
    }
    const small = randInt(3, 4);
    const big = randInt(small + 1, 8);
    return Math.random() < 0.5 ? [addcChoice(small), addcChoice(big)] : [addcChoice(big), addcChoice(small)];
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
  private projX(lane: number, s: number): number {
    return CENTER + lane * NEAR_HALF_W * s;
  }
  private projY(s: number): number {
    return HORIZON_Y + (NEAR_Y - HORIZON_Y) * s;
  }
  private project(lane: number, z: number): { x: number; y: number; s: number; halfW: number } {
    const s = this.scaleAt(z);
    return { x: this.projX(lane, s), y: this.projY(s), s, halfW: NEAR_HALF_W * s };
  }
  private crowdX(): number {
    return CENTER + this.lane * NEAR_HALF_W;
  }

  // --- Particles (pooled, ring-buffer) -------------------------------------
  private spawnParticle(
    x: number, y: number, vx: number, vy: number,
    size: number, color: string, ttl: number, grav: number, shape: number,
  ) {
    const p = this.particles[this.pIdx];
    this.pIdx = (this.pIdx + 1) % PCAP;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.size = size; p.color = color; p.ttl = ttl; p.life = ttl;
    p.grav = grav; p.shape = shape; p.rot = Math.random() * Math.PI * 2;
    p.spin = rand(-7, 7); p.active = true;
  }
  private gatePassBurst(x: number, y: number, color: string) {
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 190);
      this.spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp - rand(20, 90), rand(2.4, 5.4), color, rand(0.4, 0.7), 320, 0);
    }
  }
  private comboConfetti(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = rand(-2.5, -0.65);
      const sp = rand(120, 300);
      this.spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(3, 6), pick(CONFETTI), rand(0.6, 1.0), 420, 1);
    }
  }
  private dodgeSpark(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(120, 300);
      this.spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(1.5, 3.4), i % 2 ? '#ffffff' : C.enemy, rand(0.22, 0.42), 220, 0);
    }
  }
  private enemyHitBurst(x: number, y: number) {
    for (let i = 0; i < 18; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(60, 220);
      this.spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp - rand(0, 60), rand(2.4, 5), pick([C.enemy, '#ef4444', '#7f1d1d', '#ffffff']), rand(0.4, 0.7), 380, 0);
    }
  }
  private bossClashBurst(x: number, y: number) {
    for (let i = 0; i < 44; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(80, 430);
      this.spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp - rand(0, 130), rand(2.6, 7), pick(CONFETTI), rand(0.5, 1.1), 500, i % 3 === 0 ? 1 : 0);
    }
  }

  private spawnCue(main: string, tag: string, color: string) {
    const cu = this.cues[this.cIdx];
    this.cIdx = (this.cIdx + 1) % CUE_CAP;
    cu.main = main;
    cu.tag = tag;
    cu.color = color;
    cu.x = this.crowdX();
    cu.y = NEAR_Y - 98 - Math.min(64, Math.sqrt(Math.max(1, this.count)) * 3);
    cu.vy = tag === 'EVALUATE!' ? -20 : -30;
    cu.ttl = tag === 'EVALUATE!' ? 1.7 : tag === 'BOSS!' ? 1.35 : 1.05;
    cu.life = cu.ttl;
    cu.active = true;
  }

  // --- Simulation ----------------------------------------------------------
  update(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);
    this.tick += dt * 60;
    this.updateVisuals(dt);

    // Boss clash plays for a beat with status still 'running' so the explosion
    // is visible before the React finish card (which fires from onComplete).
    if (this.bossDefeated && this.status === 'running') {
      this.clashT -= dt;
      if (this.clashT <= 0) this.status = 'complete';
    }

    if (this.status !== 'running') return;
    // Frozen while a teach/evaluate pop-up is up: visuals keep animating above,
    // but steering, the road, and the boss all hold until the player continues.
    if (this.phase !== 'run') return;

    if (this.pointerLane != null) {
      this.targetLane = this.pointerLane;
    } else {
      if (this.moveLeft) this.targetLane -= KEY_LANE_SPEED * dt;
      if (this.moveRight) this.targetLane += KEY_LANE_SPEED * dt;
    }
    this.targetLane = Math.max(-1, Math.min(1, this.targetLane));
    this.lane += (this.targetLane - this.lane) * Math.min(1, dt * 13);
    this.laneVel = (this.lane - this.prevLane) / Math.max(dt, 1 / 120);
    this.prevLane = this.lane;

    const dz = SPEED_Z * dt;
    for (const r of this.rows) {
      r.z -= dz;
      if (!r.applied && r.z <= 0) this.applyRow(r);
    }

    // As the assignment gate nears (and every operation gate is resolved, since
    // it is always last), freeze for the "how to evaluate" lesson. Resumed via
    // continueFromTeach().
    if (!this.taught) {
      const assignRow = this.rows[this.rows.length - 1];
      if (!assignRow.applied && assignRow.z <= TEACH_TRIGGER_Z) {
        this.taught = true;
        this.phase = 'teach';
        return;
      }
    }

    this.bossZ -= dz;
    if (!this.bossDefeated && this.bossZ <= 0) this.hitBoss();
  }

  private updateVisuals(dt: number) {
    for (const cu of this.cues) {
      if (!cu.active) continue;
      cu.life -= dt;
      if (cu.life <= 0) cu.active = false;
      else cu.y += cu.vy * dt;
    }
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    this.crowdPop = Math.max(0, this.crowdPop - dt * 3.2);
    this.comboPulse = Math.max(0, this.comboPulse - dt * 3);
    this.shake = Math.max(0, this.shake - dt * 55);
    this.hitFlash = Math.max(0, this.hitFlash - dt * 2.2);
    this.whiteFlash = Math.max(0, this.whiteFlash - dt * 2.6);
    const targetCam = -this.lane * CAM_FOLLOW;
    this.camX += (targetCam - this.camX) * Math.min(1, dt * 8);
  }

  // Resolve a gate the instant it reaches the player line. Coefficient gates
  // (±kx) combine into a, constant gates (±n) combine into b, and the last gate
  // (assign) hands evaluation over to the player.
  private applyRow(r: GateRow) {
    const isLeft = this.lane < 0;
    const ch = isLeft ? r.left : r.right;
    const other = isLeft ? r.right : r.left;
    r.applied = true;
    this.rowsCleared++;

    if (ch.kind === 'assign') {
      this.applyAssign(ch, isLeft);
      return;
    }

    const isConst = ch.kind === 'addc' || ch.kind === 'subc';
    const sym = ch.kind === 'subx' || ch.kind === 'subc' ? '−' : '+';

    // Combine like terms: ±kx folds into a, ±n folds into b. The cue reads as a
    // real like-terms line ("3x + 2x = 5x" or "5 + 3 = 8").
    let main: string;
    let after: number;
    let otherAfter: number;
    if (isConst) {
      const before = this.constant;
      after = combineConst(before, ch);
      otherAfter = combineConst(before, other);
      this.constant = after;
      main = `${before} ${sym} ${ch.val} = ${after}`;
    } else {
      const before = this.coef;
      after = combineCoef(before, ch);
      otherAfter = combineCoef(before, other);
      this.coef = after;
      main = `${termX(before)} ${sym} ${termX(ch.val)} = ${termX(after)}`;
    }
    this.resolveGate(ch, other, isLeft, main, after, otherAfter, isConst);
  }

  // Shared good/bad juice so both gate families read identically: a subtract
  // gate is a monster (combo break + red sting), an add gate pops the crowd and
  // flags the smarter pick (DODGED a monster, or BIGGER than the other lane).
  private resolveGate(
    ch: Choice,
    other: Choice,
    isLeft: boolean,
    main: string,
    after: number,
    otherAfter: number,
    isConst: boolean,
  ) {
    const px = this.crowdX();
    if (ch.kind === 'subx' || ch.kind === 'subc') {
      this.combo = 0;
      this.shake = Math.max(this.shake, 9);
      this.hitFlash = 1;
      this.enemyHitBurst(px, NEAR_Y - 16);
      this.spawnCue(main, 'OUCH!', isConst ? C.subc : C.enemy);
      return;
    }

    this.combo++;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    this.comboPulse = 1;
    this.crowdPop = 1;
    const gp = this.project(isLeft ? -0.52 : 0.52, 0);
    this.gatePassBurst(gp.x, gp.y - GATE_NEAR_H * 0.5, ch.color);

    let tag = '';
    const otherIsSub = other.kind === 'subx' || other.kind === 'subc';
    if (otherIsSub) {
      const ep = this.project(isLeft ? 0.52 : -0.52, 0);
      this.dodgeSpark(ep.x, ep.y - GATE_NEAR_H * 0.5);
      tag = 'DODGED!';
    } else if (after > otherAfter) {
      tag = 'BIGGER!';
      this.comboConfetti(px, NEAR_Y - 30, 8 + Math.min(10, this.combo));
    }
    this.spawnCue(main, tag, ch.color);
  }

  // The final gate gives x a value — but rather than auto-evaluating, we hand
  // the arithmetic to the player. Record the digit, build a multiple-choice
  // challenge, and pause in the 'eval' phase until submitEvaluation() is called.
  private applyAssign(ch: Choice, isLeft: boolean) {
    const digit = ch.val;
    this.assignedX = digit;
    this.assigned = true;

    this.combo++;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    this.comboPulse = 1;
    this.crowdPop = 1;
    this.shake = Math.max(this.shake, 7);
    this.whiteFlash = 0.6;

    const px = this.crowdX();
    const gp = this.project(isLeft ? -0.52 : 0.52, 0);
    this.gatePassBurst(gp.x, gp.y - GATE_NEAR_H * 0.5, C.assign);
    this.comboConfetti(px, NEAR_Y - 30, 18);
    this.spawnCue(`x = ${digit}`, '', C.assign);

    this.buildEvalChallenge(digit);
    this.phase = 'eval';
  }

  // Build the "evaluate it yourself" multiple choice for a·x + b. Distractors
  // mirror the classic mistakes: forgetting +b, adding before multiplying, and
  // adding everything together.
  private buildEvalChallenge(d: number) {
    const a = this.coef;
    const b = this.constant;
    const answer = a * d + b;
    this.evalAnswer = answer;

    const opts = new Set<number>();
    opts.add(answer);
    const candidates = [
      a * d, // forgot to add the constant
      a * (d + b), // added the constant before multiplying
      a + d + b, // added everything instead of multiplying
      a * d - b, // flipped the sign of the constant
    ];
    for (const c of candidates) {
      if (opts.size >= 4) break;
      if (c !== answer && c >= 0) opts.add(c);
    }
    let pad = answer + 2;
    while (opts.size < 4) {
      if (pad >= 0 && pad !== answer) opts.add(pad);
      pad += 3;
    }

    const arr = Array.from(opts);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    this.evalOptions = arr;
  }

  /** The current expression ax + b as text (for overlays), e.g. "3x + 5". */
  exprLabel(): string {
    return fmtExpr(this.coef, this.constant);
  }
  /** The arithmetic line for a chosen x, e.g. "3 × 7 + 5" (or "… − 4"). */
  evalLine(x: number): string {
    const b = this.constant;
    const prod = `${this.coef} × ${x}`;
    if (b === 0) return prod;
    return b > 0 ? `${prod} + ${b}` : `${prod} − ${Math.abs(b)}`;
  }
  /** The numeric value of a·x + b for a chosen x. */
  evalValue(x: number): number {
    return this.coef * x + this.constant;
  }
  /** Kid-friendly worked steps for evaluating at a chosen x (teach + feedback). */
  evalSteps(x: number): string[] {
    const a = this.coef;
    const b = this.constant;
    const prod = a * x;
    const steps = [`Put ${x} in for x`, `Multiply first: ${a} × ${x} = ${prod}`];
    if (b === 0) steps.push(`No constant to add, so it stays ${prod}`);
    else if (b > 0) steps.push(`Then add the constant: ${prod} + ${b} = ${prod + b}`);
    else steps.push(`Then subtract the constant: ${prod} − ${Math.abs(b)} = ${prod + b}`);
    return steps;
  }

  /** Dismiss the teach pop-up and let the player steer through the assignment gate. */
  continueFromTeach() {
    if (this.phase === 'teach') this.phase = 'run';
  }

  /**
   * Record the player's own evaluation of a·x + b. The correct value becomes the
   * score either way (gentle — no harsh penalty); returns whether the pick was
   * right so the UI can celebrate or show the worked steps.
   */
  submitEvaluation(value: number): boolean {
    if (this.phase !== 'eval' || this.evalAnswered) return this.evalCorrect;
    const correct = value === this.evalAnswer;
    this.evalAnswered = true;
    this.evalPicked = value;
    this.evalCorrect = correct;
    this.count = Math.max(0, this.evalAnswer);
    this.evaluated = true;

    // Size the final boss to the crowd you actually built: a heavy flat hit plus
    // a chunk of your count, so a weak expression gets wiped out (a loss) and
    // only a strong, well-built one survives with crowd to spare.
    this.bossPower = randInt(45, 80) + Math.round(this.count * 0.3);

    const px = this.crowdX();
    // Frame the floating cue as evaluating the EXPRESSION at a value
    // ("x = 7: 3x + 5 = 26") rather than a bare substituted line.
    const line = `x = ${this.assignedX}: ${this.exprLabel()} = ${this.evalAnswer}`;
    if (correct) {
      this.whiteFlash = 0.7;
      this.comboPulse = 1;
      this.crowdPop = 1;
      this.comboConfetti(px, NEAR_Y - 30, 26);
      this.spawnCue(line, 'EVALUATE!', C.assign);
    } else {
      this.combo = 0;
      this.spawnCue(line, 'CHECK IT', C.combo2);
    }
    return correct;
  }

  /** Leave the evaluation pop-up and send the (now numeric) crowd at the boss. */
  continueFromEval() {
    if (this.phase === 'eval' && this.evalAnswered) this.phase = 'run';
  }

  private hitBoss() {
    this.bossDefeated = true;
    const before = this.count;
    this.count = Math.max(0, this.count - this.bossPower);
    this.won = this.count > 0; // crowd survived => win; wiped to 0 => loss
    this.combo = 0;
    this.shake = 16;
    this.whiteFlash = 0.85;
    this.bossClashBurst(CENTER, NEAR_Y - 70);
    this.bossClashBurst(this.crowdX(), NEAR_Y - 22);
    this.spawnCue(`${before} − ${this.bossPower} → ${this.count}`, 'BOSS!', C.boss);
    this.clashT = BOSS_CLASH_T;
    this.onComplete?.(this.count);
  }

  // --- Rendering -----------------------------------------------------------
  draw(ctx: CanvasRenderingContext2D) {
    let sx = 0;
    let sy = 0;
    if (this.shake > 0.2) {
      sx = (Math.random() * 2 - 1) * this.shake;
      sy = (Math.random() * 2 - 1) * this.shake;
    }

    this.drawSky(ctx); // full-canvas backdrop (un-shaken — no gaps)

    ctx.save();
    ctx.translate(this.camX + sx, sy);
    this.drawRoad(ctx);
    this.drawSpeedLines(ctx);

    const arr = this.scratch;
    arr.length = 0;
    for (const r of this.rows) if (!r.applied && r.z > 0.02 && r.z < 60) arr.push(r);
    arr.sort(byZDesc);
    for (const r of arr) {
      this.drawChoice(ctx, r, true);
      this.drawChoice(ctx, r, false);
    }

    this.drawBoss(ctx);
    this.drawCrowd(ctx);
    this.drawParticles(ctx);
    this.drawCues(ctx);
    ctx.restore();

    this.drawHitFlash(ctx);
    this.drawWhiteFlash(ctx);
    this.drawHud(ctx);
    this.drawCombo(ctx);
  }

  private drawSky(ctx: CanvasRenderingContext2D) {
    if (!this.skyGrad) {
      const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 60);
      g.addColorStop(0, '#7dd3fc');
      g.addColorStop(1, '#c4b5fd');
      this.skyGrad = g;
    }
    if (!this.groundGrad) {
      const g = ctx.createLinearGradient(0, HORIZON_Y, 0, GH);
      g.addColorStop(0, '#a78bfa');
      g.addColorStop(1, '#f0abfc');
      this.groundGrad = g;
    }
    ctx.fillStyle = this.skyGrad;
    ctx.fillRect(0, 0, GW, HORIZON_Y + 60);

    // Distant glowing sun + soft drifting clouds for depth.
    ctx.save();
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 34;
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(CENTER, HORIZON_Y - 8, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const cd = (this.tick * 0.04) % (GW + 120);
    this.cloud(ctx, ((cd + 40) % (GW + 120)) - 60, 70, 1);
    this.cloud(ctx, ((cd * 0.7 + 250) % (GW + 120)) - 60, 104, 0.7);

    ctx.fillStyle = this.groundGrad;
    ctx.fillRect(0, HORIZON_Y, GW, GH - HORIZON_Y);
  }

  private cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    ctx.beginPath();
    ctx.arc(x, y, 16 * s, 0, Math.PI * 2);
    ctx.arc(x + 18 * s, y + 4 * s, 13 * s, 0, Math.PI * 2);
    ctx.arc(x - 18 * s, y + 5 * s, 12 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRoad(ctx: CanvasRenderingContext2D) {
    const nearL = this.project(-1, 0);
    const nearR = this.project(1, 0);
    const farL = this.project(-1, 60);
    const farR = this.project(1, 60);

    // Soft shoulders flanking the road.
    ctx.fillStyle = '#8b5cf6';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, NEAR_Y);
    ctx.lineTo(nearL.x, nearL.y);
    ctx.lineTo(farL.x, farL.y);
    ctx.lineTo(0, farL.y);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(GW, NEAR_Y);
    ctx.lineTo(nearR.x, nearR.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.lineTo(GW, farR.y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#eef2f7';
    ctx.beginPath();
    ctx.moveTo(nearL.x, nearL.y);
    ctx.lineTo(nearR.x, nearR.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.lineTo(farL.x, farL.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(nearL.x, nearL.y);
    ctx.lineTo(farL.x, farL.y);
    ctx.moveTo(nearR.x, nearR.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.stroke();
  }

  private drawSpeedLines(ctx: CanvasRenderingContext2D) {
    // Flowing centre dashes — the base sense of forward speed.
    const STRIPE_GAP = 1.0;
    const phase = (this.tick * 0.02) % STRIPE_GAP;
    ctx.fillStyle = '#dbe2ec';
    for (let k = 0; k < 26; k++) {
      const z0 = k * STRIPE_GAP - phase;
      if (z0 <= 0.02) continue;
      const sa = this.scaleAt(z0);
      const sb = this.scaleAt(z0 + 0.42);
      const ax = this.projX(0, sa);
      const ay = this.projY(sa);
      const bx = this.projX(0, sb);
      const by = this.projY(sb);
      const wa = Math.max(1, 7 * sa);
      const wb = Math.max(1, 7 * sb);
      ctx.beginPath();
      ctx.moveTo(ax - wa, ay);
      ctx.lineTo(ax + wa, ay);
      ctx.lineTo(bx + wb, by);
      ctx.lineTo(bx - wb, by);
      ctx.closePath();
      ctx.fill();
    }

    // Edge streaks that zoom faster + brighter the longer your combo runs.
    const rush = Math.min(1, this.combo / 5);
    if (rush <= 0.01) return;
    const SG = 0.55;
    const ph = (this.tick * 0.05) % SG;
    ctx.strokeStyle = this.combo >= 4 ? C.combo : '#ffffff';
    for (let side = -1; side <= 1; side += 2) {
      for (let k = 0; k < 14; k++) {
        const z0 = k * SG - ph;
        if (z0 <= 0.05) continue;
        const sa = this.scaleAt(z0);
        const sb = this.scaleAt(z0 + 0.3);
        ctx.globalAlpha = (0.1 + 0.3 * rush) * sa;
        ctx.lineWidth = Math.max(1, 3 * sa);
        ctx.beginPath();
        ctx.moveTo(this.projX(side * 0.95, sa), this.projY(sa));
        ctx.lineTo(this.projX(side * 0.95, sb), this.projY(sb));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawChoice(ctx: CanvasRenderingContext2D, r: GateRow, isLeft: boolean) {
    const ch = isLeft ? r.left : r.right;
    const laneCenter = isLeft ? -0.52 : 0.52;
    const laneSpan = 0.9;
    const near = Math.max(0, Math.min(1, (2 - r.z) / 2)); // anticipation as it approaches
    const p = this.project(laneCenter, r.z);
    const s = p.s;
    const w = laneSpan * NEAR_HALF_W * s * (1 + near * 0.04);
    const h = GATE_NEAR_H * s * (1 + near * 0.04);
    if (h < 2) return;

    if (ch.kind === 'subx' || ch.kind === 'subc') this.drawEnemy(ctx, ch, p.x, p.y, w, h, s, near);
    else this.drawGate(ctx, ch, p.x, p.y, w, h, s, near);
  }

  private drawGate(
    ctx: CanvasRenderingContext2D, ch: Choice,
    cx: number, baseY: number, w: number, h: number, s: number, near: number,
  ) {
    const x0 = cx - w / 2;
    const top = baseY - h;
    const rad = 12 * s;

    if (near > 0.02) {
      ctx.shadowColor = ch.color;
      ctx.shadowBlur = 18 * near;
    }
    ctx.globalAlpha = 0.3 + 0.24 * near;
    ctx.fillStyle = ch.color;
    this.roundRect(ctx, x0, top, w, h, rad);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Solid header sign.
    ctx.fillStyle = ch.color;
    this.roundRect(ctx, x0, top, w, Math.max(4, 20 * s), 8 * s);
    ctx.fill();

    // Side posts to read as a doorway.
    const pw = Math.max(2, 5 * s);
    ctx.globalAlpha = 0.9;
    this.roundRect(ctx, x0 - pw * 0.5, top, pw, h, pw * 0.5);
    ctx.fill();
    this.roundRect(ctx, x0 + w - pw * 0.5, top, pw, h, pw * 0.5);
    ctx.fill();
    ctx.globalAlpha = 1;

    this.label(ctx, ch.label, cx, top + h * 0.5, s, '#ffffff', true);
  }

  private drawEnemy(
    ctx: CanvasRenderingContext2D, ch: Choice,
    cx: number, baseY: number, w: number, h: number, s: number, near: number,
  ) {
    const cy = baseY - h * 0.5;
    const bw = w * 0.72;
    const bh = h * 0.8;
    // Constant monsters (−n) wear amber; coefficient monsters (−kx) wear coral.
    const isConstMonster = ch.kind === 'subc';
    const auraColor = isConstMonster ? '#d97706' : '#e11d48';
    const browColor = isConstMonster ? '#7c2d12' : '#7f1d1d';

    // Slowly rotating spiky aura.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.tick * 0.012);
    if (near > 0.02) {
      ctx.shadowColor = ch.color;
      ctx.shadowBlur = 16 * near;
    }
    ctx.fillStyle = auraColor;
    const spikes = 10;
    const outer = Math.max(bw, bh) * 0.66;
    const inner = outer * 0.74;
    ctx.beginPath();
    for (let k = 0; k < spikes * 2; k++) {
      const rr = k % 2 ? inner : outer;
      const a = (k / (spikes * 2)) * Math.PI * 2;
      const X = Math.cos(a) * rr;
      const Y = Math.sin(a) * rr * 0.92;
      if (k === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;

    // Body.
    ctx.fillStyle = ch.color;
    this.roundRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 12 * s);
    ctx.fill();

    // Angry eyes + brows.
    const eo = bw * 0.2;
    const ey = cy - bh * 0.12;
    const es = Math.max(2, 7 * s);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - eo, ey, es, 0, Math.PI * 2);
    ctx.arc(cx + eo, ey, es, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(cx - eo, ey + es * 0.2, es * 0.5, 0, Math.PI * 2);
    ctx.arc(cx + eo, ey + es * 0.2, es * 0.5, 0, Math.PI * 2);
    ctx.fill();
    if (s > 0.3) {
      ctx.strokeStyle = browColor;
      ctx.lineWidth = Math.max(2, 3 * s);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - eo * 1.7, ey - es * 1.5);
      ctx.lineTo(cx - eo * 0.3, ey - es * 0.4);
      ctx.moveTo(cx + eo * 1.7, ey - es * 1.5);
      ctx.lineTo(cx + eo * 0.3, ey - es * 0.4);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    this.label(ctx, ch.label, cx, cy + bh * 0.3, s, '#ffffff', true);
  }

  private label(
    ctx: CanvasRenderingContext2D, text: string,
    x: number, y: number, s: number, color: string, strong: boolean,
  ) {
    const size = Math.max(9, Math.round(32 * s));
    ctx.font = `800 ${size}px Fredoka, Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (strong && size >= 12) {
      ctx.lineWidth = Math.max(2, size * 0.14);
      ctx.strokeStyle = 'rgba(17,24,39,0.5)';
      ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  private drawBoss(ctx: CanvasRenderingContext2D) {
    if (this.bossDefeated || this.bossZ <= 0.02 || this.bossZ > 60) return;
    const p = this.project(0, this.bossZ);
    const s = p.s;
    const w = 2.05 * NEAR_HALF_W * s;
    const h = 196 * s;
    if (h < 3) return;
    const cx = p.x;
    const topY = p.y - h;
    const pulse = 0.5 + 0.5 * Math.sin(this.tick * 0.18);

    // Horns.
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.42, topY + h * 0.18);
    ctx.lineTo(cx - w * 0.3, topY - h * 0.06);
    ctx.lineTo(cx - w * 0.16, topY + h * 0.18);
    ctx.closePath();
    ctx.moveTo(cx + w * 0.42, topY + h * 0.18);
    ctx.lineTo(cx + w * 0.3, topY - h * 0.06);
    ctx.lineTo(cx + w * 0.16, topY + h * 0.18);
    ctx.closePath();
    ctx.fill();

    // Body with a dark aura.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 26 * s;
    ctx.fillStyle = C.boss;
    this.roundRect(ctx, cx - w / 2, topY + h * 0.12, w, h * 0.82, 18 * s);
    ctx.fill();
    ctx.restore();

    // Glowing eyes.
    const ey = topY + h * 0.42;
    const eo = w * 0.18;
    const es = Math.max(3, 11 * s);
    ctx.save();
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 14 * s * pulse;
    ctx.fillStyle = `rgb(255,${Math.round(170 + 70 * pulse)},40)`;
    ctx.beginPath();
    ctx.arc(cx - eo, ey, es, 0, Math.PI * 2);
    ctx.arc(cx + eo, ey, es, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Snarling mouth.
    ctx.fillStyle = '#3b0a0a';
    this.roundRect(ctx, cx - w * 0.22, topY + h * 0.6, w * 0.44, h * 0.13, 6 * s);
    ctx.fill();

    // The bite is sized to your crowd at evaluation, so only show it once known.
    this.label(ctx, this.evaluated ? `−${this.bossPower}` : '?', cx, topY + h * 0.86, s * 1.05, '#ffffff', true);

    if (this.bossZ < 4.5) {
      ctx.globalAlpha = 0.6 + 0.4 * pulse;
      this.label(ctx, 'BOSS', cx, topY - 10 * s - 6, 0.78, C.boss, true);
      ctx.globalAlpha = 1;
    }
  }

  private drawCrowd(ctx: CanvasRenderingContext2D) {
    const px = this.crowdX();

    // The crowd IS your expression: while you are still ax + b each runner is an
    // "x", so the crowd size tracks the coefficient a. Once you evaluate it, the
    // crowd explodes to the resulting number.
    const expr = !this.evaluated;
    const magnitude = expr ? this.coef : this.count;
    const shown = Math.max(1, Math.min(DOT_CAP, magnitude));
    const baseScale = expr ? 1.0 + Math.min(0.95, this.coef / 26) : 1.1 + Math.min(1.4, this.count / 170);
    const scale = baseScale * (1 + this.crowdPop * 0.45);
    const lean = Math.max(-0.45, Math.min(0.45, this.laneVel * 0.05));

    ctx.save();
    ctx.translate(px, NEAR_Y);
    ctx.rotate(lean * 0.16);
    // Ground shadow.
    ctx.fillStyle = 'rgba(40,18,80,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 16 + 5 * scale, 7 + scale, 0, 0, Math.PI * 2);
    ctx.fill();
    const rDot = 5.4 * (1 + this.crowdPop * 0.12);
    for (let i = 0; i < shown; i++) {
      const d = this.dots[i];
      const bob = Math.sin(this.tick * 0.2 + d.phase) * 2;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.ox * scale, d.oy * scale + bob, rDot, 0, Math.PI * 2);
      ctx.fill();
      // A tiny "x" badge on the lead runner reinforces "you are the variable x".
      if (expr && i === 0 && rDot > 4) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = `800 ${Math.round(rDot * 1.5)}px Fredoka, Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('x', d.ox * scale, d.oy * scale + bob);
        ctx.textBaseline = 'alphabetic';
      }
    }
    ctx.restore();

    this.drawBubble(ctx, px, expr ? fmtExpr(this.coef, this.constant) : this.count.toLocaleString());
  }

  private drawBubble(ctx: CanvasRenderingContext2D, px: number, label: string) {
    ctx.font = '800 26px Fredoka, Inter, sans-serif';
    const w = Math.max(54, ctx.measureText(label).width + 28);
    const by = NEAR_Y - 70 - Math.min(60, Math.sqrt(Math.max(1, this.count)) * 3);
    const pop = 1 + this.crowdPop * 0.18;
    ctx.save();
    ctx.translate(px, by + 18);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#111827';
    this.roundRect(ctx, -w / 2, -18, w, 36, 18);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.evaluated ? C.combo2 : C.assign;
    this.roundRect(ctx, -w / 2, -18, w, 36, 18);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.min(1, (p.life / p.ttl) * 1.4);
      ctx.fillStyle = p.color;
      if (p.shape === 1) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawCues(ctx: CanvasRenderingContext2D) {
    for (const cu of this.cues) {
      if (!cu.active) continue;
      const k = cu.life / cu.ttl;
      const appear = Math.min(1, (cu.ttl - cu.life) / 0.12);
      const alpha = Math.min(1, cu.life * 2.4);
      const size = Math.round(25 * (0.7 + 0.3 * appear));
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${size}px Fredoka, Inter, sans-serif`;
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(17,24,39,0.55)';
      ctx.strokeText(cu.main, cu.x, cu.y);
      ctx.fillStyle = cu.color;
      ctx.fillText(cu.main, cu.x, cu.y);

      if (cu.tag) {
        const ty = cu.y - size * 0.95;
        const accent =
          cu.tag === 'OUCH!'
            ? C.enemy
            : cu.tag === 'BOSS!'
              ? C.boss
              : cu.tag === 'DODGED!'
                ? C.add
                : cu.tag === 'EVALUATE!'
                  ? C.assign
                  : C.combo;
        const pop = 1 + (1 - k) * 0.15;
        ctx.font = `800 ${Math.round(15 * pop)}px Fredoka, Inter, sans-serif`;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(17,24,39,0.6)';
        ctx.strokeText(cu.tag, cu.x, ty);
        ctx.fillStyle = accent;
        ctx.fillText(cu.tag, cu.x, ty);
      }
      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    }
  }

  private drawHitFlash(ctx: CanvasRenderingContext2D) {
    if (this.hitFlash <= 0.01) return;
    if (!this.redVignette) {
      const g = ctx.createRadialGradient(CENTER, GH * 0.56, 60, CENTER, GH * 0.56, GW * 0.95);
      g.addColorStop(0, 'rgba(225,29,72,0)');
      g.addColorStop(1, 'rgba(225,29,72,0.95)');
      this.redVignette = g;
    }
    ctx.globalAlpha = this.hitFlash * 0.5;
    ctx.fillStyle = this.redVignette;
    ctx.fillRect(0, 0, GW, GH);
    ctx.globalAlpha = 1;
  }

  private drawWhiteFlash(ctx: CanvasRenderingContext2D) {
    if (this.whiteFlash <= 0.01) return;
    ctx.globalAlpha = Math.min(0.85, this.whiteFlash);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, GW, GH);
    ctx.globalAlpha = 1;
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    const pad = 14;
    const barW = GW - pad * 2;
    const y = 16;
    const hh = 10;
    const progress = Math.max(0, Math.min(1, this.rowsCleared / (this.totalRows + 1)));

    if (!this.barGrad) {
      const g = ctx.createLinearGradient(pad, 0, pad + barW, 0);
      g.addColorStop(0, C.assign);
      g.addColorStop(0.55, C.combo2);
      g.addColorStop(1, C.combo);
      this.barGrad = g;
    }
    ctx.fillStyle = 'rgba(17,24,39,0.18)';
    this.roundRect(ctx, pad, y, barW, hh, hh / 2);
    ctx.fill();
    ctx.fillStyle = this.barGrad;
    this.roundRect(ctx, pad, y, Math.max(hh, barW * progress), hh, hh / 2);
    ctx.fill();

    // Boss marker at the finish.
    ctx.font = '12px Fredoka, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👹', pad + barW, y + hh / 2);
    ctx.textBaseline = 'alphabetic';
  }

  private drawCombo(ctx: CanvasRenderingContext2D) {
    if (this.combo < 2) return;
    const scale = 1 + this.comboPulse * 0.25;
    const txt = `COMBO ×${this.combo}`;
    ctx.save();
    ctx.translate(CENTER, 46);
    ctx.scale(scale, scale);
    ctx.font = '800 19px Fredoka, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 26;
    ctx.fillStyle = this.combo >= 5 ? C.combo2 : C.combo;
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    this.roundRect(ctx, -w / 2, -15, w, 30, 15);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(txt, 0, 1);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
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
}
