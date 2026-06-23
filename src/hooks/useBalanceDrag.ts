import { useCallback, useEffect, useRef, useState } from 'react';

export type DropZone = 'left' | 'right' | 'bank';

export interface DragChip {
  id: string;
  from: DropZone | 'palette';
  label: string;
  kind: 'const' | 'var';
  value: number;
  name?: string;
}

interface Options {
  onDrop: (chip: DragChip, to: DropZone) => void;
  getZoneRects: () => Array<{ zone: DropZone; rect: DOMRect }>;
  disabled?: boolean;
}

/**
 * Pointer-based (mouse + touch unified) drag for balance weights, with
 * drop-zone hit-testing. Listeners are attached synchronously on pointer-down
 * (not via an effect) so no early move/up events are missed.
 */
export function useBalanceDrag({ onDrop, getZoneRects, disabled }: Options) {
  const [drag, setDrag] = useState<DragChip | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [hoverZone, setHoverZone] = useState<DropZone | null>(null);

  const onDropRef = useRef(onDrop);
  const getRectsRef = useRef(getZoneRects);
  const dragRef = useRef<DragChip | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Keep the latest callbacks in refs (updated post-render, never during render).
  useEffect(() => {
    onDropRef.current = onDrop;
    getRectsRef.current = getZoneRects;
  });

  const start = useCallback(
    (e: React.PointerEvent, chip: DragChip) => {
      if (disabled) return;
      e.preventDefault();
      dragRef.current = chip;
      setDrag(chip);
      setPointer({ x: e.clientX, y: e.clientY });

      const hitTest = (x: number, y: number): DropZone | null => {
        for (const { zone, rect } of getRectsRef.current()) {
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return zone;
        }
        return null;
      };

      const move = (ev: PointerEvent) => {
        ev.preventDefault();
        setPointer({ x: ev.clientX, y: ev.clientY });
        setHoverZone(hitTest(ev.clientX, ev.clientY));
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        cleanupRef.current = null;
      };

      const end = (ev: PointerEvent) => {
        const zone = hitTest(ev.clientX, ev.clientY);
        const c = dragRef.current;
        if (c && zone && zone !== c.from) onDropRef.current(c, zone);
        dragRef.current = null;
        setDrag(null);
        setPointer(null);
        setHoverZone(null);
        cleanup();
      };

      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      cleanupRef.current = cleanup;
    },
    [disabled],
  );

  useEffect(() => () => cleanupRef.current?.(), []);

  return { drag, pointer, hoverZone, start };
}
