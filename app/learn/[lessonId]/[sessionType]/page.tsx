import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Player } from "@/components/player/Player";
import { getLearnerContext, loadSession } from "@/lib/data";
import { SESSION_TYPES, type SessionType } from "@/lib/exercises/types";

export default async function LearnPage({ params }: { params: Promise<{ lessonId: string; sessionType: string }> }) {
  const { lessonId, sessionType } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(lessonId) || !SESSION_TYPES.includes(sessionType as SessionType)) notFound();

  const ctx = await getLearnerContext();
  const t = await getTranslations("session");
  // RLS chỉ trả về bài đã xuất bản; bài không tồn tại hoặc còn nháp thì coi như không có.
  const { data: lesson } = await ctx.supabase.from("lessons").select("id").eq("id", lessonId).maybeSingle();
  if (!lesson) notFound();

  const { exercises, content } = await loadSession(ctx, lessonId, sessionType as SessionType);
  return (
    <Player
      lessonId={lessonId}
      sessionType={sessionType as SessionType}
      title={t(sessionType as SessionType)}
      exercises={exercises}
      content={content}
      targetLang={ctx.course.targetLang}
      ttsLocale={ctx.course.ttsLocale}
    />
  );
}
