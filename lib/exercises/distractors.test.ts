import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "../lang/en";
import { isSpelled, sentenceDistractors, tokenDistractors, wordDistractors, type GenSentence, type GenWord } from "./distractors";
import { generateExercises } from "./generate";

const w = (lemma: string, pos: string, unitId?: string): GenWord => ({ id: `w-${lemma}`, lemma, pos, unitId });
const s = (text: string, unitId?: string): GenSentence => ({ id: `s-${text}`, text, tokens: en.tokenize(text), unitId });

describe("wordDistractors", () => {
  const letters = ["S", "E", "U", "Y", "O"].map((l) => w(l, "letter", "alphabet"));
  const greetings = [w("hello", "interjection", "greetings"), w("night", "noun", "greetings"), w("later", "adverb", "greetings"), w("you", "pronoun", "greetings")];

  it("chữ cái không làm nhiễu cho từ thường khi còn đủ từ thường, dù chữ viết gần hơn", () => {
    const picked = wordDistractors(w("see", "verb", "greetings"), [...letters, ...greetings], 3);
    expect(picked.every((c) => c.pos !== "letter")).toBe(true);
    expect(picked).toHaveLength(3);
  });

  it("thiếu từ thường thì mới lấy thêm chữ cái, và từ thường đứng trước", () => {
    const picked = wordDistractors(w("see", "verb", "greetings"), [...letters, greetings[0]], 3);
    expect(picked[0].lemma).toBe("hello");
    expect(picked.slice(1).every((c) => c.pos === "letter")).toBe(true);
  });

  it("chữ cái vẫn làm nhiễu cho chữ cái", () => {
    const picked = wordDistractors(w("A", "letter", "alphabet"), [...letters, ...greetings], 3);
    expect(picked.every((c) => c.pos === "letter")).toBe(true);
  });

  it("ưu tiên từ cùng chủ đề hơn từ cùng từ loại ở chủ đề khác", () => {
    const picked = wordDistractors(w("red", "adjective", "colors"), [w("bad", "adjective", "other"), w("blue", "adjective", "colors"), w("color", "noun", "colors")], 2);
    expect(picked.map((c) => c.lemma)).toEqual(["blue", "color"]);
  });

  it("từ ngắn không tự nhiên được ưu tiên: cùng chủ đề, cùng từ loại thì chọn theo chữ viết gần nhất", () => {
    const picked = wordDistractors(w("thirteen", "number"), [w("six", "number"), w("fourteen", "number"), w("ten", "number")], 1);
    expect(picked[0].lemma).toBe("fourteen");
  });
});

describe("sentenceDistractors và tokenDistractors", () => {
  const spelled = [s("S, O, N.", "alphabet"), s("T, O, M.", "alphabet")];
  const normal = [s("See you later!", "greetings"), s("Good night!", "greetings"), s("How are you?", "greetings")];

  it("nhận ra câu đánh vần", () => {
    expect(isSpelled(spelled[0])).toBe(true);
    expect(isSpelled(normal[0])).toBe(false);
    expect(isSpelled(s("I am."))).toBe(false);
  });

  it("câu đánh vần không làm nhiễu cho câu thường khi còn câu thường", () => {
    const picked = sentenceDistractors(s("See you tomorrow!", "greetings"), [...spelled, ...normal], 2);
    expect(picked.some(isSpelled)).toBe(false);
  });

  it("thẻ từ thừa không lấy từ câu đánh vần khi còn câu thường", () => {
    const picked = tokenDistractors(s("See you tomorrow!", "greetings"), [...spelled, ...normal], 3);
    expect(picked.every((token) => token.length > 1)).toBe(true);
    expect(picked).toHaveLength(3);
  });

  it("câu đánh vần vẫn lấy thẻ thừa từ câu đánh vần khác", () => {
    const picked = tokenDistractors(spelled[0], [...spelled, ...normal], 2);
    expect(picked.every((token) => token.length === 1)).toBe(true);
  });
});

