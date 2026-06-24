import { useNavigate } from 'react-router-dom';
import { GateRunner } from '../components/gates/GateRunner';
import { useOverallStore } from '../stores/overallStore';
import { LockedLesson } from '../components/LockedLesson';

export function GatesPage() {
  const navigate = useNavigate();
  const addOverall = useOverallStore((s) => s.add);
  const unlock = useOverallStore((s) => s.unlock);
  const gatesUnlocked = useOverallStore((s) => s.gatesUnlocked);

  if (!gatesUnlocked) {
    return (
      <LockedLesson
        lessonLabel="Stage 2 · Expressions"
        title="Gate Runner is locked"
        requirement="Play Dino Runner and finish a run to unlock this game."
        ctaLabel="▶ Play Dino Runner"
        ctaTo="/"
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-6">
        <p className="text-xs font-bold tracking-[0.25em] text-text-muted uppercase">
          Stage 2 · Expressions
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
          Gate <span className="text-primary">Runner</span>
        </h1>
        <p className="text-text-muted mt-2">
          Pick the best gate at each step and grow your crowd to the finish line.
        </p>
      </div>

      <GateRunner
        onFinish={(crowd) => {
          addOverall(crowd, 'gates');
          unlock('tower'); // finishing Expressions unlocks Lesson 3
        }}
        onNext={() => navigate('/tower')}
        nextLabel="Next → Stage 3: Tower"
      />

      <div className="hidden sm:flex items-center justify-center gap-6 mt-4 text-sm text-text-muted">
        <span>
          <kbd className="px-2 py-0.5 bg-surface rounded border border-black/10 shadow-sm">←</kbd>{' '}
          <kbd className="px-2 py-0.5 bg-surface rounded border border-black/10 shadow-sm">→</kbd> Steer
        </span>
        <span>or drag across the track</span>
      </div>
    </div>
  );
}
