import { z } from "zod";

export const SESSION_TYPES = ["vocab", "listening"] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

const id = z.string().uuid();

/** Schema payload theo từng loại bài tập. Đây là hợp đồng giữa bộ sinh bài tập và trình phát. */
export const payloadSchemas = {
  word_intro: z.object({ word_id: id }),
  choose_meaning: z.object({ word_id: id, option_word_ids: z.array(id).min(2) }),
  choose_word: z.object({ word_id: id, option_word_ids: z.array(id).min(2) }),
  match_pairs: z.object({ word_ids: z.array(id).min(2) }),
  type_word: z.object({ word_id: id }),
  listen_choose: z.object({ sentence_id: id, option_sentence_ids: z.array(id).min(2) }),
  listen_arrange: z.object({ sentence_id: id, distractor_tokens: z.array(z.string()) }),
  listen_type: z.object({ sentence_id: id }),
} as const;

export type ExerciseType = keyof typeof payloadSchemas;
export type PayloadOf<T extends ExerciseType> = z.infer<(typeof payloadSchemas)[T]>;

export type Exercise = {
  [T in ExerciseType]: { id: string; type: T; payload: PayloadOf<T> };
}[ExerciseType];

/** Kiểu của một phiên học trong bài. Tên hiển thị nằm ở messages (sessionKind.*). */
export const SESSION_KINDS = ["vocab_learn", "vocab_recall", "listen_recognize", "listen_dictation"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

/** Một phiên học ngắn của bài: số thứ tự trong bài, loại kỹ năng, kiểu phiên và số bước. */
export type GeneratedSession = {
  session_no: number;
  session_type: SessionType;
  kind: SessionKind;
  step_count: number;
};

export type GeneratedExercise = {
  session_type: SessionType;
  /** Phiên chứa bài tập này. */
  session_no: number;
  /** Thứ tự trong phiên, bắt đầu từ 1. */
  sort_order: number;
  type: ExerciseType;
  source_type: "word" | "sentence" | "none";
  source_id: string | null;
  payload: Record<string, unknown>;
};

/** Đọc một dòng exercises từ database; trả về null nếu loại không biết hoặc payload sai. */
export function parseExercise(row: { id: string; type: string; payload: unknown }): Exercise | null {
  const schema = payloadSchemas[row.type as ExerciseType];
  if (!schema) return null;
  const parsed = schema.safeParse(row.payload);
  if (!parsed.success) return null;
  return { id: row.id, type: row.type, payload: parsed.data } as Exercise;
}
