import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getLearnerContext, getLessonProgress, getLessonSessions, getOrderedLessons, type OrderedLesson } from "@/lib/data";
import { lessonState, type LessonState } from "@/lib/progress";

const STATE_STYLE: Record<LessonState, { dot: string; row: string; label: string }> = {
  done: { dot: "border-brand bg-brand text-on-brand", row: "border-line bg-surface hover:border-brand", label: "text-brand-dark" },
  current: { dot: "border-brand bg-brand-soft text-brand-dark ring-4 ring-brand/20", row: "border-brand bg-brand-soft", label: "text-brand-dark" },
  available: { dot: "border-line bg-surface text-ink", row: "border-line bg-surface hover:border-brand", label: "text-muted" },
  locked: { dot: "border-line bg-page text-muted", row: "border-line bg-page opacity-70", label: "text-muted" },
};

export default async function CoursePage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const ctx = await getLearnerContext();
  const t = await getTranslations();
  const { level: requestedLevel } = await searchParams;

  const [allLessons, progress, { data: levelRows }] = await Promise.all([
    getOrderedLessons(ctx.supabase, ctx.course.id),
    getLessonProgress(ctx.supabase, ctx.userId),
    ctx.supabase.from("levels").select("code, sort_order").eq("course_id", ctx.course.id).order("sort_order"),
  ]);
  const lessons = allLessons.filter((l) => l.status === "published");
  const currentIndex = lessons.findIndex((l) => l.id === ctx.enrollment.currentLessonId);
  const sessionsByLesson = await getLessonSessions(
    ctx.supabase,
    lessons.map((l) => l.id),
  );
  const stateOf = (lesson: OrderedLesson) => {
    const sessionNos = (sessionsByLesson.get(lesson.id) ?? []).map((s) => s.no);
    const done = progress.get(lesson.id);
    return lessonState(lessons.indexOf(lesson), currentIndex, done ? sessionNos.filter((no) => done.has(no)).length : 0, sessionNos.length);
  };

  const levels = (levelRows ?? []).map((row) => {
    const own = lessons.filter((l) => l.levelCode === row.code);
    return { code: row.code as string, lessons: own, done: own.filter((l) => stateOf(l) === "done").length };
  });
  const currentLevelCode = currentIndex >= 0 ? lessons[currentIndex].levelCode : levels.find((l) => l.lessons.length)?.code;
  const selected = levels.find((l) => l.code === requestedLevel) ?? levels.find((l) => l.code === currentLevelCode) ?? levels[0];

  const unitIds = [...new Set((selected?.lessons ?? []).map((l) => l.unitId))];
  const lessonIds = (selected?.lessons ?? []).map((l) => l.id);
  const [{ data: unitRows }, { data: titleRows }] = await Promise.all([
    unitIds.length
      ? ctx.supabase.from("unit_translations").select("unit_id, title, can_do, grammar_focus").eq("locale", ctx.enrollment.sourceLang).in("unit_id", unitIds)
      : Promise.resolve({ data: [] }),
    lessonIds.length
      ? ctx.supabase.from("lesson_translations").select("lesson_id, title").eq("locale", ctx.enrollment.sourceLang).in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] }),
  ]);
  const unitInfo = new Map((unitRows ?? []).map((u) => [u.unit_id as string, u]));
  const lessonTitle = new Map((titleRows ?? []).map((l) => [l.lesson_id as string, l.title as string]));

  const levelName = (code: string) => (t.has(`levels.${code}`) ? t(`levels.${code}`) : code.toUpperCase());
  // Cấp trước A1 hiện là "A0" để không trùng nhãn với cấp A1.
  const levelBadge = (code: string) => (code.startsWith("pre-") ? "A0" : code.toUpperCase());

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-brand-dark uppercase">
          <span className="h-2 w-2 rounded-full bg-brand" />
          {t("course.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{selected ? levelName(selected.code) : t("course.title")}</h1>
        {selected && t.has(`levelDesc.${selected.code}`) && <p className="mt-2 max-w-2xl text-muted">{t(`levelDesc.${selected.code}`)}</p>}
      </header>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-start">
        {/* Cột chọn cấp độ */}
        <aside className="card flex min-w-0 flex-col gap-3 p-4 lg:sticky lg:top-20">
          <div className="px-1">
            <h2 className="text-lg font-bold">{t("course.chooseLevel")}</h2>
            <p className="text-sm text-muted">{t("course.chooseLevelHint")}</p>
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {levels.map((level) => {
              const total = level.lessons.length;
              const isSelected = level.code === selected?.code;
              const percent = total ? Math.round((level.done / total) * 100) : 0;
              const body = (
                <>
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isSelected ? "bg-brand text-on-brand" : "bg-page text-muted"}`}
                  >
                    {levelBadge(level.code)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{levelName(level.code)}</span>
                    <span className="block text-xs text-muted">
                      {total ? t("course.levelProgress", { done: level.done, total }) : t("course.comingSoon")}
                    </span>
                    {total > 0 && (
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                        <span className="block h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
                      </span>
                    )}
                  </span>
                </>
              );
              const className = `flex min-w-56 items-center gap-3 rounded-2xl border p-3 lg:min-w-0 ${isSelected ? "border-brand bg-brand-soft" : "border-line"}`;
              return (
                <li key={level.code}>
                  {total ? (
                    <Link href={`/course?level=${level.code}`} aria-current={isSelected ? "true" : undefined} className={`${className} hover:border-brand`}>
                      {body}
                    </Link>
                  ) : (
                    <div className={`${className} opacity-60`}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Lộ trình của cấp đang chọn */}
        <section className="flex min-w-0 flex-col gap-5">
          {selected && selected.lessons.length > 0 ? (
            <>
              <div className="card flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-on-brand">
                  {levelBadge(selected.code)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t("course.levelLessons", { count: selected.lessons.length })}</p>
                  <p className="text-sm text-muted">{t("course.levelProgress", { done: selected.done, total: selected.lessons.length })}</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((selected.done / selected.lessons.length) * 100)}%` }} />
                  </div>
                </div>
              </div>

              {unitIds.map((unitId, unitIndex) => {
                const info = unitInfo.get(unitId);
                const unitLessons = selected.lessons.filter((l) => l.unitId === unitId);
                return (
                  <div key={unitId} className="card flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-bold tracking-widest text-brand-dark uppercase">{t("course.unitLabel", { number: unitIndex + 1 })}</p>
                      <h2 className="mt-1 text-xl font-bold">{info?.title}</h2>
                      {info?.can_do && <p className="mt-1 text-sm text-muted">{info.can_do}</p>}
                    </div>
                    <ol className="flex flex-col">
                      {unitLessons.map((lesson, i) => {
                        const state = stateOf(lesson);
                        const style = STATE_STYLE[state];
                        const number = String(selected.lessons.indexOf(lesson) + 1).padStart(2, "0");
                        const row = (
                          <>
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold">{lessonTitle.get(lesson.id)}</span>
                              <span className={`block text-sm ${style.label}`}>
                                {state === "locked" ? t("course.lockedHint") : t(`course.state.${state}`)}
                              </span>
                            </span>
                            {state !== "locked" && <span className="shrink-0 text-sm font-semibold text-brand-dark">{t("course.viewLesson")} →</span>}
                          </>
                        );
                        const rowClass = `flex min-h-16 flex-1 items-center gap-3 rounded-2xl border px-4 py-3 transition ${style.row}`;
                        return (
                          <li key={lesson.id} className="flex gap-3">
                            {/* Cột số thứ tự và đường nối giữa các bài */}
                            <div className="flex w-12 shrink-0 flex-col items-center">
                              <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold ${style.dot}`}>
                                {state === "done" ? "✓" : number}
                              </span>
                              {i < unitLessons.length - 1 && <span className="my-1 w-0.5 flex-1 rounded-full bg-line" />}
                            </div>
                            <div className={`flex flex-1 ${i < unitLessons.length - 1 ? "pb-3" : ""}`}>
                              {state === "locked" ? (
                                <div className={rowClass} aria-disabled="true">
                                  {row}
                                </div>
                              ) : (
                                <Link href={`/lesson/${lesson.id}`} className={rowClass}>
                                  {row}
                                </Link>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="card text-center text-muted">{t("course.levelEmpty")}</p>
          )}
        </section>
      </div>
    </div>
  );
}
