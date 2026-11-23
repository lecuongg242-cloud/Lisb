import { editDistance, stableHash } from "../lang/distance";
import type { GeneratedExercise } from "./types";

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

const WORDS_PER_CHUNK = 3;
const MAX_PAIRS = 5;

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
function evenGroups<T>(items: T[], max: number): T[][] {
  const groups = Math.ceil(items.length / max);
  const size = Math.ceil(items.length / groups);
  return chunk(items, size);
}

/**
 * Sinh toàn bộ bài tập của một bài học từ từ và câu của nó.
 * Hàm thuần và tất định: cùng đầu vào luôn cho cùng kết quả.
 */
export function generateExercises(input: GenerateInput): GeneratedExercise[] {
  const { words, sentences } = input;
  const allSentences = [...sentences, ...input.poolSentences];
  const out: GeneratedExercise[] = [];

  // ----- Phiên từ vựng: nhận biết trước, tự tạo ra sau -----
  let order = 0;
  const vocab = (type: GeneratedExercise["type"], sourceId: string | null, payload: Record<string, unknown>) =>
    out.push({
      session_type: "vocab",
      sort_order: ++order,
      type,
      source_type: sourceId ? "word" : "none",
      source_id: sourceId,
      payload,
    });

  // Đáp án nhiễu chỉ lấy từ những từ người học đã gặp: bài trước và các từ đã giới thiệu trong bài này.
  const introduced: GenWord[] = [...input.poolWords];
  for (const group of chunk(words, WORDS_PER_CHUNK)) {
    for (const w of group) vocab("word_intro", w.id, { word_id: w.id });
    introduced.push(...group);
    for (const w of group) {
      const options = shuffle([w, ...similarWords(w, introduced, 3)], `meaning:${w.id}`, (o) => o.id);
      // Chưa đủ từ để làm lựa chọn (bài đầu tiên, các từ đồng nghĩa nhau) thì bỏ qua câu hỏi này.
      if (options.length >= 2) vocab("choose_meaning", w.id, { word_id: w.id, option_word_ids: options.map((o) => o.id) });
    }
  }
  if (words.length >= 2) {
    for (const group of evenGroups(words, MAX_PAIRS)) {
      if (group.length >= 2) vocab("match_pairs", null, { word_ids: group.map((w) => w.id) });
    }
  }
  for (const w of words) vocab("type_word", w.id, { word_id: w.id });

  // ----- Phiên nghe -----
  order = 0;
  const listening = (type: GeneratedExercise["type"], sourceId: string, payload: Record<string, unknown>) =>
    out.push({ session_type: "listening", sort_order: ++order, type, source_type: "sentence", source_id: sourceId, payload });

  for (const s of sentences) {
    const options = shuffle([s, ...similarSentences(s, allSentences, 2)], `listen:${s.id}`, (o) => o.id);
    if (options.length >= 2) {
      listening("listen_choose", s.id, { sentence_id: s.id, option_sentence_ids: options.map((o) => o.id) });
    }
  }
  for (const s of sentences) {
    if (s.tokens.length < 2) continue;
    const extra = distractorTokens(s, allSentences, s.tokens.length >= 4 ? 3 : 2);
    listening("listen_arrange", s.id, { sentence_id: s.id, distractor_tokens: extra });
  }
  for (const s of sentences) listening("listen_type", s.id, { sentence_id: s.id });

  return out;
}
