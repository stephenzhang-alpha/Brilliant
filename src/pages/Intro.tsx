import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConceptCheck } from '../components/quiz/ConceptCheck';
import { VARIABLE_QUESTIONS } from '../content/quizQuestions';
import { useOverallStore } from '../stores/overallStore';

const HERO_BG = 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 45%, #9d174d 100%)';

// Decorative math glyphs that float behind the hero (purely cosmetic flash).
const FLOATERS: { ch: string; left: string; top: string; delay: string; size: string }[] = [
  { ch: 'x', left: '7%', top: '16%', delay: '0s', size: 'text-6xl' },
  { ch: '+', left: '88%', top: '12%', delay: '0.5s', size: 'text-5xl' },
  { ch: 'y', left: '80%', top: '62%', delay: '1.1s', size: 'text-7xl' },
  { ch: '=', left: '14%', top: '70%', delay: '0.8s', size: 'text-5xl' },
  { ch: 'n', left: '46%', top: '8%', delay: '1.4s', size: 'text-4xl' },
  { ch: 'π', left: '30%', top: '52%', delay: '0.3s', size: 'text-5xl' },
];

/**
 * Page 0 — the landing + intro to variables. There is no game here, so it leans
 * on motion and color: an animated gradient hero, floating glyphs, a live
 * "drag the variable" demo, and a gating concept check. Answering it correctly
 * unlocks and routes to the Dino run.
 */
export function IntroPage() {
  const navigate = useNavigate();
  const completeStage = useOverallStore((s) => s.completeStage);
  const [x, setX] = useState(3);

  const onPass = () => {
    completeStage(0);
    navigate('/dino');
  };

  const quiz = VARIABLE_QUESTIONS[0];

  return (
    <div className="relative flex-1 overflow-hidden text-white" style={{ background: HERO_BG }}>
      {/* Floating glyphs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {FLOATERS.map((f, i) => (
          <span
            key={i}
            className={`absolute font-display font-black text-white/10 animate-bob ${f.size}`}
            style={{ left: f.left, top: f.top, animationDelay: f.delay }}
          >
            {f.ch}
          </span>
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        {/* Hero */}
        <div className="text-center">
          <span className="inline-block rounded-full bg-white/15 px-4 py-1 text-xs font-extrabold uppercase tracking-[0.25em] text-white/90 backdrop-blur">
            Stage 1 · Algebra
          </span>
          <h1 className="relative mt-4 font-display text-5xl font-black leading-none sm:text-7xl">
            <span className="bg-gradient-to-r from-amber-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
              Algebra Quest
            </span>
            <span className="animate-shimmer pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85 sm:text-xl">
            A seven-stage adventure through algebra — play games, beat bosses, and master{' '}
            <span className="font-bold text-white">variables, expressions &amp; equations</span> along
            the way.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            {['🔢 Variables', '🦖 Dino Run', '🧩 Expressions', '🚪 Gate Runner', '📌 Pull the Pins', '⚖️ Equations & Inequalities', '🎯 Balance Game'].map(
              (s, i) => (
                <span
                  key={s}
                  className="rounded-full bg-white/10 px-3 py-1 font-display font-semibold text-white/80 backdrop-blur"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {s}
                </span>
              ),
            )}
          </div>
        </div>

        {/* Live "drag the variable" demo */}
        <div className="mt-10 rounded-3xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur sm:p-6">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-white/70">
            Meet your first variable
          </p>
          <p className="mt-2 text-white/85">
            A <span className="font-bold text-amber-200">variable</span> is a{' '}
            <span className="font-semibold text-white">letter that stands for a number</span> — often
            one we do not know yet. We write it as a letter like{' '}
            <span className="font-mono font-bold text-cyan-200">x</span>, and it can stand for
            different values. Drag the slider to set{' '}
            <span className="font-mono font-bold text-cyan-200">x</span>:
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-black/25 px-4 py-3 text-center">
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-cyan-200">x</p>
              <p className="font-mono text-4xl font-black tabular-nums">{x}</p>
              <p className="text-xs text-white/60">the variable</p>
            </div>
            <div className="rounded-2xl bg-black/25 px-4 py-3 text-center">
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-pink-200">
                x + 5
              </p>
              <p className="font-mono text-4xl font-black tabular-nums">{x + 5}</p>
              <p className="text-xs text-white/60">changes with x</p>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={20}
            value={x}
            onChange={(e) => setX(Number(e.target.value))}
            aria-label="Drag to set the variable x"
            className="mt-4 w-full cursor-pointer accent-amber-300"
          />
          <p className="mt-1 text-center text-xs text-white/60">
            The same letter x can stand for different numbers — that is what makes it a variable.
          </p>
        </div>

        {/* Gating concept check */}
        <div className="mt-8 rounded-3xl bg-surface p-5 text-text shadow-2xl shadow-black/30 sm:p-7">
          <ConceptCheck
            badge="Quick check to begin"
            question={quiz.question}
            prompt={quiz.prompt}
            options={quiz.options}
            columns={quiz.columns}
            ctaLabel="Start the Dino Run →"
            onCorrect={onPass}
            topic="variables"
          />
        </div>
      </div>
    </div>
  );
}
