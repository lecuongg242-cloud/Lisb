import { useTranslations } from "next-intl";

// Hiện ngay khi chuyển trang, trong lúc máy chủ lấy dữ liệu, để người dùng biết lần bấm đã được nhận.
export default function Loading() {
  const t = useTranslations("common");
  return (
    <div className="flex flex-col gap-4" role="status" aria-label={t("loading")}>
      <div className="h-8 w-40 animate-pulse rounded-xl bg-line" />
      <div className="h-36 animate-pulse rounded-3xl bg-line" />
      <div className="h-24 animate-pulse rounded-3xl bg-line" />
      <div className="h-24 animate-pulse rounded-3xl bg-line" />
    </div>
  );
}
