"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Exercise } from "@/lib/exercises/types";
import type { AnswerResult, LanguageModule } from "@/lib/lang";
import { stableHash } from "@/lib/lang/distance";
import type { ContentBundle } from "@/lib/views";
import { Meaning, OptionList, SpeakButtons } from "./shared";

export type AnswerHandler = (result: AnswerResult, answer: string | null, correctText: string | null) => void;

type ViewProps = {
  exercise: Exercise;
  content: ContentBundle;
  lang: LanguageModule;
  ttsLocale: string;
  /** Đã trả lời xong, đang hiện phản hồi: khóa mọi thao tác. */
  locked: boolean;
  onAnswer: AnswerHandler;
};

function Prompt({ children }: { children: React.ReactNode }) {
  return <h2 className="text-center text-sm font-semibold tracking-wide text-muted uppercase">{children}</h2>;
}

function TextAnswerForm({ locked, onSubmit, lang }: { locked: boolean; onSubmit: (value: string) => void; lang: string }) {
  const t = useTranslations();
  const [value, setValue] = useState("");
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!locked && value.trim()) onSubmit(value);
      }}
    >
      <input
        className="field text-lg"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("player.typeHere")}
        aria-label={t("player.typeHere")}
        lang={lang}
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        readOnly={locked}
      />
      {!locked && (
        <button type="submit" className="btn btn-primary" disabled={!value.trim()}>
          {t("common.check")}
        </button>
      )}
    </form>
  );
}

export function ExerciseView({ exercise, content, lang, ttsLocale, locked, onAnswer }: ViewProps) {
  const t = useTranslations("player");
  const { words, sentences } = content;

  switch (exercise.type) {
    case "word_intro": {
      const word = words[exercise.payload.word_id];
      const example = word?.exampleSentenceId ? sentences[word.exampleSentenceId] : undefined;
      if (!word) return null;
      return (
        <div className="flex flex-col gap-5">
          <Prompt>{t("newWord")}</Prompt>
          <div className="card flex flex-col items-center gap-3 text-center">
            <p className="text-4xl font-bold">{word.lemma}</p>
            {word.pronunciation && <p className="text-lg text-muted">{word.pronunciation}</p>}
            <SpeakButtons text={word.lemma} locale={ttsLocale} audioKey={word.audioKey} autoPlay />
            <Meaning word={word} className="text-lg" />
            {(word.usageNoteTarget || word.usageNoteSource) && (
              <div className="rounded-2xl bg-page px-4 py-3 text-left text-sm">
                {word.usageNoteTarget && <p className="text-muted">{word.usageNoteTarget}</p>}
                {word.usageNoteSource && <p>{word.usageNoteSource}</p>}
              </div>
            )}
          </div>
          {example && (
            <div className="card flex flex-col gap-1">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t("example")}</p>
              <p className="text-lg font-semibold">{example.text}</p>
              {example.translation && <p className="text-muted">{example.translation}</p>}
            </div>
          )}
          <button type="button" className="btn btn-primary" onClick={() => onAnswer("correct", null, null)} autoFocus>
            {t("gotIt")}
          </button>
        </div>
      );
    }

    case "choose_meaning": {
      const word = words[exercise.payload.word_id];
      if (!word) return null;
      const options = exercise.payload.option_word_ids.filter((id) => words[id]).map((id) => ({ id, label: words[id].meaningSource ?? words[id].lemma }));
      return (
        <div className="flex flex-col gap-5">
          <Prompt>{t("chooseMeaning")}</Prompt>
          <div className="flex flex-col items-center gap-3">
            <p className="text-4xl font-bold">{word.lemma}</p>
            <SpeakButtons text={word.lemma} locale={ttsLocale} audioKey={word.audioKey} autoPlay />
          </div>
          <OptionList
            options={options}
            disabled={locked}
            onPick={(id) => onAnswer(id === word.id ? "correct" : "wrong", options.find((o) => o.id === id)?.label ?? null, word.meaningSource)}
          />
        </div>
      );
    }

    case "choose_word": {
      const word = words[exercise.payload.word_id];
      if (!word) return null;
      const options = exercise.payload.option_word_ids.filter((id) => words[id]).map((id) => ({ id, label: words[id].lemma }));
      return (
        <div className="flex flex-col gap-5">
          <Prompt>{t("chooseWord")}</Prompt>
          <Meaning word={word} className="text-center text-2xl" />
          <OptionList
            options={options}
            disabled={locked}
            onPick={(id) => onAnswer(id === word.id ? "correct" : "wrong", words[id]?.lemma ?? null, word.lemma)}
          />
        </div>
      );
    }

    case "match_pairs":
      return <MatchPairs wordIds={exercise.payload.word_ids.filter((id) => words[id])} content={content} locked={locked} onAnswer={onAnswer} seed={exercise.id} />;

    case "type_word": {
      const word = words[exercise.payload.word_id];
      if (!word) return null;
      return (
        <div className="flex flex-col gap-5">
          <Prompt>{t("typeWord")}</Prompt>
          <Meaning word={word} className="text-center text-2xl" />
          <TextAnswerForm locked={locked} lang={ttsLocale} onSubmit={(value) => onAnswer(lang.checkAnswer(value, word.lemma), value, word.lemma)} />
        </div>
      );
    }

    case "listen_choose": {
      const sentence = sentences[exercise.payload.sentence_id];
      if (!sentence) return null;
      const options = exercise.payload.option_sentence_ids.filter((id) => sentences[id]).map((id) => ({ id, label: sentences[id].text }));
      return (
        <div className="flex flex-col gap-5">
          <Prompt>{t("listenChoose")}</Prompt>
          <SpeakButtons text={sentence.text} locale={ttsLocale} audioKey={sentence.audioKey} autoPlay large />
          <OptionList
            options={options}
            disabled={locked}
            onPick={(id) => onAnswer(id === sentence.id ? "correct" : "wrong", sentences[id]?.text ?? null, sentence.text)}
          />
        </div>
      );
    }

    case "listen_arrange": {
      const sentence = sentences[exercise.payload.sentence_id];
      if (!sentence) return null;
      return (
        <ArrangeChips
          seed={exercise.id}
          chips={[...sentence.chips, ...exercise.payload.distractor_tokens]}
          locked={locked}
          header={<SpeakButtons text={sentence.text} locale={ttsLocale} audioKey={sentence.audioKey} autoPlay large />}
          onSubmit={(answer) => {
            const given = lang.normalize(answer);
            const correct = [sentence.text, ...sentence.accepted].some((c) => lang.normalize(c) === given);
            onAnswer(correct ? "correct" : "wrong", answer, sentence.text);
          }}
        />
      );
    }

    case "listen_type": {
      const sentence = sentences[exercise.payload.sentence_id];
      if (!sentence) return null;
      return (
        <div className="flex flex-col gap-5">
          <Prompt>{t("listenType")}</Prompt>
          <SpeakButtons text={sentence.text} locale={ttsLocale} audioKey={sentence.audioKey} autoPlay large />
          <TextAnswerForm
            locked={locked}
            lang={ttsLocale}
            onSubmit={(value) => onAnswer(lang.checkAnswer(value, sentence.text, sentence.accepted), value, sentence.text)}
          />
        </div>
      );
    }
  }
}

