import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SpeakIconButton } from "@/components/SpeakIconButton";
import { getCompletedSessionTypes, getLearnerContext, getOrderedLessons, loadLessonDetail, type Bilingual } from "@/lib/data";
import { SESSION_TYPES } from "@/lib/exercises/types";
import { lessonState } from "@/lib/progress";

function Tip({ title, tip }: { title: string; tip: Bilingual }) {
  if (!tip.target && !tip.source) return null;
  return (
    <div className="card flex flex-col gap-2">
      <h2 className="text-xs font-bold tracking-widest text-brand-dark uppercase">{title}</h2>
      {tip.source && <p>{tip.source}</p>}
      {tip.target && <p className="text-sm text-muted">{tip.target}</p>}
    </div>
  );
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();

  const ctx = await getLearnerContext();
  const t = await getTranslations();
  const [detail, completed, ordered] = await Promise.all([
    loadLessonDetail(ctx, lessonId),
    getCompletedSessionTypes(ctx.supabase, ctx.userId, lessonId),
    getOrderedLessons(ctx.supabase, ctx.course.id),
  ]);
  if (!detail) notFound();

  const published = ordered.filter((l) => l.status === "published");
  const state = lessonState(
    published.findIndex((l) => l.id === lessonId),
    published.findIndex((l) => l.id === ctx.enrollment.currentLessonId),
    completed,
  );
  const locked = state === "locked";
  const locale = ctx.course.ttsLocale;
  const { words, sentences } = detail.content;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link href="/course" className="self-start text-sm font-semibold text-brand-dark hover:underline">
          ← {t("lesson.back")}
        </Link>
        <p className="text-xs font-bold tracking-widest text-brand-dark uppercase">
          {t("lesson.eyebrow", { unit: detail.unitTitle ?? "", number: detail.number })}
        </p>
        <h1 className="text-3xl font-bold">{detail.title}</h1>
        <p className={`text-sm ${state === "done" || state === "current" ? "text-brand-dark" : "text-muted"}`}>{t(`lesson.status.${state}`)}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-5">
          {/* Từ mới */}
          <section className="card flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold">{t("lesson.words")}</h2>
              <span className="text-sm text-muted">{t("lesson.wordsCount", { count: detail.wordIds.length })}</span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {detail.wordIds.map((id) => {
                const word = words[id];
                return (
                  <li key={id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                    <SpeakIconButton text={word.lemma} locale={locale} audioKey={word.audioKey} label={t("lesson.listen")} />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-lg font-bold">{word.lemma}</span>
                        {word.pronunciation && <span className="text-sm text-muted">{word.pronunciation}</span>}
                      </p>
                      <p className="font-medium">{word.meaningSource}</p>
                      {word.meaningTarget && <p className="text-sm text-muted">{word.meaningTarget}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Câu mẫu */}
          <section className="card flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold">{t("lesson.sentences")}</h2>
              <span className="text-sm text-muted">{t("lesson.sentencesCount", { count: detail.sentenceIds.length })}</span>
            </div>
            <ol className="flex flex-col gap-2">
              {detail.sentenceIds.map((id, i) => {
                const sentence = sentences[id];
                return (
                  <li key={id} className="flex items-start gap-3 rounded-2xl border border-line p-3">
                    <SpeakIconButton text={sentence.text} locale={locale} audioKey={sentence.audioKey} label={t("lesson.listen")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold">
                        <span className="mr-2 text-sm font-bold text-muted">{i + 1}</span>
                        {sentence.text}
                      </p>
                      {sentence.translation && <p>{sentence.translation}</p>}
                      {(sentence.noteSource || sentence.noteTarget) && (
                        <p className="mt-1 text-sm text-muted">{sentence.noteSource ?? sentence.noteTarget}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <Tip title={t("lesson.grammar")} tip={detail.grammarTip} />
          <Tip title={t("lesson.pronunciation")} tip={detail.pronunciationTip} />
        </div>

        {/* Cột luyện tập */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <section className="card flex flex-col gap-3">
            <div>
              <h2 className="text-lg font-bold">{t("lesson.practice")}</h2>
              <p className="text-sm text-muted">{t("lesson.practiceHint")}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {SESSION_TYPES.map((type, i) => {
                const steps = detail.exerciseCounts[type] ?? 0;
                const isDone = completed.has(type);
                const blocked = locked || steps === 0 || (i > 0 && !completed.has(SESSION_TYPES[i - 1]));
                return (
                  <li key={type} className={`flex items-center gap-3 rounded-2xl border p-3 ${isDone ? "border-ok-border bg-ok-bg" : "border-line"}`}>
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${isDone ? "border-brand bg-brand text-on-brand" : "border-line text-muted"}`}
                    >
                      {isDone ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{t(`session.${type}`)}</p>
                      <p className="text-sm text-muted">
                        {steps === 0 ? t("lesson.notReady") : blocked && !locked ? t("lesson.locked") : t("lesson.steps", { count: steps })}
                      </p>
                    </div>
                    {!blocked && (
                      <Link href={`/learn/${detail.id}/${type}`} className={`btn min-h-10 px-4 text-sm ${isDone ? "btn-secondary" : "btn-primary"}`}>
                        {isDone ? t("lesson.redo") : t("lesson.start")}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {detail.canDo && (
            <section className="card">
              <h2 className="text-xs font-bold tracking-widest text-brand-dark uppercase">{t("lesson.goal")}</h2>
              <p className="mt-2">{detail.canDo}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
