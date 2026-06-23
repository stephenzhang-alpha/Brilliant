// ---------------------------------------------------------------------------
// Curriculum
// ---------------------------------------------------------------------------

export type StrandId = 'core' | 'visual' | 'patterns' | 'physics';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  prerequisiteIds: string[];
  steps: LessonStep[];
  xpReward: number;
  /** Which thematic learning path this lesson belongs to. */
  strand: StrandId;
  /** True for lessons that act as an independent starting point on the map. */
  entryPoint?: boolean;
  /** Optional explicit position on the 2D course map (column = depth, row = lane). */
  mapPosition?: { col: number; row: number };
}

export interface LessonStep {
  id: string;
  type: 'concept' | 'problem' | 'synthesis';
  interactionType?: InteractionType;
  prompt: string;
  conceptText?: string;
  hints?: string[];
  validationRule?: ValidationRule;
  /**
   * Maps a misconception id (see MisconceptionId) to a remediation. A bare
   * string is treated as { kind: 'text' } for backwards compatibility.
   */
  remediation?: Record<string, Remediation | string>;
  synthesisText?: string;
  problemConfig?: ProblemConfig;
}

export type InteractionType =
  | 'TERM_DRAG'
  | 'BALANCE_SCALE'
  | 'GRAPH_PLOT'
  | 'NUMBER_INPUT'
  | 'EXPRESSION_BUILDER'
  | 'SLIDER_GRAPH'
  | 'INTERSECTION_SCRUB';

export interface ValidationRule {
  type: 'exact' | 'expression' | 'range' | 'custom';
  answer: unknown;
  tolerance?: number;
}

// ---------------------------------------------------------------------------
// Constructive-failure remediation
// ---------------------------------------------------------------------------

export type MisconceptionId =
  | 'wrong_answer'
  | 'empty'
  | 'sign_error'
  | 'off_by_one'
  | 'slope_wrong'
  | 'intercept_wrong'
  | 'incomplete'
  | 'asymmetric_op'
  | 'cross_pan_move'
  | 'needs_decomposition'
  | 'uneven_division'
  | 'wrong_inverse';

export type MicroActivityId = 'number-line-hop' | 'rebuild-balance' | 'substitute-tile';
export type VisualId = 'sign-flip' | 'balance-tip' | 'rise-run';

export type Remediation =
  | { kind: 'text'; message: string }
  | { kind: 'microActivity'; activity: MicroActivityId; message: string; params?: Record<string, unknown> }
  | { kind: 'visual'; visual: VisualId; message: string; params?: Record<string, unknown> };

// ---------------------------------------------------------------------------
// Problem configurations
// ---------------------------------------------------------------------------

export interface ProblemConfig {
  equation?: EquationConfig;
  balance?: BalanceConfig;
  graph?: GraphConfig;
  numberInput?: NumberInputConfig;
  expressionBuilder?: ExpressionBuilderConfig;
  sliderGraph?: SliderGraphConfig;
  intersection?: IntersectionConfig;
}

export interface EquationConfig {
  left: Term[];
  right: Term[];
  targetVariable: string;
  targetValue: number;
}

export interface Term {
  id: string;
  coefficient: number;
  variable?: string;
  isConstant: boolean;
}

// --- Interactive balance scale ---------------------------------------------

export interface BalanceTermSpec {
  kind: 'const' | 'var';
  /** const: numeric value; var: coefficient (expanded into that many x-chips). */
  value: number;
  name?: string;
}

export interface BalanceConfig {
  variable: string;
  left: BalanceTermSpec[];
  right: BalanceTermSpec[];
  /** Chips the learner can drag IN from the bank. Defaults to +1 / -1 / x. */
  palette?: BalanceTermSpec[];
  /** Divide-both-sides tools to offer, e.g. [2]. */
  divisors?: number[];
  goalText?: string;
  targetValue: number;
}

export interface GraphConfig {
  targetSlope: number;
  targetIntercept: number;
  xRange: [number, number];
  yRange: [number, number];
  snapToGrid: boolean;
}

export interface NumberInputConfig {
  correctAnswer: number;
  tolerance?: number;
  placeholder?: string;
}

/** Drag-substitution module that replaces multiple choice. */
export interface ExpressionBuilderConfig {
  expression: Term[];
  variable: string;
  substituteValue: number;
  answer: number;
  maxValue?: number;
}

/** Spec Module 2: parametric y = mx + b explorer. */
export interface SliderGraphConfig {
  targetSlope: number;
  targetIntercept: number;
  xRange: [number, number];
  yRange: [number, number];
  slopeRange?: [number, number];
  interceptRange?: [number, number];
  step?: number;
}

/** Spec Module 3: dual-line constraint intersection scrub. */
export interface IntersectionConfig {
  lineA: { slope: number; intercept: number; label: string };
  lineB: { slope: number; intercept: number; label: string };
  xRange: [number, number];
  yRange: [number, number];
  answerX: number;
  tolerance?: number;
  unitLabel?: string;
}

// ---------------------------------------------------------------------------
// Progress / persistence
// ---------------------------------------------------------------------------

export interface UserProgress {
  odId: string;
  lessonProgress: Record<string, LessonProgress>;
  streak: StreakData;
  totalXp: number;
  lastActiveDate: string;
}

export interface LessonProgress {
  lessonId: string;
  currentStepIndex: number;
  completed: boolean;
  completedAt?: string;
  stepAttempts: Record<string, number>;
  stepCorrect: Record<string, boolean>;
}

export interface StreakData {
  current: number;
  longest: number;
  lastActivityDate: string;
  history: string[];
}
