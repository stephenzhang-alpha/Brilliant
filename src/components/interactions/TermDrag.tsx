import { useState, useRef, useCallback, useEffect } from 'react';
import { EquationConfig, Term } from '../../types';

interface Props {
  config: EquationConfig;
  onSubmit: (answer: number) => void;
  disabled?: boolean;
}

interface DragState {
  termId: string | null;
  startX: number;
  currentX: number;
  fromSide: 'left' | 'right';
}

export function TermDrag({ config, onSubmit, disabled }: Props) {
  const [leftTerms, setLeftTerms] = useState<Term[]>(config.left);
  const [rightTerms, setRightTerms] = useState<Term[]>(config.right);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [solved, setSolved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const equalsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLeftTerms(config.left);
    setRightTerms(config.right);
    setSolved(false);
  }, [config]);

  const formatTerm = (term: Term, index: number, side: 'left' | 'right') => {
    const coeff = term.coefficient;
    const isFirst = index === 0;
    let display = '';

    if (term.isConstant) {
      if (isFirst) {
        display = `${coeff}`;
      } else {
        display = coeff >= 0 ? `+ ${coeff}` : `- ${Math.abs(coeff)}`;
      }
    } else {
      const absCoeff = Math.abs(coeff);
      const varPart = absCoeff === 1 ? (term.variable || 'x') : `${absCoeff}${term.variable || 'x'}`;
      if (isFirst) {
        display = coeff < 0 ? `-${varPart}` : varPart;
      } else {
        display = coeff >= 0 ? `+ ${varPart}` : `- ${varPart}`;
      }
    }

    const isDragging = dragState?.termId === term.id;
    const canDrag = !disabled && !solved && term.isConstant;

    return (
      <span
        key={term.id}
        data-term-id={term.id}
        data-side={side}
        onMouseDown={(e) => canDrag && handleDragStart(e, term.id, side)}
        onTouchStart={(e) => canDrag && handleTouchStart(e, term.id, side)}
        className={`inline-block px-3 py-2 mx-1 rounded-lg text-xl font-mono font-bold transition-all duration-150 select-none
          ${canDrag ? 'cursor-grab hover:bg-primary/30 active:cursor-grabbing' : ''}
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${term.isConstant ? 'bg-surface-light/50 border border-white/20' : 'text-primary-light'}
        `}
        style={isDragging ? { transform: `translateX(${dragState!.currentX - dragState!.startX}px)` } : undefined}
      >
        {display}
      </span>
    );
  };

  const handleDragStart = useCallback((e: React.MouseEvent, termId: string, fromSide: 'left' | 'right') => {
    e.preventDefault();
    setDragState({ termId, startX: e.clientX, currentX: e.clientX, fromSide });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, termId: string, fromSide: 'left' | 'right') => {
    const touch = e.touches[0];
    setDragState({ termId, startX: touch.clientX, currentX: touch.clientX, fromSide });
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (clientX: number) => {
      setDragState((prev) => prev ? { ...prev, currentX: clientX } : null);
    };

    const handleEnd = (clientX: number) => {
      if (!dragState || !equalsRef.current || !containerRef.current) {
        setDragState(null);
        return;
      }

      const equalsRect = equalsRef.current.getBoundingClientRect();
      const equalsCenterX = equalsRect.left + equalsRect.width / 2;
      const movedPastEquals = dragState.fromSide === 'left'
        ? clientX > equalsCenterX
        : clientX < equalsCenterX;

      if (movedPastEquals && dragState.termId) {
        moveTerm(dragState.termId, dragState.fromSide);
      }
      setDragState(null);
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onMouseUp = (e: MouseEvent) => handleEnd(e.clientX);
    const onTouchEnd = (e: TouchEvent) => handleEnd(e.changedTouches[0].clientX);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragState]);

  const moveTerm = (termId: string, fromSide: 'left' | 'right') => {
    if (fromSide === 'left') {
      const term = leftTerms.find((t) => t.id === termId);
      if (!term) return;
      const flipped: Term = { ...term, coefficient: -term.coefficient };
      setLeftTerms((prev) => prev.filter((t) => t.id !== termId));
      setRightTerms((prev) => [...prev, flipped]);
    } else {
      const term = rightTerms.find((t) => t.id === termId);
      if (!term) return;
      const flipped: Term = { ...term, coefficient: -term.coefficient };
      setRightTerms((prev) => prev.filter((t) => t.id !== termId));
      setLeftTerms((prev) => [...prev, flipped]);
    }
  };

  const checkSolution = () => {
    const leftHasOnlyVariable = leftTerms.length === 1 && !leftTerms[0].isConstant;
    const rightAllConstants = rightTerms.every((t) => t.isConstant);

    if (leftHasOnlyVariable && rightAllConstants) {
      const rightSum = rightTerms.reduce((sum, t) => sum + t.coefficient, 0);
      const coeff = leftTerms[0].coefficient;
      const answer = rightSum / coeff;
      setSolved(true);
      onSubmit(answer);
    } else {
      const leftConstants = leftTerms.filter((t) => t.isConstant);
      const rightConstants = rightTerms.filter((t) => t.isConstant);
      const leftVars = leftTerms.filter((t) => !t.isConstant);
      const rightVars = rightTerms.filter((t) => !t.isConstant);

      if (leftVars.length > 0 && leftConstants.length === 0 && rightVars.length === 0) {
        const rightSum = rightConstants.reduce((sum, t) => sum + t.coefficient, 0);
        const leftCoeff = leftVars.reduce((sum, t) => sum + t.coefficient, 0);
        const answer = rightSum / leftCoeff;
        setSolved(true);
        onSubmit(answer);
      } else if (rightVars.length > 0 && rightConstants.length === 0 && leftVars.length === 0) {
        const leftSum = leftConstants.reduce((sum, t) => sum + t.coefficient, 0);
        const rightCoeff = rightVars.reduce((sum, t) => sum + t.coefficient, 0);
        const answer = leftSum / rightCoeff;
        setSolved(true);
        onSubmit(answer);
      } else {
        onSubmit(NaN);
      }
    }
  };

  return (
    <div className="space-y-6 touch-none" ref={containerRef}>
      <div className="flex items-center justify-center gap-2 flex-wrap py-6 px-4 bg-surface/50 rounded-2xl border border-white/10">
        <div className="flex items-center flex-wrap gap-1 min-w-[80px] justify-end">
          {leftTerms.map((term, i) => formatTerm(term, i, 'left'))}
        </div>

        <div
          ref={equalsRef}
          className="text-2xl font-bold text-text-muted px-4 select-none"
        >
          =
        </div>

        <div className="flex items-center flex-wrap gap-1 min-w-[80px]">
          {rightTerms.map((term, i) => formatTerm(term, i, 'right'))}
        </div>
      </div>

      {dragState && (
        <p className="text-center text-sm text-primary-light animate-pulse">
          Drag across the = sign to move the term...
        </p>
      )}

      {!solved && !disabled && (
        <button
          onClick={checkSolution}
          className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors"
        >
          Check Solution
        </button>
      )}

      {solved && (
        <div className="text-center text-success font-medium py-2">
          Variable isolated! x = {config.targetValue}
        </div>
      )}
    </div>
  );
}
