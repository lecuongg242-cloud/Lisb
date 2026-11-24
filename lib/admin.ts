import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { audioKey } from "./audio/key";
import { exerciseRefs, getOrderedLessons, getProfile, loadContent, loadLessonDetail, type LessonDetail, type LessonSession } from "./data";
import type { ExerciseType, GeneratedExercise } from "./exercises/types";
import { getLanguageModule } from "./lang";
import { prepareLesson } from "./publish";
import type { ContentBundle } from "./views";

/** Phiên của quản trị viên; null nếu người đang đăng nhập không phải quản trị. RLS vẫn là lớp chặn thật. */
export async function getAdmin() {
  const { supabase, user, profile } = await getProfile();
  return profile.role === "admin" ? { supabase, user, profile } : null;
}

/** Đọc hết một truy vấn có thể vượt giới hạn 1000 dòng mỗi lần của API. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) return out;
  }
}

// ---------- Xem trước bài học ----------

export type PreviewExercise = { sessionNo: number; order: number; type: ExerciseType; payload: Record<string, unknown> };

export type LessonPreview = {
  detail: LessonDetail;
  status: string;
  kind: string;
  courseId: string;
  ttsLocale: string;
  /** Thông tin chỉ quản trị cần: nhãn cấp độ của từ và các cách viết nghĩa khác được chấm đúng. */
  wordExtra: Record<string, { levelTag: string | null; acceptedMeanings: string[] }>;
  sessions: LessonSession[];
  exercises: PreviewExercise[];
  /** saved: bài tập đang lưu trong database (thứ người học thấy). generated: sinh thử từ nội dung hiện tại, chưa lưu. */
  exerciseSource: "saved" | "generated" | "none";
  /** Bài đã có bài tập lưu trong database hay chưa. */
  hasSaved: boolean;
  /** Lý do không sinh thử được bài tập (bài nháp thiếu nội dung hoặc thiếu nghĩa). */
  problem: { reason: string; words?: string[] } | null;
  /** Nội dung của mọi từ và câu mà bài tập nhắc tới, gồm cả lựa chọn nhiễu lấy từ bài khác. */
  content: ContentBundle;
};

/**
 * Toàn bộ nội dung của một bài cho trang xem trước của quản trị.
 * Bài chưa có bài tập (bài nháp) thì bài tập được sinh thử. `fresh` buộc sinh thử cả với bài đã xuất bản,
 * để xem nội dung vừa sửa sẽ cho ra bài tập thế nào trước khi sinh lại thật.
 */
export async function loadLessonPreview(supabase: SupabaseClient, lessonId: string, options: { fresh?: boolean } = {}): Promise<LessonPreview | null> {
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, kind, status, units(levels(course_id, courses(target_lang, languages!courses_target_lang_fkey(tts_locale))))")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!lesson) return null;
  const level = (lesson.units as unknown as { levels: { course_id: string; courses: { target_lang: string; languages: { tts_locale: string | null } | null } } }).levels;
  const targetLang = level.courses.target_lang;

  const { data: sourceLangs } = await supabase.from("course_source_langs").select("source_lang").eq("course_id", level.course_id).order("source_lang");
  const sourceLang = (sourceLangs ?? []).map((r) => r.source_lang as string).find((code) => code === "vi") ?? (sourceLangs?.[0]?.source_lang as string | undefined) ?? "vi";
  const ctx = { supabase, course: { targetLang }, enrollment: { sourceLang } };

  const detail = await loadLessonDetail(ctx, lessonId);
  if (!detail) return null;

  const { data: savedRows, error: savedError } = await supabase
    .from("exercises")
    .select("session_no, sort_order, type, payload")
    .eq("lesson_id", lessonId)
    .order("session_no")
    .order("sort_order");
  if (savedError) throw new Error(savedError.message);

  let sessions = detail.sessions;
  let exercises: PreviewExercise[] = (savedRows ?? []).map((r) => ({
    sessionNo: r.session_no as number,
    order: r.sort_order as number,
    type: r.type as ExerciseType,
    payload: r.payload as Record<string, unknown>,
  }));
  const hasSaved = exercises.length > 0;
  let exerciseSource: LessonPreview["exerciseSource"] = hasSaved ? "saved" : "none";
  let problem: LessonPreview["problem"] = null;

  if (!exercises.length || options.fresh) {
    const prepared = await prepareLesson(supabase, lessonId);
    if (prepared.ok) {
      sessions = prepared.sessions.map((s) => ({ no: s.session_no, type: s.session_type, kind: s.kind, steps: s.step_count, passPercent: s.pass_percent ?? null }));
      exercises = prepared.exercises.map((e: GeneratedExercise) => ({ sessionNo: e.session_no, order: e.sort_order, type: e.type, payload: e.payload }));
      exerciseSource = "generated";
    } else {
      exercises = [];
      exerciseSource = "none";
      problem = { reason: prepared.reason, words: prepared.reason === "missing_translations" ? prepared.words : undefined };
    }
  }

  const refs = exerciseRefs(exercises);
  const content = await loadContent(supabase, refs, { target: targetLang, source: sourceLang }, targetLang);

  const wordExtra: LessonPreview["wordExtra"] = {};
  if (detail.wordIds.length) {
    const { data: extraRows, error: extraError } = await supabase
      .from("words")
      .select("id, level_tag, word_translations(locale, accepted_forms)")
      .in("id", detail.wordIds);
    if (extraError) throw new Error(extraError.message);
    for (const row of extraRows ?? []) {
      const translations = row.word_translations as { locale: string; accepted_forms: string[] | null }[];
      wordExtra[row.id as string] = {
        levelTag: (row.level_tag as string | null) ?? null,
        acceptedMeanings: translations.filter((tr) => tr.locale === sourceLang).flatMap((tr) => tr.accepted_forms ?? []),
      };
    }
  }

  return {
    detail,
    status: lesson.status as string,
    kind: lesson.kind as string,
    courseId: level.course_id,
    ttsLocale: level.courses.languages?.tts_locale ?? targetLang,
    wordExtra,
    sessions,
    exercises,
    exerciseSource,
    hasSaved,
    problem,
    content,
  };
}

