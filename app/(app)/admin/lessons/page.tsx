import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getOrderedLessons, getProfile } from "@/lib/data";
import { LevelTestButton } from "./LevelTestButton";
import { PublishButton } from "./PublishButton";

export default async function AdminLessonsPage() {
  const { supabase, profile } = await getProfile();
  const t = await getTranslations();
  if (profile.role !== "admin") return <p className="card text-muted">{t("admin.forbidden")}</p>;

  const { data: courses } = await supabase.from("courses").select("id, slug").order("created_at");
  const sections = await Promise.all(
    (courses ?? []).map(async (course) => {
      const lessons = await getOrderedLessons(supabase, course.id);
      const ids = lessons.map((l) => l.id);
      const [{ data: titles }, { data: unitTitles }, { data: exercises }, { data: levels }] = await Promise.all([
        supabase.from("lesson_translations").select("lesson_id, title").eq("locale", "vi").in("lesson_id", ids),
        supabase
          .from("unit_translations")
          .select("unit_id, title")
          .eq("locale", "vi")
          .in("unit_id", [...new Set(lessons.map((l) => l.unitId))]),
        supabase.from("exercises").select("lesson_id").in("lesson_id", ids),
        supabase.from("levels").select("id, code, sort_order").eq("course_id", course.id).order("sort_order"),
      ]);
      const counts = new Map<string, number>();
      for (const e of exercises ?? []) counts.set(e.lesson_id, (counts.get(e.lesson_id) ?? 0) + 1);
      // Đếm số câu trong ngân hàng của từng cấp (đếm ở database, không tải cả ngân hàng về).
      const questionCounts = new Map<string, number>();
      await Promise.all(
        (levels ?? []).map(async (level) => {
          const { count } = await supabase.from("level_test_questions").select("id", { count: "exact", head: true }).eq("level_id", level.id);
          questionCounts.set(level.id as string, count ?? 0);
        }),
      );
      // Chỉ những cấp đã có bài học được xuất bản mới ra được đề kiểm tra.
      const publishedLevelCodes = new Set(lessons.filter((l) => l.status === "published" && l.kind === "lesson").map((l) => l.levelCode));
      return {
        course,
        lessons,
        title: new Map((titles ?? []).map((r) => [r.lesson_id as string, r.title as string])),
        unitTitle: new Map((unitTitles ?? []).map((r) => [r.unit_id as string, r.title as string])),
        counts,
        levels: (levels ?? []).filter((level) => publishedLevelCodes.has(level.code as string)),
        questionCounts,
      };
    }),
  );

  const levelName = (code: string) => (t.has(`levels.${code}`) ? t(`levels.${code}`) : code.toUpperCase());

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("admin.intro")}</p>
      </div>
      {sections.map(({ course, lessons, title, unitTitle, counts, levels, questionCounts }) => (
        <section key={course.id} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{course.slug}</h2>

          {levels.map((level) => {
            const questions = questionCounts.get(level.id as string) ?? 0;
            return (
              <div key={level.id} className="flex flex-col gap-3 rounded-3xl border border-brand bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">{t("admin.levelTest", { level: levelName(level.code as string) })}</p>
                  <p className="text-sm text-muted">{questions > 0 ? t("admin.levelTestQuestions", { count: questions }) : t("admin.levelTestNone")}</p>
                </div>
                <LevelTestButton levelId={level.id as string} exists={questions > 0} />
              </div>
            );
          })}

          {lessons.length === 0 && <p className="card text-muted">{t("admin.noContent")}</p>}
          {lessons.map((lesson, index) => {
            const isLastOfUnit = lessons[index + 1]?.unitId !== lesson.unitId;
            const unitHasReview = lessons.some((l) => l.unitId === lesson.unitId && l.kind === "review");
            return (
              <div key={lesson.id} className="flex flex-col gap-2">
                <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-muted">
                      {unitTitle.get(lesson.unitId)} · {t("course.lesson", { number: lesson.number })}
                    </p>
                    <p className="font-semibold">
                      <Link href={`/admin/lessons/${lesson.id}`} className="hover:underline">
                        {title.get(lesson.id)}
                      </Link>
                    </p>
                    <p className="text-sm text-muted">
                      {t(`admin.status.${lesson.status}`)} · {t("admin.exercises", { count: counts.get(lesson.id) ?? 0 })} ·{" "}
                      <Link href={`/admin/lessons/${lesson.id}`} className="font-semibold text-brand-dark hover:underline">
                        {t("admin.viewContent")}
                      </Link>
                    </p>
                  </div>
                  <PublishButton lessonId={lesson.id} published={lesson.status === "published"} />
                </div>
                {isLastOfUnit && !unitHasReview && (
                  <div className="flex flex-col gap-3 rounded-3xl border border-dashed border-line p-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted">
                      {unitTitle.get(lesson.unitId)} · {t("admin.reviewLesson")}
                    </p>
                    <PublishButton unitId={lesson.unitId} />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
