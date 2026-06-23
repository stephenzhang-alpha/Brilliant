import { useState } from 'react';
import type { LessonStep, Remediation } from '../../types';
import { NumberInput } from '../interactions/NumberInput';
import { TermDrag } from '../interactions/TermDrag';
import { InteractiveBalance } from '../interactions/InteractiveBalance/InteractiveBalance';
import { GraphPlot } from '../interactions/GraphPlot';
import { ExpressionBuilder } from '../interactions/ExpressionBuilder';
import { SliderGraph } from '../interactions/SliderGraph';
import { IntersectionScrub } from '../interactions/IntersectionScrub';
import { FeedbackPanel } from './FeedbackPanel';
import { RemediationHost } from './remediation/RemediationHost';

interface Props {
  step: LessonStep;
  onComplete: (correct: boolean) => void;
  attempts: number;
}

function resolveRemediation(entry: Remediation | string | undefined): Remediation | undefined {
  if (!entry) return undefined;
  if (typeof entry === 'string') return { kind: 'text', message: entry };
  return entry;
}

export function StepRenderer({ step, onComplete }: Props) {
  const [remediation, setRemediation] = useState<Remediation | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localAttempts, setLocalAttempts] = useState(0);
  const [answered, setAnswered] = useState(false);

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
        correct =
          Math.abs(ans.slope - target.slope) < 0.2 && Math.abs(ans.intercept - target.intercept) < 0.5;
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

    if (correct) {
      setSuccessMessage(step.synthesisText || 'Correct!');
      setRemediation(null);
      setAnswered(true);
      setTimeout(() => onComplete(true), 1200);
    } else {
      const errorKey = getErrorKey(answer, step);
      const resolved =
        resolveRemediation(step.remediation?.[errorKey]) ??
        resolveRemediation(step.remediation?.['wrong_answer']) ?? {
          kind: 'text' as const,
          message: step.hints?.[0] ?? 'Not quite — take another look and try again.',
        };
      setRemediation(resolved);
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
      {step.interactionType === 'NUMBER_INPUT' && step.problemConfig?.numberInput && (
        <NumberInput config={step.problemConfig.numberInput} onSubmit={handleSubmit} disabled={answered} />
      )}

      {step.interactionType === 'TERM_DRAG' && step.problemConfig?.equation && (
        <TermDrag config={step.problemConfig.equation} onSubmit={handleSubmit} disabled={answered} />
      )}

      {step.interactionType === 'BALANCE_SCALE' && step.problemConfig?.balance && (
        <InteractiveBalance config={step.problemConfig.balance} onSubmit={handleSubmit} disabled={answered} />
      )}

      {step.interactionType === 'EXPRESSION_BUILDER' && step.problemConfig?.expressionBuilder && (
        <ExpressionBuilder
          config={step.problemConfig.expressionBuilder}
          onSubmit={handleSubmit}
          disabled={answered}
        />
      )}

      {step.interactionType === 'GRAPH_PLOT' && step.problemConfig?.graph && (
        <GraphPlot config={step.problemConfig.graph} onSubmit={handleSubmit} disabled={answered} />
      )}

      {step.interactionType === 'SLIDER_GRAPH' && step.problemConfig?.sliderGraph && (
        <SliderGraph config={step.problemConfig.sliderGraph} onSubmit={handleSubmit} disabled={answered} />
      )}

      {step.interactionType === 'INTERSECTION_SCRUB' && step.problemConfig?.intersection && (
        <IntersectionScrub config={step.problemConfig.intersection} onSubmit={handleSubmit} disabled={answered} />
      )}

      {successMessage && (
        <FeedbackPanel message={successMessage} isCorrect={true} showHint={false} showDetailedHint={false} hints={[]} />
      )}

      {remediation && !answered && (
        <RemediationHost remediation={remediation} hints={step.hints} attempts={localAttempts} />
      )}

      {remediation && !answered && (
        <button
          onClick={() => setRemediation(null)}
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
