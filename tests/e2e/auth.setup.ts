import { expect, test as setup } from "@playwright/test";
import { STORAGE_STATE } from "../../playwright.config";
import { testAccount, vi } from "./helpers";

// Đăng nhập bằng biểu mẫu thật rồi lưu phiên cho các kiểm thử của người học dùng lại.
setup("đăng nhập bằng email và mật khẩu", async ({ page }) => {
  const { email, password } = testAccount();
  await page.goto("/login");
  await page.getByLabel(vi.login.email).fill(email);
  await page.getByLabel(vi.login.password).fill(password);
  await page.getByRole("button", { name: vi.login.signIn, exact: true }).click();

  // Tài khoản thử đã ghi danh nên vào thẳng trang chính, có thanh điều hướng.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: vi.nav.course, exact: true }).first()).toBeVisible();

  // Đã đăng nhập mà mở lại trang đăng nhập thì được đưa về trang chính.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);

  await page.context().storageState({ path: STORAGE_STATE });
});
