import { getTranslations } from "next-intl/server";
import { getLearnerContext, loadDueCards } from "@/lib/data";
import { ReviewClient } from "./ReviewClient";

/** Một lượt ôn tối đa 15 thẻ để giữ đúng khung 2-3 phút. */
const REVIEW_BATCH = 15;

export default async function ReviewPage() {
  const ctx = await getLearnerContext();
  const t = await getTranslations("review");
  const { cards, content } = await loadDueCards(ctx, REVIEW_BATCH);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {cards.length === 0 ? (
        <p className="card text-center text-muted">{t("empty")}</p>
      ) : (
        // key đổi theo lô thẻ để lượt ôn kế tiếp bắt đầu lại từ đầu.
        <ReviewClient key={cards.map((c) => c.id).join(",")} cards={cards} content={content} ttsLocale={ctx.course.ttsLocale} />
      )}
    </div>
  );
}
