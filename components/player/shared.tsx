"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { canSpeak, speak } from "@/lib/audio/speak";
import type { SentenceView, WordView } from "@/lib/views";

const noopSubscribe = () => () => {};

/** Hai nút nghe: tốc độ thường và chậm. `autoPlay` phát ngay khi hiện ra. */
export function SpeakButtons({ text, locale, autoPlay = false, large = false }: { text: string; locale: string; autoPlay?: boolean; large?: boolean }) {
  const t = useTranslations("common");
  const supported = useSyncExternalStore(noopSubscribe, canSpeak, () => true);

  useEffect(() => {
    if (autoPlay) speak(text, locale);
  }, [autoPlay, text, locale]);

  if (!supported) return <p className="rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn-text">{t("noVoice")}</p>;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" className={`btn btn-primary ${large ? "min-h-16 px-8 text-lg" : ""}`} onClick={() => speak(text, locale)}>
        {t("listen")}
      </button>
      <button type="button" className={`btn btn-secondary ${large ? "min-h-16" : ""}`} onClick={() => speak(text, locale, { slow: true })}>
        {t("listenSlow")}
      </button>
    </div>
  );
}

/** Nghĩa của một từ ở hai ngôn ngữ: ngôn ngữ đích trước, ngôn ngữ giải thích bên dưới. */
export function Meaning({ word, className = "" }: { word: WordView; className?: string }) {
  return (
    <div className={className}>
      {word.meaningTarget && <p className="text-muted">{word.meaningTarget}</p>}
      {word.meaningSource && <p className="font-medium">{word.meaningSource}</p>}
    </div>
  );
}

/** Câu có thể chạm vào từng từ để xem nghĩa. */
export function TappableSentence({ sentence, words, locale }: { sentence: SentenceView; words: Record<string, WordView>; locale: string }) {
  const t = useTranslations("player");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex === null ? null : sentence.tokens[openIndex];
  const word = open?.wordId ? words[open.wordId] : undefined;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg font-semibold">{sentence.text}</p>
      {sentence.translation && <p className="text-muted">{sentence.translation}</p>}
      <div className="flex flex-wrap gap-1.5" aria-label={t("tapWord")}>
        {sentence.tokens.map((token, i) => (
          <button
            key={i}
            type="button"
            disabled={!token.wordId}
            onClick={() => {
              setOpenIndex(openIndex === i ? null : i);
              speak(token.surface, locale);
            }}
            className={`rounded-xl border px-2.5 py-1 text-sm ${openIndex === i ? "border-brand bg-brand-soft" : "border-line bg-surface"} disabled:opacity-60`}
          >
            {token.surface}
          </button>
        ))}
      </div>
      {word ? (
        <div className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm">
          <p>
            <span className="font-semibold">{word.lemma}</span>
            {word.pronunciation && <span className="ml-2 text-muted">{word.pronunciation}</span>}
          </p>
          <Meaning word={word} />
        </div>
      ) : (
        <p className="text-xs text-muted">{t("tapWord")}</p>
      )}
    </div>
  );
}

/** Danh sách lựa chọn; bấm phím số 1-9 để chọn nhanh trên máy tính. */
export function OptionList({ options, onPick, disabled }: { options: { id: string; label: string }[]; onPick: (id: string) => void; disabled: boolean }) {
  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) onPick(options[n - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, onPick, disabled]);

  return (
    <ul className="flex flex-col gap-2">
      {options.map((option, i) => (
        <li key={option.id}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(option.id)}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2 text-left text-base font-medium hover:border-brand hover:bg-brand-soft disabled:opacity-70"
          >
            <span className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-page text-xs text-muted sm:flex">{i + 1}</span>
            {option.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
