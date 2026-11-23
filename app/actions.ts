"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getCompletedSessions, getLearnerContext, getLessonSessions, getOrderedLessons, getProfile } from "@/lib/data";
import { scoreFirstTries } from "@/lib/exercises/review";
import { nextSessionNo } from "@/lib/progress";
import { publishLesson, publishUnitReview, type PublishResult } from "@/lib/publish";
import { newCardSchedule, scheduleReview, type CardSchedule } from "@/lib/srs/fsrs";

const SCHEDULE_COLUMNS =
  "due_at, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review_at";

// ---------- Ghi danh ----------

const onboardingSchema = z.object({
  dailyGoal: z.coerce.number().int().min(1).max(20),
  // Múi giờ do trình duyệt báo; dùng để tính "hôm nay" cho chuỗi ngày học.
  timezone: z.string().max(64).regex(/^[A-Za-z0-9_+\-/]+$/).optional(),
});

export async function completeOnboarding(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { dailyGoal, timezone } = onboardingSchema.parse({
    dailyGoal: formData.get("dailyGoal"),
    timezone: formData.get("timezone") || undefined,
  });

  const { data: course } = await supabase.from("courses").select("id").eq("status", "published").order("created_at").limit(1).maybeSingle();
  if (!course) redirect("/onboarding?error=no-course");

  const lessons = (await getOrderedLessons(supabase, course.id)).filter((l) => l.status === "published");

  await supabase
    .from("profiles")
    .update({ daily_goal: dailyGoal, ...(timezone ? { timezone } : {}) })
    .eq("id", user.id);
  const { error } = await supabase.from("enrollments").upsert(
    { user_id: user.id, course_id: course.id, source_lang: "vi", current_lesson_id: lessons[0]?.id ?? null, is_active: true },
    { onConflict: "user_id,course_id" },
  );
  if (error) throw new Error(error.message);
  redirect("/");
}

// ---------- Hoàn thành một phiên học ----------

const completeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  lessonId: z.string().uuid(),
  sessionNo: z.number().int().min(1).max(50),
  durationSec: z.number().int().min(0).max(3600),
  attempts: z
    .array(z.object({ exerciseId: z.string().uuid(), isCorrect: z.boolean(), answer: z.string().max(500).nullable() }))
    .max(200),
});

/**
 * passed: phiên có ngưỡng đạt (bài ôn) chỉ tính là xong khi đạt ngưỡng; phiên thường luôn là true.
 * percent: phần trăm đúng ở lần trả lời đầu.
 */
export type CompleteSessionResult = { ok: true; streak: number; nextSessionNo: number | null; passed: boolean; percent: number } | { ok: false };

