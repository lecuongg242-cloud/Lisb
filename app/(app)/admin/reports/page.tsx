import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { getAdmin, loadReports, type ReportStatus } from "@/lib/admin";
import { ReportActions } from "./ReportActions";

const STATUSES: ReportStatus[] = ["open", "fixed", "rejected"];

// Danh sách lỗi nội dung do người học báo. Không có người duyệt nội dung nên đây là kênh phát hiện lỗi chính.
export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await getAdmin();
  const t = await getTranslations();
  const format = await getFormatter();
  if (!admin) return null;
  const { status: requested } = await searchParams;
  const status = STATUSES.find((s) => s === requested) ?? "open";
  const reports = await loadReports(admin.supabase, status);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.reports.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("admin.reports.intro")}</p>
      </div>

      <nav aria-label={t("admin.reports.statusLabel")} className="flex gap-1.5">
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={`/admin/reports?status=${value}`}
            aria-current={value === status ? "page" : undefined}
            className={`flex min-h-9 items-center rounded-full border px-3 text-sm font-semibold ${value === status ? "border-brand bg-brand-soft text-brand-dark" : "border-line text-muted"}`}
          >
            {t(`admin.reports.status.${value}`)}
          </Link>
        ))}
      </nav>

      {reports.length === 0 && <p className="card text-center text-muted">{t(status === "open" ? "admin.reports.emptyOpen" : "admin.reports.empty")}</p>}

      <ul className="flex flex-col gap-3">
        {reports.map((report) => (
          <li key={report.id} className="card flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-warn-bg px-2.5 py-0.5 font-semibold text-warn-text">
                {t.has(`report.reason.${report.reason}`) ? t(`report.reason.${report.reason}`) : report.reason}
              </span>
              <span className="text-muted">
                {t(`admin.reports.owner.${report.ownerType}`)} · {format.dateTime(new Date(report.createdAt), { dateStyle: "medium", timeStyle: "short", timeZone: admin.profile.timezone })} ·{" "}
                {report.reporter ?? t("admin.reports.anonymous")}
              </span>
            </div>

            {report.target ? (
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-lg font-bold break-words">{report.target.text}</span>
                  {report.target.pronunciation && <span className="text-sm text-muted">{report.target.pronunciation}</span>}
                </p>
                {report.target.meaning && <p>{report.target.meaning}</p>}
              </div>
            ) : (
              <p className="text-muted">{t("admin.reports.targetGone")}</p>
            )}

            {report.note && <p className="rounded-2xl bg-page px-3 py-2 text-sm whitespace-pre-wrap">{report.note}</p>}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <ReportActions reportId={report.id} status={report.status} />
              {report.target?.lessonId && (
                <Link href={`/admin/lessons/${report.target.lessonId}`} className="text-sm font-semibold text-brand-dark hover:underline">
                  {t("admin.reports.openLesson")} →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
