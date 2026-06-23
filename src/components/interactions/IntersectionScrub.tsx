import { useState } from 'react';
import type { IntersectionConfig } from '../../types';

interface Props {
  config: IntersectionConfig;
  onSubmit: (answer: number) => void;
  disabled?: boolean;
}

// Spec Module 3: Constraint Satisfaction. The learner scrubs x; a raycast hits
// both lines and a delta indicator |f(x) - g(x)| shrinks to zero at the solution.
export function IntersectionScrub({ config, onSubmit, disabled }: Props) {
  const { lineA, lineB, xRange, yRange, unitLabel } = config;
  const [x, setX] = useState(xRange[0]);

  const view = 300;
  const pad = 30;
  const size = view - pad * 2;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  const toX = (v: number) => pad + ((v - xMin) / (xMax - xMin)) * size;
  const toY = (v: number) => pad + ((yMax - v) / (yMax - yMin)) * size;

  const f = (v: number) => lineA.slope * v + lineA.intercept;
  const g = (v: number) => lineB.slope * v + lineB.intercept;
  const fx = f(x);
  const gx = g(x);
  const delta = Math.abs(fx - gx);
  const maxDelta = Math.max(Math.abs(f(xMin) - g(xMin)), Math.abs(f(xMax) - g(xMax)), 1);
  const deltaPct = Math.min(100, (delta / maxDelta) * 100);
  const atIntersection = delta < 0.25;

  const xs = Array.from({ length: xMax - xMin + 1 }, (_, i) => xMin + i);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="bg-surface/50 rounded-2xl border border-white/10 p-4">
          <svg viewBox={`0 0 ${view} ${view}`} className="w-full max-w-[300px] h-auto">
            {xs.map((v) => (
              <line
                key={`v${v}`}
                x1={toX(v)}
                y1={pad}
                x2={toX(v)}
                y2={view - pad}
                stroke={v === 0 ? '#6366f1' : '#ffffff10'}
                strokeWidth={v === 0 ? 1.5 : 0.5}
              />
            ))}

            {/* two model lines */}
            <line x1={toX(xMin)} y1={toY(f(xMin))} x2={toX(xMax)} y2={toY(f(xMax))} stroke="#818cf8" strokeWidth="2.5" />
            <line x1={toX(xMin)} y1={toY(g(xMin))} x2={toX(xMax)} y2={toY(g(xMax))} stroke="#f59e0b" strokeWidth="2.5" />

            {/* raycast */}
            <line x1={toX(x)} y1={pad} x2={toX(x)} y2={view - pad} stroke="#f8fafc" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <line
              x1={toX(x)}
              y1={toY(fx)}
              x2={toX(x)}
              y2={toY(gx)}
              stroke={atIntersection ? '#10b981' : '#ef4444'}
              strokeWidth="3"
            />
            <circle cx={toX(x)} cy={toY(fx)} r="5" fill="#818cf8" />
            <circle cx={toX(x)} cy={toY(gx)} r="5" fill="#f59e0b" />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-primary/10 rounded-lg p-2">
          <div className="text-primary-light font-medium">{lineA.label}</div>
          <div className="font-mono">{fx.toFixed(1)}</div>
        </div>
        <div className={`rounded-lg p-2 ${atIntersection ? 'bg-success/15' : 'bg-error/10'}`}>
          <div className={atIntersection ? 'text-success font-medium' : 'text-error font-medium'}>gap</div>
          <div className="font-mono">{delta.toFixed(1)}</div>
        </div>
        <div className="bg-warning/10 rounded-lg p-2">
          <div className="text-warning font-medium">{lineB.label}</div>
          <div className="font-mono">{gx.toFixed(1)}</div>
        </div>
      </div>

      <div className="h-2 bg-surface-light rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atIntersection ? 'bg-success' : 'bg-error'}`}
          style={{ width: `${100 - deltaPct}%` }}
        />
      </div>

      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>{unitLabel ?? 'x'}</span>
          <span>{x}</span>
        </div>
        <input
          type="range"
          min={xMin}
          max={xMax}
          step={0.5}
          value={x}
          disabled={disabled}
          onChange={(e) => setX(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>

      {!disabled && (
        <button
          onClick={() => onSubmit(x)}
          className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors"
        >
          Lock in the meeting point
        </button>
      )}
    </div>
  );
}
