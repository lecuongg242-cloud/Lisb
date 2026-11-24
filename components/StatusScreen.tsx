import Link from "next/link";

type Action = { label: string; href?: string; onClick?: () => void; primary?: boolean };

/**
 * Màn hình thông báo dùng chung cho trang không tìm thấy và trang lỗi: mã, tiêu đề, lời giải thích và đường quay về.
 * `fullScreen`: dùng khi màn hình đứng ngoài khung điều hướng của app (trang học, trang kiểm tra, đăng nhập).
 */
export function StatusScreen({
  code,
  title,
  body,
  detail,
  actions,
  fullScreen = false,
}: {
  code: string;
  title: string;
  body: string;
  detail?: string;
  actions: Action[];
  fullScreen?: boolean;
}) {
  return (
    <div className={`mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center ${fullScreen ? "min-h-dvh py-10" : "py-16"}`}>
      <p className="rounded-full bg-brand-soft px-4 py-1 text-sm font-bold tracking-widest text-brand-dark">{code}</p>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted">{body}</p>
      {detail && <p className="text-xs break-all text-muted">{detail}</p>}
      <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        {actions.map((action) =>
          action.href ? (
            <Link key={action.label} href={action.href} className={`btn ${action.primary ? "btn-primary" : "btn-secondary"}`}>
              {action.label}
            </Link>
          ) : (
            <button key={action.label} type="button" onClick={action.onClick} className={`btn ${action.primary ? "btn-primary" : "btn-secondary"}`}>
              {action.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