function MatchPairs({ wordIds, content, locked, onAnswer, seed }: { wordIds: string[]; content: ContentBundle; locked: boolean; onAnswer: AnswerHandler; seed: string }) {
  const t = useTranslations("player");
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const rightOrder = [...wordIds].sort((a, b) => stableHash(seed + a) - stableHash(seed + b));

  const pickRight = (id: string) => {
    if (!selected) return;
    if (id === selected) {
      const next = [...matched, id];
      setMatched(next);
      setSelected(null);
      setWrong(null);
      if (next.length === wordIds.length) onAnswer(mistakes === 0 ? "correct" : "wrong", null, null);
    } else {
      setWrong(id);
      setMistakes(mistakes + 1);
    }
  };

  const cell = "flex min-h-14 w-full items-center justify-center rounded-2xl border px-3 py-2 text-center font-medium disabled:opacity-40";
  return (
    <div className="flex flex-col gap-5">
      <Prompt>{t("matchPairs")}</Prompt>
      <div className="grid grid-cols-2 gap-3">
        <ul className="flex flex-col gap-2">
          {wordIds.map((id) => (
            <li key={id}>
              <button
                type="button"
                disabled={locked || matched.includes(id)}
                onClick={() => {
                  setSelected(id);
                  setWrong(null);
                }}
                className={`${cell} ${selected === id ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
              >
                {content.words[id].lemma}
              </button>
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2">
          {rightOrder.map((id) => (
            <li key={id}>
              <button
                type="button"
                disabled={locked || matched.includes(id)}
                onClick={() => pickRight(id)}
                className={`${cell} ${wrong === id ? "border-bad-border bg-bad-bg" : "border-line bg-surface"}`}
              >
                {content.words[id].meaningSource}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ArrangeChips({ chips, seed, locked, header, onSubmit }: { chips: string[]; seed: string; locked: boolean; header: React.ReactNode; onSubmit: (answer: string) => void }) {
  const t = useTranslations();
  const [picked, setPicked] = useState<number[]>([]);
  const pool = chips.map((label, i) => ({ label, i })).sort((a, b) => stableHash(seed + a.i + a.label) - stableHash(seed + b.i + b.label));

  const chip = "min-h-11 rounded-xl border border-line bg-surface px-3 text-base font-medium disabled:opacity-30";
  return (
    <div className="flex flex-col gap-5">
      <Prompt>{t("player.listenArrange")}</Prompt>
      {header}
      <div className="flex min-h-16 flex-wrap content-start gap-2 rounded-2xl border border-dashed border-line bg-surface p-3" aria-live="polite">
        {picked.map((i) => (
          <button key={i} type="button" disabled={locked} className={`${chip} border-brand bg-brand-soft`} onClick={() => setPicked(picked.filter((p) => p !== i))}>
            {chips[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {pool.map(({ label, i }) => (
          <button key={i} type="button" disabled={locked || picked.includes(i)} className={chip} onClick={() => setPicked([...picked, i])}>
            {label}
          </button>
        ))}
      </div>
      {!locked && (
        <button type="button" className="btn btn-primary" disabled={!picked.length} onClick={() => onSubmit(picked.map((i) => chips[i]).join(" "))}>
          {t("common.check")}
        </button>
      )}
    </div>
  );
}