// Chạy bộ sinh bài tập trên đúng nội dung thật của cấp Khởi động, theo cách trang quản trị xuất bản từng bài:
// bài tập của một bài chỉ được lấy đáp án nhiễu từ chính nó và các bài đứng trước.
describe("trên nội dung thật của cấp Khởi động", () => {
  const dir = path.resolve(__dirname, "..", "..", "content", "english", "pre-a1");
  type Unit = { unit: { slug: string } | string; lessons: { words: { lemma: string; pos: string; meaning?: unknown }[]; sentences: { text: string }[] }[] };
  const lessons = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((file) => {
      const unit = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Unit;
      return unit.lessons.map((lesson, index) => ({
        unitId: file,
        index,
        words: lesson.words.map((word): GenWord => ({ id: `${file}:${word.lemma}:${word.pos}`, lemma: word.lemma, pos: word.pos, unitId: file })),
        sentences: lesson.sentences.map((sentence): GenSentence => ({ id: `${file}:${sentence.text}`, text: sentence.text, tokens: en.tokenize(sentence.text), unitId: file })),
      }));
    });

  const generated = lessons.map((lesson, i) => ({
    lesson,
    out: generateExercises({
      words: lesson.words,
      sentences: lesson.sentences,
      poolWords: lessons.slice(0, i).flatMap((l) => l.words),
      poolSentences: lessons.slice(0, i).flatMap((l) => l.sentences),
    }),
  }));
  const wordById = new Map(lessons.flatMap((l) => l.words).map((word) => [word.id, word]));
  const sentenceById = new Map(lessons.flatMap((l) => l.sentences).map((sentence) => [sentence.id, sentence]));
  const afterAlphabet = generated.filter(({ lesson }) => !lesson.unitId.startsWith("01-"));

  it("có đủ 24 bài và bài nào cũng sinh được bài tập", () => {
    expect(generated).toHaveLength(24);
    for (const { out } of generated) expect(out.exercises.length).toBeGreaterThan(0);
  });

  it("từ bài thứ hai của chủ đề Chào hỏi trở đi, câu hỏi chọn nghĩa không còn lựa chọn là chữ cái", () => {
    const fromSecondGreetingLesson = afterAlphabet.filter(({ lesson }) => !(lesson.unitId.startsWith("02-") && lesson.index === 0));
    for (const { out } of fromSecondGreetingLesson) {
      for (const e of out.exercises.filter((x) => x.type === "choose_meaning")) {
        const options = (e.payload as { option_word_ids: string[] }).option_word_ids.map((id) => wordById.get(id)!);
        expect(options.filter((o) => o.pos === "letter").map((o) => o.lemma)).toEqual([]);
      }
    }
  });

  it("sau chủ đề bảng chữ cái, bài nghe không còn câu đánh vần hay thẻ chữ cái lẻ làm nhiễu", () => {
    for (const { out } of afterAlphabet) {
      for (const e of out.exercises.filter((x) => x.type === "listen_choose")) {
        const options = (e.payload as { option_sentence_ids: string[] }).option_sentence_ids.map((id) => sentenceById.get(id)!);
        expect(options.filter(isSpelled).map((o) => o.text)).toEqual([]);
      }
      for (const e of out.exercises.filter((x) => x.type === "listen_arrange")) {
        const tokens = (e.payload as { distractor_tokens: string[] }).distractor_tokens;
        // "I" và "a" là từ thật; chữ cái lẻ khác chỉ đến từ câu đánh vần.
        expect(tokens.filter((token) => token.length === 1 && !["i", "a"].includes(token.toLowerCase()))).toEqual([]);
        expect(tokens.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("trong chủ đề bảng chữ cái, chữ cái vẫn có đủ lựa chọn nhiễu là chữ cái", () => {
    const alphabet = generated.filter(({ lesson }) => lesson.unitId.startsWith("01-"));
    const questions = alphabet.flatMap(({ out }) => out.exercises.filter((x) => x.type === "choose_meaning"));
    expect(questions.length).toBeGreaterThan(20);
    for (const e of questions) {
      const options = (e.payload as { option_word_ids: string[] }).option_word_ids.map((id) => wordById.get(id)!);
      expect(options.every((o) => o.pos === "letter")).toBe(true);
    }
  });
});
