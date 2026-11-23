import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Player } from "@/components/player/Player";
import { getLearnerContext, getLessonSessions, loadSession } from "@/lib/data";

export default async function LearnPage({ params }: { params: Promise<{ lessonId: string; sessionNo: string }> }) {
  const { lessonId, sessionNo: rawSessionNo } = await params;
  const sessionNo = Number(rawSessionNo);
  if (!/^[0-9a-f-]{36}$/i.test(lessonId) || !Number.isInteger(sessionNo) || sessionNo < 1) notFound();

  const ctx = await getLearnerContext();
  const t = await getTranslations();
  // RLS chỉ trả về phiên của bài đã xuất bản; bài không tồn tại hoặc còn nháp thì coi như không có.
  const session = (await getLessonSessions(ctx.supabase, [lessonId])).get(lessonId)?.find((s) => s.no === sessionNo);
  if (!session) notFound();

  const { exercises, content } = await loadSession(ctx, lessonId, sessionNo);
  return (
    // key: chuyển sang phiên khác thì trình phát bắt đầu lại từ đầu, không giữ trạng thái của phiên trước.
    <Player
      key={`${lessonId}:${sessionNo}`}
      lessonId={lessonId}
      sessionNo={sessionNo}
      title={t.has(`sessionKind.${session.kind}`) ? t(`sessionKind.${session.kind}`) : t(`session.${session.type}`)}
      exercises={exercises}
      content={content}
      targetLang={ctx.course.targetLang}
      ttsLocale={ctx.course.ttsLocale}
    />
  );
}
