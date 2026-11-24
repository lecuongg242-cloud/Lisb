"use client";

import { useEffect } from "react";
import messages from "@/messages/vi.json";

// Lỗi ngay ở khung gốc của app. Trang này tự dựng <html>, không có CSS chung và không có bộ dịch,
// nên dùng kiểu viết thẳng và đọc chuỗi trực tiếp từ file dịch. Màu theo chế độ sáng tối của thiết bị.
const text = messages.errors;

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", colorScheme: "light dark", background: "Canvas", color: "CanvasText" }}>
        <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>{text.errorTitle}</h1>
          <p style={{ margin: 0, maxWidth: 420, opacity: 0.75 }}>{text.errorBody}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={retry}
              style={{ minHeight: 48, padding: "0 20px", borderRadius: 16, border: 0, background: "#059669", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
            >
              {text.retry}
            </button>
            {/* Thẻ a thường: khung gốc đã hỏng nên tải lại toàn bộ trang. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{ minHeight: 48, padding: "0 20px", borderRadius: 16, border: "1px solid GrayText", color: "inherit", fontSize: 16, fontWeight: 600, display: "inline-flex", alignItems: "center", textDecoration: "none" }}
            >
              {text.home}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
