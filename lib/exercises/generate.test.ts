import { describe, expect, it } from "vitest";
import { generateExercises, type GenSentence, type GenWord } from "./generate";
import { payloadSchemas } from "./types";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const word = (n: number, lemma: string, pos = "noun"): GenWord => ({ id: uuid(n), lemma, pos });
const sentence = (n: number, text: string): GenSentence => ({
  id: uuid(100 + n),
  text,
  tokens: text.replace(/[.,!?]/g, "").split(" "),
});

const words = [
  word(1, "hello", "interjection"),
  word(2, "hi", "interjection"),
  word(3, "goodbye", "interjection"),
  word(4, "bye", "interjection"),
  word(5, "good", "adjective"),
  word(6, "morning"),
];
const sentences = [
  sentence(1, "Hello!"),
  sentence(2, "Hi!"),
  sentence(3, "Good morning!"),
  sentence(4, "Goodbye!"),
  sentence(5, "Bye!"),
];
const input = { words, sentences, poolWords: [word(7, "night"), word(8, "great", "adjective")], poolSentences: [sentence(6, "Good night!")] };

describe("generateExercises", () => {
  const result = generateExercises(input);
  const vocab = result.filter((e) => e.session_type === "vocab");
  const listening = result.filter((e) => e.session_type === "listening");

  it("tất định: cùng đầu vào cho cùng kết quả", () => {
    expect(generateExercises(input)).toEqual(result);
  });

  it("mọi payload đúng schema và thứ tự liên tục trong từng phiên", () => {
    for (const e of result) expect(payloadSchemas[e.type].safeParse(e.payload).success, e.type).toBe(true);
    expect(vocab.map((e) => e.sort_order)).toEqual(vocab.map((_, i) => i + 1));
    expect(listening.map((e) => e.sort_order)).toEqual(listening.map((_, i) => i + 1));
  });

  it("mỗi từ được giới thiệu trước khi bị hỏi", () => {
    for (const w of words) {
      const intro = vocab.findIndex((e) => e.type === "word_intro" && e.source_id === w.id);
      const firstQuestion = vocab.findIndex((e) => e.type !== "word_intro" && JSON.stringify(e.payload).includes(w.id));
      expect(intro).toBeGreaterThanOrEqual(0);
      expect(intro).toBeLessThan(firstQuestion);
    }
  });

  it("choose_meaning có 4 lựa chọn khác nhau, gồm đáp án đúng", () => {
    for (const e of vocab.filter((x) => x.type === "choose_meaning")) {
      const p = e.payload as { word_id: string; option_word_ids: string[] };
      expect(p.option_word_ids).toHaveLength(4);
      expect(new Set(p.option_word_ids).size).toBe(4);
      expect(p.option_word_ids).toContain(p.word_id);
    }
  });

  it("đáp án nhiễu ưu tiên cùng từ loại", () => {
    const e = vocab.find((x) => x.type === "choose_meaning" && x.source_id === uuid(1))!;
    const ids = (e.payload as { option_word_ids: string[] }).option_word_ids;
    // Lúc hỏi "hello" mới giới thiệu hello, hi, goodbye: hai từ cùng loại phải có mặt trước từ khác loại.
    expect(ids).toContain(uuid(2));
    expect(ids).toContain(uuid(3));
  });

  it("match_pairs chia nhóm đều, không quá 5 từ", () => {
    const groups = vocab.filter((e) => e.type === "match_pairs").map((e) => (e.payload as { word_ids: string[] }).word_ids.length);
    expect(groups).toEqual([3, 3]);
  });

  it("câu một từ không có bài sắp xếp; thẻ nhiễu không trùng từ trong câu", () => {
    const arrange = listening.filter((e) => e.type === "listen_arrange");
    expect(arrange.map((e) => e.source_id)).toEqual([uuid(103)]);
    const tokens = (arrange[0].payload as { distractor_tokens: string[] }).distractor_tokens.map((t) => t.toLowerCase());
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens).not.toContain("good");
    expect(tokens).not.toContain("morning");
  });

  it("mỗi câu có bài nghe chọn và nghe gõ", () => {
    for (const s of sentences) {
      expect(listening.some((e) => e.type === "listen_choose" && e.source_id === s.id)).toBe(true);
      expect(listening.some((e) => e.type === "listen_type" && e.source_id === s.id)).toBe(true);
    }
  });
});
