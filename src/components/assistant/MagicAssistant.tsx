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

const SPARKLES = [
  { ch: '✨', top: '-6%', left: '4%', delay: '0s', size: 'text-lg' },
  { ch: '⭐', top: '8%', left: '78%', delay: '0.4s', size: 'text-sm' },
  { ch: '✨', top: '64%', left: '-4%', delay: '0.8s', size: 'text-base' },
  { ch: '💫', top: '78%', left: '70%', delay: '0.2s', size: 'text-lg' },
];

/**
 * "Pip", a magical star-spirit assistant that pops in (sparkles + glow) when a
 * student answers a concept check wrong, and — on request — gives an AI hint or
 * explanation (streamed, typing-effect). If the live AI (Firebase AI Logic) is
 * unavailable or errors, it gracefully shows the authored `fallback` instead, so
 * it always helps.
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
    <div className="mt-4 animate-fadein">
      <div className="flex items-start gap-3 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-3 sm:p-4">
        {/* Mascot with glow + sparkles */}
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="animate-glow absolute inset-0 -z-0 rounded-full bg-gradient-to-br from-primary/50 via-accent/40 to-cyan/40 blur-xl"
          />
          <img
            src={pose}
            alt={`${name}, your magical helper`}
            className="animate-bob relative z-10 h-20 w-20 select-none object-contain sm:h-24 sm:w-24"
            draggable={false}
          />
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

        {/* Speech bubble */}
        <div className="min-w-0 flex-1">
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
