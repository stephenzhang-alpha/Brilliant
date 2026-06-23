export interface Lesson {
  id: string;
  title: string;
  description: string;
  prerequisiteIds: string[];
  steps: LessonStep[];
  xpReward: number;
}

export interface LessonStep {
  id: string;
  type: 'concept' | 'problem' | 'synthesis';
  interactionType?: InteractionType;
  prompt: string;
  conceptText?: string;
  hints: string[];
  validationRule?: ValidationRule;
  feedbackMatrix: Record<string, string>;
  synthesisText?: string;
  problemConfig?: ProblemConfig;
}

export type InteractionType = 'TERM_DRAG' | 'SCALE_BALANCE' | 'GRAPH_PLOT' | 'MULTIPLE_CHOICE' | 'NUMBER_INPUT';

export interface ValidationRule {
  type: 'exact' | 'expression' | 'range' | 'custom';
  answer: unknown;
  tolerance?: number;
}

export interface ProblemConfig {
  equation?: EquationConfig;
  scale?: ScaleConfig;
  graph?: GraphConfig;
  choices?: ChoiceConfig;
  numberInput?: NumberInputConfig;
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

export interface ScaleConfig {
  leftItems: ScaleItem[];
  rightItems: ScaleItem[];
  targetBalance: ScaleItem[];
  availableOperations: ScaleOperation[];
}

export interface ScaleItem {
  id: string;
  label: string;
  value: number;
  isVariable?: boolean;
}

export interface ScaleOperation {
  type: 'add' | 'subtract' | 'multiply' | 'divide';
  value: number;
  label: string;
}

export interface GraphConfig {
  targetSlope: number;
  targetIntercept: number;
  xRange: [number, number];
  yRange: [number, number];
  snapToGrid: boolean;
}

export interface ChoiceConfig {
  options: { id: string; text: string; isCorrect: boolean }[];
}

export interface NumberInputConfig {
  correctAnswer: number;
  tolerance?: number;
  placeholder?: string;
}

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
