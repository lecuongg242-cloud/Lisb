import { expect, test, type Page } from "@playwright/test";
import { vi } from "./helpers";

// Học trọn phiên đầu tiên của bài đầu tiên như một người học thật: đọc màn giới thiệu từ để biết nghĩa,
// rồi dùng đúng những gì vừa đọc để trả lời câu hỏi chọn nghĩa và ghép cặp.

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

test("học xong một phiên học từ: trả lời đúng hết, kết quả được lưu", async ({ page }) => {
  await page.goto("/course");
  // Bài đầu tiên của lộ trình luôn mở.
  await page.locator('a[href^="/lesson/"]').first().click();
  await expect(page).toHaveURL(/\/lesson\/[0-9a-f-]{36}$/);
  const lessonUrl = page.url();
  await expect(page.getByRole("heading", { name: vi.lesson.practice })).toBeVisible();

  // Phần 1 mở được dù đã học hay chưa ("Bắt đầu" hoặc "Làm lại").
  await page.locator('a[href$="/1"][href^="/learn/"]').click();
  await expect(page).toHaveURL(/\/learn\/[0-9a-f-]{36}\/1$/);

  const meaningOf = new Map<string, string>();
  const done = page.getByRole("heading", { name: vi.player.summaryTitle });
  let questions = 0;

  for (let step = 0; step < 40; step++) {
    const intro = button(page, vi.player.gotIt);
    const chooseMeaning = page.getByRole("heading", { name: vi.player.chooseMeaning });
    const matchPairs = page.getByRole("heading", { name: vi.player.matchPairs });
    await expect(intro.or(chooseMeaning).or(matchPairs).or(done)).toBeVisible();
    if (await done.isVisible()) break;

    if (await intro.isVisible()) {
      const lemma = (await page.getByTestId("intro-lemma").innerText()).trim();
      meaningOf.set(lemma, (await page.getByTestId("meaning-source").innerText()).trim());
      await intro.click();
      // Màn giới thiệu không phải câu hỏi: sang bước kế tiếp ngay, không có phản hồi đúng sai.
      await expect(page.getByTestId("intro-lemma").filter({ hasText: new RegExp(`^${lemma}$`) })).toHaveCount(0);
      continue;
    }

    if (await chooseMeaning.isVisible()) {
      const lemma = (await page.getByTestId("prompt-lemma").innerText()).trim();
      const meaning = meaningOf.get(lemma);
      expect(meaning, `chưa được giới thiệu từ "${lemma}" trước khi bị hỏi`).toBeTruthy();
      await page.getByRole("listitem").getByRole("button", { name: meaning!, exact: true }).click();
    } else {
      const lemmas = await page.getByTestId("pair-words").getByRole("button").allInnerTexts();
      for (const lemma of lemmas.map((l) => l.trim())) {
        await button(page, lemma).click();
        await button(page, meaningOf.get(lemma)!).click();
      }
    }
    questions++;
    await expect(page.getByRole("status").getByText(vi.player.correct)).toBeVisible();
    await button(page, vi.common.continue).click();
  }

  // Màn tổng kết: đúng hết ở lần đầu, và máy chủ đã lưu (có chuỗi ngày học, không báo lỗi lưu).
  await expect(done).toBeVisible();
  expect(questions).toBeGreaterThan(0);
  const score = vi.player.summaryScore.replace("{correct}", String(questions)).replace("{total}", String(questions));
  await expect(page.getByText(score)).toBeVisible();
  await expect(page.getByText(vi.player.saveFailed)).toHaveCount(0);
  await expect(page.getByText(/\d+ ngày liên tục/)).toBeVisible();

  // Quay lại trang bài học: phần 1 được đánh dấu đã xong và làm lại được.
  await page.goto(lessonUrl);
  const firstPart = page.getByRole("listitem").filter({ has: page.locator('a[href$="/1"][href^="/learn/"]') });
  await expect(firstPart.getByRole("link", { name: vi.lesson.redo })).toBeVisible();
});

test("trả lời sai thì được báo, thấy đáp án đúng và có nút báo lỗi nội dung", async ({ page }) => {
  await page.goto("/course");
  await page.locator('a[href^="/lesson/"]').first().click();
  await page.locator('a[href$="/1"][href^="/learn/"]').click();

  const meaningOf = new Map<string, string>();
  const intro = button(page, vi.player.gotIt);
  const chooseMeaning = page.getByRole("heading", { name: vi.player.chooseMeaning });
  // Đi tới câu hỏi chọn nghĩa đầu tiên.
  for (let i = 0; i < 6; i++) {
    await expect(intro.or(chooseMeaning)).toBeVisible();
    if (await chooseMeaning.isVisible()) break;
    const lemma = (await page.getByTestId("intro-lemma").innerText()).trim();
    meaningOf.set(lemma, (await page.getByTestId("meaning-source").innerText()).trim());
    await intro.click();
    await expect(page.getByTestId("intro-lemma").filter({ hasText: new RegExp(`^${lemma}$`) })).toHaveCount(0);
  }

  const lemma = (await page.getByTestId("prompt-lemma").innerText()).trim();
  const right = meaningOf.get(lemma)!;
  const options = await page.getByRole("listitem").getByRole("button").allInnerTexts();
  const wrong = options.map((o) => o.replace(/^\d+\s*/, "").trim()).find((o) => o !== right)!;
  await page.getByRole("listitem").getByRole("button", { name: wrong, exact: true }).click();

  const feedback = page.getByRole("status").filter({ hasText: vi.player.wrong });
  await expect(feedback).toBeVisible();
  await expect(feedback.getByText(right)).toBeVisible();
  // Có đường báo lỗi nội dung ngay tại chỗ.
  await expect(feedback.getByRole("button", { name: vi.report.button })).toBeVisible();
});
