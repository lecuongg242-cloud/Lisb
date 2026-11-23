import { editDistance, stableHash } from "../lang/distance";
import type { GeneratedExercise, GeneratedSession, SessionKind, SessionType } from "./types";

/** meanings: nghĩa chính và các nghĩa được chấp nhận của từ (ở ngôn ngữ giải thích), dùng để tránh đáp án nhiễu đồng nghĩa. */
export type GenWord = { id: string; lemma: string; pos: string; meanings?: string[] };
/** tokens: các từ của câu ở dạng hiển thị trên thẻ (không dấu câu). */
export type GenSentence = { id: string; text: string; tokens: string[] };

export type GenerateInput = {
  /** Từ mới của bài, theo thứ tự dạy. */
  words: GenWord[];
  /** Câu mẫu của bài, theo thứ tự. */
  sentences: GenSentence[];
  /** Từ và câu đã dạy ở các bài trước trong khóa: nguồn đáp án nhiễu. */
  poolWords: GenWord[];
  poolSentences: GenSentence[];
};

export type GenerateOutput = { sessions: GeneratedSession[]; exercises: GeneratedExercise[] };

/** Số từ tối đa trong một phiên học từ mới: giữ mỗi phiên trong khung 2-3 phút. */
export const MAX_WORDS_PER_LEARN_SESSION = 5;
/** Giới thiệu hai từ rồi hỏi ngay hai từ đó, để không phải nhớ quá nhiều thứ cùng lúc. */
const INTRO_BATCH = 2;

/** Sắp xếp có tính tất định theo mã băm, để thứ tự lựa chọn không lộ đáp án và không đổi giữa các lần sinh. */
function shuffle<T>(items: T[], seed: string, key: (item: T) => string): T[] {
  return [...items].sort((a, b) => stableHash(seed + key(a)) - stableHash(seed + key(b)) || key(a).localeCompare(key(b)));
}

const meaningKey = (m: string) => m.trim().toLowerCase();

/** Hai từ có chung một nghĩa (ví dụ hello và hi đều là "xin chào") thì không dùng làm đáp án nhiễu của nhau. */
function sharesMeaning(a: GenWord, b: GenWord): boolean {
  if (!a.meanings?.length || !b.meanings?.length) return false;
  const own = new Set(a.meanings.map(meaningKey));
  return b.meanings.some((m) => own.has(meaningKey(m)));
}

/** Chọn n từ giống từ đích nhất: cùng từ loại trước, rồi tới chữ viết gần nhất. */
function similarWords(target: GenWord, candidates: GenWord[], n: number): GenWord[] {
  const seen = new Set([target.id]);
  return candidates
    .filter((c) => {
      if (seen.has(c.id) || c.lemma.toLowerCase() === target.lemma.toLowerCase() || sharesMeaning(target, c)) return false;
      seen.add(c.id);
      return true;
    })
    .map((c) => ({
      c,
      score: (c.pos === target.pos ? 0 : 100) + editDistance(c.lemma.toLowerCase(), target.lemma.toLowerCase()),
    }))
    .sort((a, b) => a.score - b.score || a.c.id.localeCompare(b.c.id))
    .slice(0, n)
    .map((x) => x.c);
}

function similarSentences(target: GenSentence, candidates: GenSentence[], n: number): GenSentence[] {
  const seen = new Set([target.id]);
  const text = target.text.toLowerCase();
  return candidates
    .filter((c) => {
      if (seen.has(c.id) || c.text.toLowerCase() === text) return false;
      seen.add(c.id);
      return true;
    })
    .map((c) => ({ c, score: editDistance(c.text.toLowerCase(), text) }))
    .sort((a, b) => a.score - b.score || a.c.id.localeCompare(b.c.id))
    .slice(0, n)
    .map((x) => x.c);
}

