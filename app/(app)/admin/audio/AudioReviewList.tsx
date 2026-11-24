"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordedAudioUrl } from "@/lib/audio/speak";
import type { AudioItem, AudioKind, AudioVerdict } from "@/lib/admin";
import { setAudioVerdictAction } from "../actions";

type Voice = { dir: string; label: string };
type Mark = { verdict: AudioVerdict; note: string | null };
type Filter = "all" | "pending" | "bad";

const KINDS: AudioKind[] = ["word", "sentence", "token"];
const markKey = (key: string, voice: string) => `${key}|${voice}`;

/**
 * Danh sách file âm thanh của một chủ đề để quản trị nghe và đánh dấu đạt hay sai theo từng giọng.
 * Chỉ phát file sinh sẵn: không có file thì báo thiếu, không đọc thay bằng giọng trình duyệt.
 */
export function AudioReviewList({ items, voices }: { items: AudioItem[]; voices: Voice[] }) {
  const t = useTranslations("admin.audio");
  const [marks, setMarks] = useState<Record<string, Mark | undefined>>(() => {
    const initial: Record<string, Mark> = {};
    for (const item of items) for (const [voice, mark] of Object.entries(item.verdicts)) initial[markKey(item.key, voice)] = mark;
    return initial;
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [playing, setPlaying] = useState<string | null>(null);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);

  // Số liệu của các chủ đề ở đầu trang do máy chủ tính: làm mới sau khi ngừng đánh dấu một lúc,
  // thay vì tải lại sau từng lần bấm.
  const scheduleRefresh = () => {
    if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => router.refresh(), 2000);
  };
  useEffect(
    () => () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
      player.current?.pause();
    },
    [],
  );

  const play = (item: AudioItem, voice: string) => {
    const id = markKey(item.key, voice);
    player.current?.pause();
    const audio = new Audio(recordedAudioUrl(voice, item.key));
    player.current = audio;
    setPlaying(id);
    const stop = () => setPlaying((current) => (current === id ? null : current));
    audio.onended = stop;
    audio.onerror = () => {
      stop();
      setMissing((current) => new Set(current).add(id));
    };
    audio.play().catch(stop);
  };

  const save = async (item: AudioItem, voice: string, next: Mark | undefined) => {
    const id = markKey(item.key, voice);
    const previous = marks[id];
    setMarks((current) => ({ ...current, [id]: next }));
    setFailed(false);
    try {
      const result = await setAudioVerdictAction({ voice, text: item.text, verdict: next?.verdict ?? null, note: next?.note ?? "" });
      if (result.ok) return scheduleRefresh();
    } catch {
      // Rơi xuống phần hoàn tác bên dưới.
    }
    setMarks((current) => ({ ...current, [id]: previous }));
    setFailed(true);
  };

  /** Bấm lại nút đang chọn thì bỏ đánh dấu. */
  const toggle = (item: AudioItem, voice: string, verdict: AudioVerdict) => {
    const current = marks[markKey(item.key, voice)];
    void save(item, voice, current?.verdict === verdict ? undefined : { verdict, note: verdict === "bad" ? (current?.note ?? null) : null });
  };

  const total = items.length * voices.length;
  let reviewed = 0;
  let bad = 0;
  for (const item of items) {
    for (const voice of voices) {
      const mark = marks[markKey(item.key, voice.dir)];
      if (mark) reviewed++;
      if (mark?.verdict === "bad") bad++;
    }
  }

  const visible = items.filter((item) => {
    if (filter === "all") return true;
    return voices.some((voice) => {
      const mark = marks[markKey(item.key, voice.dir)];
      return filter === "pending" ? !mark : mark?.verdict === "bad";
    });
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted" role="status">
          {t("progress", { reviewed, total, bad })}
        </p>
        <div className="flex gap-1.5" role="group" aria-label={t("filterLabel")}>
          {(["all", "pending", "bad"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`min-h-9 rounded-full border px-3 text-sm font-semibold ${filter === value ? "border-brand bg-brand-soft text-brand-dark" : "border-line text-muted"}`}
            >
              {t(`filter.${value}`)}
            </button>
          ))}
        </div>
      </div>

      {failed && (
        <p role="alert" className="rounded-2xl bg-bad-bg px-4 py-3 text-sm text-bad-text">
          {t("saveFailed")}
        </p>
      )}
      {visible.length === 0 && <p className="card text-center text-muted">{t(filter === "bad" ? "emptyBad" : filter === "pending" ? "emptyPending" : "empty")}</p>}

      {KINDS.map((kind) => {
        const group = visible.filter((item) => item.kind === kind);
        if (!group.length) return null;
        return (
          <section key={kind} className="card flex flex-col gap-3">
            <h2 className="text-lg font-bold">
              {t(`kind.${kind}`)} <span className="text-sm font-normal text-muted">{group.length}</span>
            </h2>
            <ul className="flex flex-col gap-2">
              {group.map((item) => (
                <li key={item.key} className="flex flex-col gap-2 rounded-2xl border border-line p-3">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-lg font-semibold break-words">{item.text}</span>
                    {item.pronunciation && <span className="text-sm text-muted">{item.pronunciation}</span>}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {voices.map((voice) => {
                      const id = markKey(item.key, voice.dir);
                      const mark = marks[id];
                      const isMissing = missing.has(id);
                      return (
                        <div key={voice.dir} className="flex flex-col gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => play(item, voice.dir)}
                              className={`flex min-h-10 flex-1 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${playing === id ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand"}`}
                            >
                              <span aria-hidden="true">▶</span>
                              {voice.label}
                            </button>
                            <button
                              type="button"
                              aria-label={`${t("markOk")}: ${item.text} (${voice.label})`}
                              aria-pressed={mark?.verdict === "ok"}
                              onClick={() => toggle(item, voice.dir, "ok")}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-base font-bold ${mark?.verdict === "ok" ? "border-ok-border bg-ok-bg text-ok-text" : "border-line text-muted hover:border-brand"}`}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              aria-label={`${t("markBad")}: ${item.text} (${voice.label})`}
                              aria-pressed={mark?.verdict === "bad"}
                              onClick={() => toggle(item, voice.dir, "bad")}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-base font-bold ${mark?.verdict === "bad" ? "border-bad-border bg-bad-bg text-bad-text" : "border-line text-muted hover:border-bad-border"}`}
                            >
                              ✗
                            </button>
                          </div>
                          {isMissing && <p className="text-sm text-bad-text">{t("missingFile")}</p>}
                          {mark?.verdict === "bad" && (
                            <input
                              className="field min-h-10 text-sm"
                              defaultValue={mark.note ?? ""}
                              maxLength={300}
                              placeholder={t("notePlaceholder")}
                              aria-label={`${t("notePlaceholder")}: ${item.text} (${voice.label})`}
                              onBlur={(e) => {
                                const note = e.target.value.trim() || null;
                                if (note !== (mark.note ?? null)) void save(item, voice.dir, { verdict: "bad", note });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
