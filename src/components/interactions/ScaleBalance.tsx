import { useState, useEffect, useRef } from 'react';
import { ScaleConfig, ScaleItem, ScaleOperation } from '../../types';

interface Props {
  config: ScaleConfig;
  onSubmit: (answer: number) => void;
  disabled?: boolean;
}

export function ScaleBalance({ config, onSubmit, disabled }: Props) {
  const [leftItems, setLeftItems] = useState<ScaleItem[]>(config.leftItems);
  const [rightItems, setRightItems] = useState<ScaleItem[]>(config.rightItems);
  const [tilt, setTilt] = useState(0);
  const [appliedOps, setAppliedOps] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const animRef = useRef<number>(0);
  const targetTiltRef = useRef(0);
  const currentTiltRef = useRef(0);

  useEffect(() => {
    setLeftItems(config.leftItems);
    setRightItems(config.rightItems);
    setAppliedOps([]);
    setSolved(false);
  }, [config]);

  useEffect(() => {
    const leftTotal = leftItems.reduce((s, i) => s + i.value, 0);
    const rightTotal = rightItems.reduce((s, i) => s + i.value, 0);
    const diff = leftTotal - rightTotal;
    targetTiltRef.current = Math.max(-15, Math.min(15, diff * 3));
  }, [leftItems, rightItems]);

  useEffect(() => {
    const animate = () => {
      const target = targetTiltRef.current;
      const current = currentTiltRef.current;
      const next = current + (target - current) * 0.1;
      currentTiltRef.current = next;
      setTilt(next);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const applyOperation = (op: ScaleOperation) => {
    if (disabled || solved) return;

    setAppliedOps((prev) => [...prev, op.label]);

    const applyToItems = (items: ScaleItem[]): ScaleItem[] => {
      switch (op.type) {
        case 'add':
          return items.map((item) => {
            if (item.isVariable) return item;
            return { ...item, value: item.value + op.value, label: String(item.value + op.value) };
          });
        case 'subtract':
          return items.map((item) => {
            if (item.isVariable) return item;
            return { ...item, value: item.value - op.value, label: String(item.value - op.value) };
          });
        case 'multiply':
          return items.map((item) => {
            if (item.isVariable) return item;
            return { ...item, value: item.value * op.value, label: String(item.value * op.value) };
          });
        case 'divide':
          return items.map((item) => {
            if (item.isVariable) return item;
            return { ...item, value: item.value / op.value, label: String(item.value / op.value) };
          });
        default:
          return items;
      }
    };

    const newLeft = applyToItems(leftItems);
    const newRight = applyToItems(rightItems);

    const cleanLeft = newLeft.filter((i) => i.isVariable || i.value !== 0);
    const cleanRight = newRight.filter((i) => i.isVariable || i.value !== 0);

    setLeftItems(cleanLeft.length > 0 ? cleanLeft : [{ id: '0', label: '0', value: 0 }]);
    setRightItems(cleanRight.length > 0 ? cleanRight : [{ id: '0', label: '0', value: 0 }]);

    const onlyVarLeft = cleanLeft.length === 1 && cleanLeft[0].isVariable;
    const onlyVarRight = cleanRight.length === 1 && cleanRight[0].isVariable;

    if (onlyVarLeft) {
      const rightVal = cleanRight.reduce((s, i) => s + i.value, 0);
      setSolved(true);
      setTimeout(() => onSubmit(rightVal), 500);
    } else if (onlyVarRight) {
      const leftVal = cleanLeft.reduce((s, i) => s + i.value, 0);
      setSolved(true);
      setTimeout(() => onSubmit(leftVal), 500);
    }
  };

  const leftTotal = leftItems.reduce((s, i) => s + i.value, 0);
  const rightTotal = rightItems.reduce((s, i) => s + i.value, 0);
  const isBalanced = Math.abs(leftTotal - rightTotal) < 0.01;

  return (
    <div className="space-y-6">
      {/* Scale visualization */}
      <div className="relative h-64 flex items-center justify-center">
        <svg viewBox="0 0 400 200" className="w-full max-w-md h-full">
          {/* Fulcrum / Triangle base */}
          <polygon points="200,180 185,160 215,160" fill="#4f46e5" />
          <rect x="195" y="155" width="10" height="10" fill="#4f46e5" />

          {/* Beam */}
          <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: '200px 145px', transition: 'none' }}>
            <rect x="50" y="140" width="300" height="8" rx="4" fill="#818cf8" />

            {/* Left pan */}
            <rect x="60" y="148" width="80" height="4" rx="2" fill="#6366f1" />
            <rect x="65" y="152" width="70" height="35" rx="6" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
            {leftItems.map((item, i) => (
              <text
                key={item.id}
                x={100}
                y={170 + i * 14}
                textAnchor="middle"
                fill={item.isVariable ? '#818cf8' : '#f8fafc'}
                fontSize="12"
                fontWeight="bold"
              >
                {item.label}
              </text>
            ))}

            {/* Right pan */}
            <rect x="260" y="148" width="80" height="4" rx="2" fill="#6366f1" />
            <rect x="265" y="152" width="70" height="35" rx="6" fill="#1e1b4b" stroke="#6366f1" strokeWidth="2" />
            {rightItems.map((item, i) => (
              <text
                key={item.id}
                x={300}
                y={170 + i * 14}
                textAnchor="middle"
                fill={item.isVariable ? '#818cf8' : '#f8fafc'}
                fontSize="12"
                fontWeight="bold"
              >
                {item.label}
              </text>
            ))}
          </g>

          {/* Balance indicator */}
          <circle cx="200" cy="130" r="8" fill={isBalanced ? '#10b981' : '#f59e0b'} />
        </svg>
      </div>

      {/* Status */}
      <div className="text-center">
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${isBalanced ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
          {isBalanced ? 'Balanced!' : 'Unbalanced'}
        </span>
      </div>

      {/* Operations */}
      {!solved && !disabled && (
        <div className="space-y-2">
          <p className="text-sm text-text-muted text-center">Apply an operation to both sides:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {config.availableOperations.map((op, i) => (
              <button
                key={i}
                onClick={() => applyOperation(op)}
                className="px-4 py-2 bg-surface-light border border-white/20 rounded-lg text-sm font-medium hover:border-primary-light hover:bg-primary/10 transition-all active:scale-95"
              >
                {op.label}
              </button>
            ))}
          </div>
          {appliedOps.length > 0 && (
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  setLeftItems(config.leftItems);
                  setRightItems(config.rightItems);
                  setAppliedOps([]);
                }}
                className="text-xs text-text-muted underline hover:text-text transition-colors"
              >
                Reset scale
              </button>
            </div>
          )}
        </div>
      )}

      {/* Applied operations log */}
      {appliedOps.length > 0 && (
        <div className="text-xs text-text-muted text-center">
          Steps: {appliedOps.join(' → ')}
        </div>
      )}

      {solved && (
        <div className="text-center text-success font-medium py-2 animate-pulse">
          Scale balanced! Variable isolated.
        </div>
      )}
    </div>
  );
}
