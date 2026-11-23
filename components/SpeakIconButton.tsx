"use client";

import { speak } from "@/lib/audio/speak";

/** Nút loa nhỏ đặt cạnh một từ hoặc một câu. */
export function SpeakIconButton({ text, locale, audioKey, label }: { text: string; locale: string; audioKey: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={`${label}: ${text}`}
      onClick={() => speak(text, locale, { audioKey })}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-brand-dark transition hover:border-brand hover:bg-brand-soft active:scale-95"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  );
}
