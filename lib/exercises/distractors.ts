import { editDistance } from "../lang/distance";

// Chọn đáp án nhiễu. Dùng chung cho bài tập của bài học, bài ôn cuối chủ đề và bài kiểm tra cuối cấp.
//
// Thứ tự ưu tiên, từ nặng tới nhẹ:
//   1. Cùng loại nội dung: chữ cái đứng riêng chỉ làm nhiễu cho chữ cái, từ thường cho từ thường;
//      câu đánh vần ("S, O, N.") chỉ làm nhiễu cho câu đánh vần. Khác loại thì quá dễ loại.
//   2. Cùng chủ đề: lựa chọn cùng chủ đề gần nghĩa nhau hơn nên đáng phân vân hơn.
//   3. Cùng từ loại (với từ).
//   4. Chữ viết gần nhau, tính theo tỉ lệ độ dài để chuỗi ngắn không tự nhiên được ưu tiên.
// Lựa chọn khác loại chỉ được dùng khi không còn đủ lựa chọn cùng loại (bài đầu tiên của một chủ đề).

/** meanings: nghĩa chính và các nghĩa được chấp nhận của từ (ở ngôn ngữ giải thích), dùng để tránh đáp án nhiễu đồng nghĩa. */
export type GenWord = { id: string; lemma: string; pos: string; meanings?: string[]; unitId?: string };
/** tokens: các từ của câu ở dạng hiển thị trên thẻ (không dấu câu). */
export type GenSentence = { id: string; text: string; tokens: string[]; unitId?: string };

const OTHER_KIND = 1000;
const OTHER_UNIT = 100;
const OTHER_POS = 50;

const meaningKey = (m: string) => m.trim().toLowerCase();

/** Hai từ có chung một nghĩa (ví dụ hello và hi đều là "xin chào") thì không dùng làm đáp án nhiễu của nhau. */
export function sharesMeaning(a: GenWord, b: GenWord): boolean {
  if (!a.meanings?.length || !b.meanings?.length) return false;
  const own = new Set(a.meanings.map(meaningKey));
  return b.meanings.some((m) => own.has(meaningKey(m)));
}

/** Độ khác nhau về chữ viết, từ 0 (giống hệt) tới 10 (khác hoàn toàn). */
function spellingGap(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return (editDistance(x, y) / Math.max(x.length, y.length, 1)) * 10;
}

const isLetter = (word: GenWord) => word.pos === "letter";
/** Câu đánh vần: mọi từ của câu đều là một ký tự. */
export const isSpelled = (sentence: GenSentence) => sentence.tokens.length > 0 && sentence.tokens.every((t) => t.length === 1);
/** Chỉ phạt khác chủ đề khi biết chủ đề của cả hai. */
const unitGap = (a: { unitId?: string }, b: { unitId?: string }) => (a.unitId && b.unitId && a.unitId !== b.unitId ? OTHER_UNIT : 0);

/** n từ làm đáp án nhiễu tốt nhất cho từ đích, lấy từ `candidates`. */
export function wordDistractors(target: GenWord, candidates: GenWord[], n: number): GenWord[] {
  const seen = new Set([target.id]);
  const lemma = target.lemma.toLowerCase();
  return candidates
    .filter((c) => {
      if (seen.has(c.id) || c.lemma.toLowerCase() === lemma || sharesMeaning(target, c)) return false;
      seen.add(c.id);
      return true;
    })
    .map((c) => ({
      c,
      score: (isLetter(c) === isLetter(target) ? 0 : OTHER_KIND) + unitGap(target, c) + (c.pos === target.pos ? 0 : OTHER_POS) + spellingGap(c.lemma, target.lemma),
    }))
    .sort((a, b) => a.score - b.score || a.c.id.localeCompare(b.c.id))
    .slice(0, n)
    .map((x) => x.c);
}

/** n câu làm đáp án nhiễu tốt nhất cho câu đích. */
export function sentenceDistractors(target: GenSentence, candidates: GenSentence[], n: number): GenSentence[] {
  const seen = new Set([target.id]);
  const text = target.text.toLowerCase();
  return candidates
    .filter((c) => {
      if (seen.has(c.id) || c.text.toLowerCase() === text) return false;
      seen.add(c.id);
      return true;
    })
    .map((c) => ({ c, score: (isSpelled(c) === isSpelled(target) ? 0 : OTHER_KIND) + unitGap(target, c) + spellingGap(c.text, target.text) }))
    .sort((a, b) => a.score - b.score || a.c.id.localeCompare(b.c.id))
    .slice(0, n)
    .map((x) => x.c);
}

/** n thẻ từ thừa cho bài sắp xếp câu: lấy từ các câu khác, không trùng từ nào của câu đích. */
export function tokenDistractors(target: GenSentence, candidates: GenSentence[], n: number): string[] {
  const own = new Set(target.tokens.map((t) => t.toLowerCase()));
  const best = new Map<string, { token: string; score: number }>();
  for (const s of candidates) {
    if (s.id === target.id) continue;
    const base = (isSpelled(s) === isSpelled(target) ? 0 : OTHER_KIND) + unitGap(target, s);
    for (const token of s.tokens) {
      const lower = token.toLowerCase();
      if (own.has(lower)) continue;
      const score = base + Math.min(...target.tokens.map((t) => spellingGap(t, token)));
      const prev = best.get(lower);
      if (!prev || score < prev.score) best.set(lower, { token, score });
    }
  }
  return [...best.values()]
    .sort((a, b) => a.score - b.score || a.token.localeCompare(b.token))
    .slice(0, n)
    .map((x) => x.token);
}
