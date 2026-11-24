"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { StatusScreen } from "./StatusScreen";

/** Nội dung của các file error.tsx: báo lỗi bằng lời dễ hiểu, cho thử lại và có đường quay về. */
export function ErrorScreen({ error, retry, fullScreen = false }: { error: unknown; retry: () => void; fullScreen?: boolean }) {
  const t = useTranslations("errors");
  // Lỗi từ máy chủ chỉ mang theo một mã để đối chiếu với nhật ký máy chủ, không mang nội dung lỗi.
  const digest = typeof error === "object" && error !== null && "digest" in error && typeof error.digest === "string" ? error.digest : null;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code={t("errorCode")}
      title={t("errorTitle")}
      body={t("errorBody")}
      detail={digest ? t("digest", { digest }) : undefined}
      fullScreen={fullScreen}
      actions={[
        { label: t("retry"), onClick: retry, primary: true },
        { label: t("home"), href: "/" },
      ]}
    />
  );
}
