import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { requireUser } from "./auth";
import { sentenceChips } from "./content/chips";
import { parseExercise, type Exercise, type SessionType } from "./exercises/types";
import { getLanguageModule } from "./lang";
import type { ContentBundle, ReviewCard, SentenceView, WordView } from "./views";

export type Profile = {
  id: string;
  display_name: string | null;
  role: "user" | "admin";
  ui_locale: string;
  daily_goal: number;
  new_cards_per_day: number;
  timezone: string;
  streak_count: number;
  longest_streak: number;
  last_active_date: string | null;
};

export type LearnerContext = {
  supabase: SupabaseClient;
  userId: string;
  profile: Profile;
  enrollment: { courseId: string; sourceLang: string; currentLessonId: string | null };
  course: { id: string; targetLang: string; ttsLocale: string };
};

const PROFILE_COLUMNS =
  "id, display_name, role, ui_locale, daily_goal, new_cards_per_day, timezone, streak_count, longest_streak, last_active_date";

export async function getProfile() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).single();
  if (error || !data) throw new Error("Không đọc được hồ sơ người dùng");
  return { supabase, user, profile: data as Profile };
}

/** Ngữ cảnh của người học: hồ sơ, khóa đang học, ngôn ngữ. Chưa ghi danh thì chuyển sang màn hình chào mừng. */
export async function getLearnerContext(): Promise<LearnerContext> {
  const { supabase, user, profile } = await getProfile();
  const { data } = await supabase
    .from("enrollments")
    .select("course_id, source_lang, current_lesson_id, courses(id, target_lang, languages(tts_locale))")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!data) redirect("/onboarding");

  const course = data.courses as unknown as { id: string; target_lang: string; languages: { tts_locale: string | null } | null };
  return {
    supabase,
    userId: user.id,
    profile,
    enrollment: { courseId: data.course_id, sourceLang: data.source_lang, currentLessonId: data.current_lesson_id },
    course: { id: course.id, targetLang: course.target_lang, ttsLocale: course.languages?.tts_locale ?? course.target_lang },
  };
}

export type OrderedLesson = {
  id: string;
  kind: string;
  status: string;
  number: number;
  unitId: string;
  unitSlug: string;
  unitStatus: string;
  levelCode: string;
};

/** Mọi bài học của khóa mà người gọi được phép thấy, theo đúng thứ tự học. */
export async function getOrderedLessons(supabase: SupabaseClient, courseId: string): Promise<OrderedLesson[]> {
  const { data, error } = await supabase
    .from("levels")
    .select("code, sort_order, units(id, slug, sort_order, status, lessons(id, sort_order, kind, status))")
    .eq("course_id", courseId);
  if (error) throw new Error(error.message);

  type Row = {
    code: string;
    sort_order: number;
    units: { id: string; slug: string; sort_order: number; status: string; lessons: { id: string; sort_order: number; kind: string; status: string }[] }[];
  };
  const out: OrderedLesson[] = [];
  for (const level of [...(data as Row[])].sort((a, b) => a.sort_order - b.sort_order)) {
    for (const unit of [...level.units].sort((a, b) => a.sort_order - b.sort_order)) {
      for (const lesson of [...unit.lessons].sort((a, b) => a.sort_order - b.sort_order)) {
        out.push({
          id: lesson.id,
          kind: lesson.kind,
          status: lesson.status,
          number: lesson.sort_order,
          unitId: unit.id,
          unitSlug: unit.slug,
          unitStatus: unit.status,
          levelCode: level.code,
        });
      }
    }
  }
  return out;
}

/** Các phiên đã hoàn thành của một bài học. */
export async function getCompletedSessionTypes(supabase: SupabaseClient, userId: string, lessonId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("session_logs")
    .select("session_type")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .not("completed_at", "is", null);
  return new Set((data ?? []).map((r) => r.session_type as string));
}

type Locales = { target: string; source: string };

function pick<T extends { locale: string }>(rows: T[] | null | undefined, locale: string): T | undefined {
  return rows?.find((r) => r.locale === locale);
}

