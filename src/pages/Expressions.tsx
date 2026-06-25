import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConceptCheck } from '../components/quiz/ConceptCheck';
import { EXPRESSION_QUESTIONS } from '../content/quizQuestions';
import { useOverallStore } from '../stores/overallStore';

const BG = 'linear-gradient(165deg, #0c4a6e 0%, #5b21b6 50%, #9d174d 100%)';

/** Format a·x + b like a textbook: hide a=1 and b=0, show negatives with a minus. */
function fmtExpr(a: number, b: number): string {
  const ax = a === 1 ? 'x' : `${a}x`;
  if (b === 0) return ax;
  return b > 0 ? `${ax} + ${b}` : `${ax} − ${Math.abs(b)}`;
}

/**
 * Page 2 — intro to expressions. Teaches what an expression is, combining like
 * terms, and evaluating ax + b (the exact mechanic the upcoming Gate Runner is
 * built on), with a live "build & evaluate" playground. A gating concept check
 * unlocks and routes to Gate Runner.
 */
export function ExpressionsPage() {
  const navigate = useNavigate();
  const completeStage = useOverallStore((s) => s.completeStage);
  const [a, setA] = useState(3);
  const [x, setX] = useState(4);
  const [b, setB] = useState(5);

  const onPass = () => {
    completeStage(2);
    navigate('/gates');
  };

  const quiz = EXPRESSION_QUESTIONS[0];
  const value = a * x + b;

  return (
    <div className="relative flex-1 overflow-hidden text-white" style={{ background: BG }}>
      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <div className="text-center">
          <span className="inline-block rounded-full bg-white/15 px-4 py-1 text-xs font-extrabold uppercase tracking-[0.25em] text-white/90 backdrop-blur">
            Stage 3 · Expressions
          </span>
          <h1 className="mt-4 font-display text-4xl font-black sm:text-6xl">
            <span className="bg-gradient-to-r from-cyan-300 via-violet-200 to-pink-300 bg-clip-text text-transparent">
              Expressions
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
            An <span className="font-bold text-white">expression</span> combines variables and
            numbers with operations — like{' '}
            <span className="font-mono font-bold text-cyan-200">3x + 5</span>. There&apos;s no equals
            sign; it just describes a value.
          </p>
        </div>

        {/* Concept chips */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="font-mono text-lg font-bold text-cyan-200">x</p>
            <p className="mt-1 text-sm text-white/80">
              the <b>variable</b> — a value that can change
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="font-mono text-lg font-bold text-emerald-200">3x</p>
            <p className="mt-1 text-sm text-white/80">
              a <b>coefficient</b> times x — combine like terms (3x + 2x = 5x)
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
            <p className="font-mono text-lg font-bold text-amber-200">+ 5</p>
            <p className="mt-1 text-sm text-white/80">
              a <b>constant</b> — a plain number added on
            </p>
          </div>
        </div>

        {/* Live build & evaluate playground */}
        <div className="mt-6 rounded-3xl bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur sm:p-6">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-white/70">
            Build &amp; evaluate
          </p>
          <p className="mt-2 text-center font-mono text-3xl font-black sm:text-4xl">
            {fmtExpr(a, b)}{' '}
            <span className="text-white/60">when x = {x}</span>{' '}
            <span className="text-emerald-300">= {value}</span>
          </p>
          <p className="mt-1 text-center text-sm text-white/70">
            Multiply first: {a} × {x} = {a * x}, then {b >= 0 ? `add ${b}` : `subtract ${Math.abs(b)}`}{' '}
            → <b className="text-emerald-200">{value}</b>
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-semibold text-white/85">coefficient a = {a}</span>
              <input
                type="range"
                min={1}
                max={5}
                value={a}
                onChange={(e) => setA(Number(e.target.value))}
                className="mt-1 w-full cursor-pointer accent-emerald-300"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-white/85">variable x = {x}</span>
              <input
                type="range"
                min={0}
                max={9}
                value={x}
                onChange={(e) => setX(Number(e.target.value))}
                className="mt-1 w-full cursor-pointer accent-cyan-300"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-white/85">constant b = {b}</span>
              <input
                type="range"
                min={0}
                max={9}
                value={b}
                onChange={(e) => setB(Number(e.target.value))}
                className="mt-1 w-full cursor-pointer accent-amber-300"
              />
            </label>
          </div>
        </div>

        {/* Gating concept check */}
        <div className="mt-8 rounded-3xl bg-surface p-5 text-text shadow-2xl shadow-black/30 sm:p-7">
          <ConceptCheck
            badge="Concept check"
            question={quiz.question}
            prompt={quiz.prompt}
            options={quiz.options}
            columns={quiz.columns}
            ctaLabel="Enter Gate Runner →"
            onCorrect={onPass}
          />
        </div>
      </div>
    </div>
  );
}
