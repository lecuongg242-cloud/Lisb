import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ReportButton } from "@/components/ReportButton";
import { SpeakIconButton } from "@/components/SpeakIconButton";
import {
  getCompletedSessions,
  getLearnerContext,
  loadLessonDetail,
  type Bilingual,
} from "@/lib/data";
import { getLearningPath } from "@/lib/path";
import { lessonState, nextSessionNo } from "@/lib/progress";
import { sessionLabels } from "@/lib/session-label";

function Tip({ title, tip }: { title: string; tip: Bilingual }) {
  if (!tip.target && !tip.source) return null;
  return (
    <div className="card flex flex-col gap-2">
      <h2 className="text-xs font-bold tracking-widest text-brand-dark uppercase">
        {title}
      </h2>
      {tip.source && <p>{tip.source}</p>}
      {tip.target && <p className="text-sm text-muted">{tip.target}</p>}
    </div>
  );
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();

  const ctx = await getLearnerContext();
  const t = await getTranslations();
  const [detail, completed, path] = await Promise.all([
    loadLessonDetail(ctx, lessonId),
    getCompletedSessions(ctx.supabase, ctx.userId, lessonId),
    getLearningPath(ctx),
  ]);
  if (!detail) notFound();

  const sessionNos = detail.sessions.map((s) => s.no);
  const state = lessonState(
    path.lessons.findIndex((l) => l.id === lessonId),
    path.currentIndex,
    sessionNos.filter((no) => completed.has(no)).length,
    sessionNos.length,
  );
  const nextNo = nextSessionNo(sessionNos, completed);
  const labels = sessionLabels(detail.sessions, {
    has: (key) => t.has(key),
    text: (key) => t(key),
  });
  const locked = state === "locked";
  const locale = ctx.course.ttsLocale;
  const { words, sentences } = detail.content;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href="/course"
          className="self-start text-sm font-semibold text-brand-dark hover:underline"
        >
          ← {t("lesson.back")}
        </Link>
        <p className="text-xs font-bold tracking-widest text-brand-dark uppercase">
          {t("lesson.eyebrow", {
            unit: detail.unitTitle ?? "",
            number: detail.number,
          })}
        </p>
        <h1 className="text-3xl font-bold">{detail.title}</h1>
        <p
          className={`text-sm ${state === "done" || state === "current" ? "text-brand-dark" : "text-muted"}`}
        >
          {t(`lesson.status.${state}`)}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-5">
          {detail.wordIds.length === 0 && detail.sentenceIds.length === 0 && (
            <section className="card flex flex-col gap-2">
              <h2 className="text-xs font-bold tracking-widest text-brand-dark uppercase">
                {t("lesson.reviewBadge")}
              </h2>
              <p>{t("lesson.reviewIntro")}</p>
            </section>
          )}

          {/* Từ mới */}
          {detail.wordIds.length > 0 && (
            <section className="card flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold">{t("lesson.words")}</h2>
                <span className="text-sm text-muted">
                  {t("lesson.wordsCount", { count: detail.wordIds.length })}
                </span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {detail.wordIds.map((id) => {
                  const word = words[id];
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-3 rounded-2xl border border-line p-3"
                    >
                      <SpeakIconButton
                        text={word.lemma}
                        locale={locale}
                        audioKey={word.audioKey}
                        label={t("lesson.listen")}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-lg font-bold">
                            {word.lemma}
                          </span>
                          {word.pronunciation && (
                            <span className="text-sm text-muted">
                              {word.pronunciation}
                            </span>
                          )}
                        </p>
                        <p className="font-medium">{word.meaningSource}</p>
                        {word.meaningTarget && (
                          <p className="text-sm text-muted">
                            {word.meaningTarget}
                          </p>
                        )}
                      </div>
                      <ReportButton ownerType="word" ownerId={id} text={word.lemma} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Câu mẫu */}
          {detail.sentenceIds.length > 0 && (
            <section className="card flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold">{t("lesson.sentences")}</h2>
                <span className="text-sm text-muted">
                  {t("lesson.sentencesCount", {
                    count: detail.sentenceIds.length,
                  })}
                </span>
              </div>
              <ol className="flex flex-col gap-2">
                {detail.sentenceIds.map((id, i) => {
                  const sentence = sentences[id];
                  return (
                    <li
                      key={id}
                      className="flex items-start gap-3 rounded-2xl border border-line p-3"
                    >
                      <SpeakIconButton
                        text={sentence.text}
                        locale={locale}
                        audioKey={sentence.audioKey}
                        label={t("lesson.listen")}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold">
                          <span className="mr-2 text-sm font-bold text-muted">
                            {i + 1}
                          </span>
                          {sentence.text}
                        </p>
                        {sentence.translation && <p>{sentence.translation}</p>}
                        {(sentence.noteSource || sentence.noteTarget) && (
                          <p className="mt-1 text-sm text-muted">
                            {sentence.noteSource ?? sentence.noteTarget}
                          </p>
                        )}
                      </div>
                      <ReportButton ownerType="sentence" ownerId={id} text={sentence.text} />
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          <Tip title={t("lesson.grammar")} tip={detail.grammarTip} />
          <Tip
            title={t("lesson.pronunciation")}
            tip={detail.pronunciationTip}
          />
        </div>

        {/* Cột luyện tập */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <section className="card flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-bold">{t("lesson.practice")}</h2>
              <p className="text-sm text-muted">{t("lesson.practiceHint")}</p>
            </div>
            {detail.sessions.length === 0 && (
              <p className="text-sm text-muted">{t("lesson.notReady")}</p>
            )}
            <ol className="flex flex-col gap-2">
              {detail.sessions.map((session) => {
                const isDone = completed.has(session.no);
                // Phiên mở khi bài đã mở và mọi phiên đứng trước đã xong.
                const blocked = locked || (!isDone && session.no !== nextNo);
                return (
                  <li
                    key={session.no}
                    className={`flex items-center gap-3 rounded-2xl border p-3 ${isDone ? "border-ok-border bg-ok-bg" : "border-line"}`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${isDone ? "border-brand bg-brand text-on-brand" : "border-line text-muted"}`}
                    >
                      {isDone ? "✓" : session.no}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{labels.get(session.no)}</p>
                      <p className="text-sm text-muted">
                        {blocked && !locked
                          ? t("lesson.locked")
                          : `${t("lesson.steps", { count: session.steps })}${t.has(`sessionKindHint.${session.kind}`) ? ` · ${t(`sessionKindHint.${session.kind}`)}` : ""}`}
                      </p>
                    </div>
                    {!blocked && (
                      <Link
                        href={`/learn/${detail.id}/${session.no}`}
                        className={`btn min-h-10 shrink-0 px-4 text-sm ${isDone ? "btn-secondary" : "btn-primary"}`}
                      >
                        {isDone ? t("lesson.redo") : t("lesson.start")}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          {detail.canDo && (
            <section className="card">
              <h2 className="text-xs font-bold tracking-widest text-brand-dark uppercase">
                {t("lesson.goal")}
              </h2>
              <p className="mt-2">{detail.canDo}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
