import { en } from "./en";
import type { LanguageModule } from "./types";

export type { AnswerResult, DiffPart, LanguageModule } from "./types";

const MODULES: Record<string, LanguageModule> = { en };

/** Lấy bộ xử lý ngôn ngữ theo mã BCP-47 của ngôn ngữ đích (ví dụ "en-US"). */
export function getLanguageModule(targetLang: string): LanguageModule {
  const base = targetLang.split("-")[0].toLowerCase();
  const mod = MODULES[base];
  if (!mod) throw new Error(`Chưa có bộ xử lý cho ngôn ngữ "${targetLang}"`);
  return mod;
}
