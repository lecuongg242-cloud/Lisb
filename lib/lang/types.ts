export type AnswerResult = "correct" | "almost" | "wrong";

export type DiffPart = {
  word: string;
  /** ok: gõ đúng. missing: có trong đáp án nhưng thiếu. extra: gõ thừa hoặc sai. */
  status: "ok" | "missing" | "extra";
};

/**
 * Mọi xử lý phụ thuộc ngôn ngữ đích đi qua giao diện này.
 * Thêm ngôn ngữ mới = thêm một bản cài đặt, không sửa trình phát bài học.
 */
export interface LanguageModule {
  /** Tách câu thành các từ, bỏ dấu câu. */
  tokenize(text: string): string[];
  /** Chuẩn hóa để so sánh: chữ thường, bỏ dấu câu, gộp khoảng trắng. */
  normalize(text: string): string;
  /** Chấm câu trả lời gõ tay. Mọi mục trong acceptedForms đều được tính đúng. */
  checkAnswer(input: string, expected: string, acceptedForms?: string[]): AnswerResult;
  /** So sánh từng từ để hiển thị lỗi nghe chép. */
  diffWords(expected: string, actual: string): DiffPart[];
}
