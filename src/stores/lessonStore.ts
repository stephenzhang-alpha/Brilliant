import { create } from 'zustand';
import { Lesson, LessonStep } from '../types';

interface LessonState {
  currentLesson: Lesson | null;
  currentStepIndex: number;
  attempts: number;
  showHint: boolean;
  showDetailedHint: boolean;
  isCorrect: boolean | null;
  feedbackMessage: string;

  setLesson: (lesson: Lesson, startStep?: number) => void;
  advanceStep: () => boolean;
  submitAnswer: (answer: unknown) => { correct: boolean; feedback: string };
  resetAttempts: () => void;
  getCurrentStep: () => LessonStep | null;
}

export const useLessonStore = create<LessonState>((set, get) => ({
  currentLesson: null,
  currentStepIndex: 0,
  attempts: 0,
  showHint: false,
  showDetailedHint: false,
  isCorrect: null,
  feedbackMessage: '',

  setLesson: (lesson, startStep = 0) => {
    set({
      currentLesson: lesson,
      currentStepIndex: startStep,
      attempts: 0,
      showHint: false,
      showDetailedHint: false,
      isCorrect: null,
      feedbackMessage: '',
    });
  },

  advanceStep: () => {
    const { currentLesson, currentStepIndex } = get();
    if (!currentLesson) return false;
    if (currentStepIndex >= currentLesson.steps.length - 1) return false;
    set({
      currentStepIndex: currentStepIndex + 1,
      attempts: 0,
      showHint: false,
      showDetailedHint: false,
      isCorrect: null,
      feedbackMessage: '',
    });
    return true;
  },

  submitAnswer: (answer: unknown) => {
    const { currentLesson, currentStepIndex, attempts } = get();
    if (!currentLesson) return { correct: false, feedback: '' };

    const step = currentLesson.steps[currentStepIndex];
    if (!step.validationRule) return { correct: true, feedback: 'Good job!' };

    const correct = validateAnswer(answer, step.validationRule);
    const newAttempts = attempts + 1;

    let feedback = '';
    if (correct) {
      feedback = step.synthesisText || 'Correct! Well done.';
    } else {
      const errorKey = getErrorKey(answer, step);
      feedback = step.feedbackMatrix[errorKey] || step.hints[0] || 'Try again!';
    }

    set({
      attempts: newAttempts,
      isCorrect: correct,
      feedbackMessage: feedback,
      showHint: !correct && newAttempts >= 1,
      showDetailedHint: !correct && newAttempts >= 2,
    });

    return { correct, feedback };
  },

  resetAttempts: () => {
    set({ attempts: 0, showHint: false, showDetailedHint: false, isCorrect: null, feedbackMessage: '' });
  },

  getCurrentStep: () => {
    const { currentLesson, currentStepIndex } = get();
    if (!currentLesson) return null;
    return currentLesson.steps[currentStepIndex] || null;
  },
}));

function validateAnswer(answer: unknown, rule: { type: string; answer: unknown; tolerance?: number }): boolean {
  switch (rule.type) {
    case 'exact':
      return JSON.stringify(answer) === JSON.stringify(rule.answer);
    case 'range': {
      const num = Number(answer);
      const target = Number(rule.answer);
      const tolerance = rule.tolerance || 0;
      return Math.abs(num - target) <= tolerance;
    }
    case 'expression':
      return String(answer).replace(/\s/g, '') === String(rule.answer).replace(/\s/g, '');
    default:
      return answer === rule.answer;
  }
}

function getErrorKey(answer: unknown, step: LessonStep): string {
  if (typeof answer === 'number') {
    const correct = step.validationRule?.answer as number;
    if (typeof correct === 'number') {
      if (answer === -correct) return 'sign_error';
      if (Math.abs(answer - correct) <= 1) return 'off_by_one';
    }
  }
  if (typeof answer === 'string') {
    if (answer === '') return 'empty';
  }
  return 'wrong_answer';
}
