import { create } from 'zustand';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import { UserProgress, LessonProgress, StreakData } from '../types';

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function calculateStreak(lastDate: string, currentStreak: number): number {
  const today = getTodayStr();
  if (lastDate === today) return currentStreak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastDate === yesterdayStr) return currentStreak + 1;
  return 1;
}

function loadFromLocal(userId: string): UserProgress | null {
  const raw = localStorage.getItem(`eq_progress_${userId}`);
  return raw ? JSON.parse(raw) : null;
}

function saveToLocal(userId: string, progress: UserProgress) {
  localStorage.setItem(`eq_progress_${userId}`, JSON.stringify(progress));
}

interface ProgressState {
  progress: UserProgress | null;
  loading: boolean;

  loadProgress: (userId: string) => Promise<void>;
  saveProgress: (userId: string) => Promise<void>;
  updateLessonProgress: (lessonId: string, stepIndex: number, correct: boolean) => void;
  completeLesson: (lessonId: string, xp: number) => void;
  recordActivity: () => void;
  getLessonProgress: (lessonId: string) => LessonProgress | undefined;
  isLessonCompleted: (lessonId: string) => boolean;
  isLessonUnlocked: (lessonId: string, prerequisites: string[]) => boolean;
}

const defaultStreak: StreakData = {
  current: 0,
  longest: 0,
  lastActivityDate: '',
  history: [],
};

export const useProgressStore = create<ProgressState>((set, get) => ({
  progress: null,
  loading: true,

  loadProgress: async (userId: string) => {
    set({ loading: true });

    const makeInitial = (): UserProgress => ({
      odId: userId,
      lessonProgress: {},
      streak: defaultStreak,
      totalXp: 0,
      lastActiveDate: '',
    });

    if (!isFirebaseConfigured) {
      const local = loadFromLocal(userId);
      set({ progress: local || makeInitial(), loading: false });
      return;
    }

    try {
      const docRef = doc(db!, 'userProgress', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        set({ progress: docSnap.data() as UserProgress, loading: false });
      } else {
        set({ progress: makeInitial(), loading: false });
      }
    } catch {
      const local = loadFromLocal(userId);
      set({ progress: local || makeInitial(), loading: false });
    }
  },

  saveProgress: async (userId: string) => {
    const { progress } = get();
    if (!progress) return;

    saveToLocal(userId, progress);

    if (!isFirebaseConfigured) return;

    try {
      const docRef = doc(db!, 'userProgress', userId);
      await setDoc(docRef, progress);
    } catch {
      // Saved to localStorage as fallback
    }
  },

  updateLessonProgress: (lessonId: string, stepIndex: number, correct: boolean) => {
    set((state) => {
      if (!state.progress) return state;
      const existing = state.progress.lessonProgress[lessonId] || {
        lessonId,
        currentStepIndex: 0,
        completed: false,
        stepAttempts: {},
        stepCorrect: {},
      };

      const stepKey = `step-${stepIndex}`;
      const attempts = (existing.stepAttempts[stepKey] || 0) + 1;

      return {
        progress: {
          ...state.progress,
          lessonProgress: {
            ...state.progress.lessonProgress,
            [lessonId]: {
              ...existing,
              currentStepIndex: correct ? stepIndex + 1 : stepIndex,
              stepAttempts: { ...existing.stepAttempts, [stepKey]: attempts },
              stepCorrect: { ...existing.stepCorrect, [stepKey]: correct },
            },
          },
        },
      };
    });
  },

  completeLesson: (lessonId: string, xp: number) => {
    set((state) => {
      if (!state.progress) return state;
      const existing = state.progress.lessonProgress[lessonId] || {
        lessonId,
        currentStepIndex: 0,
        completed: false,
        stepAttempts: {},
        stepCorrect: {},
      };

      return {
        progress: {
          ...state.progress,
          totalXp: state.progress.totalXp + xp,
          lessonProgress: {
            ...state.progress.lessonProgress,
            [lessonId]: {
              ...existing,
              completed: true,
              completedAt: new Date().toISOString(),
            },
          },
        },
      };
    });
  },

  recordActivity: () => {
    set((state) => {
      if (!state.progress) return state;
      const today = getTodayStr();
      const streak = state.progress.streak;
      const newCurrent = calculateStreak(streak.lastActivityDate, streak.current);
      const newLongest = Math.max(streak.longest, newCurrent);

      return {
        progress: {
          ...state.progress,
          lastActiveDate: today,
          streak: {
            current: newCurrent,
            longest: newLongest,
            lastActivityDate: today,
            history: streak.history.includes(today)
              ? streak.history
              : [...streak.history.slice(-29), today],
          },
        },
      };
    });
  },

  getLessonProgress: (lessonId: string) => {
    const { progress } = get();
    return progress?.lessonProgress[lessonId];
  },

  isLessonCompleted: (lessonId: string) => {
    const { progress } = get();
    return progress?.lessonProgress[lessonId]?.completed ?? false;
  },

  isLessonUnlocked: (_lessonId: string, prerequisites: string[]) => {
    const { progress } = get();
    if (!progress) return prerequisites.length === 0;
    if (prerequisites.length === 0) return true;
    return prerequisites.every(
      (preId) => progress.lessonProgress[preId]?.completed
    );
  },
}));
