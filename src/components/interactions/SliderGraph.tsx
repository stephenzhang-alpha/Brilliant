import { useState } from 'react';
import type { SliderGraphConfig } from '../../types';

interface Props {
  config: SliderGraphConfig;
  onSubmit: (answer: { slope: number; intercept: number }) => void;
  disabled?: boolean;
}

// Spec Module 2: Parameterized Affine Geometries. Dragging the m and b sliders
// transforms the plotted line in real time (rotation for m, translation for b).
export function SliderGraph({ config, onSubmit, disabled }: Props) {
  const [m, setM] = useState(0);
  const [b, setB] = useState(0);

  const view = 300;
  const pad = 30;
  const size = view - pad * 2;
  const [xMin, xMax] = config.xRange;
  const [yMin, yMax] = config.yRange;
  const step = config.step ?? 0.5;
  const [mMin, mMax] = config.slopeRange ?? [-5, 5];
  const [bMin, bMax] = config.interceptRange ?? [yMin, yMax];

  const toX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * size;
  const toY = (y: number) => pad + ((yMax - y) / (yMax - yMin)) * size;

  const lineY = (slope: number, intercept: number, x: number) => slope * x + intercept;

  const userMatches =
    Math.abs(m - config.targetSlope) < 0.001 && Math.abs(b - config.targetIntercept) < 0.001;
  const close =
    Math.abs(m - config.targetSlope) <= step && Math.abs(b - config.targetIntercept) <= 1;

  const xs = Array.from({ length: xMax - xMin + 1 }, (_, i) => xMin + i);
  const ys = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="bg-surface/50 rounded-2xl border border-white/10 p-4">
          <svg viewBox={`0 0 ${view} ${view}`} className="w-full max-w-[300px] h-auto">
            {xs.map((x) => (
              <line
                key={`v${x}`}
                x1={toX(x)}
                y1={pad}
                x2={toX(x)}
                y2={view - pad}
                stroke={x === 0 ? '#6366f1' : '#ffffff10'}
                strokeWidth={x === 0 ? 1.5 : 0.5}
              />
            ))}
            {ys.map((y) => (
              <line
                key={`h${y}`}
                x1={pad}
                y1={toY(y)}
                x2={view - pad}
                y2={toY(y)}
                stroke={y === 0 ? '#6366f1' : '#ffffff10'}
                strokeWidth={y === 0 ? 1.5 : 0.5}
              />
            ))}

            {/* target line */}
            <line
              x1={toX(xMin)}
              y1={toY(lineY(config.targetSlope, config.targetIntercept, xMin))}
              x2={toX(xMax)}
              y2={toY(lineY(config.targetSlope, config.targetIntercept, xMax))}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="5 5"
              opacity="0.7"
            />

            {/* user line */}
            <line
              x1={toX(xMin)}
              y1={toY(lineY(m, b, xMin))}
              x2={toX(xMax)}
              y2={toY(lineY(m, b, xMax))}
              stroke={userMatches ? '#10b981' : '#818cf8'}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx={toX(0)} cy={toY(b)} r="5" fill="#4f46e5" stroke="#818cf8" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <div className="text-center">
        <span className="font-mono text-lg bg-surface-light/50 px-4 py-2 rounded-lg border border-white/10">
          y = {m}x {b >= 0 ? '+' : '−'} {Math.abs(b)}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>slope m</span>
            <span>{m}</span>
          </div>
          <input
            type="range"
            min={mMin}
            max={mMax}
            step={step}
            value={m}
            disabled={disabled}
            onChange={(e) => setM(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>intercept b</span>
            <span>{b}</span>
          </div>
          <input
            type="range"
            min={bMin}
            max={bMax}
            step={1}
            value={b}
            disabled={disabled}
            onChange={(e) => setB(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </div>

      <div className="text-center text-xs">
        <span className={close ? 'text-warning' : 'text-text-muted'}>
          {userMatches ? 'Perfect overlap!' : close ? 'Very close — fine-tune the sliders' : 'Match the dashed target line'}
        </span>
      </div>

      {!disabled && (
        <button
          onClick={() => onSubmit({ slope: m, intercept: b })}
          className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors"
        >
          Check Line
        </button>
      )}
    </div>
  );
}
