import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { countDueCards, countSessionsToday, getCompletedSessions, getLearnerContext, getLessonSessions, type LessonSession } from "@/lib/data";
import { nextSessionNo } from "@/lib/progress";

/** Từ 5 thẻ đến hạn trở lên thì ưu tiên ôn trước khi học phần mới. */
const REVIEW_FIRST_THRESHOLD = 5;

export default async function HomePage() {
  const ctx = await getLearnerContext();
  const t = await getTranslations();
  const lessonId = ctx.enrollment.currentLessonId;

  const [due, sessionsToday, done, sessionsByLesson, lessonTitle] = await Promise.all([
    countDueCards(ctx),
    countSessionsToday(ctx),
    lessonId ? getCompletedSessions(ctx.supabase, ctx.userId, lessonId) : Promise.resolve(new Set<number>()),
    lessonId ? getLessonSessions(ctx.supabase, [lessonId]) : Promise.resolve(new Map<string, LessonSession[]>()),
    lessonId
      ? ctx.supabase
          .from("lesson_translations")
          .select("title")
          .eq("lesson_id", lessonId)
          .eq("locale", ctx.enrollment.sourceLang)
          .maybeSingle()
          .then((r) => r.data?.title as string | undefined)
      : Promise.resolve(undefined),
  ]);

  const sessions = lessonId ? (sessionsByLesson.get(lessonId) ?? []) : [];
  const nextNo = nextSessionNo(
    sessions.map((s) => s.no),
    done,
  );
  const nextSession = sessions.find((s) => s.no === nextNo);
  const kindLabel = (kind: string, type: string) => (t.has(`sessionKind.${kind}`) ? t(`sessionKind.${kind}`) : t(`session.${type}`));

  let next: { href: string; label: string } | null = null;
  if (due >= REVIEW_FIRST_THRESHOLD || (!nextSession && due > 0)) {
    next = { href: "/review", label: t("home.nextReview", { count: due }) };
  } else if (lessonId && nextSession) {
    next = { href: `/learn/${lessonId}/${nextSession.no}`, label: kindLabel(nextSession.kind, nextSession.type) };
  }

  const name = ctx.profile.display_name;
  const doneCount = sessions.filter((s) => done.has(s.no)).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">{name ? t("home.greeting", { name }) : t("home.greetingNoName")}</h1>
        <p className="mt-1 text-sm text-muted">{t("home.sessionsToday", { done: sessionsToday, goal: ctx.profile.daily_goal })}</p>
      </div>

      {next ? (
        <Link
          href={next.href}
          className="flex min-h-36 flex-col items-center justify-center gap-1 rounded-3xl bg-brand px-6 py-8 text-center text-on-brand shadow-lg shadow-brand/25 transition hover:bg-brand-dark active:scale-[0.99]"
        >
          <span className="text-3xl font-bold">{t("home.twoMinutes")}</span>
          <span className="text-base text-on-brand/85">{next.label}</span>
        </Link>
      ) : (
        <div className="card text-center text-muted">{t("home.allDone")}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-sm text-muted">{t("nav.review")}</p>
          <p className="mt-1 font-semibold">{t("home.due", { count: due })}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">{t("app.name")}</p>
          <p className="mt-1 font-semibold">{t("home.streak", { count: ctx.profile.streak_count })}</p>
        </div>
      </div>

      {lessonId && (
        <section className="card flex flex-col gap-3">
          <div>
            <p className="text-sm text-muted">{t("home.currentLesson")}</p>
            <h2 className="text-lg font-semibold">{lessonTitle}</h2>
            <p className="mt-1 text-sm text-muted">{t("home.lessonProgress", { done: doneCount, total: sessions.length })}</p>
            <Link href={`/lesson/${lessonId}`} className="mt-1 inline-block text-sm font-semibold text-brand-dark hover:underline">
              {t("home.openLesson")} →
            </Link>
          </div>
          <ol className="flex flex-col gap-2">
            {sessions.map((session) => {
              const isDone = done.has(session.no);
              const locked = !isDone && session.no !== nextNo;
              const row = (
                <>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${isDone ? "border-brand bg-brand text-on-brand" : "border-line text-muted"}`}
                  >
                    {isDone ? "✓" : session.no}
                  </span>
                  <span className="min-w-0 flex-1 font-medium">{kindLabel(session.kind, session.type)}</span>
                  <span className={`shrink-0 text-sm ${isDone ? "text-brand-dark" : "text-muted"}`}>
                    {isDone ? t("session.done") : locked ? t("session.locked") : t("lesson.steps", { count: session.steps })}
                  </span>
                </>
              );
              const className = "flex min-h-12 items-center gap-3 rounded-2xl border border-line px-3 py-2";
              return (
                <li key={session.no}>
                  {locked ? (
                    <div className={`${className} opacity-60`}>{row}</div>
                  ) : (
                    <Link href={`/learn/${lessonId}/${session.no}`} className={`${className} hover:bg-page`}>
                      {row}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted">{t("ai.notice")}</p>
    </div>
  );
}
