interface Props {
  label: string;
  kind: 'const' | 'var';
  negative?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  ghost?: boolean;
  highlight?: boolean;
  splittable?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onSplit?: () => void;
}

export function WeightToken({
  label,
  kind,
  negative,
  draggable,
  dragging,
  ghost,
  highlight,
  splittable,
  onPointerDown,
  onSplit,
}: Props) {
  const base =
    kind === 'var'
      ? 'bg-primary/30 border-primary-light text-primary-light'
      : negative
        ? 'bg-error/20 border-error/50 text-error'
        : 'bg-surface-light border-white/25 text-text';

  return (
    <div className="relative">
      <div
        onPointerDown={onPointerDown}
        role={draggable ? 'button' : undefined}
        aria-label={draggable ? `weight ${label}` : undefined}
        tabIndex={draggable ? 0 : undefined}
        className={`relative flex items-center justify-center min-w-[2.6rem] h-11 px-3 rounded-xl border-2 font-mono font-bold text-lg select-none
          ${base}
          ${ghost ? 'opacity-40 border-dashed' : ''}
          ${dragging ? 'opacity-30' : ''}
          ${highlight ? 'ring-4 ring-warning/60 animate-pulse' : ''}
          ${draggable ? 'cursor-grab active:cursor-grabbing touch-none shadow-lg shadow-black/30' : ''}
        `}
        style={{ touchAction: draggable ? 'none' : undefined }}
      >
        {label}
      </div>
      {splittable && onSplit && (
        <button
          onClick={onSplit}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-warning text-bg text-xs font-bold flex items-center justify-center shadow-md hover:scale-110 transition-transform"
          title="Split this weight"
          aria-label="Split this weight"
        >
          ✂
        </button>
      )}
    </div>
  );
}
