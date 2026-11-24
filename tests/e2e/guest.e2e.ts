import { expect, test } from "@playwright/test";
import { testAccount, vi } from "./helpers";

// Người chưa đăng nhập.

test("mở trang trong app khi chưa đăng nhập thì được đưa về trang đăng nhập", async ({ page }) => {
  for (const path of ["/", "/course", "/review", "/admin/lessons", "/test/pre-a1"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login$/);
  }
  await expect(page.getByRole("heading", { name: vi.login.title })).toBeVisible();
});

test("trang chính sách quyền riêng tư mở được khi chưa đăng nhập", async ({ page }) => {
  const response = await page.goto("/privacy");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/privacy$/);
});

test("sai mật khẩu thì báo lỗi và vẫn ở trang đăng nhập", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(vi.login.email).fill(testAccount().email);
  await page.getByLabel(vi.login.password).fill("mat-khau-sai-123");
  await page.getByRole("button", { name: vi.login.signIn, exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
