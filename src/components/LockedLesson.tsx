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
      <div className="relative">
        <div
          aria-hidden
          className="absolute -inset-0.5 rounded-[1.75rem] bg-gradient-to-br from-primary/40 via-accent/30 to-cyan/30 opacity-70 blur-sm"
        />
        <div className="relative bg-surface border-2 border-primary/15 rounded-3xl shadow-xl px-8 py-10">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-surface-light">
            <span className="text-5xl animate-bob" aria-hidden>
              🔒
            </span>
          </div>
          <p className="inline-block text-xs font-bold tracking-[0.25em] text-primary uppercase bg-primary/10 rounded-full px-3 py-1">
            {lessonLabel}
          </p>
          <h1 className="text-2xl font-extrabold mt-3">{title}</h1>
          <p className="text-text-muted mt-3">{requirement}</p>
          <button
            onClick={onCta}
            className="btn-pop inline-block mt-6 bg-primary text-white font-display font-semibold px-7 py-3 rounded-2xl"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
