import { sentenceOptions, wordOptions } from "../exercises/review";
import type { GenSentence, GenWord } from "../exercises/generate";
import { stableHash } from "../lang/distance";

/** Bốn loại câu hỏi của bài kiểm tra cuối cấp. Mỗi lượt làm bài lấy số câu bằng nhau ở mỗi loại. */
export const LEVEL_TEST_TYPES = ["choose_word", "type_word", "listen_choose", "listen_type"] as const;
export type LevelTestType = (typeof LEVEL_TEST_TYPES)[number];

/** Số câu mỗi lượt làm (chia đều cho 4 loại) và ngưỡng đạt. */
export const LEVEL_TEST_QUESTION_COUNT = 20;
export const LEVEL_TEST_PASS_PERCENT = 80;

export type PoolWord = GenWord & { unitId: string };
export type PoolSentence = GenSentence & { unitId: string; audioKey: string };

export type PoolQuestion = {
  type: LevelTestType;
  source_type: "word" | "sentence";
  source_id: string;
  unit_id: string;
  /** Chứa đáp án; chỉ lưu ở bảng mà người học không đọc được. */
  payload: Record<string, unknown>;
};

/** Sắp theo mã băm để việc chia loại câu hỏi tất định nhưng không theo thứ tự dạy. */
function hashed<T extends { id: string }>(items: T[], seed: string): T[] {
  return [...items].sort((a, b) => stableHash(seed + a.id) - stableHash(seed + b.id) || a.id.localeCompare(b.id));
}

function byUnit<T extends { unitId: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(item.unitId, [...(groups.get(item.unitId) ?? []), item]);
  return groups;
}

/**
 * Sinh ngân hàng câu hỏi cho bài kiểm tra cuối cấp từ toàn bộ từ và câu của cấp.
 *
 * - Mỗi từ thành đúng một câu hỏi: chọn từ theo nghĩa, hoặc gõ từ theo nghĩa.
 * - Mỗi câu thành đúng một câu hỏi: nghe rồi chọn câu, hoặc nghe rồi gõ lại.
 * Vì mỗi từ và mỗi câu chỉ thuộc một loại, một lượt làm bài không bao giờ hỏi cùng một thứ hai lần.
 * Trong từng chủ đề, hai loại được chia xen kẽ để chủ đề nào cũng có mặt ở mọi loại câu hỏi.
 */
export function generateLevelTestPool(input: { words: PoolWord[]; sentences: PoolSentence[]; seed: string }): PoolQuestion[] {
  const { words, sentences, seed } = input;
  const questions: PoolQuestion[] = [];

  for (const [unitId, unitWords] of byUnit(words)) {
    hashed(unitWords, `${seed}:word`).forEach((word, i) => {
      if (i % 2 === 0) {
        const options = wordOptions(word, words, seed);
        // Không đủ lựa chọn thì chuyển thành câu gõ từ, để từ nào cũng được hỏi.
        if (options.length >= 2) {
          questions.push({
            type: "choose_word",
            source_type: "word",
            source_id: word.id,
            unit_id: unitId,
            payload: { word_id: word.id, option_word_ids: options.map((o) => o.id) },
          });
          return;
        }
      }
      questions.push({ type: "type_word", source_type: "word", source_id: word.id, unit_id: unitId, payload: { word_id: word.id } });
    });
  }

  for (const [unitId, unitSentences] of byUnit(sentences)) {
    hashed(unitSentences, `${seed}:sentence`).forEach((sentence, i) => {
      if (i % 2 === 0) {
        const options = sentenceOptions(sentence, sentences, seed);
        if (options.length >= 2) {
          questions.push({
            type: "listen_choose",
            source_type: "sentence",
            source_id: sentence.id,
            unit_id: unitId,
            payload: { sentence_id: sentence.id, option_sentence_ids: options.map((o) => o.id), audio_key: sentence.audioKey },
          });
          return;
        }
      }
      questions.push({
        type: "listen_type",
        source_type: "sentence",
        source_id: sentence.id,
        unit_id: unitId,
        payload: { sentence_id: sentence.id, audio_key: sentence.audioKey },
      });
    });
  }

  return questions;
}

/** Số câu hỏi của mỗi loại trong ngân hàng: dùng để kiểm tra có đủ cho một lượt làm bài không. */
export function countByType(questions: PoolQuestion[]): Record<LevelTestType, number> {
  const counts = { choose_word: 0, type_word: 0, listen_choose: 0, listen_type: 0 };
  for (const q of questions) counts[q.type] += 1;
  return counts;
}