function distractorTokens(target: GenSentence, candidates: GenSentence[], n: number): string[] {
  const own = new Set(target.tokens.map((t) => t.toLowerCase()));
  const best = new Map<string, { token: string; score: number }>();
  for (const s of candidates) {
    if (s.id === target.id) continue;
    for (const token of s.tokens) {
      const lower = token.toLowerCase();
      if (own.has(lower)) continue;
      const score = Math.min(...target.tokens.map((t) => editDistance(t.toLowerCase(), lower)));
      const prev = best.get(lower);
      if (!prev || score < prev.score) best.set(lower, { token, score });
    }
  }
  return [...best.values()]
    .sort((a, b) => a.score - b.score || a.token.localeCompare(b.token))
    .slice(0, n)
    .map((x) => x.token);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Chia đều thành các nhóm không quá `max` phần tử (8 từ -> 4 + 4, không phải 5 + 3). */
export function evenGroups<T>(items: T[], max: number): T[][] {
  if (!items.length) return [];
  const groups = Math.ceil(items.length / max);
  const size = Math.ceil(items.length / groups);
  return chunk(items, size);
}

/**
 * Sinh toàn bộ phiên học và bài tập của một bài từ từ và câu của nó.
 * Hàm thuần và tất định: cùng đầu vào luôn cho cùng kết quả.
 *
 * Mỗi bài gồm các phiên ngắn theo thứ tự:
 *   1. Học từ mới (một hoặc nhiều phiên, mỗi phiên tối đa 5 từ): giới thiệu, chọn nghĩa, ghép cặp.
 *   2. Nhớ lại từ: nhìn nghĩa, gõ từ.
 *   3. Nghe hiểu: nghe và chọn câu, nghe và sắp xếp từ.
 *   4. Nghe chép: nghe và gõ lại cả câu.
 */
export function generateExercises(input: GenerateInput): GenerateOutput {
  const { words, sentences } = input;
  const allSentences = [...sentences, ...input.poolSentences];
  const sessions: GeneratedSession[] = [];
  const exercises: GeneratedExercise[] = [];

  /** Mở một phiên mới và trả về hàm thêm bài tập vào phiên đó. Phiên không có bài tập nào thì không được tạo. */
  const openSession = (sessionType: SessionType, kind: SessionKind) => {
    const session: GeneratedSession = { session_no: 0, session_type: sessionType, kind, step_count: 0 };
    return (type: GeneratedExercise["type"], sourceType: "word" | "sentence" | "none", sourceId: string | null, payload: Record<string, unknown>) => {
      if (session.step_count === 0) {
        sessions.push(session);
        session.session_no = sessions.length;
      }
      session.step_count += 1;
      exercises.push({
        session_type: sessionType,
        session_no: session.session_no,
        sort_order: session.step_count,
        type,
        source_type: sourceType,
        source_id: sourceId,
        payload,
      });
    };
  };

  // ----- Học từ mới: nhận biết -----
  // Đáp án nhiễu chỉ lấy từ những từ người học đã gặp: bài trước và các từ đã giới thiệu trong bài này.
  const introduced: GenWord[] = [...input.poolWords];
  for (const group of evenGroups(words, MAX_WORDS_PER_LEARN_SESSION)) {
    const add = openSession("vocab", "vocab_learn");
    for (const batch of chunk(group, INTRO_BATCH)) {
      for (const w of batch) add("word_intro", "word", w.id, { word_id: w.id });
      introduced.push(...batch);
      for (const w of batch) {
        const options = shuffle([w, ...similarWords(w, introduced, 3)], `meaning:${w.id}`, (o) => o.id);
        // Chưa đủ từ để làm lựa chọn (bài đầu tiên, các từ đồng nghĩa nhau) thì bỏ qua câu hỏi này.
        if (options.length >= 2) add("choose_meaning", "word", w.id, { word_id: w.id, option_word_ids: options.map((o) => o.id) });
      }
    }
    if (group.length >= 2) add("match_pairs", "none", null, { word_ids: group.map((w) => w.id) });
  }

  // ----- Nhớ lại từ: tự tạo ra -----
  if (words.length) {
    const add = openSession("vocab", "vocab_recall");
    for (const w of words) add("type_word", "word", w.id, { word_id: w.id });
  }

  // ----- Nghe hiểu -----
  if (sentences.length) {
    const add = openSession("listening", "listen_recognize");
    for (const s of sentences) {
      const options = shuffle([s, ...similarSentences(s, allSentences, 2)], `listen:${s.id}`, (o) => o.id);
      if (options.length >= 2) add("listen_choose", "sentence", s.id, { sentence_id: s.id, option_sentence_ids: options.map((o) => o.id) });
    }
    for (const s of sentences) {
      if (s.tokens.length < 2) continue;
      const extra = distractorTokens(s, allSentences, s.tokens.length >= 4 ? 3 : 2);
      add("listen_arrange", "sentence", s.id, { sentence_id: s.id, distractor_tokens: extra });
    }
  }

  // ----- Nghe chép -----
  if (sentences.length) {
    const add = openSession("listening", "listen_dictation");
    for (const s of sentences) add("listen_type", "sentence", s.id, { sentence_id: s.id });
  }

  return { sessions, exercises };
}
