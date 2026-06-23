interface Props {
  message: string;
  isCorrect: boolean | null;
  showHint: boolean;
  showDetailedHint: boolean;
  hints: string[];
}

export function FeedbackPanel({ message, isCorrect, showHint, showDetailedHint, hints }: Props) {
  if (isCorrect === null) return null;

  return (
    <div
      className={`rounded-xl p-4 border-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2
        ${isCorrect
          ? 'bg-success/10 border-success/30'
          : 'bg-error/10 border-error/30'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">
          {isCorrect ? '✓' : '✗'}
        </span>
        <div className="flex-1 space-y-2">
          <p className={`font-medium ${isCorrect ? 'text-success' : 'text-error'}`}>
            {isCorrect ? 'Correct!' : 'Not quite right'}
          </p>
          <p className="text-sm text-text/80">{message}</p>

          {!isCorrect && showHint && hints.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Hint</p>
              <p className="text-sm text-primary-light">{hints[0]}</p>
            </div>
          )}

          {!isCorrect && showDetailedHint && hints.length > 1 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Detailed Hint</p>
              <p className="text-sm text-warning">{hints[1]}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