/** Tải từ và câu theo id, kèm nghĩa ở hai ngôn ngữ và các từ cấu thành câu. */
export async function loadContent(
  supabase: SupabaseClient,
  ids: { wordIds: Iterable<string>; sentenceIds: Iterable<string> },
  locales: Locales,
  targetLang: string,
  exampleByWord: Map<string, string | null> = new Map(),
): Promise<ContentBundle> {
  const lang = getLanguageModule(targetLang);
  const sentenceIds = new Set([...ids.sentenceIds, ...[...exampleByWord.values()].filter((v): v is string => !!v)]);
  const wordIds = new Set(ids.wordIds);

  type SentenceRow = {
    id: string;
    text: string;
    accepted_forms: string[];
    sentence_translations: { locale: string; text: string; note: string | null }[];
    sentence_words: { position: number; surface: string; word_id: string }[];
  };
  let sentenceRows: SentenceRow[] = [];
  if (sentenceIds.size) {
    const { data, error } = await supabase
      .from("sentences")
      .select("id, text, accepted_forms, sentence_translations(locale, text, note), sentence_words(position, surface, word_id)")
      .in("id", [...sentenceIds]);
    if (error) throw new Error(error.message);
    sentenceRows = data as SentenceRow[];
    for (const s of sentenceRows) for (const sw of s.sentence_words) wordIds.add(sw.word_id);
  }

  type WordRow = {
    id: string;
    lemma: string;
    part_of_speech: string;
    pronunciation: string | null;
    word_translations: { locale: string; meaning: string; usage_note: string | null }[];
  };
  const words: Record<string, WordView> = {};
  if (wordIds.size) {
    const { data, error } = await supabase
      .from("words")
      .select("id, lemma, part_of_speech, pronunciation, word_translations(locale, meaning, usage_note)")
      .in("id", [...wordIds]);
    if (error) throw new Error(error.message);
    for (const w of data as WordRow[]) {
      const target = pick(w.word_translations, locales.target);
      const source = pick(w.word_translations, locales.source);
      words[w.id] = {
        id: w.id,
        lemma: w.lemma,
        pos: w.part_of_speech,
        pronunciation: w.pronunciation,
        meaningTarget: target?.meaning ?? null,
        meaningSource: source?.meaning ?? null,
        usageNoteTarget: target?.usage_note ?? null,
        usageNoteSource: source?.usage_note ?? null,
        exampleSentenceId: exampleByWord.get(w.id) ?? null,
      };
    }
  }

  const sentences: Record<string, SentenceView> = {};
  for (const s of sentenceRows) {
    const byPosition = new Map(s.sentence_words.map((sw) => [sw.position, sw.word_id]));
    const tokens = lang.tokenize(s.text).map((surface, i) => ({ surface, wordId: byPosition.get(i + 1) ?? null }));
    sentences[s.id] = {
      id: s.id,
      text: s.text,
      accepted: s.accepted_forms ?? [],
      translation: pick(s.sentence_translations, locales.source)?.text ?? null,
      noteTarget: pick(s.sentence_translations, locales.target)?.note ?? null,
      noteSource: pick(s.sentence_translations, locales.source)?.note ?? null,
      tokens,
      chips: sentenceChips(tokens.map((t) => ({ surface: t.surface, lemma: t.wordId ? (words[t.wordId]?.lemma ?? null) : null }))),
    };
  }
  return { words, sentences };
}

/** Bài tập của một phiên học kèm toàn bộ nội dung cần hiển thị. */
export async function loadSession(ctx: LearnerContext, lessonId: string, sessionType: SessionType) {
  const { supabase } = ctx;
  const { data: rows, error } = await supabase
    .from("exercises")
    .select("id, type, payload")
    .eq("lesson_id", lessonId)
    .eq("session_type", sessionType)
    .order("sort_order");
  if (error) throw new Error(error.message);

  const exercises = (rows ?? []).map(parseExercise).filter((e): e is Exercise => e !== null);
  const wordIds = new Set<string>();
  const sentenceIds = new Set<string>();
  for (const e of exercises) {
    const p = e.payload as Record<string, unknown>;
    for (const key of ["word_id", "sentence_id"] as const) {
      if (typeof p[key] === "string") (key === "word_id" ? wordIds : sentenceIds).add(p[key] as string);
    }
    for (const id of (p.option_word_ids as string[] | undefined) ?? []) wordIds.add(id);
    for (const id of (p.word_ids as string[] | undefined) ?? []) wordIds.add(id);
    for (const id of (p.option_sentence_ids as string[] | undefined) ?? []) sentenceIds.add(id);
  }

  const { data: lessonWords } = await supabase.from("lesson_words").select("word_id, example_sentence_id").eq("lesson_id", lessonId);
  const exampleByWord = new Map((lessonWords ?? []).map((r) => [r.word_id as string, r.example_sentence_id as string | null]));

  const content = await loadContent(
    supabase,
    { wordIds, sentenceIds },
    { target: ctx.course.targetLang, source: ctx.enrollment.sourceLang },
    ctx.course.targetLang,
    exampleByWord,
  );
  return { exercises, content };
}

/** Thẻ đến hạn ôn, kèm nội dung. */
export async function loadDueCards(ctx: LearnerContext, limit: number): Promise<{ cards: ReviewCard[]; content: ContentBundle }> {
  const { data, error } = await ctx.supabase
    .from("cards")
    .select("id, kind, word_id, sentence_id")
    .eq("user_id", ctx.userId)
    .eq("course_id", ctx.course.id)
    .in("kind", ["word", "sentence"])
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(limit);
  if (error) throw new Error(error.message);

  const cards: ReviewCard[] = (data ?? []).map((c) => ({ id: c.id, kind: c.kind, wordId: c.word_id, sentenceId: c.sentence_id }));
  const content = await loadContent(
    ctx.supabase,
    {
      wordIds: cards.map((c) => c.wordId).filter((v): v is string => !!v),
      sentenceIds: cards.map((c) => c.sentenceId).filter((v): v is string => !!v),
    },
    { target: ctx.course.targetLang, source: ctx.enrollment.sourceLang },
    ctx.course.targetLang,
  );
  return { cards, content };
}

export async function countDueCards(ctx: LearnerContext): Promise<number> {
  const { count } = await ctx.supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .eq("course_id", ctx.course.id)
    .lte("due_at", new Date().toISOString());
  return count ?? 0;
}

/** Thời điểm bắt đầu ngày hôm nay theo múi giờ của người học, dạng ISO (UTC). */
export function startOfTodayIso(timezone: string, now: Date = new Date()): string {
  let tz = timezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    tz = "UTC";
  }
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const elapsedMs = (((get("hour") % 24) * 60 + get("minute")) * 60 + get("second")) * 1000 + now.getMilliseconds();
  return new Date(now.getTime() - elapsedMs).toISOString();
}

export async function countSessionsToday(ctx: LearnerContext): Promise<number> {
  const { count } = await ctx.supabase
    .from("session_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .not("completed_at", "is", null)
    .gte("completed_at", startOfTodayIso(ctx.profile.timezone));
  return count ?? 0;
}
