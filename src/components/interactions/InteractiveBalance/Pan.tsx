import type { Chip, MirrorHint } from '../../../engine/balance/balanceState';
import { chipLabel } from '../../../engine/balance/balanceState';
import { WeightToken } from './WeightToken';

interface Props {
  zone: 'left' | 'right';
  chips: Chip[];
  panRef: (el: HTMLDivElement | null) => void;
  isHover: boolean;
  disabled: boolean;
  draggingId: string | null;
  mirror?: MirrorHint;
  onChipPointerDown: (e: React.PointerEvent, chip: Chip) => void;
  onSplitChip: (chip: Chip, into: [number, number]) => void;
}

export function Pan({
  zone,
  chips,
  panRef,
  isHover,
  disabled,
  draggingId,
  mirror,
  onChipPointerDown,
  onSplitChip,
}: Props) {
  const mirrorHere = mirror && mirror.zone === zone ? mirror : undefined;

  const decomposeId = mirrorHere?.needsDecomposition?.chipId;
  const exactMatch = (c: Chip) =>
    mirrorHere?.action === 'remove' &&
    !mirrorHere.needsDecomposition &&
    c.kind === mirrorHere.kind &&
    c.value === mirrorHere.value;

  return (
    <div className="flex flex-col items-center gap-2 w-40">
      <div
        ref={panRef}
        className={`min-h-[5.5rem] w-full rounded-2xl border-2 p-2 flex flex-wrap items-center justify-center gap-2 transition-colors
          ${isHover ? 'border-primary-light bg-primary/15' : 'border-white/15 bg-surface/60'}
        `}
      >
        {chips.length === 0 && <span className="text-text-muted/40 text-xs">empty</span>}
        {chips.map((c) => {
          const isSplitTarget = c.id === decomposeId;
          return (
            <WeightToken
              key={c.id}
              label={chipLabel(c)}
              kind={c.kind}
              negative={c.kind === 'const' && c.value < 0}
              draggable={!disabled}
              dragging={draggingId === c.id}
              highlight={isSplitTarget || exactMatch(c)}
              splittable={isSplitTarget}
              onPointerDown={(e) => onChipPointerDown(e, c)}
              onSplit={
                isSplitTarget && mirrorHere?.needsDecomposition
                  ? () => onSplitChip(c, mirrorHere.needsDecomposition!.into)
                  : undefined
              }
            />
          );
        })}

        {mirrorHere?.action === 'add' && (
          <WeightToken
            label={mirrorHere.kind === 'var' ? 'x' : String(mirrorHere.value)}
            kind={mirrorHere.kind}
            negative={mirrorHere.kind === 'const' && mirrorHere.value < 0}
            ghost
          />
        )}
      </div>
      <span className="text-xs uppercase tracking-wider text-text-muted">{zone} pan</span>
    </div>
  );
}
