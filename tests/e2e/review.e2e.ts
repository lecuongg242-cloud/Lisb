import { expect, test } from "@playwright/test";
import { vi } from "./helpers";

// Ôn tập: lật một thẻ đến hạn và chấm. Chấm "Quên" để thẻ đó đến hạn lại sau ít phút,
// nhờ vậy tài khoản thử luôn còn thẻ cho những lần chạy sau.

test("ôn một thẻ đến hạn: xem đáp án, chấm, sang thẻ kế tiếp", async ({ page }) => {
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: vi.review.title })).toBeVisible();

  const empty = page.getByText(vi.review.empty);
  const show = page.getByRole("button", { name: vi.review.show });
  await expect(empty.or(show)).toBeVisible();
  test.skip(await empty.isVisible(), "Tài khoản thử hiện không có thẻ nào đến hạn; chạy lại sau khi học một phiên.");

  const progress = (current: number) => new RegExp(`^${vi.review.progress.replace("{current}", String(current)).replace("{total}", "(\\d+)")}$`);
  const first = await page.getByText(progress(1)).innerText();
  const total = Number(first.match(/(\d+)\s*$/)![1]);

  // Trước khi lật thẻ chưa có nút chấm.
  await expect(page.getByRole("button", { name: vi.review.again, exact: true })).toHaveCount(0);
  await show.click();
  for (const key of ["again", "hard", "good", "easy"] as const) await expect(page.getByRole("button", { name: vi.review[key], exact: true })).toBeVisible();

  await page.getByRole("button", { name: vi.review.again, exact: true }).click();

  if (total > 1) {
    await expect(page.getByText(progress(2))).toBeVisible();
    await expect(show).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: vi.review.doneTitle })).toBeVisible();
  }
  // Lần chấm được ghi ở nền: không được hiện báo lỗi lưu.
  await expect(page.getByText(vi.player.saveFailed)).toHaveCount(0);
});
