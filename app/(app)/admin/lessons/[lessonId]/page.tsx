import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SpeakIconButton } from "@/components/SpeakIconButton";
import { getAdmin, loadLessonPreview, type PreviewExercise } from "@/lib/admin";
import type { Bilingual } from "@/lib/data";
import { sessionLabels } from "@/lib/session-label";
import type { ContentBundle } from "@/lib/views";
import { PublishButton } from "../PublishButton";

type Translate = (key: string, values?: Record<string, string | number>) => string;

const idsOf = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

/** Danh sách lựa chọn của một câu hỏi; lựa chọn đúng được tô màu. */
function Options({ options }: { options: { key: string; label: string; correct: boolean }[] }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <li key={o.key} className={`rounded-xl border px-2.5 py-1 text-sm ${o.correct ? "border-ok-border bg-ok-bg font-semibold text-ok-text" : "border-line"}`}>
          {o.label}
        </li>
      ))}
    </ul>
  );
}

/** Một bài tập viết ra thành chữ: đề bài, các lựa chọn và đáp án. */
function ExerciseBody({ exercise, content, t }: { exercise: PreviewExercise; content: ContentBundle; t: Translate }) {
  const p = exercise.payload;
  const word = typeof p.word_id === "string" ? content.words[p.word_id] : undefined;
  const sentence = typeof p.sentence_id === "string" ? content.sentences[p.sentence_id] : undefined;
  const missing = <p className="text-sm text-bad-text">{t("admin.preview.missingRef")}</p>;

  switch (exercise.type) {
    case "word_intro":
      return word ? (
        <p>
          <span className="font-semibold">{word.lemma}</span> · {word.meaningSource}
        </p>
      ) : (
        missing
      );
    case "choose_meaning":
    case "choose_word": {
      if (!word) return missing;
      const asMeaning = exercise.type === "choose_meaning";
      return (
        <>
          <p className="font-semibold">{asMeaning ? word.lemma : word.meaningSource}</p>
          <Options
            options={idsOf(p.option_word_ids).map((id) => ({
              key: id,
              label: (asMeaning ? content.words[id]?.meaningSource : content.words[id]?.lemma) ?? "?",
              correct: id === word.id,
            }))}
          />
        </>
      );
    }
    case "match_pairs":
      return (
        <ul className="flex flex-wrap gap-1.5">
          {idsOf(p.word_ids).map((id) => (
            <li key={id} className="rounded-xl border border-line px-2.5 py-1 text-sm">
              <span className="font-semibold">{content.words[id]?.lemma ?? "?"}</span> = {content.words[id]?.meaningSource ?? "?"}
            </li>
          ))}
        </ul>
      );
    case "type_word":
      return word ? (
        <p>
          {word.meaningSource} → <span className="font-semibold text-ok-text">{word.lemma}</span>
        </p>
      ) : (
        missing
      );
    case "listen_choose":
      return sentence ? (
        <Options options={idsOf(p.option_sentence_ids).map((id) => ({ key: id, label: content.sentences[id]?.text ?? "?", correct: id === sentence.id }))} />
      ) : (
        missing
      );
    case "listen_arrange": {
      if (!sentence) return missing;
      const distractors = Array.isArray(p.distractor_tokens) ? (p.distractor_tokens as string[]) : [];
      return (
        <>
          <p className="font-semibold">{sentence.text}</p>
          <Options
            options={[
              ...sentence.chips.map((chip, i) => ({ key: `c${i}`, label: chip, correct: true })),
              ...distractors.map((chip, i) => ({ key: `d${i}`, label: chip, correct: false })),
            ]}
          />
        </>
      );
    }
    case "listen_type":
      return sentence ? (
        <>
          <p className="font-semibold text-ok-text">{sentence.text}</p>
          {sentence.accepted.length > 0 && <p className="text-sm text-muted">{t("admin.preview.alsoAccepted", { forms: sentence.accepted.join(" · ") })}</p>}
        </>
      ) : (
        missing
      );
    default:
      return <p className="text-sm text-muted">{exercise.type}</p>;
  }
}

