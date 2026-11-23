-- 005: Dữ liệu của người học.

-- Người học chọn khóa (ngôn ngữ đích) và ngôn ngữ giải thích.
create table public.enrollments (
  user_id           uuid not null references public.profiles (id) on delete cascade,
  course_id         uuid not null references public.courses (id) on delete cascade,
  source_lang       text not null references public.languages (code),
  current_lesson_id uuid references public.lessons (id) on delete set null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- Thẻ ôn tập. Các cột lịch ôn khớp với cấu trúc Card của thư viện ts-fsrs.
-- state: 0 = New, 1 = Learning, 2 = Review, 3 = Relearning.
create table public.cards (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  course_id      uuid not null references public.courses (id) on delete cascade,
  kind           text not null check (kind in ('word', 'sentence', 'mistake', 'custom')),
  word_id        uuid references public.words (id) on delete cascade,
  sentence_id    uuid references public.sentences (id) on delete cascade,
  custom_front   text,
  custom_back    text,
  due_at         timestamptz not null default now(),
  stability      double precision not null default 0,
  difficulty     double precision not null default 0,
  elapsed_days   integer not null default 0,
  scheduled_days integer not null default 0,
  learning_steps integer not null default 0,
  reps           integer not null default 0,
  lapses         integer not null default 0,
  state          smallint not null default 0 check (state between 0 and 3),
  last_review_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (
    (kind = 'word' and word_id is not null)
    or (kind = 'sentence' and sentence_id is not null)
    or (kind = 'mistake' and (word_id is not null or sentence_id is not null or custom_front is not null))
    or (kind = 'custom' and custom_front is not null)
  )
);

-- Mỗi người chỉ có một thẻ cho mỗi từ và mỗi câu.
create unique index cards_user_word_uidx on public.cards (user_id, word_id) where kind = 'word';
create unique index cards_user_sentence_uidx on public.cards (user_id, sentence_id) where kind = 'sentence';
-- Truy vấn chính: thẻ đến hạn của một người trong một khóa.
create index cards_due_idx on public.cards (user_id, course_id, due_at);

-- Lịch sử ôn. id do máy khách sinh để gửi lại khi mạng lỗi không bị ghi trùng.
create table public.review_logs (
  id                uuid primary key default gen_random_uuid(),
  card_id           uuid not null references public.cards (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  rating            smallint not null check (rating between 1 and 4),
  source            text not null default 'review' check (source in ('review', 'vocab', 'listening', 'speaking', 'writing')),
  state_before      smallint not null,
  due_before        timestamptz,
  stability_before  double precision,
  difficulty_before double precision,
  elapsed_days      integer not null default 0,
  scheduled_days    integer not null default 0,
  reviewed_at       timestamptz not null default now()
);

create index review_logs_card_idx on public.review_logs (card_id, reviewed_at);
create index review_logs_user_idx on public.review_logs (user_id, reviewed_at);

-- Một phiên học 2-3 phút. id do máy khách sinh (chống ghi trùng).
create table public.session_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  course_id     uuid not null references public.courses (id) on delete cascade,
  lesson_id     uuid references public.lessons (id) on delete set null,
  session_type  text not null check (session_type in ('vocab', 'listening', 'speaking', 'writing', 'review')),
  total_items   integer not null default 0,
  correct_items integer not null default 0,
  duration_sec  integer not null default 0,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index session_logs_user_idx on public.session_logs (user_id, started_at);
create index session_logs_user_lesson_idx on public.session_logs (user_id, lesson_id);

create table public.exercise_attempts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  exercise_id    uuid not null references public.exercises (id) on delete cascade,
  session_log_id uuid references public.session_logs (id) on delete set null,
  is_correct     boolean not null,
  answer         jsonb,
  created_at     timestamptz not null default now()
);

create index exercise_attempts_user_idx on public.exercise_attempts (user_id, created_at);
create index exercise_attempts_exercise_idx on public.exercise_attempts (exercise_id);

-- Bài viết và kết quả AI sửa. Chỉ máy chủ ghi.
create table public.writing_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  lesson_id      uuid references public.lessons (id) on delete set null,
  original_text  text not null,
  corrected_text text,
  feedback       jsonb,
  created_at     timestamptz not null default now()
);

create index writing_entries_user_idx on public.writing_entries (user_id, created_at);

-- Hội thoại nhập vai với AI. Chỉ máy chủ ghi.
create table public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  lesson_id       uuid references public.lessons (id) on delete set null,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  correction      jsonb,
  created_at      timestamptz not null default now()
);

create index chat_messages_conversation_idx on public.chat_messages (user_id, conversation_id, created_at);

-- Người học báo lỗi nội dung. Không có người duyệt nên đây là kênh phát hiện lỗi quan trọng.
create table public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete set null,
  owner_type  text not null check (owner_type in ('sentence', 'word', 'lesson', 'exercise', 'audio')),
  owner_id    uuid not null,
  locale      text references public.languages (code),
  reason      text not null,
  status      text not null default 'open' check (status in ('open', 'fixed', 'rejected')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index content_reports_status_idx on public.content_reports (status, created_at);

create trigger enrollments_set_updated_at before update on public.enrollments
  for each row execute function public.set_updated_at();
create trigger cards_set_updated_at before update on public.cards
  for each row execute function public.set_updated_at();
