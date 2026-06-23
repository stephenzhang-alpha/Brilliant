import { useState } from 'react';
import { ChoiceConfig } from '../../types';

interface Props {
  config: ChoiceConfig;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function MultipleChoice({ config, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (optionId: string) => {
    if (disabled) return;
    setSelected(optionId);
  };

  const handleSubmit = () => {
    if (!selected) return;
    const option = config.options.find((o) => o.id === selected);
    if (option) onSubmit(option.text);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3">
        {config.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            disabled={disabled}
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 font-medium
              ${selected === option.id
                ? 'border-primary-light bg-primary/20 text-text'
                : 'border-white/10 bg-surface hover:border-white/30 text-text-muted hover:text-text'
              }
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
            `}
          >
            <span className="inline-flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs
                ${selected === option.id ? 'border-primary-light bg-primary' : 'border-white/30'}
              `}>
                {selected === option.id && '✓'}
              </span>
              {option.text}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!selected || disabled}
        className="w-full bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors mt-4"
      >
        Check Answer
      </button>
    </div>
  );
}
