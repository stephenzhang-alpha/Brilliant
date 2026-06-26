import { useState } from 'react';
import { MagicAssistant } from '../assistant/MagicAssistant';

export interface QuizOption {
  id: string;
  label: string;
  /** A short tag shown under the label. */
  hint?: string;
  correct: boolean;
  /** Gentle, encouraging re-explanation shown when this wrong option is picked. */
  feedback?: string;
}

interface Props {
  question: string;
  options: QuizOption[];
  /** Fired once the player picks the correct answer and taps continue. */
  onCorrect: () => void;
  /** Optional small line under the question. */
  prompt?: string;
  /** Optional eyebrow badge above the question (e.g. "Stage 1 · Variables"). */
  badge?: string;
  /** Label of the continue button shown after a correct answer. */
  ctaLabel?: string;
  /** Column count for the option grid. Defaults to 2. */
  columns?: 2 | 3;
  /** Lesson topic passed to the AI assistant for better hints (e.g. "variables"). */
  topic?: string;
  /** Optional override for the assistant's name. */
  assistantName?: string;
}

/**
 * A reusable multiple-choice concept check that GATES progress: a wrong pick is
 * never punished — it just surfaces a gentle nudge and lets the player retry —
 * and only a correct answer reveals the "continue" button that calls
 * `onCorrect`. Lifted from the original Dino variables quiz so every gate on the
 * quest (landing, expressions, and the in-run Dino reinforcement) behaves the
 * same way.
 */
export function ConceptCheck({
  question,
  options,
  onCorrect,
  prompt,
  badge,
  ctaLabel = 'Continue →',
  columns = 2,
  topic,
  assistantName,
}: Props) {
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const wrongOption = wrongPick ? options.find((o) => o.id === wrongPick) : null;

  const pick = (opt: QuizOption) => {
    if (opt.correct) {
      setWrongPick(null);
      setDone(true);
    } else {
      setWrongPick(opt.id);
    }
  };

  if (done) {
    return (
      <div className="animate-fadein text-center">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <h4 className="mt-1 font-display text-xl font-extrabold text-text">Correct!</h4>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-muted">
          Nice — you&apos;ve got it. Onward!
        </p>
        <button
          onClick={onCorrect}
          className="btn-pop mt-5 rounded-2xl bg-primary px-9 py-3.5 font-display text-lg font-extrabold text-white animate-pulse"
        >
          {ctaLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fadein">
      {badge && (
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary">
          {badge}
        </span>
      )}
      <h4 className="mt-2 flex items-center gap-2 font-display text-lg font-extrabold text-text sm:text-xl">
        <span aria-hidden>🎯</span> {question}
      </h4>
      {prompt && <p className="mt-1 text-sm text-text-muted">{prompt}</p>}

      <div
        className={`mt-3 grid gap-2 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
      >
        {options.map((opt) => {
          const isWrongPick = wrongPick === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => pick(opt)}
              className={[
                'btn-pop rounded-xl border-2 px-4 py-3 text-left transition-colors',
                isWrongPick
                  ? 'border-coral bg-coral/10'
                  : 'border-black/10 bg-surface-light hover:border-primary hover:bg-primary/5',
              ].join(' ')}
            >
              <span className="block font-display font-bold text-text">{opt.label}</span>
              {opt.hint && <span className="mt-0.5 block text-xs text-text-muted">{opt.hint}</span>}
              {isWrongPick && (
                <span className="mt-1 block text-xs font-semibold text-coral">not this one</span>
              )}
            </button>
          );
        })}
      </div>

      {wrongOption && (
        <MagicAssistant
          key={wrongOption.id}
          topic={topic}
          question={question}
          prompt={prompt}
          options={options.map((o) => o.label)}
          userPickLabel={wrongOption.label}
          correctLabel={options.find((o) => o.correct)?.label ?? ''}
          fallback={wrongOption.feedback}
          name={assistantName}
        />
      )}
    </div>
  );
}
