import { useNavigate } from 'react-router-dom';
import { GateRunner } from '../components/gates/GateRunner';
import { useOverallStore } from '../stores/overallStore';
import { LockedLesson } from '../components/LockedLesson';
import { GameShell } from '../components/GameShell';

const GATE_BG = 'linear-gradient(180deg, #7dd3fc 0%, #a78bfa 50%, #f0abfc 100%)';

export function GatesPage() {
  const navigate = useNavigate();
  const addOverall = useOverallStore((s) => s.add);
  const unlock = useOverallStore((s) => s.unlock);
  const gatesUnlocked = useOverallStore((s) => s.gatesUnlocked);

  if (!gatesUnlocked) {
    return (
      <GameShell bg={GATE_BG} maxWidth={520}>
        <LockedLesson
          lessonLabel="Stage 2 · Expressions"
          title="Gate Runner is locked"
          requirement="Play Dino Runner and finish a run to unlock this game."
          ctaLabel="▶ Play Dino Runner"
          ctaTo="/"
        />
      </GameShell>
    );
  }

  return (
    <GameShell
      bg={GATE_BG}
      maxWidth={460}
      footer={
        <div className="hidden sm:flex items-center justify-center gap-6 text-sm text-white/85">
          <span>
            <kbd className="px-2 py-0.5 bg-white/20 rounded">←</kbd>{' '}
            <kbd className="px-2 py-0.5 bg-white/20 rounded">→</kbd> Steer
          </span>
          <span>or drag across the track</span>
        </div>
      }
    >
      <GateRunner
        onFinish={(crowd) => {
          addOverall(crowd, 'gates');
          unlock('tower'); // finishing Expressions unlocks Stage 3
        }}
        onNext={() => navigate('/tower')}
        nextLabel="Next → Stage 3: Tower"
      />
    </GameShell>
  );
}
