import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TestRunner } from "@/components/level-test/TestRunner";
import { getLearnerContext } from "@/lib/data";
import { getLevelTestOverview } from "@/lib/level-test/server";

// Bài kiểm tra cuối cấp. Làm được bất cứ lúc nào, nên cũng là bài vượt cấp cho người đã biết.
export default async function LevelTestPage({ params }: { params: Promise<{ levelCode: string }> }) {
  const { levelCode } = await params;
  if (!/^[a-z0-9-]{1,20}$/.test(levelCode)) notFound();

  const ctx = await getLearnerContext();
  const t = await getTranslations();
  const { data: level } = await ctx.supabase.from("levels").select("id, code").eq("course_id", ctx.course.id).eq("code", levelCode).maybeSingle();
  if (!level) notFound();

  const overview = (await getLevelTestOverview(ctx.supabase, ctx.userId, [level.id])).get(level.id);
  // Cấp chưa có bài kiểm tra đang mở.
  if (!overview) notFound();

  return (
    <TestRunner
      levelId={level.id}
      levelName={t.has(`levels.${levelCode}`) ? t(`levels.${levelCode}`) : levelCode.toUpperCase()}
      backHref={`/course?level=${levelCode}`}
      questionCount={overview.questionCount}
      passPercent={overview.passPercent}
      bestPercent={overview.bestPercent}
      alreadyPassed={overview.passed}
      ttsLocale={ctx.course.ttsLocale}
    />
  );
}
