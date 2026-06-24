import { useNavigate } from 'react-router-dom';
import { lessons } from '../../content';
import { strands, strandMap, getMapEdges } from '../../content/curriculum';
import { useProgressStore } from '../../stores/progressStore';

const NODE_W = 158;
const NODE_H = 84;
const GAP_X = 40;
const GAP_Y = 52;
const PAD = 24;
const CELL_W = NODE_W + GAP_X;
const CELL_H = NODE_H + GAP_Y;

export function CourseMap() {
  const { progress, isLessonCompleted, isLessonUnlocked } = useProgressStore();
  const navigate = useNavigate();

  if (!progress) return null;

  // Vertical tree: lesson "depth" (mapPosition.col) flows top -> bottom so the
  // basic / entry-point courses sit at the top, while each strand fans out into
  // its own column across the screen.
  const positioned = lessons.map((lesson, i) => {
    const depth = lesson.mapPosition?.col ?? i;
    const lane = lesson.mapPosition?.row ?? strandMap[lesson.strand]?.row ?? 0;
    const x = PAD + lane * CELL_W;
    const y = PAD + depth * CELL_H;
    return { lesson, x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 };
  });

  const centerById = Object.fromEntries(positioned.map((p) => [p.lesson.id, p]));
  const maxDepth = Math.max(...positioned.map((p) => (p.y - PAD) / CELL_H));
  const width = PAD * 2 + strands.length * CELL_W - GAP_X;
  const height = PAD * 2 + (maxDepth + 1) * CELL_H - GAP_Y;

  const edges = getMapEdges();

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Algebra 1 Roadmap</h1>
        <p className="text-text-muted">Start at the top and work your way down.</p>
      </div>

      {/* Strand legend */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {strands.map((s) => (
          <div key={s.id} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.accent }} />
            <span className="text-text font-medium">{s.title}</span>
          </div>
        ))}
      </div>

      {/* The vertical tree */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="relative mx-auto" style={{ width, height, minWidth: width }}>
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
              // Prerequisite edges flow top (parent) -> bottom (child).
              const x1 = a.cx;
              const y1 = a.y + NODE_H;
              const x2 = b.cx;
              const y2 = b.y;
              const dy = Math.max(24, (y2 - y1) * 0.5);
              const done = isLessonCompleted(e.from);
              return (
                <path
                  key={`e${i}`}
                  d={`M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`}
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
                style={{ left: x, top: y, width: NODE_W, height: NODE_H, borderTopColor: unlocked ? accent : undefined, borderTopWidth: 4 }}
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
