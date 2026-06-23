import { useNavigate } from 'react-router-dom';
import { lessons } from '../../content';
import { useProgressStore } from '../../stores/progressStore';
import { StreakCounter } from '../streak/StreakCounter';

export function CourseMap() {
  const { progress, isLessonCompleted, isLessonUnlocked } = useProgressStore();
  const navigate = useNavigate();

  if (!progress) return null;

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Algebra 1 Fundamentals</h1>
        <p className="text-text-muted">Master the basics of algebra step by step</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StreakCounter />
        <div className="bg-surface/50 border border-white/10 rounded-2xl p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-4xl mb-1 sm:mb-2">⚡</div>
          <div className="text-xl sm:text-3xl font-bold text-primary-light">{progress.totalXp}</div>
          <div className="text-xs sm:text-sm text-text-muted mt-1">total XP</div>
        </div>
        <div className="bg-surface/50 border border-white/10 rounded-2xl p-3 sm:p-6 text-center">
          <div className="text-2xl sm:text-4xl mb-1 sm:mb-2">📚</div>
          <div className="text-xl sm:text-3xl font-bold text-text">
            {lessons.filter((l) => isLessonCompleted(l.id)).length}/{lessons.length}
          </div>
          <div className="text-xs sm:text-sm text-text-muted mt-1">complete</div>
        </div>
      </div>

      {/* Lesson path */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-muted">Course Path</h2>
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const completed = isLessonCompleted(lesson.id);
            const unlocked = isLessonUnlocked(lesson.id, lesson.prerequisiteIds);
            const inProgress = progress.lessonProgress[lesson.id] && !completed;
            const stepProgress = progress.lessonProgress[lesson.id];

            return (
              <div key={lesson.id} className="relative">
                {/* Connector line */}
                {index < lessons.length - 1 && (
                  <div className={`absolute left-6 top-full w-0.5 h-3 ${completed ? 'bg-success' : 'bg-white/10'}`} />
                )}

                <button
                  onClick={() => unlocked && navigate(`/lesson/${lesson.id}`)}
                  disabled={!unlocked}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200
                    ${completed ? 'border-success/30 bg-success/5 hover:bg-success/10' : ''}
                    ${inProgress ? 'border-primary/50 bg-primary/5 hover:bg-primary/10' : ''}
                    ${unlocked && !completed && !inProgress ? 'border-white/10 bg-surface/50 hover:border-primary-light/50 hover:bg-surface' : ''}
                    ${!unlocked ? 'border-white/5 bg-surface/20 opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {/* Status icon */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold
                    ${completed ? 'bg-success/20 text-success' : ''}
                    ${inProgress ? 'bg-primary/20 text-primary-light' : ''}
                    ${unlocked && !completed && !inProgress ? 'bg-surface-light text-text-muted' : ''}
                    ${!unlocked ? 'bg-surface-light/50 text-text-muted/50' : ''}
                  `}>
                    {completed ? '✓' : !unlocked ? '🔒' : index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate ${!unlocked ? 'text-text-muted/50' : ''}`}>
                      {lesson.title}
                    </h3>
                    <p className={`text-sm truncate ${!unlocked ? 'text-text-muted/30' : 'text-text-muted'}`}>
                      {lesson.description}
                    </p>
                    {inProgress && stepProgress && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-light rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-light rounded-full"
                            style={{ width: `${(stepProgress.currentStepIndex / lesson.steps.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-muted">
                          {stepProgress.currentStepIndex}/{lesson.steps.length}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* XP badge */}
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${!unlocked ? 'bg-surface-light/30 text-text-muted/30' : 'bg-primary/20 text-primary-light'}`}>
                    +{lesson.xpReward} XP
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
