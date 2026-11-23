import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { countDueCards, countSessionsToday, getCompletedSessionTypes, getLearnerContext } from "@/lib/data";
import { SESSION_TYPES } from "@/lib/exercises/types";

/** Từ 5 thẻ đến hạn trở lên thì ưu tiên ôn trước khi học bài mới. */
const REVIEW_FIRST_THRESHOLD = 5;

export default async function HomePage() {
  const ctx = await getLearnerContext();
  const t = await getTranslations();
  const lessonId = ctx.enrollment.currentLessonId;

  const [due, sessionsToday, done, lessonTitle] = await Promise.all([
    countDueCards(ctx),
    countSessionsToday(ctx),
    lessonId ? getCompletedSessionTypes(ctx.supabase, ctx.userId, lessonId) : Promise.resolve(new Set<string>()),
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

  const nextSession = lessonId ? SESSION_TYPES.find((type) => !done.has(type)) : undefined;
  let next: { href: string; label: string } | null = null;
  if (due >= REVIEW_FIRST_THRESHOLD || (!nextSession && due > 0)) {
    next = { href: "/review", label: t("home.nextReview", { count: due }) };
  } else if (lessonId && nextSession) {
    next = {
      href: `/learn/${lessonId}/${nextSession}`,
      label: nextSession === "vocab" ? t("home.nextVocab") : t("home.nextListening"),
    };
  }

  const name = ctx.profile.display_name;
  return (
    <div className="flex flex-col gap-5">
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
          </div>
          <ul className="flex flex-col gap-2">
            {SESSION_TYPES.map((type, i) => {
              const isDone = done.has(type);
              const locked = i > 0 && !done.has(SESSION_TYPES[i - 1]);
              const row = (
                <>
                  <span className="font-medium">{t(`session.${type}`)}</span>
                  <span className={`text-sm ${isDone ? "text-brand-dark" : "text-muted"}`}>
                    {isDone ? t("session.done") : locked ? t("session.locked") : t("session.notDone")}
                  </span>
                </>
              );
              const className = "flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-line px-4";
              return (
                <li key={type}>
                  {locked ? (
                    <div className={`${className} opacity-60`}>{row}</div>
                  ) : (
                    <Link href={`/learn/${lessonId}/${type}`} className={`${className} hover:bg-page`}>
                      {row}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted">{t("ai.notice")}</p>
    </div>
  );
}
