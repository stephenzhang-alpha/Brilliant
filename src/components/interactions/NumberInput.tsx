import { useState, FormEvent } from 'react';
import { NumberInputConfig } from '../../types';

interface Props {
  config: NumberInputConfig;
  onSubmit: (answer: number) => void;
  disabled?: boolean;
}

export function NumberInput({ config, onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onSubmit(num);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={config.placeholder || 'Enter your answer'}
          disabled={disabled}
          className="w-full bg-surface border-2 border-white/10 focus:border-primary-light rounded-xl px-4 py-3 text-lg text-text placeholder:text-text-muted/50 focus:outline-none transition-colors disabled:opacity-60"
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={!value || disabled}
        className="w-full bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
      >
        Check Answer
      </button>
    </form>
  );
}
