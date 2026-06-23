import type { VisualId } from '../../../types';

interface Props {
  visual: VisualId;
  params?: Record<string, unknown>;
}

const num = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function VisualExplanation({ visual, params }: Props) {
  if (visual === 'sign-flip') {
    const value = num(params?.value, 5);
    return (
      <div className="flex items-center justify-center gap-3 py-3">
        <span className="px-3 py-2 rounded-lg bg-surface-light border border-white/20 font-mono font-bold">
          +{value}
        </span>
        <div className="flex flex-col items-center text-text-muted">
          <span className="text-2xl leading-none">↷</span>
          <span className="text-[10px]">cross =</span>
        </div>
        <span className="text-xl font-bold text-text-muted">=</span>
        <span className="px-3 py-2 rounded-lg bg-error/20 border border-error/50 text-error font-mono font-bold animate-pulse">
          −{value}
        </span>
      </div>
    );
  }

  if (visual === 'balance-tip') {
    return (
      <div className="flex justify-center py-2">
        <svg viewBox="0 0 160 70" className="w-40">
          <polygon points="80,60 70,46 90,46" fill="#4f46e5" />
          <g style={{ transform: 'rotate(-8deg)', transformOrigin: '80px 24px' }}>
            <rect x="20" y="20" width="120" height="6" rx="3" fill="#818cf8" />
            <rect x="22" y="26" width="26" height="16" rx="3" fill="#1e1b4b" stroke="#6366f1" />
            <rect x="112" y="26" width="26" height="16" rx="3" fill="#1e1b4b" stroke="#6366f1" />
          </g>
        </svg>
      </div>
    );
  }

  // rise-run
  const rise = num(params?.rise, 2);
  const run = num(params?.run, 1);
  return (
    <div className="flex justify-center py-2">
      <svg viewBox="0 0 120 90" className="w-32">
        <line x1="20" y1="70" x2="100" y2="20" stroke="#818cf8" strokeWidth="2.5" />
        <line x1="20" y1="70" x2="100" y2="70" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
        <line x1="100" y1="70" x2="100" y2="20" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
        <text x="60" y="84" textAnchor="middle" fill="#94a3b8" fontSize="9">
          run {run}
        </text>
        <text x="106" y="48" fill="#94a3b8" fontSize="9">
          rise {rise}
        </text>
      </svg>
    </div>
  );
}
