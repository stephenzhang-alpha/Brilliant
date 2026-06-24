interface Props {
  lessonLabel: string;
  title: string;
  requirement: string;
  ctaLabel: string;
  /** Tap handler — used to scroll back up to the prerequisite section. */
  onCta?: () => void;
}

/** Friendly "this lesson is locked" screen shown until its prerequisite is done. */
export function LockedLesson({ lessonLabel, title, requirement, ctaLabel, onCta }: Props) {
  return (
    <div className="max-w-md mx-auto px-4 text-center">
      <div className="bg-surface border-2 border-primary/15 rounded-3xl shadow-xl px-8 py-10">
        <div className="text-5xl mb-3 animate-bob" aria-hidden>
          🔒
        </div>
        <p className="text-xs font-bold tracking-[0.25em] text-text-muted uppercase">{lessonLabel}</p>
        <h1 className="text-2xl font-extrabold mt-1">{title}</h1>
        <p className="text-text-muted mt-3">{requirement}</p>
        <button
          onClick={onCta}
          className="btn-pop inline-block mt-6 bg-primary text-white font-display font-semibold px-7 py-3 rounded-2xl"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
