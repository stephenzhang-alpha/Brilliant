import { useCallback, useEffect, useRef, useState } from 'react';
import type { EquationConfig, Term } from '../../types';

interface Props {
  config: EquationConfig;
  onSubmit: (answer: number) => void;
  disabled?: boolean;
}

// Physicality tuning (all px). Kept generous so Sam never feels "punished" for
// being a few pixels off — see "forgiving drop-zones".
const TENSION_RANGE = 90; // how far out the "=" starts stretching toward the term
const CROSS_MARGIN = 22; // magnetic forgiveness: counts as crossed this far before center
const ALMOST_BAND = 70; // dropped here = "so close" wobble instead of silent reset

type Side = 'left' | 'right';

interface DragMeta {
  term: Term;
  fromSide: Side;
  w: number;
  h: number;
}

export function TermDrag({ config, onSubmit, disabled }: Props) {
  const [leftTerms, setLeftTerms] = useState<Term[]>(config.left);
  const [rightTerms, setRightTerms] = useState<Term[]>(config.right);
  const [solved, setSolved] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [crossed, setCrossed] = useState(false);
  const [struggle, setStruggle] = useState<string | null>(null);
  const [justMovedId, setJustMovedId] = useState<string | null>(null);

  const equalsRef = useRef<HTMLDivElement>(null);
  const ghostPosRef = useRef<HTMLDivElement>(null);
  const ghostVisualRef = useRef<HTMLDivElement>(null);
  const termRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  const dragMeta = useRef<DragMeta | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const crossedRef = useRef(false);
  const raf = useRef(0);
  const struggleTimer = useRef(0);

  useEffect(() => {
    setLeftTerms(config.left);
    setRightTerms(config.right);
    setSolved(false);
    setDragId(null);
    setCrossed(false);
  }, [config]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      window.clearTimeout(struggleTimer.current);
    },
    [],
  );

  // Animate a term snapping into its new home after it crosses the =.
  useEffect(() => {
    if (!justMovedId) return;
    const el = termRefs.current.get(justMovedId);
    el?.animate(
      [
        { transform: 'scale(0.7)', opacity: 0 },
        { transform: 'scale(1.12)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: 220, easing: 'cubic-bezier(.34,1.56,.64,1)' },
    );
    setJustMovedId(null);
  }, [justMovedId, leftTerms, rightTerms]);

  const flash = (msg: string) => {
    setStruggle(msg);
    window.clearTimeout(struggleTimer.current);
    struggleTimer.current = window.setTimeout(() => setStruggle(null), 3800);
  };

  const equalsCenterX = () => {
    const r = equalsRef.current?.getBoundingClientRect();
    return r ? r.left + r.width / 2 : 0;
  };

  const isPastEquals = (meta: DragMeta, x: number) => {
    const cx = equalsCenterX();
    return meta.fromSide === 'left' ? x > cx - CROSS_MARGIN : x < cx + CROSS_MARGIN;
  };

  // 60fps loop: drives the ghost position + the rubber-band stretch on the "="
  // entirely through refs (no per-frame React state) to stay well under 16ms.
  const tick = useCallback(() => {
    const meta = dragMeta.current;
    const eq = equalsRef.current;
    if (meta && eq) {
      const cx = equalsCenterX();
      const x = pointer.current.x;
      const past = isPastEquals(meta, x);
      const dist = Math.abs(x - cx);
      const tension = past ? 0 : Math.max(0, 1 - dist / TENSION_RANGE);
      const pull = meta.fromSide === 'left' ? 1 : -1;
      eq.style.transform = `scaleX(${1 + tension * 0.85}) translateX(${tension * 7 * pull}px)`;
      eq.style.color = tension > 0.04 ? '#818cf8' : '';

      if (ghostPosRef.current) {
        ghostPosRef.current.style.transform = `translate3d(${x - meta.w / 2}px, ${
          pointer.current.y - meta.h / 2
        }px, 0)`;
      }

      if (past !== crossedRef.current) {
        crossedRef.current = past;
        setCrossed(past);
        // The "snap": ghost pops + flips as the sign inverts.
        ghostVisualRef.current?.animate(
          [
            { transform: 'scale(1) rotateY(0deg)' },
            { transform: 'scale(1.28) rotateY(180deg)', offset: 0.5 },
            { transform: 'scale(1) rotateY(360deg)' },
          ],
          { duration: 180, easing: 'cubic-bezier(.34,1.56,.64,1)' },
        );
      }
    }
    raf.current = requestAnimationFrame(tick);
  }, []);

  const onMove = useCallback((e: PointerEvent) => {
    e.preventDefault();
    pointer.current = { x: e.clientX, y: e.clientY };
  }, []);

  const commitMove = (meta: DragMeta) => {
    const flipped: Term = { ...meta.term, coefficient: -meta.term.coefficient };
    if (meta.fromSide === 'left') {
      setLeftTerms((prev) => prev.filter((t) => t.id !== meta.term.id));
      setRightTerms((prev) => [...prev, flipped]);
    } else {
      setRightTerms((prev) => prev.filter((t) => t.id !== meta.term.id));
      setLeftTerms((prev) => [...prev, flipped]);
    }
    setJustMovedId(meta.term.id);
  };

  const onUp = useCallback(() => {
    cancelAnimationFrame(raf.current);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);

    const eq = equalsRef.current;
    if (eq) {
      eq.style.transform = '';
      eq.style.color = '';
    }

    const meta = dragMeta.current;
    if (meta) {
      if (crossedRef.current) {
        commitMove(meta);
      } else {
        const dist = Math.abs(pointer.current.x - equalsCenterX());
        const homeEl = termRefs.current.get(meta.term.id);
        homeEl?.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-7px)' },
            { transform: 'translateX(6px)' },
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(0)' },
          ],
          { duration: 320, easing: 'ease-in-out' },
        );
        if (dist < TENSION_RANGE + ALMOST_BAND) {
          flash('So close — carry it all the way past the = so its sign can flip.');
        } else {
          flash("Back where it started — if it doesn't cross the =, nothing changes.");
        }
      }
    }

    dragMeta.current = null;
    crossedRef.current = false;
    setDragId(null);
    setCrossed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMove]);

  const onTermPointerDown = (e: React.PointerEvent, term: Term, side: Side) => {
    if (disabled || solved) return;
    if (!term.isConstant) {
      flash("x is the prize we're hunting — slide the numbers around it, never x itself.");
      return;
    }
    e.preventDefault();
    const rect = termRefs.current.get(term.id)?.getBoundingClientRect();
    dragMeta.current = {
      term,
      fromSide: side,
      w: rect?.width ?? 48,
      h: rect?.height ?? 40,
    };
    pointer.current = { x: e.clientX, y: e.clientY };
    crossedRef.current = false;
    setDragId(term.id);
    setCrossed(false);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    raf.current = requestAnimationFrame(tick);
  };

  const rowLabel = (term: Term, index: number): string => {
    const coeff = term.coefficient;
    const first = index === 0;
    if (term.isConstant) {
      if (first) return `${coeff}`;
      return coeff >= 0 ? `+ ${coeff}` : `− ${Math.abs(coeff)}`;
    }
    const abs = Math.abs(coeff);
    const varPart = abs === 1 ? term.variable || 'x' : `${abs}${term.variable || 'x'}`;
    if (first) return coeff < 0 ? `−${varPart}` : varPart;
    return coeff >= 0 ? `+ ${varPart}` : `− ${varPart}`;
  };

  const ghostLabel = (): string => {
    const m = dragMeta.current;
    if (!m) return '';
    const c = crossed ? -m.term.coefficient : m.term.coefficient;
    return `${c < 0 ? '−' : '+'}${Math.abs(c)}`;
  };

  const renderSide = (terms: Term[], side: Side) => {
    if (terms.length === 0) {
      return <span className="text-text-muted/40 text-xl font-mono">0</span>;
    }
    return terms.map((term, i) => {
      const canDrag = !disabled && !solved && term.isConstant;
      const isDragging = dragId === term.id;
      return (
        <span
          key={term.id}
          ref={(el) => {
            if (el) termRefs.current.set(term.id, el);
            else termRefs.current.delete(term.id);
          }}
          onPointerDown={(e) => onTermPointerDown(e, term, side)}
          className={`inline-block px-3 py-2 mx-1 rounded-lg text-xl font-mono font-bold select-none touch-none transition-colors duration-150
            ${canDrag ? 'cursor-grab active:cursor-grabbing hover:bg-primary/30' : ''}
            ${isDragging ? 'opacity-25' : 'opacity-100'}
            ${term.isConstant ? 'bg-surface-light/50 border border-white/20' : 'text-primary-light'}
          `}
          style={{ touchAction: canDrag ? 'none' : undefined }}
        >
          {rowLabel(term, i)}
        </span>
      );
    });
  };

  const checkSolution = () => {
    const leftConstants = leftTerms.filter((t) => t.isConstant);
    const rightConstants = rightTerms.filter((t) => t.isConstant);
    const leftVars = leftTerms.filter((t) => !t.isConstant);
    const rightVars = rightTerms.filter((t) => !t.isConstant);

    if (leftVars.length > 0 && leftConstants.length === 0 && rightVars.length === 0) {
      const rightSum = rightConstants.reduce((s, t) => s + t.coefficient, 0);
      const leftCoeff = leftVars.reduce((s, t) => s + t.coefficient, 0);
      setSolved(true);
      onSubmit(rightSum / leftCoeff);
    } else if (rightVars.length > 0 && rightConstants.length === 0 && leftVars.length === 0) {
      const leftSum = leftConstants.reduce((s, t) => s + t.coefficient, 0);
      const rightCoeff = rightVars.reduce((s, t) => s + t.coefficient, 0);
      setSolved(true);
      onSubmit(leftSum / rightCoeff);
    } else {
      flash('Almost — get every plain number onto the side opposite x first.');
      onSubmit(NaN);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-2 flex-wrap py-8 px-4 bg-surface/50 rounded-2xl border border-white/10">
        <div className="flex items-center flex-wrap gap-1 min-w-[80px] justify-end">{renderSide(leftTerms, 'left')}</div>

        <div
          ref={equalsRef}
          className="text-2xl font-bold text-text-muted px-4 select-none"
          style={{ willChange: 'transform', transformOrigin: 'center', transition: dragId ? 'none' : 'transform 220ms cubic-bezier(.34,1.56,.64,1), color 200ms' }}
        >
          =
        </div>

        <div className="flex items-center flex-wrap gap-1 min-w-[80px]">{renderSide(rightTerms, 'right')}</div>
      </div>

      <div className="h-5 text-center text-sm">
        {dragId ? (
          <span className={crossed ? 'text-success font-medium' : 'text-primary-light'}>
            {crossed ? 'Release to flip the sign!' : 'Pull it across the ='}
          </span>
        ) : struggle ? (
          <span className="text-warning">{struggle}</span>
        ) : null}
      </div>

      {!solved && !disabled && (
        <button
          onClick={checkSolution}
          className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors"
        >
          Check Solution
        </button>
      )}

      {solved && (
        <div className="text-center text-success font-medium py-2">Variable isolated! x = {config.targetValue}</div>
      )}

      {/* Floating ghost — position layer (per-frame transform) wraps a visual layer (flip/pop) */}
      {dragId && (
        <div ref={ghostPosRef} className="fixed top-0 left-0 z-50 pointer-events-none" style={{ willChange: 'transform' }}>
          <div
            ref={ghostVisualRef}
            className={`px-3 py-2 rounded-lg text-xl font-mono font-bold border-2 shadow-xl shadow-black/40
              ${crossed ? 'bg-success/30 border-success text-success' : 'bg-primary/30 border-primary-light text-primary-light'}
            `}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {ghostLabel()}
          </div>
        </div>
      )}
    </div>
  );
}
