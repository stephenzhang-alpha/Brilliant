import { useRef, useState } from 'react';
import pipIdle from '../../assets/assistant/pip-idle.png';
import pipExplaining from '../../assets/assistant/pip-explaining.png';
import { isAssistantAvailable, streamQuestionHelp, type HelpMode } from '../../firebase/ai';

interface MagicAssistantProps {
  /** Lesson topic, e.g. "variables" or "equations and inequalities". */
  topic?: string;
  question: string;
  prompt?: string;
  /** All answer choice labels. */
  options: string[];
  /** The (wrong) answer the student just chose. */
  userPickLabel: string;
  /** The correct answer's label. */
  correctLabel: string;
  /** Authored fallback used when the live AI is unavailable or errors. */
  fallback?: string;
  /** Mascot name. */
  name?: string;
}

/** Sparkles that gently bob around Pip while it hovers. */
const SPARKLES = [
  { ch: '✨', top: '-8%', left: '2%', delay: '0s', size: 'text-lg' },
  { ch: '⭐', top: '6%', left: '82%', delay: '0.4s', size: 'text-sm' },
  { ch: '✨', top: '66%', left: '-8%', delay: '0.8s', size: 'text-base' },
  { ch: '💫', top: '80%', left: '74%', delay: '0.2s', size: 'text-lg' },
];

/** Sparkles that fling outward from Pip's center in the one-shot arrival burst. */
const BURST = [
  { ch: '✨', top: '2%', left: '44%' },
  { ch: '⭐', top: '40%', left: '90%' },
  { ch: '💫', top: '84%', left: '42%' },
  { ch: '✨', top: '44%', left: '2%' },
  { ch: '⭐', top: '10%', left: '80%' },
  { ch: '✨', top: '80%', left: '10%' },
];

/**
 * "Pip", a magical star-spirit assistant. When a student answers a concept check
 * wrong, Pip swoops in from the side (sparkle trail), bursts a ring of sparkles
 * as it lands, then hovers — untethered, no box — beside a tailed speech bubble.
 * On request it gives an AI hint or explanation (streamed, typing-effect). If the
 * live AI (Firebase AI Logic) is unavailable or errors, it gracefully shows the
 * authored `fallback` instead, so it always helps.
 */
export function MagicAssistant({
  topic,
  question,
  prompt,
  options,
  userPickLabel,
  correctLabel,
  fallback,
  name = 'Pip',
}: MagicAssistantProps) {
  const [mode, setMode] = useState<HelpMode | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  // Each request gets an id so a newer request (e.g. switching Hint -> Explain)
  // supersedes an older in-flight stream's late updates. The component is keyed
  // by the wrong pick upstream, so a brand-new wrong answer remounts it fresh.
  const reqIdRef = useRef(0);

  const fallbackText = () =>
    fallback ??
    `Take another look${topic ? ` at ${topic}` : ''} — you've got this! Try a different answer.`;

  const requestHelp = async (m: HelpMode) => {
    const id = ++reqIdRef.current;
    setMode(m);
    setText('');
    setUsedFallback(false);
    setLoading(true);

    if (!isAssistantAvailable()) {
      if (id === reqIdRef.current) {
        setText(fallbackText());
        setUsedFallback(true);
        setLoading(false);
      }
      return;
    }

    try {
      await streamQuestionHelp(
        { topic, question, prompt, options, userPickLabel, correctLabel, mode: m },
        (t) => {
          if (id === reqIdRef.current) setText(t);
        },
      );
      if (id === reqIdRef.current) setLoading(false);
    } catch {
      if (id === reqIdRef.current) {
        setText(fallbackText());
        setUsedFallback(true);
        setLoading(false);
      }
    }
  };

  const pose = mode ? pipExplaining : pipIdle;

  return (
    <div className="mt-5 flex items-start gap-2 sm:gap-3">
      {/* Pip — a free-floating character that swoops in and hovers (no box) */}
      <div className="animate-pip-fly relative shrink-0">
        {/* magical glow */}
        <div
          aria-hidden
          className="animate-glow absolute inset-1 z-0 rounded-full bg-gradient-to-br from-primary/55 via-accent/40 to-cyan/40 blur-2xl"
        />
        {/* one-shot sparkle burst on arrival (hidden at rest) */}
        <div aria-hidden className="animate-pip-burst pointer-events-none absolute inset-0 z-20 opacity-0">
          {BURST.map((b, i) => (
            <span key={i} className="absolute text-sm" style={{ top: b.top, left: b.left }}>
              {b.ch}
            </span>
          ))}
        </div>
        <img
          src={pose}
          alt={`${name}, your magical helper`}
          className="animate-bob relative z-10 h-24 w-24 select-none object-contain drop-shadow-[0_10px_18px_rgba(124,58,237,0.35)] sm:h-28 sm:w-28"
          style={{ animationDelay: '0.72s' }}
          draggable={false}
        />
        {/* ambient floating sparkles */}
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            aria-hidden
            className={`animate-bob pointer-events-none absolute z-20 ${s.size}`}
            style={{ top: s.top, left: s.left, animationDelay: s.delay }}
          >
            {s.ch}
          </span>
        ))}
      </div>

      {/* Speech bubble — unboxed, with a little tail pointing back at Pip */}
      <div className="animate-bubble-in relative mt-2 min-w-0 flex-1">
        <div
          aria-hidden
          className="absolute -left-1.5 top-5 h-3.5 w-3.5 rotate-45 rounded-[3px] bg-surface shadow-[-2px_2px_3px_rgba(124,58,237,0.06)]"
        />
        <div className="relative rounded-2xl bg-surface p-3 shadow-xl ring-1 ring-primary/15 sm:p-3.5">
          {mode === null ? (
            <>
              <p className="text-sm font-semibold text-text">
                Not quite — but mistakes are how the magic happens! ✨ Want a hand from {name}?
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => requestHelp('hint')}
                  className="btn-pop rounded-full bg-primary px-4 py-1.5 text-sm font-display font-bold text-white"
                >
                  ✨ Give me a hint
                </button>
                <button
                  onClick={() => requestHelp('explain')}
                  className="btn-pop rounded-full border-2 border-primary/30 bg-surface px-4 py-1.5 text-sm font-display font-bold text-primary"
                >
                  📖 Explain it
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary">
                <span aria-hidden>{mode === 'hint' ? '✨' : '📖'}</span>
                {name}&apos;s {mode === 'hint' ? 'hint' : 'explanation'}
                {usedFallback && (
                  <span className="ml-1 rounded-full bg-amber/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                    offline tip
                  </span>
                )}
              </p>

              {loading && !text ? (
                <p className="mt-1 animate-pulse text-sm text-text-muted">
                  {name} is conjuring up some help… ✨
                </p>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text" aria-live="polite">
                  {text}
                  {loading && <span className="ml-0.5 animate-pulse">▍</span>}
                </p>
              )}

              {!loading && (
                <button
                  onClick={() => requestHelp(mode === 'hint' ? 'explain' : 'hint')}
                  className="mt-2 text-xs font-semibold text-primary underline hover:text-primary-dark"
                >
                  {mode === 'hint' ? 'Explain it fully →' : 'Just a quick hint →'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
