import { useEffect, useRef, useState } from 'react';
import pipIdle from '../../assets/assistant/pip-idle.webp';
import pipExplaining from '../../assets/assistant/pip-explaining.webp';
import { isAssistantAvailable, generateQuestionHelp, type AnswerMeta } from '../../firebase/ai';
import { useAssistantStore } from '../../stores/assistantStore';

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
  /**
   * The authored, known-correct explanation for this wrong pick. Shown FIRST
   * (deterministic), and used to ground the optional AI re-explanation.
   */
  fallback?: string;
  /** Optional data-driven ground truth, forwarded to the AI verifier. */
  answer?: AnswerMeta;
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

type AiState = 'idle' | 'loading' | 'done' | 'error';

/**
 * "Pip", a magical star-spirit assistant. When a student answers a concept check
 * wrong, Pip swoops in from the side (sparkle trail), bursts a ring of sparkles
 * as it lands, then hovers — untethered, no box — beside a tailed speech bubble.
 *
 * Help is DETERMINISTIC-FIRST: Pip immediately shows the authored, known-correct
 * tip for this wrong pick. Only if the student taps "Explain another way" do we
 * call the live AI (Gemini) — and that call is grounded in the authored tip, so
 * it just rephrases the same correct idea (no made-up math). If the AI is
 * unavailable the button is simply hidden; the authored tip always stands.
 */
export function MagicAssistant({
  topic,
  question,
  prompt,
  options,
  userPickLabel,
  correctLabel,
  fallback,
  answer,
  name = 'Pip',
}: MagicAssistantProps) {
  const authored =
    fallback ??
    `Take another look${topic ? ` at ${topic}` : ''} — you've got this! Try a different answer.`;
  const aiAvailable = isAssistantAvailable();

  const [aiState, setAiState] = useState<AiState>('idle');
  const [aiText, setAiText] = useState('');

  // Each request gets an id so a newer request supersedes an older in-flight
  // one's late update. The student can also answer correctly mid-request, which
  // unmounts us (we only render for a wrong pick) — so track mount state and
  // abort the Gemini call on unmount instead of burning tokens / setting state
  // on an unmounted component.
  const reqIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  // While we're mounted, Pip is "away" from her logo seat (down here helping).
  const enter = useAssistantStore((s) => s.enter);
  const leave = useAssistantStore((s) => s.leave);
  useEffect(() => {
    mountedRef.current = true;
    enter();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      leave();
    };
  }, [enter, leave]);

  // Validate-then-reveal: keep the "Pip is thinking…" shimmer up while we await
  // the FULL, verified text — we never paint token-by-token unverified output.
  // If generation or deterministic verification fails, we surface the graceful
  // fallback note (the authored tip above always stands).
  const explainAnotherWay = async () => {
    const id = ++reqIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiText('');
    setAiState('loading');

    try {
      const validated = await generateQuestionHelp(
        { topic, question, prompt, options, userPickLabel, correctLabel, authoredExplanation: authored, answer },
        controller.signal,
      );
      if (mountedRef.current && id === reqIdRef.current) {
        setAiText(validated);
        setAiState('done');
      }
    } catch {
      if (mountedRef.current && id === reqIdRef.current) setAiState('error');
    }
  };

  const pose = aiState === 'idle' ? pipIdle : pipExplaining;

  return (
    <div className="mt-5 flex items-start gap-2 sm:gap-3">
      {/* Pip — drops down from her logo seat and hovers (no box) */}
      <div className="animate-pip-drop relative shrink-0">
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
          {/* Deterministic, always-correct tip (shown immediately) */}
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary">
            <span aria-hidden>✨</span>
            {name}&apos;s tip
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text">{authored}</p>

          {/* Optional AI re-explanation, grounded in the tip above */}
          {aiState !== 'idle' && (
            <div className="mt-2.5 border-t border-black/5 pt-2">
              <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-accent">
                <span aria-hidden>🔮</span>
                Another way
              </p>
              {aiState === 'error' ? (
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  Hmm, I couldn&apos;t dream up another way just now — but the tip above still holds.
                  Give it another try! ✨
                </p>
              ) : aiState === 'loading' ? (
                <p className="mt-1 animate-pulse text-sm text-text-muted">
                  {name} is thinking of another way… ✨
                </p>
              ) : (
                <p
                  className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-text"
                  aria-live="polite"
                >
                  {aiText}
                </p>
              )}
            </div>
          )}

          {/* Escalate to the live AI only on request */}
          {aiAvailable && aiState !== 'loading' && (
            <button
              onClick={explainAnotherWay}
              className="btn-pop mt-2.5 rounded-full bg-primary px-4 py-1.5 text-sm font-display font-bold text-white"
            >
              {aiState === 'idle' ? '🔮 Explain another way' : '🔮 Try another way'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
