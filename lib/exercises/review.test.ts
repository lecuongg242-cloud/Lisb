import { describe, expect, it } from "vitest";
import type { GenSentence, GenWord } from "./generate";
import { generateReview, REVIEW_PASS_PERCENT, scoreFirstTries } from "./review";
import { payloadSchemas } from "./types";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const words: GenWord[] = Array.from({ length: 29 }, (_, i) => ({ id: uuid(i + 1), lemma: `word${i}`, pos: i % 2 ? "noun" : "verb" }));
const sentences: GenSentence[] = Array.from({ length: 20 }, (_, i) => {
  const tokens = Array.from({ length: 1 + (i % 5) }, (_, k) => `w${i}x${k}`);
  return { id: uuid(100 + i), text: tokens.join(" ") + ".", tokens };
});
const input = { words, sentences, seed: "review-lesson-id" };

describe("generateReview", () => {
  const { sessions, exercises } = generateReview(input);

  it("tất định theo hạt giống; hạt giống khác cho bộ câu hỏi khác", () => {
    expect(generateReview(input)).toEqual({ sessions, exercises });
    const other = generateReview({ ...input, seed: "another" });
    expect(other.exercises.map((e) => e.source_id)).not.toEqual(exercises.map((e) => e.source_id));
  });

  it("hai phiên ngắn, đều có ngưỡng đạt 80%", () => {
    expect(sessions.map((s) => s.kind)).toEqual(["review_vocab", "review_listening"]);
    for (const s of sessions) {
      expect(s.pass_percent).toBe(REVIEW_PASS_PERCENT);
      expect(s.step_count).toBeLessThanOrEqual(12);
      const own = exercises.filter((e) => e.session_no === s.session_no);
      expect(own.map((e) => e.sort_order)).toEqual(own.map((_, i) => i + 1));
      expect(own.length).toBe(s.step_count);
    }
  });

  it("mọi payload đúng schema, không có màn hình giới thiệu, không hỏi trùng một từ hay một câu", () => {
    for (const e of exercises) expect(payloadSchemas[e.type].safeParse(e.payload).success, e.type).toBe(true);
    expect(exercises.some((e) => e.type === "word_intro")).toBe(false);
    for (const s of sessions) {
      const sources = exercises.filter((e) => e.session_no === s.session_no).map((e) => e.source_id);
      expect(new Set(sources).size).toBe(sources.length);
    }
  });

  it("lựa chọn có đáp án đúng và không trùng nhau", () => {
    for (const e of exercises.filter((x) => x.type === "choose_word")) {
      const p = e.payload as { word_id: string; option_word_ids: string[] };
      expect(p.option_word_ids).toContain(p.word_id);
      expect(new Set(p.option_word_ids).size).toBe(p.option_word_ids.length);
    }
    for (const e of exercises.filter((x) => x.type === "listen_choose")) {
      const p = e.payload as { sentence_id: string; option_sentence_ids: string[] };
      expect(p.option_sentence_ids).toContain(p.sentence_id);
    }
  });

  it("phần gõ lại ưu tiên câu dài", () => {
    const typed = exercises.filter((e) => e.type === "listen_type").map((e) => sentences.find((s) => s.id === e.source_id)!.tokens.length);
    expect(Math.min(...typed)).toBeGreaterThanOrEqual(4);
  });

  it("chủ đề quá ít nội dung thì không sinh phiên tương ứng", () => {
    expect(generateReview({ words: words.slice(0, 1), sentences: [], seed: "x" })).toEqual({ sessions: [], exercises: [] });
    const few = generateReview({ words: words.slice(0, 4), sentences: sentences.slice(0, 3), seed: "x" });
    expect(few.exercises.filter((e) => e.type === "type_word")).toHaveLength(0);
    expect(few.exercises.filter((e) => e.type === "choose_word")).toHaveLength(4);
  });
});

describe("scoreFirstTries", () => {
  const a = (exerciseId: string, isCorrect: boolean) => ({ exerciseId, isCorrect });

  it("chỉ tính lần trả lời đầu của mỗi bài tập", () => {
    // Bài 1 sai lần đầu rồi đúng khi làm lại: vẫn tính là sai.
    const result = scoreFirstTries([a("1", false), a("2", true), a("3", true), a("4", true), a("5", true), a("1", true)], 80);
    expect(result).toEqual({ percent: 80, passed: true });
  });
  it("dưới ngưỡng thì không đạt", () => {
    expect(scoreFirstTries([a("1", false), a("2", false), a("3", true), a("4", true), a("5", true)], 80)).toEqual({ percent: 60, passed: false });
  });
  it("phiên không có ngưỡng thì luôn đạt; phiên có ngưỡng mà không có câu trả lời thì không đạt", () => {
    expect(scoreFirstTries([a("1", false)], null).passed).toBe(true);
    expect(scoreFirstTries([], 80).passed).toBe(false);
    expect(scoreFirstTries([], null).passed).toBe(true);
  });
});
