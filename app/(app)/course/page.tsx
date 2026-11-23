import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getLearnerContext, getOrderedLessons } from "@/lib/data";

export default async function CoursePage() {
  const ctx = await getLearnerContext();
  const t = await getTranslations();
  const lessons = (await getOrderedLessons(ctx.supabase, ctx.course.id)).filter((l) => l.status === "published");
  const currentIndex = lessons.findIndex((l) => l.id === ctx.enrollment.currentLessonId);

  const unitIds = [...new Set(lessons.map((l) => l.unitId))];
  const [{ data: unitTitles }, { data: lessonTitles }] = await Promise.all([
    ctx.supabase.from("unit_translations").select("unit_id, title, can_do").eq("locale", ctx.enrollment.sourceLang).in("unit_id", unitIds),
    ctx.supabase
      .from("lesson_translations")
      .select("lesson_id, title")
      .eq("locale", ctx.enrollment.sourceLang)
      .in("lesson_id", lessons.map((l) => l.id)),
  ]);
  const unitInfo = new Map((unitTitles ?? []).map((u) => [u.unit_id as string, u]));
  const lessonTitle = new Map((lessonTitles ?? []).map((l) => [l.lesson_id as string, l.title as string]));

  const levels: { code: string; units: { id: string; lessons: typeof lessons }[] }[] = [];
  for (const lesson of lessons) {
    let level = levels.find((l) => l.code === lesson.levelCode);
    if (!level) levels.push((level = { code: lesson.levelCode, units: [] }));
    let unit = level.units.find((u) => u.id === lesson.unitId);
    if (!unit) level.units.push((unit = { id: lesson.unitId, lessons: [] }));
    unit.lessons.push(lesson);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("course.title")}</h1>
      {levels.map((level) => (
        <section key={level.code} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            {t.has(`levels.${level.code}`) ? t(`levels.${level.code}`) : level.code}
          </h2>
          {level.units.map((unit) => (
            <div key={unit.id} className="card flex flex-col gap-3">
              <div>
                <h3 className="text-lg font-semibold">{unitInfo.get(unit.id)?.title}</h3>
                {unitInfo.get(unit.id)?.can_do && <p className="text-sm text-muted">{unitInfo.get(unit.id)?.can_do}</p>}
              </div>
              <ul className="flex flex-col gap-2">
                {unit.lessons.map((lesson) => {
                  const index = lessons.indexOf(lesson);
                  const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "locked";
                  const content = (
                    <>
                      <span>
                        <span className="text-sm text-muted">{t("course.lesson", { number: lesson.number })}</span>
                        <span className="block font-medium">{lessonTitle.get(lesson.id)}</span>
                      </span>
                      <span className={`shrink-0 text-sm ${state === "locked" ? "text-muted" : "text-brand-dark"}`}>{t(`course.${state}`)}</span>
                    </>
                  );
                  const className = "flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line px-4 py-2";
                  return (
                    <li key={lesson.id}>
                      {state === "locked" ? (
                        <div className={`${className} opacity-60`}>{content}</div>
                      ) : (
                        <Link href={`/learn/${lesson.id}/vocab`} className={`${className} hover:bg-page ${state === "current" ? "border-brand bg-brand-soft" : ""}`}>
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