// ---------- Nghe duyệt âm thanh ----------

export type AudioKind = "word" | "sentence" | "token";
export type AudioVerdict = "ok" | "bad";
export type AudioItem = {
  key: string;
  text: string;
  kind: AudioKind;
  /** Phiên âm, chỉ có với từ. */
  pronunciation: string | null;
  /** Kết luận theo từng giọng (tên thư mục giọng); giọng chưa duyệt thì không có mục. */
  verdicts: Record<string, { verdict: AudioVerdict; note: string | null }>;
};
export type AudioUnit = { id: string; title: string; levelCode: string; items: AudioItem[] };

/**
 * Mọi đoạn văn bản có file âm thanh, gom theo chủ đề: từ của bài, câu mẫu, và từng từ xuất hiện trong câu.
 * Một đoạn chỉ xuất hiện ở chủ đề đầu tiên dùng nó, vì file âm thanh dùng chung cho cả khóa.
 */
export async function loadAudioUnits(supabase: SupabaseClient, courseId: string, targetLang: string, sourceLang: string): Promise<AudioUnit[]> {
  const lang = getLanguageModule(targetLang);
  const lessons = (await getOrderedLessons(supabase, courseId)).filter((l) => l.kind === "lesson");
  const lessonIds = lessons.map((l) => l.id);
  if (!lessonIds.length) return [];
  const unitIds = [...new Set(lessons.map((l) => l.unitId))];

  const [wordRows, sentenceRows, { data: unitTitles }, reviews] = await Promise.all([
    fetchAll<{ lesson_id: string; sort_order: number; words: { lemma: string; pronunciation: string | null } }>((from, to) =>
      supabase.from("lesson_words").select("lesson_id, sort_order, words(lemma, pronunciation)").in("lesson_id", lessonIds).order("lesson_id").order("word_id").range(from, to) as never,
    ),
    fetchAll<{ lesson_id: string; sort_order: number; text: string }>((from, to) =>
      supabase.from("sentences").select("lesson_id, sort_order, text").in("lesson_id", lessonIds).order("id").range(from, to),
    ),
    supabase.from("unit_translations").select("unit_id, title").eq("locale", sourceLang).in("unit_id", unitIds),
    fetchAll<{ audio_key: string; voice: string; verdict: AudioVerdict; note: string | null }>((from, to) =>
      supabase.from("audio_reviews").select("audio_key, voice, verdict, note").order("audio_key").order("voice").range(from, to),
    ),
  ]);

  const verdictsByKey = new Map<string, AudioItem["verdicts"]>();
  for (const r of reviews) {
    const entry = verdictsByKey.get(r.audio_key) ?? {};
    entry[r.voice] = { verdict: r.verdict, note: r.note };
    verdictsByKey.set(r.audio_key, entry);
  }

  const titleByUnit = new Map((unitTitles ?? []).map((r) => [r.unit_id as string, r.title as string]));
  const units = new Map<string, AudioUnit>();
  const seen = new Set<string>();
  const add = (unitId: string, levelCode: string, kind: AudioKind, text: string, pronunciation: string | null) => {
    if (seen.has(text)) return;
    seen.add(text);
    const unit = units.get(unitId) ?? { id: unitId, title: titleByUnit.get(unitId) ?? "", levelCode, items: [] };
    const key = audioKey(text);
    unit.items.push({ key, text, kind, pronunciation, verdicts: verdictsByKey.get(key) ?? {} });
    units.set(unitId, unit);
  };

  const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;
  // Theo đúng thứ tự học: từ của bài, rồi câu của bài, rồi các từ lẻ trong câu.
  for (const lesson of lessons) {
    for (const row of wordRows.filter((r) => r.lesson_id === lesson.id).sort(bySort)) {
      add(lesson.unitId, lesson.levelCode, "word", row.words.lemma, row.words.pronunciation);
    }
    const ownSentences = sentenceRows.filter((r) => r.lesson_id === lesson.id).sort(bySort);
    for (const row of ownSentences) add(lesson.unitId, lesson.levelCode, "sentence", row.text, null);
    for (const row of ownSentences) for (const token of lang.tokenize(row.text)) add(lesson.unitId, lesson.levelCode, "token", token, null);
  }
  return unitIds.map((id) => units.get(id)).filter((u): u is AudioUnit => !!u);
}

