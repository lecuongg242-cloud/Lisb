import { editDistance } from "./distance";
import type { AnswerResult, DiffPart, LanguageModule } from "./types";

const APOSTROPHES = /[‘’ʼ`]/g;
const EDGE_PUNCT = /^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu;

function tokenize(text: string): string[] {
  return text
    .replace(APOSTROPHES, "'")
    .split(/\s+/)
    .map((t) => t.replace(EDGE_PUNCT, ""))
    .filter(Boolean);
}

function normalize(text: string): string {
  return tokenize(text)
    .map((t) => t.toLowerCase().replace(/^'+|'+$/g, ""))
    .filter(Boolean)
    .join(" ");
}

/** Sai đúng một ký tự ở đúng một từ dài từ 5 chữ trở lên thì tính là "gần đúng". */
function isAlmost(input: string, candidate: string): boolean {
  const a = input.split(" ");
  const b = candidate.split(" ");
  if (a.length !== b.length) return false;
  let offBy = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (b[i].length < 5 || editDistance(a[i], b[i]) !== 1) return false;
    offBy++;
  }
  return offBy === 1;
}

function checkAnswer(input: string, expected: string, acceptedForms: string[] = []): AnswerResult {
  const given = normalize(input);
  if (!given) return "wrong";
  const candidates = [expected, ...acceptedForms].map(normalize);
  if (candidates.includes(given)) return "correct";
  return candidates.some((c) => isAlmost(given, c)) ? "almost" : "wrong";
}

function diffWords(expected: string, actual: string): DiffPart[] {
  const exp = tokenize(expected);
  const act = tokenize(actual);
  const e = exp.map((t) => t.toLowerCase());
  const a = act.map((t) => t.toLowerCase());

  // Chuỗi con chung dài nhất.
  const lcs = Array.from({ length: e.length + 1 }, () => new Array<number>(a.length + 1).fill(0));
  for (let i = e.length - 1; i >= 0; i--) {
    for (let j = a.length - 1; j >= 0; j--) {
      lcs[i][j] = e[i] === a[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < e.length && j < a.length) {
    if (e[i] === a[j]) {
      parts.push({ word: exp[i], status: "ok" });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      parts.push({ word: exp[i++], status: "missing" });
    } else {
      parts.push({ word: act[j++], status: "extra" });
    }
  }
  while (i < e.length) parts.push({ word: exp[i++], status: "missing" });
  while (j < a.length) parts.push({ word: act[j++], status: "extra" });
  return parts;
}

export const en: LanguageModule = { tokenize, normalize, checkAnswer, diffWords };
