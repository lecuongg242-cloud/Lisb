import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sentenceChips } from "./content/chips";
import { getOrderedLessons } from "./data";
import { generateExercises, type GenSentence, type GenWord } from "./exercises/generate";
import { getLanguageModule } from "./lang";

export type PublishResult =
  | { ok: true; count: number }
  | { ok: false; reason: "forbidden" | "not_found" | "no_content" | "error"; detail?: string }
  | { ok: false; reason: "missing_translations"; words: string[] };

type WordRow = {
  id: string;
  lemma: string;
  part_of_speech: string;
  word_translations: { locale: string; meaning: string; accepted_forms: string[] | null }[];
};
type SentenceRow = {
  id: string;
  lesson_id: string;
  sort_order: number;
  text: string;
  sentence_words: { position: number; surface: string; word_id: string; words: { lemma: string } | null }[];
};

/**
 * Sinh bài tập cho một bài học rồi xuất bản.
 * Chạy bằng phiên của quản trị viên; RLS và hàm publish_lesson tự kiểm tra quyền.
 */
export async function publishLesson(supabase: SupabaseClient, lessonId: string): Promise<PublishResult> {
  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, units(levels(course_id, courses(target_lang)))")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return { ok: false, reason: "not_found" };
  const level = (lesson.units as unknown as { levels: { course_id: string; courses: { target_lang: string } } }).levels;
  const courseId = level.course_id;
  const lang = getLanguageModule(level.courses.target_lang);

  // Các bài đứng trước trong khóa là nguồn đáp án nhiễu.
  const ordered = await getOrderedLessons(supabase, courseId);
  const index = ordered.findIndex((l) => l.id === lessonId);
  if (index < 0) return { ok: false, reason: "not_found" };
  const earlierIds = ordered.slice(0, index).map((l) => l.id);
  const lessonIds = [...earlierIds, lessonId];

  const [{ data: lessonWords, error: e1 }, { data: sentenceData, error: e2 }, { data: sourceLangs, error: e3 }] = await Promise.all([
    supabase
      .from("lesson_words")
      .select("lesson_id, sort_order, words(id, lemma, part_of_speech, word_translations(locale, meaning, accepted_forms))")
      .in("lesson_id", lessonIds),
    supabase
      .from("sentences")
      .select("id, lesson_id, sort_order, text, sentence_words(position, surface, word_id, words(lemma))")
      .in("lesson_id", lessonIds),
    supabase.from("course_source_langs").select("source_lang").eq("course_id", courseId),
  ]);
  const error = e1 ?? e2 ?? e3;
  if (error) return { ok: false, reason: "error", detail: error.message };

  const targetLang = level.courses.target_lang;
  const toGenWord = (w: WordRow): GenWord => ({
    id: w.id,
    lemma: w.lemma,
    pos: w.part_of_speech,
    // Nghĩa ở các ngôn ngữ giải thích (không tính lời giải thích bằng chính ngôn ngữ đích).
    meanings: w.word_translations.filter((t) => t.locale !== targetLang).flatMap((t) => [t.meaning, ...(t.accepted_forms ?? [])]),
  });
  const toGenSentence = (s: SentenceRow): GenSentence => {
    const lemmaAt = new Map(s.sentence_words.map((sw) => [sw.position, sw.words?.lemma ?? null]));
    const tokens = lang.tokenize(s.text).map((surface, i) => ({ surface, lemma: lemmaAt.get(i + 1) ?? null }));
    return { id: s.id, text: s.text, tokens: sentenceChips(tokens) };
  };

  const lwRows = (lessonWords ?? []) as unknown as { lesson_id: string; sort_order: number; words: WordRow }[];
  const sRows = (sentenceData ?? []) as unknown as SentenceRow[];
  const rank = new Map(lessonIds.map((id, i) => [id, i]));
  const byLessonOrder = <T extends { lesson_id: string; sort_order: number }>(a: T, b: T) =>
    rank.get(a.lesson_id)! - rank.get(b.lesson_id)! || a.sort_order - b.sort_order;

  const words = lwRows.filter((r) => r.lesson_id === lessonId).sort(byLessonOrder).map((r) => toGenWord(r.words));
  const sentences = sRows.filter((s) => s.lesson_id === lessonId).sort(byLessonOrder).map(toGenSentence);
  if (!words.length || !sentences.length) return { ok: false, reason: "no_content" };

  // Mọi từ xuất hiện trong câu của bài phải có nghĩa ở mọi ngôn ngữ giải thích của khóa.
  const usedWordIds = new Set<string>(words.map((w) => w.id));
  const lemmaById = new Map<string, string>(words.map((w) => [w.id, w.lemma]));
  for (const s of sRows.filter((r) => r.lesson_id === lessonId)) {
    for (const sw of s.sentence_words) {
      usedWordIds.add(sw.word_id);
      if (sw.words) lemmaById.set(sw.word_id, sw.words.lemma);
    }
  }
  const { data: translations, error: e4 } = await supabase
    .from("word_translations")
    .select("word_id, locale")
    .in("word_id", [...usedWordIds]);
  if (e4) return { ok: false, reason: "error", detail: e4.message };
  const have = new Set((translations ?? []).map((t) => `${t.word_id}|${t.locale}`));
  const missing = new Set<string>();
  for (const id of usedWordIds) {
    for (const { source_lang } of sourceLangs ?? []) {
      if (!have.has(`${id}|${source_lang}`)) missing.add(`${lemmaById.get(id) ?? id} (${source_lang})`);
    }
  }
  if (missing.size) return { ok: false, reason: "missing_translations", words: [...missing] };

  const { sessions, exercises: generated } = generateExercises({
    words,
    sentences,
    poolWords: lwRows.filter((r) => r.lesson_id !== lessonId).sort(byLessonOrder).map((r) => toGenWord(r.words)),
    poolSentences: sRows.filter((s) => s.lesson_id !== lessonId).sort(byLessonOrder).map(toGenSentence),
  });

  // Giữ id của bài tập đã tồn tại để không mất lịch sử làm bài khi sinh lại.
  const { data: existing, error: e5 } = await supabase
    .from("exercises")
    .select("id, session_type, type, source_id, sort_order")
    .eq("lesson_id", lessonId)
    .order("sort_order");
  if (e5) return { ok: false, reason: "error", detail: e5.message };
  const reusable = new Map<string, string[]>();
  for (const e of existing ?? []) {
    const key = `${e.session_type}|${e.type}|${e.source_id ?? ""}`;
    reusable.set(key, [...(reusable.get(key) ?? []), e.id]);
  }
  const payload = generated.map((g) => {
    const key = `${g.session_type}|${g.type}|${g.source_id ?? ""}`;
    return { ...g, id: reusable.get(key)?.shift() ?? randomUUID() };
  });

  const { data: count, error: e6 } = await supabase.rpc("publish_lesson", {
    p_lesson_id: lessonId,
    p_sessions: sessions,
    p_exercises: payload,
  });
  if (e6) return { ok: false, reason: e6.message.includes("forbidden") ? "forbidden" : "error", detail: e6.message };
  return { ok: true, count: count as number };
}