export async function completeSession(input: z.infer<typeof completeSessionSchema>): Promise<CompleteSessionResult> {
  const parsed = completeSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { sessionId, lessonId, sessionNo, durationSec, attempts } = parsed.data;
  const ctx = await getLearnerContext();
  const { supabase, userId } = ctx;
  const now = new Date();

  // Phiên và bài tập hợp lệ (RLS chỉ trả về bài đã xuất bản).
  const [sessionsByLesson, { data: exerciseRows }] = await Promise.all([
    getLessonSessions(supabase, [lessonId]),
    supabase.from("exercises").select("id, source_type, source_id").eq("lesson_id", lessonId).eq("session_no", sessionNo),
  ]);
  const lessonSessions = sessionsByLesson.get(lessonId) ?? [];
  const session = lessonSessions.find((s) => s.no === sessionNo);
  if (!session || !exerciseRows?.length) return { ok: false };
  const exerciseById = new Map(exerciseRows.map((e) => [e.id as string, e]));
  const valid = attempts.filter((a) => exerciseById.has(a.exerciseId));
  const score = scoreFirstTries(valid, session.passPercent);

  /** Phiên kế tiếp của bài sau khi phiên này được tính là xong. */
  const remainingAfter = async () => {
    const done = await getCompletedSessions(supabase, userId, lessonId);
    return { done, next: nextSessionNo(lessonSessions.map((s) => s.no), done) };
  };

  // id do trình duyệt sinh: gửi lại cùng một phiên thì không ghi trùng.
  const { data: inserted, error: logError } = await supabase
    .from("session_logs")
    .upsert(
      {
        id: sessionId,
        user_id: userId,
        course_id: ctx.course.id,
        lesson_id: lessonId,
        session_type: session.type,
        session_no: sessionNo,
        total_items: valid.length,
        correct_items: valid.filter((a) => a.isCorrect).length,
        duration_sec: durationSec,
        started_at: new Date(now.getTime() - durationSec * 1000).toISOString(),
        // Chưa đạt ngưỡng thì lượt làm vẫn được ghi lại nhưng phiên chưa tính là xong.
        completed_at: score.passed ? now.toISOString() : null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");
  if (logError) return { ok: false };
  if (!inserted?.length) {
    return { ok: true, streak: ctx.profile.streak_count, nextSessionNo: (await remainingAfter()).next, passed: score.passed, percent: score.percent };
  }

  if (valid.length) {
    await supabase.from("exercise_attempts").insert(
      valid.map((a) => ({ user_id: userId, exercise_id: a.exerciseId, session_log_id: sessionId, is_correct: a.isCorrect, answer: a.answer })),
    );
  }

  // Từ hoặc câu nào có ít nhất một lần trả lời sai trong phiên.
  const missed = new Set<string>();
  for (const a of valid) {
    const sourceId = exerciseById.get(a.exerciseId)?.source_id as string | null;
    if (!a.isCorrect && sourceId) missed.add(sourceId);
  }

  // Mỗi từ hoặc câu được luyện trong phiên này có một thẻ ôn.
  for (const kind of ["word", "sentence"] as const) {
    const idColumn = kind === "word" ? "word_id" : "sentence_id";
    const sourceIds = [...new Set(exerciseRows.filter((e) => e.source_type === kind && e.source_id).map((e) => e.source_id as string))];
    if (!sourceIds.length) continue;

    const { data: existing } = await supabase
      .from("cards")
      .select(`id, ${idColumn}, ${SCHEDULE_COLUMNS}`)
      .eq("user_id", userId)
      .eq("kind", kind)
      .in(idColumn, sourceIds);
    const existingRows = (existing ?? []) as unknown as (CardSchedule & { id: string } & Record<string, string>)[];
    const existingBySource = new Map(existingRows.map((c) => [c[idColumn], c]));

    // Thẻ mới: phiên học vừa rồi được tính là lần gặp đầu tiên (Nhớ, hoặc Quên nếu có trả lời sai).
    const newCards = sourceIds
      .filter((id) => !existingBySource.has(id))
      .map((id) => ({
        user_id: userId,
        course_id: ctx.course.id,
        kind,
        [idColumn]: id,
        ...scheduleReview(newCardSchedule(now), missed.has(id) ? 1 : 3, now).schedule,
      }));
    if (newCards.length) await supabase.from("cards").insert(newCards);

    // Thẻ đã có mà trả lời sai trong phiên: tính là một lần Quên.
    for (const id of sourceIds) {
      const card = existingBySource.get(id);
      if (!card || !missed.has(id)) continue;
      const { schedule, log } = scheduleReview(card, 1, now);
      await supabase.from("cards").update(schedule).eq("id", card.id);
      await supabase.from("review_logs").insert({ card_id: card.id, user_id: userId, source: session.type, ...log });
    }
  }

  // Học xong mọi phiên của bài đang học thì chuyển sang bài kế tiếp.
  const { next } = await remainingAfter();
  if (next === null && ctx.enrollment.currentLessonId === lessonId) {
    const lessons = (await getOrderedLessons(supabase, ctx.course.id)).filter((l) => l.status === "published");
    const nextLesson = lessons[lessons.findIndex((l) => l.id === lessonId) + 1];
    if (nextLesson) {
      await supabase.from("enrollments").update({ current_lesson_id: nextLesson.id }).eq("user_id", userId).eq("course_id", ctx.course.id);
    }
  }

  const { data: streak } = await supabase.rpc("touch_streak");
  revalidatePath("/", "layout");
  return { ok: true, streak: (streak as number | null) ?? ctx.profile.streak_count, nextSessionNo: next, passed: score.passed, percent: score.percent };
}

// ---------- Ôn tập ----------

const reviewSchema = z.object({
  reviewId: z.string().uuid(),
  cardId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

export async function submitReview(input: z.infer<typeof reviewSchema>): Promise<{ ok: boolean }> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { reviewId, cardId, rating } = parsed.data;
  const { supabase, user } = await requireUser();

  const { data: card } = await supabase.from("cards").select(`id, ${SCHEDULE_COLUMNS}`).eq("id", cardId).eq("user_id", user.id).maybeSingle();
  if (!card) return { ok: false };

  const { schedule, log } = scheduleReview(card as unknown as CardSchedule, rating);
  // Ghi nhật ký trước; nếu id đã tồn tại (gửi lại) thì không cập nhật thẻ lần nữa.
  const { data: inserted, error } = await supabase
    .from("review_logs")
    .upsert({ id: reviewId, card_id: cardId, user_id: user.id, source: "review", ...log }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (error) return { ok: false };
  if (inserted?.length) {
    const { error: updateError } = await supabase.from("cards").update(schedule).eq("id", cardId);
    if (updateError) return { ok: false };
  }
  return { ok: true };
}

const finishReviewSchema = z.object({
  sessionId: z.string().uuid(),
  total: z.number().int().min(1).max(100),
  remembered: z.number().int().min(0).max(100),
  durationSec: z.number().int().min(0).max(3600),
});

export async function finishReviewSession(input: z.infer<typeof finishReviewSchema>): Promise<{ ok: boolean }> {
  const parsed = finishReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const ctx = await getLearnerContext();
  const now = new Date();
  const { error } = await ctx.supabase.from("session_logs").upsert(
    {
      id: parsed.data.sessionId,
      user_id: ctx.userId,
      course_id: ctx.course.id,
      session_type: "review",
      total_items: parsed.data.total,
      correct_items: Math.min(parsed.data.remembered, parsed.data.total),
      duration_sec: parsed.data.durationSec,
      started_at: new Date(now.getTime() - parsed.data.durationSec * 1000).toISOString(),
      completed_at: now.toISOString(),
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) return { ok: false };
  await ctx.supabase.rpc("touch_streak");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Cài đặt ----------

const settingsSchema = z.object({
  displayName: z.string().trim().max(60),
  dailyGoal: z.coerce.number().int().min(1).max(20),
});

export async function updateSettings(_prev: { saved: boolean; error: boolean }, formData: FormData) {
  const parsed = settingsSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    dailyGoal: formData.get("dailyGoal"),
  });
  if (!parsed.success) return { saved: false, error: true };
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName || null, daily_goal: parsed.data.dailyGoal })
    .eq("id", user.id);
  if (error) return { saved: false, error: true };
  revalidatePath("/", "layout");
  return { saved: true, error: false };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- Quản trị ----------

/** Tạo hoặc cập nhật bài ôn cuối chủ đề. */
export async function publishUnitReviewAction(unitId: string): Promise<PublishResult> {
  if (!z.string().uuid().safeParse(unitId).success) return { ok: false, reason: "not_found" };
  const { supabase, profile } = await getProfile();
  if (profile.role !== "admin") return { ok: false, reason: "forbidden" };
  const result = await publishUnitReview(supabase, unitId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function publishLessonAction(lessonId: string): Promise<PublishResult> {
  if (!z.string().uuid().safeParse(lessonId).success) return { ok: false, reason: "not_found" };
  const { supabase, profile } = await getProfile();
  if (profile.role !== "admin") return { ok: false, reason: "forbidden" };
  const result = await publishLesson(supabase, lessonId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
