import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { audioKey } from "../audio/key";
import { getLanguageModule } from "../lang";
import {
  countByType,
  generateLevelTestPool,
  LEVEL_TEST_PASS_PERCENT,
  LEVEL_TEST_QUESTION_COUNT,
  LEVEL_TEST_TYPES,
  type PoolSentence,
  type PoolWord,
} from "./pool";
import type { LevelTestOverview } from "./types";

export type PublishLevelTestResult = { ok: true; count: number } | { ok: false; reason: "forbidden" | "not_found" | "no_content" | "error"; detail?: string };

/**
 * Sinh ngân hàng câu hỏi từ mọi bài học đã xuất bản của một cấp rồi mở bài kiểm tra cuối cấp.
 * Chạy bằng phiên của quản trị viên; hàm publish_level_test trong database tự kiểm tra quyền.
 */
export async function publishLevelTest(supabase: SupabaseClient, levelId: string): Promise<PublishLevelTestResult> {
  const { data: level, error: levelError } = await supabase
    .from("levels")
    .select("id, courses(target_lang), units(id, lessons(id, kind, status))")
    .eq("id", levelId)
    .maybeSingle();
  if (levelError) return { ok: false, reason: "error", detail: levelError.message };
  if (!level) return { ok: false, reason: "not_found" };

  const targetLang = (level.courses as unknown as { target_lang: string }).target_lang;
  const lang = getLanguageModule(targetLang);
  const units = level.units as unknown as { id: string; lessons: { id: string; kind: string; status: string }[] }[];
  // Bài ôn không có nội dung riêng; bài còn nháp chưa được dạy nên không được đưa vào đề.
  const unitByLesson = new Map<string, string>();
  for (const unit of units) {
    for (const lesson of unit.lessons) if (lesson.kind === "lesson" && lesson.status === "published") unitByLesson.set(lesson.id, unit.id);
  }
  const lessonIds = [...unitByLesson.keys()];
  if (!lessonIds.length) return { ok: false, reason: "no_content" };

  const [{ data: wordRows, error: e1 }, { data: sentenceRows, error: e2 }] = await Promise.all([
    supabase
      .from("lesson_words")
      .select("lesson_id, words(id, lemma, part_of_speech, word_translations(locale, meaning, accepted_forms))")
      .in("lesson_id", lessonIds),
    supabase.from("sentences").select("id, lesson_id, text").in("lesson_id", lessonIds),
  ]);
  const error = e1 ?? e2;
  if (error) return { ok: false, reason: "error", detail: error.message };

  type WordRow = {
    lesson_id: string;
    words: { id: string; lemma: string; part_of_speech: string; word_translations: { locale: string; meaning: string; accepted_forms: string[] | null }[] };
  };
  const words: PoolWord[] = ((wordRows ?? []) as unknown as WordRow[]).map((row) => ({
    id: row.words.id,
    lemma: row.words.lemma,
    pos: row.words.part_of_speech,
    unitId: unitByLesson.get(row.lesson_id)!,
    // Nghĩa ở các ngôn ngữ giải thích: hai từ chung nghĩa không làm đáp án nhiễu của nhau.
    meanings: row.words.word_translations.filter((t) => t.locale !== targetLang).flatMap((t) => [t.meaning, ...(t.accepted_forms ?? [])]),
  }));
  const sentences: PoolSentence[] = (sentenceRows ?? []).map((row) => ({
    id: row.id as string,
    text: row.text as string,
    tokens: lang.tokenize(row.text as string),
    unitId: unitByLesson.get(row.lesson_id as string)!,
    audioKey: audioKey(row.text as string),
  }));

  const pool = generateLevelTestPool({ words, sentences, seed: levelId });
  const counts = countByType(pool);
  if (LEVEL_TEST_TYPES.some((type) => counts[type] < LEVEL_TEST_QUESTION_COUNT / LEVEL_TEST_TYPES.length)) return { ok: false, reason: "no_content" };

  const { data: count, error: rpcError } = await supabase.rpc("publish_level_test", {
    p_level_id: levelId,
    p_question_count: LEVEL_TEST_QUESTION_COUNT,
    p_pass_percent: LEVEL_TEST_PASS_PERCENT,
    p_questions: pool,
  });
  if (rpcError) return { ok: false, reason: rpcError.message.includes("forbidden") ? "forbidden" : "error", detail: rpcError.message };
  return { ok: true, count: count as number };
}

/** Bài kiểm tra đang mở của các cấp, kèm kết quả của người học. Cấp không có bài kiểm tra thì không có trong kết quả. */
export async function getLevelTestOverview(supabase: SupabaseClient, userId: string, levelIds: string[]): Promise<Map<string, LevelTestOverview>> {
  const overview = new Map<string, LevelTestOverview>();
  if (!levelIds.length) return overview;

  const [{ data: tests, error: e1 }, { data: attempts, error: e2 }] = await Promise.all([
    supabase.from("level_tests").select("level_id, question_count, pass_percent").eq("status", "published").in("level_id", levelIds),
    supabase.from("level_test_attempts").select("level_id, percent, passed").eq("user_id", userId).eq("status", "submitted").in("level_id", levelIds),
  ]);
  const error = e1 ?? e2;
  if (error) throw new Error(error.message);

  for (const test of tests ?? []) {
    overview.set(test.level_id as string, {
      questionCount: test.question_count as number,
      passPercent: test.pass_percent as number,
      passed: false,
      bestPercent: null,
      attempts: 0,
    });
  }
  for (const attempt of attempts ?? []) {
    const entry = overview.get(attempt.level_id as string);
    if (!entry) continue;
    entry.attempts += 1;
    entry.passed ||= attempt.passed === true;
    entry.bestPercent = Math.max(entry.bestPercent ?? 0, (attempt.percent as number | null) ?? 0);
  }
  return overview;
}
