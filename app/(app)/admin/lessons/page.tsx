import { getTranslations } from "next-intl/server";
import { getOrderedLessons, getProfile } from "@/lib/data";
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
      const [{ data: titles }, { data: unitTitles }, { data: exercises }] = await Promise.all([
        supabase.from("lesson_translations").select("lesson_id, title").eq("locale", "vi").in("lesson_id", ids),
        supabase.from("unit_translations").select("unit_id, title").eq("locale", "vi").in("unit_id", [...new Set(lessons.map((l) => l.unitId))]),
        supabase.from("exercises").select("lesson_id").in("lesson_id", ids),
      ]);
      const counts = new Map<string, number>();
      for (const e of exercises ?? []) counts.set(e.lesson_id, (counts.get(e.lesson_id) ?? 0) + 1);
      return {
        course,
        lessons,
        title: new Map((titles ?? []).map((r) => [r.lesson_id as string, r.title as string])),
        unitTitle: new Map((unitTitles ?? []).map((r) => [r.unit_id as string, r.title as string])),
        counts,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("admin.intro")}</p>
      </div>
      {sections.map(({ course, lessons, title, unitTitle, counts }) => (
        <section key={course.id} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{course.slug}</h2>
          {lessons.length === 0 && <p className="card text-muted">{t("admin.noContent")}</p>}
          {lessons.map((lesson) => (
            <div key={lesson.id} className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted">
                  {unitTitle.get(lesson.unitId)} · {t("course.lesson", { number: lesson.number })}
                </p>
                <p className="font-semibold">{title.get(lesson.id)}</p>
                <p className="text-sm text-muted">
                  {t(`admin.status.${lesson.status}`)} · {t("admin.exercises", { count: counts.get(lesson.id) ?? 0 })}
                </p>
              </div>
              <PublishButton lessonId={lesson.id} published={lesson.status === "published"} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
