import { useNavigate } from 'react-router-dom';
import { lessons } from '../../content';
import { strands, strandMap, getMapEdges } from '../../content/curriculum';
import { useProgressStore } from '../../stores/progressStore';
import { StreakCounter } from '../streak/StreakCounter';

const NODE_W = 150;
const NODE_H = 86;
const GAP_X = 44;
const GAP_Y = 46;
const PAD = 24;
const CELL_W = NODE_W + GAP_X;
const CELL_H = NODE_H + GAP_Y;

export function CourseMap() {
  const { progress, isLessonCompleted, isLessonUnlocked } = useProgressStore();
  const navigate = useNavigate();

  if (!progress) return null;

  const positioned = lessons.map((lesson, i) => {
    const col = lesson.mapPosition?.col ?? i;
    const row = lesson.mapPosition?.row ?? strandMap[lesson.strand]?.row ?? 0;
    const x = PAD + col * CELL_W;
    const y = PAD + row * CELL_H;
    return { lesson, x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 };
  });

  const centerById = Object.fromEntries(positioned.map((p) => [p.lesson.id, p]));
  const maxCol = Math.max(...positioned.map((p) => (p.x - PAD) / CELL_W));
  const width = PAD * 2 + (maxCol + 1) * CELL_W - GAP_X;
  const height = PAD * 2 + strands.length * CELL_H - GAP_Y;

  const edges = getMapEdges();

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Algebra 1 Atlas</h1>
        <p className="text-text-muted">Four ways in. Pick an entry point and explore.</p>
      </div>

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

      {/* Strand legend */}
      <div className="flex flex-wrap gap-3">
        {strands.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.accent }} />
            <span className="text-text-muted">
              <span className="text-text font-medium">{s.title}</span> · {s.blurb}
            </span>
          </div>
        ))}
      </div>

      {/* The map */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="relative" style={{ width, height, minWidth: width }}>
          <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
            {edges.map((e, i) => {
              const a = centerById[e.from];
              const b = centerById[e.to];
              if (!a || !b) return null;
              const accent = strandMap[b.lesson.strand]?.accent ?? '#818cf8';
              if (e.kind === 'cross') {
                return (
                  <line
                    key={`e${i}`}
                    x1={a.cx}
                    y1={a.cy}
                    x2={b.cx}
                    y2={b.cy}
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeDasharray="4 5"
                    opacity="0.25"
                  />
                );
              }
              const x1 = a.x + NODE_W;
              const y1 = a.cy;
              const x2 = b.x;
              const y2 = b.cy;
              const dx = Math.max(30, (x2 - x1) * 0.5);
              const done = isLessonCompleted(e.from);
              return (
                <path
                  key={`e${i}`}
                  d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={done ? '#10b981' : accent}
                  strokeWidth="2.5"
                  opacity={done ? 0.8 : 0.4}
                />
              );
            })}
          </svg>

          {positioned.map(({ lesson, x, y }) => {
            const completed = isLessonCompleted(lesson.id);
            const unlocked = isLessonUnlocked(lesson.id, lesson.prerequisiteIds);
            const lessonProgress = progress.lessonProgress[lesson.id];
            const inProgress = lessonProgress && !completed && lessonProgress.currentStepIndex > 0;
            const accent = strandMap[lesson.strand]?.accent ?? '#818cf8';

            return (
              <button
                key={lesson.id}
                onClick={() => unlocked && navigate(`/lesson/${lesson.id}`)}
                disabled={!unlocked}
                className={`absolute text-left rounded-2xl border-2 p-3 transition-all duration-200 flex flex-col justify-between
                  ${completed ? 'bg-success/10 border-success/40' : ''}
                  ${inProgress ? 'bg-primary/10 border-primary/50' : ''}
                  ${unlocked && !completed && !inProgress ? 'bg-surface/70 border-white/15 hover:border-primary-light/60 hover:bg-surface' : ''}
                  ${!unlocked ? 'bg-surface/30 border-white/5 opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'}
                `}
                style={{ left: x, top: y, width: NODE_W, height: NODE_H, borderLeftColor: unlocked ? accent : undefined, borderLeftWidth: 4 }}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className={`text-sm font-semibold leading-tight ${!unlocked ? 'text-text-muted/60' : ''}`}>
                    {lesson.title}
                  </span>
                  <span className="text-base flex-shrink-0">
                    {completed ? '✅' : !unlocked ? '🔒' : lesson.entryPoint ? '▶' : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  {lesson.entryPoint && !completed ? (
                    <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: accent }}>
                      Start here
                    </span>
                  ) : (
                    <span className="text-[10px] text-text-muted">
                      {inProgress ? 'In progress' : completed ? 'Done' : unlocked ? 'Ready' : 'Locked'}
                    </span>
                  )}
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${unlocked ? 'bg-primary/20 text-primary-light' : 'bg-surface-light/30 text-text-muted/40'}`}>
                    +{lesson.xpReward}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
