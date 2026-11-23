"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { publishLessonAction } from "@/app/actions";

export function PublishButton({ lessonId, published }: { lessonId: string; published: boolean }) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const publish = () =>
    startTransition(async () => {
      const result = await publishLessonAction(lessonId);
      if (result.ok) setMessage({ ok: true, text: t("admin.published", { count: result.count }) });
      else if (result.reason === "missing_translations") setMessage({ ok: false, text: t("admin.missingTranslations", { words: result.words.join(", ") }) });
      else if (result.reason === "no_content") setMessage({ ok: false, text: t("admin.noContent") });
      else if (result.reason === "forbidden") setMessage({ ok: false, text: t("admin.forbidden") });
      else setMessage({ ok: false, text: t("common.error") });
    });

  return (
    <div className="flex shrink-0 flex-col gap-1 sm:items-end">
      <button type="button" className={`btn ${published ? "btn-secondary" : "btn-primary"}`} onClick={publish} disabled={pending}>
        {published ? t("admin.republish") : t("admin.publish")}
      </button>
      {message && (
        <p role="status" className={`max-w-xs text-sm ${message.ok ? "text-brand-dark" : "text-bad-text"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