// ---------- Báo lỗi nội dung ----------

export type ReportStatus = "open" | "fixed" | "rejected";
export type ReportRow = {
  id: string;
  ownerType: "word" | "sentence";
  ownerId: string;
  reason: string;
  note: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: string | null;
  /** Nội dung bị báo lỗi; null nếu mục đó đã bị xóa khỏi khóa học. */
  target: { text: string; pronunciation: string | null; meaning: string | null; lessonId: string | null } | null;
};

export async function countOpenReports(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase.from("content_reports").select("id", { count: "exact", head: true }).eq("status", "open");
  return count ?? 0;
}

/** Báo cáo theo trạng thái, mới nhất trước, kèm nội dung bị báo và bài chứa nó. */
export async function loadReports(supabase: SupabaseClient, status: ReportStatus, limit = 200): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("content_reports")
    .select("id, user_id, owner_type, owner_id, locale, reason, note, status, created_at")
    .eq("status", status)
    .in("owner_type", ["word", "sentence"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (!rows.length) return [];

  const idsOf = (type: string) => [...new Set(rows.filter((r) => r.owner_type === type).map((r) => r.owner_id as string))];
  const wordIds = idsOf("word");
  const sentenceIds = idsOf("sentence");
  const userIds = [...new Set(rows.map((r) => r.user_id as string | null).filter((v): v is string => !!v))];
  const none = Promise.resolve({ data: [] as never[], error: null });

  const [words, lessonWords, sentences, profiles] = await Promise.all([
    wordIds.length ? supabase.from("words").select("id, lemma, pronunciation, word_translations(locale, meaning)").in("id", wordIds) : none,
    wordIds.length ? supabase.from("lesson_words").select("word_id, lesson_id").in("word_id", wordIds) : none,
    sentenceIds.length ? supabase.from("sentences").select("id, text, lesson_id, sentence_translations(locale, text)").in("id", sentenceIds) : none,
    userIds.length ? supabase.from("profiles").select("id, display_name").in("id", userIds) : none,
  ]);
  const failed = words.error ?? lessonWords.error ?? sentences.error ?? profiles.error;
  if (failed) throw new Error(failed.message);

  const lessonByWord = new Map<string, string>();
  for (const r of (lessonWords.data ?? []) as { word_id: string; lesson_id: string }[]) if (!lessonByWord.has(r.word_id)) lessonByWord.set(r.word_id, r.lesson_id);
  const nameById = new Map(((profiles.data ?? []) as { id: string; display_name: string | null }[]).map((p) => [p.id, p.display_name]));

  type WordRow = { id: string; lemma: string; pronunciation: string | null; word_translations: { locale: string; meaning: string }[] };
  type SentenceRow = { id: string; text: string; lesson_id: string; sentence_translations: { locale: string; text: string }[] };
  const wordById = new Map(((words.data ?? []) as WordRow[]).map((w) => [w.id, w]));
  const sentenceById = new Map(((sentences.data ?? []) as SentenceRow[]).map((s) => [s.id, s]));

  return rows.map((r) => {
    const locale = (r.locale as string | null) ?? "vi";
    let target: ReportRow["target"] = null;
    if (r.owner_type === "word") {
      const w = wordById.get(r.owner_id as string);
      if (w) {
        target = {
          text: w.lemma,
          pronunciation: w.pronunciation,
          meaning: w.word_translations.find((tr) => tr.locale === locale)?.meaning ?? null,
          lessonId: lessonByWord.get(w.id) ?? null,
        };
      }
    } else {
      const s = sentenceById.get(r.owner_id as string);
      if (s) target = { text: s.text, pronunciation: null, meaning: s.sentence_translations.find((tr) => tr.locale === locale)?.text ?? null, lessonId: s.lesson_id };
    }
    return {
      id: r.id as string,
      ownerType: r.owner_type as "word" | "sentence",
      ownerId: r.owner_id as string,
      reason: r.reason as string,
      note: (r.note as string | null) ?? null,
      status: r.status as ReportStatus,
      createdAt: r.created_at as string,
      reporter: r.user_id ? (nameById.get(r.user_id as string) ?? null) : null,
      target,
    };
  });
}
