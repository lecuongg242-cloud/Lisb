"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { publishLevelTestAction } from "@/app/test/actions";

/** Sinh (hoặc sinh lại) ngân hàng câu hỏi của bài kiểm tra cuối cấp từ các bài đã xuất bản của cấp đó. */
export function LevelTestButton({ levelId, exists }: { levelId: string; exists: boolean }) {
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const publish = () =>
    startTransition(async () => {
      const result = await publishLevelTestAction(levelId);
      if (result.ok) setMessage({ ok: true, text: t("admin.levelTestPublished", { count: result.count }) });
      else if (result.reason === "no_content") setMessage({ ok: false, text: t("admin.noContent") });
      else if (result.reason === "forbidden") setMessage({ ok: false, text: t("admin.forbidden") });
      else setMessage({ ok: false, text: t("common.error") });
    });

  return (
    <div className="flex shrink-0 flex-col gap-1 sm:items-end">
      <button type="button" className={`btn ${exists ? "btn-secondary" : "btn-primary"}`} onClick={publish} disabled={pending}>
        {exists ? t("admin.updateLevelTest") : t("admin.createLevelTest")}
      </button>
      {message && (
        <p role="status" className={`max-w-xs text-sm ${message.ok ? "text-brand-dark" : "text-bad-text"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
