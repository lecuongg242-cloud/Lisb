import "server-only";
import { getLessonProgress, getLessonSessions, getOrderedLessons, type LearnerContext, type LessonSession, type OrderedLesson } from "./data";
import { getLevelTestOverview } from "./level-test/server";
import type { LevelTestOverview } from "./level-test/types";
import { currentLessonIndex } from "./progress";

export type LearningPath = {
  /** Bài đã xuất bản, theo thứ tự học. */
  lessons: OrderedLesson[];
  /** Vị trí của bài đang học trong lessons; -1 nếu đã học hết. */
  currentIndex: number;
  /** Bài đang học; null nếu đã học hết. */
  currentLessonId: string | null;
  /** Các phiên đã hoàn thành của từng bài. */
  progress: Map<string, Set<number>>;
  sessionsByLesson: Map<string, LessonSession[]>;
  levels: { id: string; code: string }[];
  /** Bài kiểm tra cuối cấp đang mở, theo id cấp. */
  levelTests: Map<string, LevelTestOverview>;
};

/** Lộ trình của người học: bài nào đã xong, bài nào đang học (xem currentLessonIndex). */
export async function getLearningPath(ctx: LearnerContext): Promise<LearningPath> {
  const [allLessons, progress, { data: levelRows, error }] = await Promise.all([
    getOrderedLessons(ctx.supabase, ctx.course.id),
    getLessonProgress(ctx.supabase, ctx.userId),
    ctx.supabase.from("levels").select("id, code, sort_order").eq("course_id", ctx.course.id).order("sort_order"),
  ]);
  if (error) throw new Error(error.message);
  const levels = (levelRows ?? []).map((row) => ({ id: row.id as string, code: row.code as string }));
  const lessons = allLessons.filter((l) => l.status === "published");
  const [sessionsByLesson, levelTests] = await Promise.all([
    getLessonSessions(
      ctx.supabase,
      lessons.map((l) => l.id),
    ),
    getLevelTestOverview(
      ctx.supabase,
      ctx.userId,
      levels.map((l) => l.id),
    ),
  ]);

  const isDone = (lessonId: string) => {
    const sessions = sessionsByLesson.get(lessonId) ?? [];
    const done = progress.get(lessonId);
    return sessions.length > 0 && !!done && sessions.every((s) => done.has(s.no));
  };
  const passedLevels = new Set(levels.filter((l) => levelTests.get(l.id)?.passed).map((l) => l.code));
  const currentIndex = currentLessonIndex(lessons, ctx.enrollment.currentLessonId, isDone, passedLevels);

  return {
    lessons,
    currentIndex,
    currentLessonId: currentIndex >= 0 ? lessons[currentIndex].id : null,
    progress,
    sessionsByLesson,
    levels,
    levelTests,
  };
}
