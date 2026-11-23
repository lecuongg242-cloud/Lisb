import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Mọi trang (trừ đăng nhập) phụ thuộc người dùng đang đăng nhập nên luôn render theo request.
// Vì vậy không bật cacheComponents/partialPrefetching: đọc cookie tự làm trang thành động.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
