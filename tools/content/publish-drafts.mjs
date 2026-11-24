// Xuất bản mọi bài đang nháp và tạo bài ôn cho chủ đề nào đã có bài học mà chưa có bài ôn,
// bằng cách bấm nút ở trang Quản trị > Bài học (cùng đường đi như quản trị viên bấm tay).
//
//   npx next dev -p 3210                       (một cửa sổ khác; hoặc app đang chạy ở BASE_URL)
//   node tools/content/publish-drafts.mjs      xuất bản rồi in số bài tập của từng bài
//   node tools/content/publish-drafts.mjs --dry-run   chỉ liệt kê việc sẽ làm
//
// Đăng nhập bằng E2E_EMAIL / E2E_PASSWORD trong .env.local; tài khoản đó phải có quyền quản trị.
// Mặc định trỏ tới app ở máy (http://localhost:3210), dùng database trong .env.local.

import fs from "node:fs";
import { chromium } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Thiếu .env.local thì báo ở dưới.
}

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const DRY_RUN = process.argv.includes("--dry-run");
const vi = JSON.parse(fs.readFileSync("messages/vi.json", "utf8"));
const { E2E_EMAIL: email, E2E_PASSWORD: password } = process.env;
if (!email || !password) throw new Error("Thiếu E2E_EMAIL hoặc E2E_PASSWORD trong .env.local.");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ locale: "vi-VN" });
page.setDefaultTimeout(60_000);

try {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel(vi.login.email).fill(email);
  await page.getByLabel(vi.login.password).fill(password);
  await page.getByRole("button", { name: vi.login.signIn, exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  await page.goto(`${BASE_URL}/admin/lessons`);
  await page.getByRole("heading", { name: vi.admin.title }).waitFor();

  // Bài nháp: nút "Xuất bản". Bài đã xuất bản có nút "Sinh lại bài tập" nên không bị đụng tới.
  const lessonButtons = page.getByRole("button", { name: vi.admin.publish, exact: true });
  const drafts = await lessonButtons.count();
  console.log(`Bài nháp: ${drafts}`);

  if (!DRY_RUN) {
    // Xuất bản lần lượt từ trên xuống, vì đáp án nhiễu của một bài lấy từ các bài đứng trước.
    for (let i = 0; i < drafts; i++) {
      const button = lessonButtons.first();
      const card = button.locator("xpath=ancestor::div[contains(@class,'card')][1]");
      const label = (await card.locator("p.font-semibold").innerText()).trim();
      await button.click();
      const status = card.getByRole("status");
      await status.waitFor();
      console.log(`  ${label}: ${(await status.innerText()).trim()}`);
      // Trang được tải lại sau khi xuất bản; chờ nút của bài này đổi nhãn.
      await card.getByRole("button", { name: vi.admin.republish, exact: true }).waitFor().catch(() => {});
    }
  }

  // Bài ôn: chỉ hiện ở chủ đề chưa có bài ôn. Tải lại để thấy trạng thái mới nhất.
  await page.reload();
  await page.getByRole("heading", { name: vi.admin.title }).waitFor();
  const reviewButtons = page.getByRole("button", { name: vi.admin.createReview, exact: true });
  const reviews = await reviewButtons.count();
  console.log(`Chủ đề chưa có bài ôn: ${reviews}`);
  if (!DRY_RUN) {
    for (let i = 0; i < reviews; i++) {
      const button = reviewButtons.first();
      const box = button.locator("xpath=ancestor::div[contains(@class,'border-dashed')][1]");
      const label = (await box.locator("p").first().innerText()).trim();
      await button.click();
      const status = box.getByRole("status");
      await status.waitFor();
      console.log(`  ${label}: ${(await status.innerText()).trim()}`);
      await page.reload();
      await page.getByRole("heading", { name: vi.admin.title }).waitFor();
    }
  }
} finally {
  await browser.close();
}
