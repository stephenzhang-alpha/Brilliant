import { useParams, Navigate } from 'react-router-dom';
import { getLessonById } from '../content';
import { LessonRenderer } from '../components/lesson/LessonRenderer';

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();

  if (!lessonId) return <Navigate to="/course" replace />;

  const lesson = getLessonById(lessonId);
  if (!lesson) return <Navigate to="/course" replace />;

  return <LessonRenderer lesson={lesson} />;
}