function Tip({ title, tip }: { title: string; tip: Bilingual }) {
  if (!tip.target && !tip.source) return null;
  return (
    <section className="card flex flex-col gap-2">
      <h2 className="text-xs font-bold tracking-widest text-brand-dark uppercase">{title}</h2>
      {tip.source && <p>{tip.source}</p>}
      {tip.target && <p className="text-sm text-muted">{tip.target}</p>}
    </section>
  );
}

const EXERCISE_LABEL: Record<string, string> = {
  word_intro: "player.newWord",
  choose_meaning: "player.chooseMeaning",
  choose_word: "player.chooseWord",
  match_pairs: "player.matchPairs",
  type_word: "player.typeWord",
  listen_choose: "player.listenChoose",
  listen_arrange: "player.listenArrange",
  listen_type: "player.listenType",
};

// Quản trị xem toàn bộ nội dung của một bài (kể cả bài nháp) trước khi xuất bản: từ, câu, mẹo và bài tập.
export default async function AdminLessonPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ fresh?: string }>;
}) {
  const { lessonId } = await params;
  const fresh = (await searchParams).fresh === "1";
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();

  const admin = await getAdmin();
  const t = await getTranslations();
  if (!admin) return null;
  const preview = await loadLessonPreview(admin.supabase, lessonId, { fresh });
  if (!preview) notFound();

  const { detail, content } = preview;
  const { words, sentences } = detail.content;
  const locale = preview.ttsLocale;
  const labels = sessionLabels(preview.sessions, { has: (key) => t.has(key), text: (key) => t(key) });
  const isReview = preview.kind === "review";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link href="/admin/lessons" className="self-start text-sm font-semibold text-brand-dark hover:underline">
          ← {t("admin.preview.back")}
        </Link>
        <p className="text-xs font-bold tracking-widest text-brand-dark uppercase">{t("lesson.eyebrow", { unit: detail.unitTitle ?? "", number: detail.number })}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{detail.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {t(`admin.status.${preview.status}`)} · {t("lesson.wordsCount", { count: detail.wordIds.length })} · {t("lesson.sentencesCount", { count: detail.sentenceIds.length })}
            </p>
          </div>
          {!isReview && <PublishButton lessonId={detail.id} published={preview.status === "published"} />}
        </div>
      </header>

      {isReview && <p className="card text-sm text-muted">{t("lesson.reviewIntro")}</p>}

      {detail.wordIds.length > 0 && (
        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("lesson.words")}</h2>
          <ul className="flex flex-col gap-2">
            {detail.wordIds.map((id) => {
              const word = words[id];
              const extra = preview.wordExtra[id];
              const example = word.exampleSentenceId ? sentences[word.exampleSentenceId] : undefined;
              return (
                <li key={id} className="flex items-start gap-3 rounded-2xl border border-line p-3">
                  <SpeakIconButton text={word.lemma} locale={locale} audioKey={word.audioKey} label={t("lesson.listen")} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-base">
                      <span className="text-lg font-bold">{word.lemma}</span>
                      {word.pronunciation ? <span className="text-muted">{word.pronunciation}</span> : <span className="text-bad-text">{t("admin.preview.noPronunciation")}</span>}
                      {word.pos && <span className="rounded-lg bg-page px-1.5 text-xs text-muted">{word.pos}</span>}
                      {extra?.levelTag && <span className="rounded-lg bg-page px-1.5 text-xs text-muted">{extra.levelTag}</span>}
                    </p>
                    {word.meaningSource ? <p className="text-base font-medium">{word.meaningSource}</p> : <p className="text-bad-text">{t("admin.preview.noMeaning")}</p>}
                    {word.meaningTarget && <p className="text-muted">{word.meaningTarget}</p>}
                    {!!extra?.acceptedMeanings.length && <p className="text-muted">{t("admin.preview.alsoAccepted", { forms: extra.acceptedMeanings.join(" · ") })}</p>}
                    {(word.usageNoteSource || word.usageNoteTarget) && <p className="mt-1 text-muted">{word.usageNoteSource ?? word.usageNoteTarget}</p>}
                    {example && (
                      <p className="mt-1">
                        <span className="text-muted">{t("player.example")}:</span> {example.text}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {detail.sentenceIds.length > 0 && (
        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("lesson.sentences")}</h2>
          <ol className="flex flex-col gap-2">
            {detail.sentenceIds.map((id, i) => {
              const sentence = sentences[id];
              const unlinked = sentence.tokens.filter((token) => !token.wordId).map((token) => token.surface);
              return (
                <li key={id} className="flex items-start gap-3 rounded-2xl border border-line p-3">
                  <SpeakIconButton text={sentence.text} locale={locale} audioKey={sentence.audioKey} label={t("lesson.listen")} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-lg font-semibold">
                      <span className="mr-2 text-sm font-bold text-muted">{i + 1}</span>
                      {sentence.text}
                    </p>
                    {sentence.translation ? <p className="text-base">{sentence.translation}</p> : <p className="text-bad-text">{t("admin.preview.noMeaning")}</p>}
                    {sentence.accepted.length > 0 && <p className="text-muted">{t("admin.preview.alsoAccepted", { forms: sentence.accepted.join(" · ") })}</p>}
                    {(sentence.noteSource || sentence.noteTarget) && <p className="mt-1 text-muted">{sentence.noteSource ?? sentence.noteTarget}</p>}
                    {unlinked.length > 0 && <p className="mt-1 text-bad-text">{t("admin.preview.unlinkedTokens", { tokens: unlinked.join(", ") })}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <Tip title={t("lesson.grammar")} tip={detail.grammarTip} />
      <Tip title={t("lesson.pronunciation")} tip={detail.pronunciationTip} />

      <section className="card flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold">{t("admin.preview.exercises")}</h2>
          <p className="text-sm text-muted">
            {preview.exerciseSource === "saved"
              ? t("admin.preview.sourceSaved", { count: preview.exercises.length })
              : preview.exerciseSource === "generated"
                ? t("admin.preview.sourceGenerated", { count: preview.exercises.length })
                : t("admin.preview.sourceNone")}
          </p>
          {preview.hasSaved && (
            <Link href={fresh ? `/admin/lessons/${detail.id}` : `/admin/lessons/${detail.id}?fresh=1`} className="mt-1 inline-block text-sm font-semibold text-brand-dark hover:underline">
              {fresh ? t("admin.preview.showSaved") : t("admin.preview.showFresh")}
            </Link>
          )}
        </div>
        {preview.problem && (
          <p role="alert" className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad-text">
            {preview.problem.reason === "missing_translations"
              ? t("admin.missingTranslations", { words: (preview.problem.words ?? []).join(", ") })
              : preview.problem.reason === "no_content"
                ? t("admin.noContent")
                : t("common.error")}
          </p>
        )}
        {preview.sessions.map((session) => {
          const own = preview.exercises.filter((e) => e.sessionNo === session.no);
          return (
            <div key={session.no} className="flex flex-col gap-2">
              <h3 className="font-semibold">
                {t("lesson.partNumber", { number: session.no })} · {labels.get(session.no)}
                <span className="ml-2 text-sm font-normal text-muted">
                  {t("lesson.steps", { count: own.length })}
                  {session.passPercent !== null && ` · ${t("admin.preview.passMark", { percent: session.passPercent })}`}
                </span>
              </h3>
              <ol className="flex flex-col gap-2">
                {own.map((exercise) => (
                  <li key={`${exercise.sessionNo}-${exercise.order}`} className="flex gap-3 rounded-2xl border border-line p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-xs font-bold text-muted">{exercise.order}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{EXERCISE_LABEL[exercise.type] ? t(EXERCISE_LABEL[exercise.type]) : exercise.type}</p>
                      <ExerciseBody exercise={exercise} content={content} t={t as unknown as Translate} />
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </section>
    </div>
  );
}
