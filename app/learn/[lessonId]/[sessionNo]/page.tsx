import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Player } from "@/components/player/Player";
import { getLearnerContext, getLessonSessions, loadSession } from "@/lib/data";
import { sessionLabels } from "@/lib/session-label";

export default async function LearnPage({ params }: { params: Promise<{ lessonId: string; sessionNo: string }> }) {
  const { lessonId, sessionNo: rawSessionNo } = await params;
  const sessionNo = Number(rawSessionNo);
  if (!/^[0-9a-f-]{36}$/i.test(lessonId) || !Number.isInteger(sessionNo) || sessionNo < 1) notFound();

  const ctx = await getLearnerContext();
  const t = await getTranslations();
  // RLS chỉ trả về phiên của bài đã xuất bản; bài không tồn tại hoặc còn nháp thì coi như không có.
  const sessions = (await getLessonSessions(ctx.supabase, [lessonId])).get(lessonId) ?? [];
  if (!sessions.some((s) => s.no === sessionNo)) notFound();
  const labels = sessionLabels(sessions, { has: (key) => t.has(key), text: (key) => t(key) });

  const { exercises, content } = await loadSession(ctx, lessonId, sessionNo);
  return (
    // key: chuyển sang phiên khác thì trình phát bắt đầu lại từ đầu, không giữ trạng thái của phiên trước.
    <Player
      key={`${lessonId}:${sessionNo}`}
      lessonId={lessonId}
      sessionNo={sessionNo}
      title={labels.get(sessionNo) ?? ""}
      exercises={exercises}
      content={content}
      targetLang={ctx.course.targetLang}
      ttsLocale={ctx.course.ttsLocale}
    />
  );
}
