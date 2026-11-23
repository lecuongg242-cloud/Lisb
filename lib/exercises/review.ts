import { editDistance, stableHash } from "../lang/distance";
import type { GenSentence, GenWord } from "./generate";
import type { GeneratedExercise, GeneratedSession, SessionKind, SessionType } from "./types";

export type ReviewInput = {
  /** Mọi từ đã dạy trong chủ đề, theo thứ tự dạy. */
  words: GenWord[];
  /** Mọi câu mẫu của chủ đề, theo thứ tự. */
  sentences: GenSentence[];
  /** Hạt giống cho việc chọn mẫu, thường là id của bài ôn: cùng hạt giống cho cùng bộ câu hỏi. */
  seed: string;
};

/** Phải đúng từ 80% ở lần trả lời đầu mới tính là qua bài ôn. */
export const REVIEW_PASS_PERCENT = 80;

const CHOOSE_WORD_COUNT = 6;
const TYPE_WORD_COUNT = 4;
const LISTEN_CHOOSE_COUNT = 3;
const LISTEN_TYPE_COUNT = 5;

/** Lấy mẫu có tính tất định: sắp theo mã băm rồi lấy n phần tử đầu. */
function sample<T extends { id: string }>(items: T[], n: number, seed: string): T[] {
  return [...items].sort((a, b) => stableHash(seed + a.id) - stableHash(seed + b.id) || a.id.localeCompare(b.id)).slice(0, n);
}

function sharesMeaning(a: GenWord, b: GenWord): boolean {
  if (!a.meanings?.length || !b.meanings?.length) return false;
  const own = new Set(a.meanings.map((m) => m.trim().toLowerCase()));
  return b.meanings.some((m) => own.has(m.trim().toLowerCase()));
}

function wordOptions(target: GenWord, all: GenWord[], seed: string): GenWord[] {
  const distractors = all
    .filter((c) => c.id !== target.id && c.lemma.toLowerCase() !== target.lemma.toLowerCase() && !sharesMeaning(target, c))
    .map((c) => ({ c, score: (c.pos === target.pos ? 0 : 100) + editDistance(c.lemma.toLowerCase(), target.lemma.toLowerCase()) }))
    .sort((a, b) => a.score - b.score || a.c.id.localeCompare(b.c.id))
    .slice(0, 3)
    .map((x) => x.c);
  return sample([target, ...distractors], 4, `${seed}:options:${target.id}`);
}

function sentenceOptions(target: GenSentence, all: GenSentence[], seed: string): GenSentence[] {
  const text = target.text.toLowerCase();
  const distractors = all
    .filter((c) => c.id !== target.id && c.text.toLowerCase() !== text)
    .map((c) => ({ c, score: editDistance(c.text.toLowerCase(), text) }))
    .sort((a, b) => a.score - b.score || a.c.id.localeCompare(b.c.id))
    .slice(0, 2)
    .map((x) => x.c);
  return sample([target, ...distractors], 3, `${seed}:options:${target.id}`);
}

/**
 * Sinh bài ôn cuối chủ đề từ toàn bộ từ và câu của chủ đề.
 * Hai phiên ngắn, đều có ngưỡng đạt: ôn từ (chọn từ theo nghĩa, gõ từ) và ôn nghe (chọn câu, gõ lại câu).
 * Bài ôn không dạy gì mới và không có màn hình giới thiệu.
 */
export function generateReview(input: ReviewInput): { sessions: GeneratedSession[]; exercises: GeneratedExercise[] } {
  const { words, sentences, seed } = input;
  const sessions: GeneratedSession[] = [];
  const exercises: GeneratedExercise[] = [];

  const openSession = (sessionType: SessionType, kind: SessionKind) => {
    const session: GeneratedSession = { session_no: 0, session_type: sessionType, kind, step_count: 0, pass_percent: REVIEW_PASS_PERCENT };
    return (type: GeneratedExercise["type"], sourceType: "word" | "sentence", sourceId: string, payload: Record<string, unknown>) => {
      if (session.step_count === 0) {
        sessions.push(session);
        session.session_no = sessions.length;
      }
      session.step_count += 1;
      exercises.push({ session_type: sessionType, session_no: session.session_no, sort_order: session.step_count, type, source_type: sourceType, source_id: sourceId, payload });
    };
  };

  // ----- Ôn từ -----
  if (words.length >= 2) {
    const add = openSession("vocab", "review_vocab");
    const picked = sample(words, CHOOSE_WORD_COUNT + TYPE_WORD_COUNT, `${seed}:words`);
    // Chia mẫu thành hai nhóm không trùng nhau; ít từ thì ưu tiên phần chọn từ.
    const typed = picked.length > CHOOSE_WORD_COUNT ? picked.slice(CHOOSE_WORD_COUNT) : [];
    for (const w of picked.slice(0, CHOOSE_WORD_COUNT)) {
      const options = wordOptions(w, words, seed);
      if (options.length >= 2) add("choose_word", "word", w.id, { word_id: w.id, option_word_ids: options.map((o) => o.id) });
    }
    for (const w of typed) add("type_word", "word", w.id, { word_id: w.id });
  }

  // ----- Ôn nghe -----
  if (sentences.length >= 2) {
    const add = openSession("listening", "review_listening");
    // Câu dài hơn được ưu tiên cho phần gõ lại; phần chọn câu lấy từ các câu còn lại.
    const byLength = [...sentences].sort((a, b) => b.tokens.length - a.tokens.length || stableHash(seed + a.id) - stableHash(seed + b.id));
    const typed = byLength.slice(0, LISTEN_TYPE_COUNT);
    const typedIds = new Set(typed.map((s) => s.id));
    const chosen = sample(
      sentences.filter((s) => !typedIds.has(s.id)),
      LISTEN_CHOOSE_COUNT,
      `${seed}:sentences`,
    );
    for (const s of chosen) {
      const options = sentenceOptions(s, sentences, seed);
      if (options.length >= 2) add("listen_choose", "sentence", s.id, { sentence_id: s.id, option_sentence_ids: options.map((o) => o.id) });
    }
    for (const s of sample(typed, typed.length, `${seed}:typed`)) add("listen_type", "sentence", s.id, { sentence_id: s.id });
  }

  return { sessions, exercises };
}

/**
 * Chấm một phiên có ngưỡng đạt: chỉ tính lần trả lời đầu tiên của mỗi bài tập.
 * @returns phần trăm đúng (0-100) và có đạt ngưỡng hay không
 */
export function scoreFirstTries(
  attempts: { exerciseId: string; isCorrect: boolean }[],
  passPercent: number | null,
): { percent: number; passed: boolean } {
  const first = new Map<string, boolean>();
  for (const a of attempts) if (!first.has(a.exerciseId)) first.set(a.exerciseId, a.isCorrect);
  if (first.size === 0) return { percent: 0, passed: passPercent === null };
  const percent = Math.round(([...first.values()].filter(Boolean).length / first.size) * 100);
  return { percent, passed: passPercent === null || percent >= passPercent };
}
