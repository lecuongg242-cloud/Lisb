"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { completeSession } from "@/app/actions";
import { ReportButton } from "@/components/ReportButton";
import type { Exercise } from "@/lib/exercises/types";
import { getLanguageModule, type AnswerResult } from "@/lib/lang";
import type { ContentBundle } from "@/lib/views";
import { ExerciseView } from "./exercises";
import { TappableSentence } from "./shared";

type Props = {
  lessonId: string;
  sessionNo: number;
  /** Ngưỡng đạt của phiên (bài ôn); null với phiên luyện tập thường. */
  passPercent: number | null;
  title: string;
  exercises: Exercise[];
  content: ContentBundle;
  targetLang: string;
  ttsLocale: string;
};

type Item = { exercise: Exercise; retry: boolean };
type Attempt = { exerciseId: string; isCorrect: boolean; answer: string | null; retry: boolean };
type Feedback = { result: AnswerResult; answer: string | null; correctText: string | null };

const FEEDBACK_STYLE: Record<AnswerResult, string> = {
  correct: "border-ok-border bg-ok-bg",
  almost: "border-warn-border bg-warn-bg",
  wrong: "border-bad-border bg-bad-bg",
};

export function Player({ lessonId, sessionNo, passPercent, title, exercises, content, targetLang, ttsLocale }: Props) {
  const t = useTranslations();
  const lang = getLanguageModule(targetLang);
  const [queue, setQueue] = useState<Item[]>(() => exercises.map((exercise) => ({ exercise, retry: false })));
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [phase, setPhase] = useState<"run" | "saving" | "done" | "error">("run");
  const [summary, setSummary] = useState<{ durationSec: number; streak: number | null; nextSessionNo: number | null; passed: boolean; percent: number }>({
    durationSec: 0,
    streak: null,
    nextSessionNo: null,
    passed: true,
    percent: 0,
  });
  const startedAt = useRef<number | null>(null);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    sessionId.current = crypto.randomUUID();
  }, []);

  const item = queue[index];

  const save = async (finalAttempts: Attempt[], durationSec: number) => {
    setPhase("saving");
    try {
      const result = await completeSession({
        sessionId: sessionId.current ?? crypto.randomUUID(),
        lessonId,
        sessionNo,
        durationSec,
        attempts: finalAttempts.map(({ exerciseId, isCorrect, answer }) => ({ exerciseId, isCorrect, answer })),
      });
      if (!result.ok) return setPhase("error");
      setSummary({ durationSec, streak: result.streak, nextSessionNo: result.nextSessionNo, passed: result.passed, percent: result.percent });
      setPhase("done");
    } catch {
      setPhase("error");
    }
  };

  const goNext = (currentQueue: Item[], currentAttempts: Attempt[]) => {
    setFeedback(null);
    if (index + 1 < currentQueue.length) return setIndex(index + 1);
    const durationSec = Math.min(3600, Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000));
    setSummary({ durationSec, streak: null, nextSessionNo: null, passed: true, percent: 0 });
    void save(currentAttempts, durationSec);
  };

  const handleAnswer = (result: AnswerResult, answer: string | null, correctText: string | null) => {
    if (!item || feedback) return;
    // Màn hình giới thiệu từ không phải câu hỏi: đi tiếp luôn, không tính điểm.
    if (item.exercise.type === "word_intro") return goNext(queue, attempts);
    setAttempts([...attempts, { exerciseId: item.exercise.id, isCorrect: result !== "wrong", answer, retry: item.retry }]);
    setFeedback({ result, answer, correctText });
  };

  const handleContinue = () => {
    if (!item || !feedback) return;
    // Trả lời sai thì câu đó quay lại một lần nữa ở cuối phiên.
    const nextQueue = feedback.result === "wrong" && !item.retry ? [...queue, { exercise: item.exercise, retry: true }] : queue;
    if (nextQueue !== queue) setQueue(nextQueue);
    goNext(nextQueue, attempts);
  };

  const continueRef = useRef(handleContinue);
  useEffect(() => {
    continueRef.current = handleContinue;
  });
  const hasFeedback = feedback !== null;
  useEffect(() => {
    if (!hasFeedback) return;
    const onKey = (e: KeyboardEvent) => {
      // Đang mở hộp thoại báo lỗi thì phím Enter thuộc về hộp thoại.
      if (e.key === "Enter" && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        continueRef.current();
      }
    };
    // Gắn sau một nhịp để phím Enter vừa dùng để nộp câu trả lời không đồng thời bấm "Tiếp tục".
    const timer = window.setTimeout(() => window.addEventListener("keydown", onKey), 150);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [hasFeedback]);

  if (exercises.length === 0) {
    return (
      <Shell title={title} progress={0}>
        <p className="card text-center text-muted">{t("session.empty")}</p>
      </Shell>
    );
  }

  if (phase !== "run") {
    const firstTries = attempts.filter((a) => !a.retry);
    return (
      <Shell title={title} progress={1}>
        <div className="card flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-bold">{phase === "done" && !summary.passed ? t("player.notPassedTitle") : t("player.summaryTitle")}</h1>
          {phase === "done" && passPercent !== null && (
            <p className={summary.passed ? "font-semibold text-brand-dark" : "font-semibold text-bad-text"}>
              {summary.passed
                ? t("player.passed", { percent: summary.percent, required: passPercent })
                : t("player.notPassed", { percent: summary.percent, required: passPercent })}
            </p>
          )}
          <p className="text-lg">{t("player.summaryScore", { correct: firstTries.filter((a) => a.isCorrect).length, total: firstTries.length })}</p>
          <p className="text-muted">
            {t("player.summaryTime", { minutes: Math.floor(summary.durationSec / 60), seconds: summary.durationSec % 60 })}
          </p>
          {phase === "saving" && <p className="text-sm text-muted">{t("player.saving")}</p>}
          {phase === "done" && summary.streak !== null && <p className="font-semibold text-brand-dark">{t("player.summaryStreak", { count: summary.streak })}</p>}
          {phase === "error" && (
            <>
              <p role="alert" className="text-sm text-bad-text">
                {t("player.saveFailed")}
              </p>
              <button type="button" className="btn btn-secondary" onClick={() => void save(attempts, summary.durationSec)}>
                {t("player.retry")}
              </button>
            </>
          )}
        </div>
        {phase === "done" && !summary.passed && (
          // Thẻ a thường (không phải Link) để tải lại trang: phiên bắt đầu lại từ đầu với trạng thái mới.
          <a href={`/learn/${lessonId}/${sessionNo}`} className="btn btn-primary">
            {t("player.tryAgain")}
          </a>
        )}
        {phase === "done" && summary.passed && summary.nextSessionNo !== null && (
          <Link href={`/learn/${lessonId}/${summary.nextSessionNo}`} className="btn btn-primary">
            {t("player.nextSession")}
          </Link>
        )}
        {phase === "done" && summary.passed && summary.nextSessionNo === null && <p className="text-center font-semibold text-brand-dark">{t("player.lessonDone")}</p>}
        {phase !== "saving" && (
          <Link href={`/lesson/${lessonId}`} className={`btn ${phase === "done" && (summary.nextSessionNo !== null || !summary.passed) ? "btn-secondary" : "btn-primary"}`}>
            {t("player.backLesson")}
          </Link>
        )}
      </Shell>
    );
  }

  const payload = item.exercise.payload as { sentence_id?: string; word_id?: string };
  const sentence = payload.sentence_id ? content.sentences[payload.sentence_id] : undefined;
  const word = payload.word_id ? content.words[payload.word_id] : undefined;
  const showDiff = feedback && feedback.result !== "correct" && item.exercise.type === "listen_type" && feedback.answer && feedback.correctText;

  return (
    <Shell title={title} progress={index / queue.length}>
      <ExerciseView key={index} exercise={item.exercise} content={content} lang={lang} ttsLocale={ttsLocale} locked={hasFeedback} onAnswer={handleAnswer} />

      {feedback && (
        <div role="status" className={`flex flex-col gap-3 rounded-3xl border p-4 ${FEEDBACK_STYLE[feedback.result]}`}>
          <p className="text-lg font-bold">{t(`player.${feedback.result}`)}</p>
          {showDiff && (
            <p className="flex flex-wrap gap-1.5 text-base">
              {lang.diffWords(feedback.correctText!, feedback.answer!).map((part, i) => (
                <span
                  key={i}
                  className={part.status === "ok" ? "" : part.status === "missing" ? "rounded bg-ok-border px-1 font-semibold" : "rounded bg-bad-border px-1 line-through"}
                >
                  {part.word}
                </span>
              ))}
            </p>
          )}
          {sentence ? (
            <TappableSentence sentence={sentence} words={content.words} locale={ttsLocale} />
          ) : (
            feedback.result !== "correct" &&
            feedback.correctText && (
              <p>
                {t("player.answerIs")} <span className="font-semibold">{feedback.correctText}</span>
              </p>
            )
          )}
          <button type="button" className="btn btn-primary" onClick={handleContinue}>
            {t("common.continue")}
          </button>
          {sentence ? (
            <ReportButton variant="link" className="self-start" ownerType="sentence" ownerId={sentence.id} text={sentence.text} />
          ) : (
            word && <ReportButton variant="link" className="self-start" ownerType="word" ownerId={word.id} text={word.lemma} />
          )}
        </div>
      )}
    </Shell>
  );
}

function Shell({ title, progress, children }: { title: string; progress: number; children: React.ReactNode }) {
  const t = useTranslations("common");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-4 pt-4 pb-8">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label={t("close")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-lg text-muted">
          ✕
        </Link>
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-label={title}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </header>
      {children}
    </div>
  );
}
