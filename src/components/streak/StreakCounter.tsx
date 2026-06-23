import { useProgressStore } from '../../stores/progressStore';

export function StreakCounter() {
  const { progress } = useProgressStore();
  if (!progress) return null;

  const { current, longest } = progress.streak;

  return (
    <div className="bg-surface/50 border border-white/10 rounded-2xl p-3 sm:p-6 text-center">
      <div className="text-2xl sm:text-4xl mb-1 sm:mb-2">🔥</div>
      <div className="text-xl sm:text-3xl font-bold text-warning">{current}</div>
      <div className="text-xs sm:text-sm text-text-muted mt-1">day streak</div>
      {longest > 0 && (
        <div className="text-xs text-text-muted mt-2 hidden sm:block">
          Best: {longest} days
        </div>
      )}
    </div>
  );
}
