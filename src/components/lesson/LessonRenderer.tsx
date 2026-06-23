import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lesson } from '../../types';
import { StepRenderer } from './StepRenderer';
import { useProgressStore } from '../../stores/progressStore';
import { useAuthStore } from '../../stores/authStore';
import { getNextLesson } from '../../content';

interface Props {
  lesson: Lesson;
}

export function LessonRenderer({ lesson }: Props) {
  const { user } = useAuthStore();
  const { updateLessonProgress, completeLesson, recordActivity, saveProgress, getLessonProgress } = useProgressStore();
  const navigate = useNavigate();

  const existingProgress = getLessonProgress(lesson.id);
  const startStep = existingProgress?.completed ? 0 : (existingProgress?.currentStepIndex || 0);

  const [currentStepIndex, setCurrentStepIndex] = useState(startStep);
  const [attempts, setAttempts] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    setCurrentStepIndex(startStep);
    setShowCompletion(false);
  }, [lesson.id, startStep]);

  const currentStep = lesson.steps[currentStepIndex];
  const totalSteps = lesson.steps.length;
  const progressPercent = ((currentStepIndex) / totalSteps) * 100;

  const handleStepComplete = (correct: boolean) => {
    if (!user) return;

    updateLessonProgress(lesson.id, currentStepIndex, correct);
    recordActivity();

    if (correct) {
      setAttempts(0);
      if (currentStepIndex >= totalSteps - 1) {
        completeLesson(lesson.id, lesson.xpReward);
        saveProgress(user.uid);
        setShowCompletion(true);
      } else {
        setCurrentStepIndex((prev) => prev + 1);
        saveProgress(user.uid);
      }
    } else {
      setAttempts((prev) => prev + 1);
    }
  };

  if (showCompletion) {
    const next = getNextLesson(lesson.id);
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-12 px-4">
        <div className="text-6xl animate-bounce">🏆</div>
        <h2 className="text-2xl font-bold">Lesson Complete!</h2>
        <p className="text-text-muted">You earned <span className="text-primary-light font-bold">+{lesson.xpReward} XP</span></p>
        <div className="flex flex-col gap-3">
          {next && (
            <button
              onClick={() => navigate(`/lesson/${next.id}`)}
              className="bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors"
            >
              Next: {next.title}
            </button>
          )}
          <button
            onClick={() => navigate('/course')}
            className="border border-white/20 hover:border-white/40 text-text-muted font-medium py-3 rounded-xl transition-colors"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  if (!currentStep) return null;

  return (
    <div className="max-w-lg mx-auto py-6 px-4 space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted">{lesson.title}</span>
          <span className="text-text-muted">{currentStepIndex + 1} / {totalSteps}</span>
        </div>
        <div className="h-2 bg-surface-light rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-light rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step prompt */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold">{currentStep.prompt}</h2>
      </div>

      {/* Step content */}
      <StepRenderer
        step={currentStep}
        onComplete={handleStepComplete}
        attempts={attempts}
      />
    </div>
  );
}
