"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

// Lỗi ở một trang bên trong app: thanh điều hướng vẫn còn, chỉ phần nội dung báo lỗi.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} />;
}
