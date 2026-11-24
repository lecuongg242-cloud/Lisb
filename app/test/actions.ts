"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/data";
import { publishLevelTest, type PublishLevelTestResult } from "@/lib/level-test/server";
import { startedTestSchema, testResultSchema, type StartedTest, type TestResult } from "@/lib/level-test/types";

export type StartTestResult = { ok: true; test: StartedTest } | { ok: false; reason: "unavailable" | "error" };
export type SubmitTestResult = { ok: true; result: TestResult } | { ok: false; reason: "closed" | "error" };

/** Bắt đầu một lượt làm bài: database chọn câu hỏi và chỉ trả về đề, không có đáp án. */
export async function startLevelTestAction(levelId: string): Promise<StartTestResult> {
  if (!z.string().uuid().safeParse(levelId).success) return { ok: false, reason: "unavailable" };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("start_level_test", { p_level_id: levelId });
  if (error) {
    const expected = error.message.includes("test not available") || error.message.includes("not enrolled");
    return { ok: false, reason: expected ? "unavailable" : "error" };
  }
  const parsed = startedTestSchema.safeParse(data);
  return parsed.success ? { ok: true, test: parsed.data } : { ok: false, reason: "error" };
}

const submitSchema = z.object({
  attemptId: z.string().uuid(),
  // Khóa là id câu hỏi; giá trị là id lựa chọn hoặc chữ đã gõ.
  answers: z.record(z.string().uuid(), z.string().max(500)).refine((value) => Object.keys(value).length <= 100),
});

/** Nộp bài: database chấm và ghi kết quả. Một lượt làm bài chỉ nộp được một lần. */
export async function submitLevelTestAction(input: z.infer<typeof submitSchema>): Promise<SubmitTestResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "error" };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("submit_level_test", { p_attempt_id: parsed.data.attemptId, p_answers: parsed.data.answers });
  if (error) {
    const closed = error.message.includes("attempt not open") || error.message.includes("attempt not found");
    return { ok: false, reason: closed ? "closed" : "error" };
  }
  const result = testResultSchema.safeParse(data);
  if (!result.success) return { ok: false, reason: "error" };

  // Làm bài kiểm tra cũng là một hoạt động học trong ngày.
  await supabase.rpc("touch_streak");
  revalidatePath("/", "layout");
  return { ok: true, result: result.data };
}

/** Quản trị: sinh lại ngân hàng câu hỏi và mở bài kiểm tra cuối cấp. */
export async function publishLevelTestAction(levelId: string): Promise<PublishLevelTestResult> {
  if (!z.string().uuid().safeParse(levelId).success) return { ok: false, reason: "not_found" };
  const { supabase, profile } = await getProfile();
  if (profile.role !== "admin") return { ok: false, reason: "forbidden" };
  const result = await publishLevelTest(supabase, levelId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
