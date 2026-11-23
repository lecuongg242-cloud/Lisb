-- 007: Row Level Security.
-- Nguyên tắc:
--   Nội dung: người đã đăng nhập đọc được phần đã xuất bản; quản trị đọc và ghi tất cả.
--   Dữ liệu người học: chỉ chủ sở hữu.
--   Bảng chỉ máy chủ ghi (service role bỏ qua RLS): writing_entries, chat_messages,
--   ai_usage, subscriptions. Người dùng chỉ được đọc dòng của mình.

-- Hàm kiểm tra bài học có được xem không. security definer để policy của bảng con
-- không phải chạy lồng RLS của lessons.
create or replace function public.can_read_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson_id and l.status = 'published'
  ) or public.is_admin();
$$;

alter table public.languages             enable row level security;
alter table public.profiles              enable row level security;
alter table public.courses               enable row level security;
alter table public.course_source_langs   enable row level security;
alter table public.levels                enable row level security;
alter table public.units                 enable row level security;
alter table public.lessons               enable row level security;
alter table public.sentences             enable row level security;
alter table public.words                 enable row level security;
alter table public.lesson_words          enable row level security;
alter table public.sentence_words        enable row level security;
alter table public.exercises             enable row level security;
alter table public.audio_assets          enable row level security;
alter table public.unit_translations     enable row level security;
alter table public.lesson_translations   enable row level security;
alter table public.sentence_translations enable row level security;
alter table public.word_translations     enable row level security;
alter table public.enrollments           enable row level security;
alter table public.cards                 enable row level security;
alter table public.review_logs           enable row level security;
alter table public.session_logs          enable row level security;
alter table public.exercise_attempts     enable row level security;
alter table public.writing_entries       enable row level security;
alter table public.chat_messages         enable row level security;
alter table public.content_reports       enable row level security;
alter table public.ai_usage              enable row level security;
alter table public.plans                 enable row level security;
alter table public.subscriptions         enable row level security;

-- ---------- Bảng tra cứu công khai ----------

create policy languages_read on public.languages
  for select to anon, authenticated using (true);
create policy languages_admin on public.languages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy plans_read on public.plans
  for select to anon, authenticated using (is_active);
create policy plans_admin on public.plans
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Hồ sơ ----------

create policy profiles_read_own on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Người dùng chỉ sửa được các cột tùy chọn. role, chuỗi ngày... chỉ máy chủ sửa.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, ui_locale, daily_goal, new_cards_per_day, reminder_times, timezone)
  on public.profiles to authenticated;

-- ---------- Nội dung ----------

create policy courses_read on public.courses
  for select to authenticated using (status = 'published' or public.is_admin());
create policy courses_admin on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy course_source_langs_read on public.course_source_langs
  for select to authenticated using (status = 'published' or public.is_admin());
create policy course_source_langs_admin on public.course_source_langs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy levels_read on public.levels
  for select to authenticated using (true);
create policy levels_admin on public.levels
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy units_read on public.units
  for select to authenticated using (status = 'published' or public.is_admin());
create policy units_admin on public.units
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lessons_read on public.lessons
  for select to authenticated using (status = 'published' or public.is_admin());
create policy lessons_admin on public.lessons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy sentences_read on public.sentences
  for select to authenticated using (public.can_read_lesson(lesson_id));
create policy sentences_admin on public.sentences
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Từ điển của khóa: người đã đăng nhập đọc được toàn bộ.
create policy words_read on public.words
  for select to authenticated using (true);
create policy words_admin on public.words
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lesson_words_read on public.lesson_words
  for select to authenticated using (public.can_read_lesson(lesson_id));
create policy lesson_words_admin on public.lesson_words
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy sentence_words_read on public.sentence_words
  for select to authenticated using (
    exists (
      select 1 from public.sentences s
      where s.id = sentence_id and public.can_read_lesson(s.lesson_id)
    )
  );
create policy sentence_words_admin on public.sentence_words
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy exercises_read on public.exercises
  for select to authenticated using (public.can_read_lesson(lesson_id));
create policy exercises_admin on public.exercises
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy audio_assets_read on public.audio_assets
  for select to authenticated using (true);
create policy audio_assets_admin on public.audio_assets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Lớp dịch ----------

create policy unit_translations_read on public.unit_translations
  for select to authenticated using (
    exists (select 1 from public.units u where u.id = unit_id)
  );
create policy unit_translations_admin on public.unit_translations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy lesson_translations_read on public.lesson_translations
  for select to authenticated using (public.can_read_lesson(lesson_id));
create policy lesson_translations_admin on public.lesson_translations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy sentence_translations_read on public.sentence_translations
  for select to authenticated using (
    exists (
      select 1 from public.sentences s
      where s.id = sentence_id and public.can_read_lesson(s.lesson_id)
    )
  );
create policy sentence_translations_admin on public.sentence_translations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy word_translations_read on public.word_translations
  for select to authenticated using (true);
create policy word_translations_admin on public.word_translations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Dữ liệu người học: chỉ chủ sở hữu ----------

create policy enrollments_own on public.enrollments
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy cards_own on public.cards
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy review_logs_read_own on public.review_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy review_logs_insert_own on public.review_logs
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.cards c where c.id = card_id and c.user_id = (select auth.uid()))
  );

create policy session_logs_read_own on public.session_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy session_logs_insert_own on public.session_logs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy session_logs_update_own on public.session_logs
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy exercise_attempts_read_own on public.exercise_attempts
  for select to authenticated using (user_id = (select auth.uid()));
create policy exercise_attempts_insert_own on public.exercise_attempts
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy content_reports_read on public.content_reports
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy content_reports_insert_own on public.content_reports
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy content_reports_admin_update on public.content_reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Bảng chỉ máy chủ ghi: người dùng chỉ đọc dòng của mình ----------

create policy writing_entries_read_own on public.writing_entries
  for select to authenticated using (user_id = (select auth.uid()));

create policy chat_messages_read_own on public.chat_messages
  for select to authenticated using (user_id = (select auth.uid()));

create policy ai_usage_read on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

create policy subscriptions_read on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
