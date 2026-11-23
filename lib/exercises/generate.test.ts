import { describe, expect, it } from "vitest";
import { evenGroups, generateExercises, type GenSentence, type GenWord } from "./generate";
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

/** Một bài 8 từ, 5 câu nhiều từ: trường hợp dài nhất của cấp Khởi động. */
const bigInput = {
  words: Array.from({ length: 8 }, (_, i) => word(20 + i, `word${i}`)),
  sentences: Array.from({ length: 5 }, (_, i) => sentence(20 + i, `This is word${i} for you today.`)),
  poolWords: input.poolWords,
  poolSentences: input.poolSentences,
};

describe("evenGroups", () => {
  it("chia đều, không vượt quá kích thước tối đa", () => {
    expect(evenGroups([1, 2, 3, 4, 5], 5).map((g) => g.length)).toEqual([5]);
    expect(evenGroups([1, 2, 3, 4, 5, 6], 5).map((g) => g.length)).toEqual([3, 3]);
    expect(evenGroups([1, 2, 3, 4, 5, 6, 7, 8], 5).map((g) => g.length)).toEqual([4, 4]);
    expect(evenGroups([], 5)).toEqual([]);
  });
});

describe("generateExercises", () => {
  const { sessions, exercises } = generateExercises(input);
  const inSession = (no: number) => exercises.filter((e) => e.session_no === no);

  it("tất định: cùng đầu vào cho cùng kết quả", () => {
    expect(generateExercises(input)).toEqual({ sessions, exercises });
  });

  it("các phiên đánh số liên tục, theo thứ tự học từ rồi mới nghe", () => {
    expect(sessions.map((s) => s.session_no)).toEqual(sessions.map((_, i) => i + 1));
    expect(sessions.map((s) => s.kind)).toEqual(["vocab_learn", "vocab_learn", "vocab_recall", "listen_recognize", "listen_dictation"]);
  });

  it("mọi payload đúng schema; thứ tự liên tục trong từng phiên; số bước khớp", () => {
    for (const e of exercises) expect(payloadSchemas[e.type].safeParse(e.payload).success, e.type).toBe(true);
    for (const s of sessions) {
      const own = inSession(s.session_no);
      expect(own.map((e) => e.sort_order)).toEqual(own.map((_, i) => i + 1));
      expect(own.length).toBe(s.step_count);
      expect(own.every((e) => e.session_type === s.session_type)).toBe(true);
    }
  });

  it("không phiên nào dài quá 12 bước, kể cả bài dài nhất", () => {
    for (const s of sessions) expect(s.step_count, s.kind).toBeLessThanOrEqual(12);
    const big = generateExercises(bigInput);
    for (const s of big.sessions) expect(s.step_count, s.kind).toBeLessThanOrEqual(12);
    expect(big.sessions.filter((s) => s.kind === "vocab_learn")).toHaveLength(2);
  });

  it("mỗi từ được giới thiệu trước khi bị hỏi, trong cùng phiên học từ", () => {
    for (const w of words) {
      const intro = exercises.findIndex((e) => e.type === "word_intro" && e.source_id === w.id);
      const firstQuestion = exercises.findIndex((e) => e.type !== "word_intro" && JSON.stringify(e.payload).includes(w.id));
      expect(intro).toBeGreaterThanOrEqual(0);
      expect(intro).toBeLessThan(firstQuestion);
      const learn = exercises.find((e) => e.type === "choose_meaning" && e.source_id === w.id)!;
      expect(learn.session_no).toBe(exercises[intro].session_no);
    }
  });

  it("phiên nhớ lại từ hỏi đủ mọi từ của bài", () => {
    const recall = sessions.find((s) => s.kind === "vocab_recall")!;
    expect(inSession(recall.session_no).map((e) => e.source_id)).toEqual(words.map((w) => w.id));
  });

  it("lựa chọn nghĩa không trùng nhau và có đáp án đúng", () => {
    for (const e of exercises.filter((x) => x.type === "choose_meaning")) {
      const p = e.payload as { word_id: string; option_word_ids: string[] };
      expect(new Set(p.option_word_ids).size).toBe(p.option_word_ids.length);
      expect(p.option_word_ids.length).toBeGreaterThanOrEqual(2);
      expect(p.option_word_ids).toContain(p.word_id);
    }
  });

  it("đáp án nhiễu chỉ lấy từ những từ đã gặp", () => {
    // "hello" được hỏi khi mới giới thiệu hello và hi: các từ sau đó của bài chưa được dùng làm lựa chọn.
    const e = exercises.find((x) => x.type === "choose_meaning" && x.source_id === uuid(1))!;
    const ids = (e.payload as { option_word_ids: string[] }).option_word_ids;
    for (const later of [3, 4, 5, 6]) expect(ids).not.toContain(uuid(later));
    expect(ids).toContain(uuid(2));
  });

  it("từ đồng nghĩa không làm đáp án nhiễu của nhau", () => {
    const hello = { ...words[0], meanings: ["xin chào", "chào"] };
    const hi = { ...words[1], meanings: ["chào (thân mật)", "Xin chào"] };
    const out = generateExercises({ ...input, words: [hello, hi, ...words.slice(2)] });
    const options = (id: string) =>
      (out.exercises.find((e) => e.type === "choose_meaning" && e.source_id === id)!.payload as { option_word_ids: string[] }).option_word_ids;
    expect(options(hello.id)).not.toContain(hi.id);
    expect(options(hi.id)).not.toContain(hello.id);
  });

  it("câu một từ không có bài sắp xếp; thẻ nhiễu không trùng từ trong câu", () => {
    const arrange = exercises.filter((e) => e.type === "listen_arrange");
    expect(arrange.map((e) => e.source_id)).toEqual([uuid(103)]);
    const tokens = (arrange[0].payload as { distractor_tokens: string[] }).distractor_tokens.map((t) => t.toLowerCase());
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens).not.toContain("good");
    expect(tokens).not.toContain("morning");
  });

  it("mỗi câu có bài nghe chọn (phiên nghe hiểu) và nghe gõ (phiên nghe chép)", () => {
    const recognize = sessions.find((s) => s.kind === "listen_recognize")!.session_no;
    const dictation = sessions.find((s) => s.kind === "listen_dictation")!.session_no;
    for (const s of sentences) {
      expect(exercises.some((e) => e.type === "listen_choose" && e.source_id === s.id && e.session_no === recognize)).toBe(true);
      expect(exercises.some((e) => e.type === "listen_type" && e.source_id === s.id && e.session_no === dictation)).toBe(true);
    }
  });

  it("bài không có nội dung thì không sinh phiên nào", () => {
    expect(generateExercises({ words: [], sentences: [], poolWords: [], poolSentences: [] })).toEqual({ sessions: [], exercises: [] });
  });
});
