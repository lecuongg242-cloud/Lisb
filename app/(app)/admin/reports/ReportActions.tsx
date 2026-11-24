"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReportStatus } from "@/lib/admin";
import { resolveReportAction } from "../actions";

/** Nút xử lý một báo cáo: đã sửa, không phải lỗi, hoặc mở lại. */
export function ReportActions({ reportId, status }: { reportId: string; status: ReportStatus }) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const setStatus = (next: ReportStatus) =>
    startTransition(async () => {
      setFailed(false);
      const result = await resolveReportAction({ reportId, status: next });
      if (result.ok) router.refresh();
      else setFailed(true);
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {status === "open" ? (
          <>
            <button type="button" className="btn btn-primary min-h-10 px-4 text-sm" onClick={() => setStatus("fixed")} disabled={pending}>
              {t("admin.reports.markFixed")}
            </button>
            <button type="button" className="btn btn-secondary min-h-10 px-4 text-sm" onClick={() => setStatus("rejected")} disabled={pending}>
              {t("admin.reports.markRejected")}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary min-h-10 px-4 text-sm" onClick={() => setStatus("open")} disabled={pending}>
            {t("admin.reports.reopen")}
          </button>
        )}
      </div>
      {failed && (
        <p role="alert" className="text-sm text-bad-text">
          {t("common.error")}
        </p>
      )}
    </div>
  );
}
