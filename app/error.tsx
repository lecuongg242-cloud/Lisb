"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

// Lỗi ở các trang đứng ngoài khung điều hướng (trang học, trang kiểm tra, đăng nhập) và ở khung điều hướng của app.
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} fullScreen />;
}
