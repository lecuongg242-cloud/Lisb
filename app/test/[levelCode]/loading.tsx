import { useTranslations } from "next-intl";

// Khung chờ của trang bài kiểm tra cuối cấp.
export default function Loading() {
  const t = useTranslations("common");
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-5 px-4 pt-4 pb-8" role="status" aria-label={t("loading")}>
      <div className="h-10 animate-pulse rounded-xl bg-line" />
      <div className="h-64 animate-pulse rounded-3xl bg-line" />
      <div className="h-12 animate-pulse rounded-2xl bg-line" />
    </div>
  );
}
