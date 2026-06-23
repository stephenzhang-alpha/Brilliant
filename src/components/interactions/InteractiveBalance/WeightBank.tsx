import type { BalanceTermSpec } from '../../../types';
import type { Chip } from '../../../engine/balance/balanceState';
import { chipLabel } from '../../../engine/balance/balanceState';
import { WeightToken } from './WeightToken';

interface Props {
  bankChips: Chip[];
  palette: BalanceTermSpec[];
  bankRef: (el: HTMLDivElement | null) => void;
  isHover: boolean;
  disabled: boolean;
  draggingId: string | null;
  onBankChipPointerDown: (e: React.PointerEvent, chip: Chip) => void;
  onPalettePointerDown: (e: React.PointerEvent, spec: BalanceTermSpec, idx: number) => void;
}

const paletteLabel = (s: BalanceTermSpec): string =>
  s.kind === 'var' ? s.name ?? 'x' : s.value > 0 ? `+${s.value}` : `${s.value}`;

export function WeightBank({
  bankChips,
  palette,
  bankRef,
  isHover,
  disabled,
  draggingId,
  onBankChipPointerDown,
  onPalettePointerDown,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-text-muted mb-1">
          Bank — drag weights here to take them off a pan
        </p>
        <div
          ref={bankRef}
          className={`min-h-[3.5rem] rounded-2xl border-2 border-dashed p-2 flex flex-wrap items-center gap-2 transition-colors
            ${isHover ? 'border-primary-light bg-primary/10' : 'border-white/15 bg-surface/40'}
          `}
        >
          {bankChips.length === 0 && (
            <span className="text-text-muted/40 text-xs">removed weights land here</span>
          )}
          {bankChips.map((c) => (
            <WeightToken
              key={c.id}
              label={chipLabel(c)}
              kind={c.kind}
              negative={c.kind === 'const' && c.value < 0}
              draggable={!disabled}
              dragging={draggingId === c.id}
              onPointerDown={(e) => onBankChipPointerDown(e, c)}
            />
          ))}
        </div>
      </div>

      {palette.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-text-muted mb-1">
            Add weights — drag onto a pan
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {palette.map((spec, i) => (
              <WeightToken
                key={`${spec.kind}-${spec.value}-${i}`}
                label={paletteLabel(spec)}
                kind={spec.kind}
                negative={spec.kind === 'const' && spec.value < 0}
                draggable={!disabled}
                onPointerDown={(e) => onPalettePointerDown(e, spec, i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
