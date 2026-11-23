"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { finishReviewSession, submitReview } from "@/app/actions";
import { Meaning, SpeakButtons, TappableSentence } from "@/components/player/shared";
import type { ReviewRating } from "@/lib/srs/fsrs";
import type { ContentBundle, ReviewCard } from "@/lib/views";

const RATINGS: { rating: ReviewRating; key: "again" | "hard" | "good" | "easy"; style: string }[] = [
  { rating: 1, key: "again", style: "border-bad-border bg-bad-bg text-bad-text" },
  { rating: 2, key: "hard", style: "border-warn-border bg-warn-bg text-warn-text" },
  { rating: 3, key: "good", style: "border-ok-border bg-ok-bg text-ok-text" },
  { rating: 4, key: "easy", style: "border-info-border bg-info-bg text-info-text" },
];

function elapsedSeconds(startedAt: number | null): number {
  return startedAt === null ? 0 : Math.min(3600, Math.round((Date.now() - startedAt) / 1000));
}

export function ReviewClient({ cards, content, ttsLocale }: { cards: ReviewCard[]; content: ContentBundle; ttsLocale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const [failed, setFailed] = useState(false);
  const startedAt = useRef<number | null>(null);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    sessionId.current = crypto.randomUUID();
  }, []);

  const card = cards[index];
  const done = index >= cards.length;

  const rate = (rating: ReviewRating) => {
    if (!card) return;
    const nextRemembered = remembered + (rating > 1 ? 1 : 0);
    // Ghi ở nền để không chặn thẻ kế tiếp; id riêng cho mỗi lần chấm nên gửi lại không ghi trùng.
    void submitReview({ reviewId: crypto.randomUUID(), cardId: card.id, rating })
      .then((r) => {
        if (!r.ok) setFailed(true);
      })
      .catch(() => setFailed(true));
    setRemembered(nextRemembered);
    setRevealed(false);
    setIndex(index + 1);
    if (index + 1 >= cards.length) {
      const durationSec = elapsedSeconds(startedAt.current);
      void finishReviewSession({ sessionId: sessionId.current ?? crypto.randomUUID(), total: cards.length, remembered: nextRemembered, durationSec }).catch(() =>
        setFailed(true),
      );
    }
  };

  if (done) {
    return (
      <div className="card flex flex-col items-center gap-3 text-center">
        <h2 className="text-xl font-bold">{t("review.doneTitle")}</h2>
        <p className="text-muted">{t("review.doneCount", { count: cards.length })}</p>
        {failed && (
          <p role="alert" className="text-sm text-bad-text">
            {t("player.saveFailed")}
          </p>
        )}
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" className="btn btn-secondary" onClick={() => router.refresh()}>
            {t("review.more")}
          </button>
          <Link href="/" className="btn btn-primary">
            {t("player.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  const word = card.wordId ? content.words[card.wordId] : undefined;
  const sentence = card.sentenceId ? content.sentences[card.sentenceId] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("review.progress", { current: index + 1, total: cards.length })}</p>

      <div key={card.id} className="card flex min-h-56 flex-col items-center justify-center gap-4 text-center">
        {word && (
          <>
            <p className="text-sm font-semibold tracking-wide text-muted uppercase">{t("review.recallWord")}</p>
            <Meaning word={word} className="text-2xl" />
            {revealed && (
              <div className="flex flex-col items-center gap-2 border-t border-line pt-4">
                <p className="text-4xl font-bold">{word.lemma}</p>
                {word.pronunciation && <p className="text-muted">{word.pronunciation}</p>}
                <SpeakButtons text={word.lemma} locale={ttsLocale} audioKey={word.audioKey} autoPlay />
              </div>
            )}
          </>
        )}
        {sentence && (
          <>
            <p className="text-sm font-semibold tracking-wide text-muted uppercase">{t("review.recallSentence")}</p>
            <SpeakButtons text={sentence.text} locale={ttsLocale} audioKey={sentence.audioKey} autoPlay large />
            {revealed && (
              <div className="w-full border-t border-line pt-4 text-left">
                <TappableSentence sentence={sentence} words={content.words} locale={ttsLocale} />
              </div>
            )}
          </>
        )}
      </div>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map(({ rating, key, style }) => (
            <button key={key} type="button" className={`min-h-14 rounded-2xl border px-1 text-sm font-semibold ${style}`} onClick={() => rate(rating)}>
              {t(`review.${key}`)}
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)} autoFocus>
          {t("review.show")}
        </button>
      )}
    </div>
  );
}
