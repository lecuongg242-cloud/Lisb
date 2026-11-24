import { defineConfig } from "@playwright/test";

// Kiểm thử luồng chính trên trình duyệt thật: đăng nhập, học một phiên, ôn tập.
//
//   npm run test:e2e
//
// - Chạy trên app ở máy (cổng 3210); nếu chưa có app nào đang chạy ở cổng đó thì tự khởi động.
// - Dùng Chrome đã cài sẵn trên máy, không tải trình duyệt riêng.
// - Cần E2E_EMAIL và E2E_PASSWORD trong .env.local: một tài khoản thử đã ghi danh. Kiểm thử ghi dữ liệu học
//   thật (nhật ký phiên, thẻ ôn) cho tài khoản đó, nên không dùng tài khoản của người học thật.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Không có .env.local: các kiểm thử cần tài khoản sẽ tự báo thiếu cấu hình.
}

const PORT = 3210;
export const STORAGE_STATE = "tests/e2e/.auth/state.json";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "tests/e2e/.output",
  // Các luồng dùng chung một tài khoản và ghi dữ liệu thật nên chạy lần lượt.
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    locale: "vi-VN",
    // Kích thước điện thoại: đây là nơi app được dùng nhiều nhất.
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "guest", testMatch: /guest\.e2e\.ts$/ },
    { name: "setup", testMatch: /auth\.setup\.ts$/ },
    { name: "learner", testMatch: /(learn|review)\.e2e\.ts$/, dependencies: ["setup"], use: { storageState: STORAGE_STATE } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
