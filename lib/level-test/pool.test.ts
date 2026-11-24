import { describe, expect, it } from "vitest";
import { countByType, generateLevelTestPool, type PoolSentence, type PoolWord } from "./pool";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const units = ["unit-a", "unit-b", "unit-c"];
const words: PoolWord[] = Array.from({ length: 30 }, (_, i) => ({ id: uuid(i + 1), lemma: `word${i}`, pos: i % 2 ? "noun" : "verb", unitId: units[i % 3] }));
const sentences: PoolSentence[] = Array.from({ length: 21 }, (_, i) => ({
  id: uuid(100 + i),
  text: `Sentence number ${i}.`,
  tokens: ["Sentence", "number", String(i)],
  unitId: units[i % 3],
  audioKey: `key${i}`,
}));
const input = { words, sentences, seed: "level-id" };

describe("generateLevelTestPool", () => {
  const pool = generateLevelTestPool(input);

  it("tất định theo hạt giống", () => {
    expect(generateLevelTestPool(input)).toEqual(pool);
  });

  it("mỗi từ và mỗi câu thành đúng một câu hỏi", () => {
    const sources = pool.map((q) => q.source_id);
    expect(new Set(sources).size).toBe(sources.length);
    expect(sources.length).toBe(words.length + sentences.length);
  });

  it("bốn loại câu hỏi đều có mặt ở mọi chủ đề", () => {
    for (const unit of units) {
      const types = new Set(pool.filter((q) => q.unit_id === unit).map((q) => q.type));
      expect([...types].sort()).toEqual(["choose_word", "listen_choose", "listen_type", "type_word"]);
    }
    const counts = countByType(pool);
    expect(counts.choose_word + counts.type_word).toBe(words.length);
    expect(counts.listen_choose + counts.listen_type).toBe(sentences.length);
  });

  it("câu hỏi chọn có đáp án đúng trong các lựa chọn, không trùng lựa chọn", () => {
    for (const q of pool.filter((x) => x.type === "choose_word")) {
      const p = q.payload as { word_id: string; option_word_ids: string[] };
      expect(p.word_id).toBe(q.source_id);
      expect(p.option_word_ids).toContain(p.word_id);
      expect(new Set(p.option_word_ids).size).toBe(p.option_word_ids.length);
      expect(p.option_word_ids.length).toBeGreaterThanOrEqual(2);
    }
    for (const q of pool.filter((x) => x.type === "listen_choose")) {
      const p = q.payload as { sentence_id: string; option_sentence_ids: string[] };
      expect(p.option_sentence_ids).toContain(p.sentence_id);
    }
  });

  it("câu hỏi nghe có khóa âm thanh của đúng câu đó", () => {
    for (const q of pool.filter((x) => x.source_type === "sentence")) {
      const sentence = sentences.find((s) => s.id === q.source_id)!;
      expect((q.payload as { audio_key: string }).audio_key).toBe(sentence.audioKey);
    }
  });

  it("từ không có đủ lựa chọn thì thành câu gõ từ", () => {
    const single = generateLevelTestPool({ words: [words[0]], sentences: [], seed: "x" });
    expect(single).toEqual([{ type: "type_word", source_type: "word", source_id: words[0].id, unit_id: words[0].unitId, payload: { word_id: words[0].id } }]);
  });
});
