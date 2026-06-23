import { useState } from 'react';
import type { Remediation } from '../../../types';
import { NumberLineHop } from './NumberLineHop';
import { VisualExplanation } from './VisualExplanation';

interface Props {
  remediation: Remediation;
  hints?: string[];
  attempts: number;
}

const n = (v: unknown, fallback: number): number => {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Renders constructive-failure feedback. Instead of a flat "Incorrect", every
 * wrong answer surfaces a targeted explanation, and may embed an interactive
 * micro-activity or a visual that repairs the underlying misconception.
 */
export function RemediationHost({ remediation, hints, attempts }: Props) {
  const [resolved, setResolved] = useState(false);

  return (
    <div className="rounded-xl p-4 border-2 bg-error/10 border-error/30 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">✗</span>
        <div className="flex-1 space-y-1">
          <p className="font-medium text-error">Not quite — let's fix the idea</p>
          <p className="text-sm text-text/80">{remediation.message}</p>
        </div>
      </div>

      {remediation.kind === 'visual' && (
        <div className="rounded-lg bg-surface/40 border border-white/10">
          <VisualExplanation visual={remediation.visual} params={remediation.params} />
        </div>
      )}

      {remediation.kind === 'microActivity' && remediation.activity === 'number-line-hop' && (
        <div className="rounded-lg bg-surface/40 border border-white/10 p-3">
          <NumberLineHop
            min={n(remediation.params?.min, 0)}
            max={n(remediation.params?.max, 10)}
            answer={n(remediation.params?.answer, 0)}
            caption={remediation.params?.caption as string | undefined}
            onSolved={() => setResolved(true)}
          />
        </div>
      )}

      {remediation.kind === 'microActivity' &&
        remediation.activity !== 'number-line-hop' && (
          <div className="rounded-lg bg-surface/40 border border-white/10 p-3 text-sm text-text-muted">
            Work through the step above, then try again.
          </div>
        )}

      {resolved && (
        <p className="text-xs text-success">Nice — you repaired the step. Give the problem another go.</p>
      )}

      {hints && hints.length > 0 && attempts >= 2 && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Hint</p>
          <p className="text-sm text-primary-light">{hints[Math.min(attempts - 2, hints.length - 1)]}</p>
        </div>
      )}
    </div>
  );
}
