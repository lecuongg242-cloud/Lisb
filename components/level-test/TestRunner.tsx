"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { startLevelTestAction, submitLevelTestAction } from "@/app/test/actions";
import { SpeakButtons } from "@/components/player/shared";
import type { StartedTest, TestQuestion, TestResult } from "@/lib/level-test/types";

type Props = {
  levelId: string;
  levelName: string;
  /** Đường dẫn quay về lộ trình của cấp này. */
  backHref: string;
  questionCount: number;
  passPercent: number;
  /** Điểm cao nhất trước đó; null nếu chưa làm lần nào. */
  bestPercent: number | null;
  alreadyPassed: boolean;
  ttsLocale: string;
};

type Phase = "intro" | "starting" | "running" | "submitting" | "result";

export function TestRunner({ levelId, levelName, backHref, questionCount, passPercent, bestPercent, alreadyPassed, ttsLocale }: Props) {
  const t = useTranslations();
  const [phase, setPhase] = useState<Phase>("intro");
  const [test, setTest] = useState<StartedTest | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setPhase("starting");
    setError(null);
    try {
      const response = await startLevelTestAction(levelId);
      if (!response.ok) {
        setError(t(response.reason === "unavailable" ? "levelTest.unavailable" : "common.error"));
        return setPhase("intro");
      }
      setTest(response.test);
      setAnswers({});
      setIndex(0);
      setResult(null);
      setPhase("running");
    } catch {
      setError(t("common.error"));
      setPhase("intro");
    }
  };

  const submit = async () => {
    if (!test) return;
    setPhase("submitting");
    setError(null);
    try {
      const response = await submitLevelTestAction({ attemptId: test.attempt_id, answers });
      if (!response.ok) {
        setError(t(response.reason === "closed" ? "levelTest.closed" : "common.error"));
        return setPhase("running");
      }
      setResult(response.result);
      setPhase("result");
    } catch {
      setError(t("common.error"));
      setPhase("running");
    }
  };

  // ----- Giới thiệu -----
  if (phase === "intro" || phase === "starting" || !test) {
    return (
      <Shell backHref={backHref} closeLabel={t("common.close")}>
        <div className="card flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-brand-dark uppercase">{t("levelTest.eyebrow")}</p>
            <h1 className="mt-1 text-2xl font-bold">{t("levelTest.title", { level: levelName })}</h1>
          </div>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>{t("levelTest.ruleCount", { count: questionCount })}</li>
            <li>{t("levelTest.rulePass", { percent: passPercent })}</li>
            <li>{t("levelTest.ruleNoFeedback")}</li>
            <li>{t("levelTest.ruleRetake")}</li>
          </ul>
          {bestPercent !== null && (
            <p className={`rounded-2xl px-4 py-3 text-sm font-medium ${alreadyPassed ? "bg-ok-bg text-ok-text" : "bg-warn-bg text-warn-text"}`}>
              {alreadyPassed ? t("levelTest.alreadyPassed", { percent: bestPercent }) : t("levelTest.bestSoFar", { percent: bestPercent, required: passPercent })}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad-text">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={() => void start()} disabled={phase === "starting"}>
            {phase === "starting" ? t("levelTest.starting") : t("levelTest.start")}
          </button>
        </div>
      </Shell>
    );
  }

  // ----- Kết quả -----
  if (phase === "result" && result) {
    const detailById = new Map(result.details.map((d) => [d.question_id, d]));
    return (
      <Shell backHref={backHref} closeLabel={t("common.close")}>
        <div className={`flex flex-col items-center gap-2 rounded-3xl border p-6 text-center ${result.passed ? "border-ok-border bg-ok-bg" : "border-warn-border bg-warn-bg"}`}>
          <p className="text-xs font-bold tracking-widest uppercase">{t("levelTest.title", { level: levelName })}</p>
          <p className="text-5xl font-bold">{result.percent}%</p>
          <p className="text-lg font-semibold">{result.passed ? t("levelTest.passed") : t("levelTest.failed")}</p>
          <p className="text-sm">{t("levelTest.score", { correct: result.correct, total: result.total, required: result.pass_percent })}</p>
        </div>

        <section className="card flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t("levelTest.reviewTitle")}</h2>
          <ol className="flex flex-col gap-2">
            {test.questions.map((question, i) => {
              const detail = detailById.get(question.id);
              const given = answers[question.id] ?? "";
              const givenLabel = question.options ? (question.options.find((o) => o.id === given)?.label ?? "") : given;
              return (
                <li key={question.id} className={`flex gap-3 rounded-2xl border p-3 ${detail?.is_correct ? "border-ok-border" : "border-bad-border"}`}>
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${detail?.is_correct ? "bg-ok-bg text-ok-text" : "bg-bad-bg text-bad-text"}`}
                    aria-label={detail?.is_correct ? t("player.correct") : t("player.wrong")}
                  >
                    {detail?.is_correct ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-muted">
                      {t("levelTest.questionNumber", { current: i + 1, total: test.questions.length })} · {question.prompt_source ?? t(`levelTest.kind.${question.type}`)}
                    </p>
                    <p className="text-base font-semibold">{detail?.correct_answer}</p>
                    {!detail?.is_correct && <p className="text-bad-text">{givenLabel ? t("levelTest.yourAnswer", { answer: givenLabel }) : t("levelTest.noAnswer")}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" className={`btn flex-1 ${result.passed ? "btn-secondary" : "btn-primary"}`} onClick={() => void start()}>
            {t("levelTest.retake")}
          </button>
          <Link href={backHref} className={`btn flex-1 ${result.passed ? "btn-primary" : "btn-secondary"}`}>
            {t("levelTest.backToCourse")}
          </Link>
        </div>
      </Shell>
    );
  }

  // ----- Đang làm bài -----
  const question = test.questions[index];
  const total = test.questions.length;
  const isLast = index === total - 1;
  const unanswered = test.questions.filter((q) => !(answers[q.id] ?? "").trim()).length;
  const setAnswer = (value: string) => setAnswers({ ...answers, [question.id]: value });
  const goNext = () => (isLast ? void submit() : setIndex(index + 1));

  return (
    <Shell backHref={backHref} closeLabel={t("common.close")} progress={(index + 1) / total} progressLabel={t("levelTest.questionNumber", { current: index + 1, total })}>
      <p className="text-center text-sm font-semibold text-muted">{t("levelTest.questionNumber", { current: index + 1, total })}</p>
      <QuestionView key={question.id} question={question} value={answers[question.id] ?? ""} onChange={setAnswer} onEnter={goNext} ttsLocale={ttsLocale} />

      {isLast && unanswered > 0 && <p className="rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn-text">{t("levelTest.unanswered", { count: unanswered })}</p>}
      {error && (
        <p role="alert" className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad-text">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => setIndex(index - 1)} disabled={index === 0 || phase === "submitting"}>
          {t("common.back")}
        </button>
        <button type="button" className="btn btn-primary flex-1" onClick={goNext} disabled={phase === "submitting"}>
          {phase === "submitting" ? t("levelTest.submitting") : isLast ? t("levelTest.submit") : t("common.continue")}
        </button>
      </div>
    </Shell>
  );
}

function QuestionView({
  question,
  value,
  onChange,
  onEnter,
  ttsLocale,
}: {
  question: TestQuestion;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  ttsLocale: string;
}) {
  const t = useTranslations();
  const isListening = question.type === "listen_choose" || question.type === "listen_type";

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-center text-sm font-semibold tracking-wide text-muted uppercase">{t(`levelTest.kind.${question.type}`)}</h2>

      {isListening ? (
        // Bài kiểm tra không gửi chữ của câu xuống trình duyệt, nên chỉ phát được file âm thanh sinh sẵn.
        <SpeakButtons text="" locale={ttsLocale} audioKey={question.audio_key ?? undefined} autoPlay large />
      ) : (
        <div className="text-center text-2xl">
          {question.prompt_target && <p className="text-muted">{question.prompt_target}</p>}
          {question.prompt_source && <p className="font-medium">{question.prompt_source}</p>}
        </div>
      )}

      {question.options ? (
        <ul className="flex flex-col gap-2">
          {question.options.map((option) => {
            const selected = value === option.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(option.id)}
                  className={`flex min-h-14 w-full items-center rounded-2xl border px-4 py-2 text-left text-base font-medium ${selected ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <input
          className="field text-lg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder={t("player.typeHere")}
          aria-label={t("player.typeHere")}
          lang={ttsLocale}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      )}
    </div>
  );
}

function Shell({
  backHref,
  closeLabel,
  progress,
  progressLabel,
  children,
}: {
  backHref: string;
  closeLabel: string;
  progress?: number;
  progressLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-4 pt-4 pb-8">
      <header className="flex items-center gap-3">
        <Link href={backHref} aria-label={closeLabel} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-lg text-muted">
          ✕
        </Link>
        {progress !== undefined && (
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-label={progressLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
