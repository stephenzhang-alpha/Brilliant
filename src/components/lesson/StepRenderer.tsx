import { useState, useEffect } from 'react';
import { LessonStep } from '../../types';
import { MultipleChoice } from '../interactions/MultipleChoice';
import { NumberInput } from '../interactions/NumberInput';
import { TermDrag } from '../interactions/TermDrag';
import { ScaleBalance } from '../interactions/ScaleBalance';
import { GraphPlot } from '../interactions/GraphPlot';
import { FeedbackPanel } from './FeedbackPanel';

interface Props {
  step: LessonStep;
  onComplete: (correct: boolean) => void;
  attempts: number;
}

export function StepRenderer({ step, onComplete, attempts }: Props) {
  const [feedback, setFeedback] = useState<{ message: string; correct: boolean } | null>(null);
  const [localAttempts, setLocalAttempts] = useState(0);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    setFeedback(null);
    setLocalAttempts(0);
    setAnswered(false);
  }, [step.id]);

  const handleSubmit = (answer: unknown) => {
    if (answered) return;

    const rule = step.validationRule;
    let correct = false;

    if (!rule) {
      correct = true;
    } else if (rule.type === 'exact') {
      if (typeof rule.answer === 'object' && rule.answer !== null) {
        const target = rule.answer as { slope: number; intercept: number };
        const ans = answer as { slope: number; intercept: number };
        correct = Math.abs(ans.slope - target.slope) < 0.2 && Math.abs(ans.intercept - target.intercept) < 0.5;
      } else {
        correct = String(answer) === String(rule.answer) || Number(answer) === Number(rule.answer);
      }
    } else if (rule.type === 'range') {
      const num = Number(answer);
      const target = Number(rule.answer);
      correct = Math.abs(num - target) <= (rule.tolerance || 0.5);
    }

    const newAttempts = localAttempts + 1;
    setLocalAttempts(newAttempts);

    let message = '';
    if (correct) {
      message = step.synthesisText || 'Correct!';
      setAnswered(true);
    } else {
      const errorKey = getErrorKey(answer, step);
      message = step.feedbackMatrix[errorKey] || step.hints[0] || 'Try again!';
    }

    setFeedback({ message, correct });

    if (correct) {
      setTimeout(() => onComplete(true), 1200);
    }
  };

  if (step.type === 'concept') {
    return (
      <div className="space-y-6">
        <div className="bg-surface/50 rounded-2xl border border-white/10 p-6">
          <p className="text-lg leading-relaxed text-text/90">{step.conceptText}</p>
        </div>
        <button
          onClick={() => onComplete(true)}
          className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors"
        >
          Got it! Continue
        </button>
      </div>
    );
  }

  if (step.type === 'synthesis') {
    return (
      <div className="space-y-6">
        <div className="bg-success/10 border border-success/30 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-lg leading-relaxed text-text/90">{step.synthesisText}</p>
        </div>
        <button
          onClick={() => onComplete(true)}
          className="w-full bg-success hover:bg-success/80 text-white font-medium py-3 rounded-xl transition-colors"
        >
          Complete Lesson
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {step.interactionType === 'MULTIPLE_CHOICE' && step.problemConfig?.choices && (
        <MultipleChoice
          config={step.problemConfig.choices}
          onSubmit={(answer) => handleSubmit(answer)}
          disabled={answered}
        />
      )}

      {step.interactionType === 'NUMBER_INPUT' && step.problemConfig?.numberInput && (
        <NumberInput
          config={step.problemConfig.numberInput}
          onSubmit={(answer) => handleSubmit(answer)}
          disabled={answered}
        />
      )}

      {step.interactionType === 'TERM_DRAG' && step.problemConfig?.equation && (
        <TermDrag
          config={step.problemConfig.equation}
          onSubmit={(answer) => handleSubmit(answer)}
          disabled={answered}
        />
      )}

      {step.interactionType === 'SCALE_BALANCE' && step.problemConfig?.scale && (
        <ScaleBalance
          config={step.problemConfig.scale}
          onSubmit={(answer) => handleSubmit(answer)}
          disabled={answered}
        />
      )}

      {step.interactionType === 'GRAPH_PLOT' && step.problemConfig?.graph && (
        <GraphPlot
          config={step.problemConfig.graph}
          onSubmit={(answer) => handleSubmit(answer)}
          disabled={answered}
        />
      )}

      {feedback && (
        <FeedbackPanel
          message={feedback.message}
          isCorrect={feedback.correct}
          showHint={localAttempts >= 1 && !feedback.correct}
          showDetailedHint={localAttempts >= 2 && !feedback.correct}
          hints={step.hints}
        />
      )}

      {!answered && feedback && !feedback.correct && (
        <button
          onClick={() => setFeedback(null)}
          className="w-full border border-white/20 hover:border-white/40 text-text-muted font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

function getErrorKey(answer: unknown, step: LessonStep): string {
  if (answer === null || answer === undefined || answer === '') return 'empty';

  if (typeof answer === 'number' || !isNaN(Number(answer))) {
    const num = Number(answer);
    const correct = Number(step.validationRule?.answer);
    if (!isNaN(correct)) {
      if (num === -correct) return 'sign_error';
      if (Math.abs(num - correct) <= 1) return 'off_by_one';
    }
    if (isNaN(num)) return 'empty';
  }

  if (typeof answer === 'object' && answer !== null && 'slope' in answer) {
    const { slope, intercept } = answer as { slope: number; intercept: number };
    const target = step.validationRule?.answer as { slope: number; intercept: number };
    if (target) {
      if (Math.abs(slope - target.slope) > 0.3) return 'slope_wrong';
      if (Math.abs(intercept - target.intercept) > 0.5) return 'intercept_wrong';
    }
  }

  return 'wrong_answer';
}
