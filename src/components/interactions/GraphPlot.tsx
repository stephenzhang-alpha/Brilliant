import { useState, useRef, useCallback, useEffect } from 'react';
import { GraphConfig } from '../../types';

interface Props {
  config: GraphConfig;
  onSubmit: (answer: { slope: number; intercept: number }) => void;
  disabled?: boolean;
}

export function GraphPlot({ config, onSubmit, disabled }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [point1, setPoint1] = useState({ x: 0, y: config.targetIntercept });
  const [point2, setPoint2] = useState({ x: 2, y: config.targetIntercept + config.targetSlope * 2 + 1 });
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null);

  const viewSize = 300;
  const padding = 30;
  const graphSize = viewSize - padding * 2;
  const [xMin, xMax] = config.xRange;
  const [yMin, yMax] = config.yRange;

  const toSvgX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * graphSize;
  const toSvgY = (y: number) => padding + ((yMax - y) / (yMax - yMin)) * graphSize;
  const fromSvgX = (sx: number) => xMin + ((sx - padding) / graphSize) * (xMax - xMin);
  const fromSvgY = (sy: number) => yMax - ((sy - padding) / graphSize) * (yMax - yMin);

  const snap = (val: number) => config.snapToGrid ? Math.round(val) : val;

  const slope = point2.x !== point1.x
    ? (point2.y - point1.y) / (point2.x - point1.x)
    : Infinity;
  const intercept = point1.y - slope * point1.x;

  const getClientPos = (e: MouseEvent | TouchEvent) => {
    if ('touches' in e) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const handlePointerDown = useCallback((point: 'p1' | 'p2') => {
    if (disabled) return;
    setDragging(point);
  }, [disabled]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!svgRef.current) return;
      const { clientX, clientY } = getClientPos(e);
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / rect.width) * viewSize;
      const svgY = ((clientY - rect.top) / rect.height) * viewSize;
      const mathX = snap(fromSvgX(svgX));
      const mathY = snap(fromSvgY(svgY));
      const clampedX = Math.max(xMin, Math.min(xMax, mathX));
      const clampedY = Math.max(yMin, Math.min(yMax, mathY));

      if (dragging === 'p1') {
        setPoint1({ x: clampedX, y: clampedY });
      } else {
        setPoint2({ x: clampedX, y: clampedY });
      }
    };

    const handleUp = () => setDragging(null);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, xMin, xMax, yMin, yMax]);

  const handleSubmit = () => {
    onSubmit({ slope: Math.round(slope * 100) / 100, intercept: Math.round(intercept * 100) / 100 });
  };

  const lineX1 = xMin;
  const lineY1 = slope * lineX1 + intercept;
  const lineX2 = xMax;
  const lineY2 = slope * lineX2 + intercept;

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <div className="bg-surface/50 rounded-2xl border border-white/10 p-4 inline-block">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewSize} ${viewSize}`}
            className="w-full max-w-[300px] h-auto touch-none"
          >
            {/* Grid lines */}
            {Array.from({ length: xMax - xMin + 1 }, (_, i) => xMin + i).map((x) => (
              <line
                key={`vg-${x}`}
                x1={toSvgX(x)} y1={padding} x2={toSvgX(x)} y2={viewSize - padding}
                stroke={x === 0 ? '#6366f1' : '#ffffff10'}
                strokeWidth={x === 0 ? 1.5 : 0.5}
              />
            ))}
            {Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i).map((y) => (
              <line
                key={`hg-${y}`}
                x1={padding} y1={toSvgY(y)} x2={viewSize - padding} y2={toSvgY(y)}
                stroke={y === 0 ? '#6366f1' : '#ffffff10'}
                strokeWidth={y === 0 ? 1.5 : 0.5}
              />
            ))}

            {/* Axis labels */}
            {Array.from({ length: xMax - xMin + 1 }, (_, i) => xMin + i).filter(x => x !== 0).map((x) => (
              <text key={`xl-${x}`} x={toSvgX(x)} y={toSvgY(0) + 14} textAnchor="middle" fill="#94a3b8" fontSize="8">{x}</text>
            ))}
            {Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i).filter(y => y !== 0).map((y) => (
              <text key={`yl-${y}`} x={toSvgX(0) - 12} y={toSvgY(y) + 3} textAnchor="middle" fill="#94a3b8" fontSize="8">{y}</text>
            ))}

            {/* User's line */}
            <line
              x1={toSvgX(lineX1)} y1={toSvgY(lineY1)}
              x2={toSvgX(lineX2)} y2={toSvgY(lineY2)}
              stroke="#818cf8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Draggable points */}
            <circle
              cx={toSvgX(point1.x)} cy={toSvgY(point1.y)}
              r={dragging === 'p1' ? 10 : 8}
              fill="#4f46e5"
              stroke="#818cf8"
              strokeWidth="2"
              className={!disabled ? 'cursor-grab active:cursor-grabbing' : ''}
              onMouseDown={() => handlePointerDown('p1')}
              onTouchStart={() => handlePointerDown('p1')}
            />
            <circle
              cx={toSvgX(point2.x)} cy={toSvgY(point2.y)}
              r={dragging === 'p2' ? 10 : 8}
              fill="#4f46e5"
              stroke="#818cf8"
              strokeWidth="2"
              className={!disabled ? 'cursor-grab active:cursor-grabbing' : ''}
              onMouseDown={() => handlePointerDown('p2')}
              onTouchStart={() => handlePointerDown('p2')}
            />
          </svg>
        </div>
      </div>

      {/* Live equation readout */}
      <div className="text-center">
        <span className="font-mono text-lg bg-surface-light/50 px-4 py-2 rounded-lg border border-white/10">
          y = {slope === Infinity ? '∞' : slope.toFixed(1)}x {intercept >= 0 ? '+' : '-'} {Math.abs(intercept).toFixed(1)}
        </span>
      </div>

      <div className="text-center text-xs text-text-muted">
        Point 1: ({point1.x}, {point1.y}) &nbsp; Point 2: ({point2.x}, {point2.y})
      </div>

      {!disabled && (
        <button
          onClick={handleSubmit}
          className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors"
        >
          Check Line
        </button>
      )}
    </div>
  );
}
