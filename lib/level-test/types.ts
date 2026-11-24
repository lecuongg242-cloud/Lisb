import { z } from "zod";
import { LEVEL_TEST_TYPES } from "./pool";

// Dữ liệu trao đổi với hai hàm trong database (start_level_test, submit_level_test).
// Được kiểm tra bằng zod vì đây là ranh giới giữa database và ứng dụng.

const questionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(LEVEL_TEST_TYPES),
  /** Nghĩa của từ bằng ngôn ngữ đích và ngôn ngữ giải thích (câu hỏi từ vựng). */
  prompt_target: z.string().nullable(),
  prompt_source: z.string().nullable(),
  /** Khóa file âm thanh (câu hỏi nghe). */
  audio_key: z.string().nullable(),
  /** Lựa chọn của câu hỏi chọn đáp án; null với câu hỏi gõ. */
  options: z.array(z.object({ id: z.string().uuid(), label: z.string() })).nullable(),
});

export const startedTestSchema = z.object({
  attempt_id: z.string().uuid(),
  pass_percent: z.number().int(),
  questions: z.array(questionSchema).min(1),
});

export const testResultSchema = z.object({
  correct: z.number().int(),
  total: z.number().int(),
  percent: z.number().int(),
  passed: z.boolean(),
  pass_percent: z.number().int(),
  details: z.array(z.object({ question_id: z.string().uuid(), is_correct: z.boolean(), correct_answer: z.string() })),
});

export type TestQuestion = z.infer<typeof questionSchema>;
export type StartedTest = z.infer<typeof startedTestSchema>;
export type TestResult = z.infer<typeof testResultSchema>;

/** Tình trạng bài kiểm tra của một cấp đối với một người học. */
export type LevelTestOverview = {
  questionCount: number;
  passPercent: number;
  /** Đã từng đạt: cấp được tính là hoàn thành. */
  passed: boolean;
  /** Điểm cao nhất trong các lượt đã nộp; null nếu chưa làm lần nào. */
  bestPercent: number | null;
  attempts: number;
};
