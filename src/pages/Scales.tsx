import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BalanceScale } from '../components/balance/BalanceScale';
import { ConceptCheck } from '../components/quiz/ConceptCheck';
import { EQUATION_QUESTIONS } from '../content/quizQuestions';
import { useOverallStore } from '../stores/overallStore';

/** Page background — a "scale" gradient: teal (level) → indigo → amber (tipping). */
const BG = 'linear-gradient(165deg, #0f766e 0%, #4338ca 50%, #b45309 100%)';

/** How many concept checks gate progress before the Balance game (first three). */
const N = 3;

/**
 * Page 6 (index 5) — Equations & Inequalities intro. A balanced scale means the
 * two sides are EQUAL (an equation); when it tips, one side is greater (an
 * inequality). The player scrubs x and watches a live balance react
 * (2x + 3 vs x + 7, level at x = 4) to build intuition, then a short
 * concept-check sequence gates progress and routes into the Balance game.
 */
export function ScalesPage() {
  const navigate = useNavigate();
  const completeStage = useOverallStore((s) => s.completeStage);

  // The single source of truth for the interactive scale, kept in 0..10.
  const [x, setX] = useState(2);
  const setXClamped = (v: number) =>
    setX(Math.max(0, Math.min(10, Number.isFinite(v) ? Math.round(v) : 0)));

  const left = 2 * x + 3;
  const right = x + 7;
  const balanced = left === right;

  const caption = balanced
    ? 'Balanced! 2x + 3 = x + 7 — that is an EQUATION (true when x = 4)'
    : left > right
      ? '2x + 3 > x + 7 — the left side is greater (an inequality)'
      : '2x + 3 < x + 7 — the right side is greater (an inequality)';

  // Concept-check sequence: walk through N questions, then unlock + route on.
  const [i, setI] = useState(0);
  const quiz = EQUATION_QUESTIONS[i];
  const advance = () => {
    if (i < N - 1) {
      setI(i + 1);
    } else {
      completeStage(5);
      navigate('/balance');
    }
  };

  return (
    <div className="relative flex-1 overflow-hidden text-white" style={{ background: BG }}>
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-full bg-white/15 px-4 py-1 text-xs font-extrabold uppercase tracking-[0.25em] text-white/90 backdrop-blur">
            Stage 6 · Equations &amp; Inequalities
          </span>
          <h1 className="mt-4 font-display text-4xl font-black sm:text-6xl">
            <span className="bg-gradient-to-r from-teal-200 via-indigo-200 to-amber-200 bg-clip-text text-transparent">
              Equations &amp; Inequalities
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
            A <span className="font-bold text-white">balanced</span> scale means the two sides are{' '}
            <span className="font-bold text-emerald-200">equal</span> — that&apos;s an{' '}
            <span className="font-bold text-white">equation</span>. When it{' '}
            <span className="font-bold text-amber-200">tips</span>, one side is greater — that&apos;s
            an <span className="font-bold text-white">inequality</span>.
          </p>
        </div>

        {/* Concept chips */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="font-mono text-lg font-bold text-emerald-200">=</p>
            <p className="mt-1 text-sm text-white/80">
              a <b>level</b> scale — both sides are equal (an <b>equation</b>)
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="font-mono text-lg font-bold text-amber-200">{'>'} {'<'}</p>
            <p className="mt-1 text-sm text-white/80">
              a <b>tipped</b> scale — one side is greater (an <b>inequality</b>)
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="font-mono text-lg font-bold text-cyan-200">x</p>
            <p className="mt-1 text-sm text-white/80">
              the value of x that <b>levels</b> the scale is the <b>solution</b>
            </p>
          </div>
        </div>

        {/* Live balance playground */}
        <div className="mt-6 rounded-3xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur sm:p-6">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-white/70">
            Tip &amp; balance
          </p>
          <p className="mt-1 text-sm text-white/70">
            Change x and watch the scale react. Can you{' '}
            <b className="text-white">find the x that balances it</b>?
          </p>

          <div className="mt-4">
            <BalanceScale
              left={left}
              right={right}
              leftLabel="2x + 3"
              rightLabel="x + 7"
              xValue={x}
              leftBlocks={{ xCount: 2, units: 3 }}
              rightBlocks={{ xCount: 1, units: 7 }}
            />
          </div>

          {/* Live relation readout, in words */}
          <p
            className={[
              'mt-2 rounded-2xl px-4 py-3 text-center font-display text-base font-extrabold sm:text-lg',
              balanced
                ? 'bg-emerald-400/20 text-emerald-100 animate-bob'
                : 'bg-amber-400/15 text-amber-100',
            ].join(' ')}
          >
            {caption}
          </p>

          {/* Controls — a slider AND a number input, both driving the one x state */}
          <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_auto]">
            <label className="block text-sm">
              <span className="font-semibold text-white/85">x = {x}</span>
              <input
                type="range"
                min={0}
                max={10}
                value={x}
                onChange={(e) => setXClamped(Number(e.target.value))}
                aria-label="x value (slider)"
                className="mt-1 w-full cursor-pointer accent-teal-300"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-white/85">type a value</span>
              <input
                type="number"
                min={0}
                max={10}
                value={x}
                onChange={(e) => setXClamped(Number(e.target.value))}
                aria-label="x value (number)"
                className="mt-1 w-24 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-center font-mono text-lg font-bold text-white outline-none focus:border-teal-200 focus:ring-2 focus:ring-teal-300/40"
              />
            </label>
          </div>
        </div>

        {/* Gating concept-check sequence */}
        <div className="mt-8 rounded-3xl bg-surface p-5 text-text shadow-2xl shadow-black/30 sm:p-7">
          <ConceptCheck
            key={i}
            {...quiz}
            badge={`Concept check ${i + 1} of ${N}`}
            ctaLabel={i < N - 1 ? 'Next question →' : 'Enter the Balance Game →'}
            onCorrect={advance}
            topic="equations and inequalities"
          />
        </div>
      </div>
    </div>
  );
}
