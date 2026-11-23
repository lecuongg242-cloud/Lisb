-- 003: Nội dung khóa học. Văn bản ở đây luôn bằng ngôn ngữ đích.
-- Mọi văn bản bằng ngôn ngữ giải thích nằm ở các bảng *_translations (file 004).

-- Trạng thái nội dung: draft (nháp) -> checked (qua kiểm tra tự động) -> reviewed (qua kiểm tra chéo)
-- -> published (đã xuất bản) -> retired (đã thu hồi).

create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  target_lang text not null references public.languages (code),
  framework   text not null default 'CEFR',
  status      text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Khóa học đã có lớp giải thích cho những ngôn ngữ nào.
create table public.course_source_langs (
  course_id   uuid not null references public.courses (id) on delete cascade,
  source_lang text not null references public.languages (code),
  status      text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  primary key (course_id, source_lang)
);

create table public.levels (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses (id) on delete cascade,
  code       text not null,
  sort_order integer not null,
  unique (course_id, code),
  unique (course_id, sort_order)
);

create table public.units (
  id         uuid primary key default gen_random_uuid(),
  level_id   uuid not null references public.levels (id) on delete cascade,
  slug       text not null,
  sort_order integer not null,
  status     text not null default 'draft' check (status in ('draft', 'checked', 'reviewed', 'published', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level_id, slug),
  unique (level_id, sort_order)
);

create table public.lessons (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references public.units (id) on delete cascade,
  sort_order   integer not null,
  kind         text not null default 'lesson' check (kind in ('lesson', 'review', 'test')),
  status       text not null default 'draft' check (status in ('draft', 'checked', 'reviewed', 'published', 'retired')),
  version      integer not null default 1,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (unit_id, sort_order)
);

create table public.sentences (
  id             uuid primary key default gen_random_uuid(),
  lesson_id      uuid not null references public.lessons (id) on delete cascade,
  sort_order     integer not null,
  text           text not null,
  -- Các cách viết khác cũng được chấm đúng (ví dụ "I am" cho "I'm").
  accepted_forms text[] not null default '{}',
  pronunciation  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (lesson_id, sort_order)
);

-- Từ điển của khóa, dùng chung giữa các bài.
create table public.words (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references public.courses (id) on delete cascade,
  lemma          text not null,
  part_of_speech text not null default '',
  pronunciation  text,
  level_tag      text,
  frequency_rank integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (course_id, lemma, part_of_speech)
);

-- Từ nào được dạy (là từ mới) ở bài nào.
create table public.lesson_words (
  lesson_id           uuid not null references public.lessons (id) on delete cascade,
  word_id             uuid not null references public.words (id) on delete cascade,
  sort_order          integer not null,
  example_sentence_id uuid references public.sentences (id) on delete set null,
  primary key (lesson_id, word_id)
);

create index lesson_words_word_id_idx on public.lesson_words (word_id);

-- Câu gồm những từ nào: để bấm vào từ xem nghĩa và kiểm tra câu chỉ chứa từ đã dạy.
create table public.sentence_words (
  sentence_id uuid not null references public.sentences (id) on delete cascade,
  position    integer not null,
  word_id     uuid not null references public.words (id) on delete restrict,
  surface     text not null,
  primary key (sentence_id, position)
);

create index sentence_words_word_id_idx on public.sentence_words (word_id);

-- Bài tập dạng dữ liệu. id cố định: sửa chữ trong câu không làm đổi id.
create table public.exercises (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  session_type text not null check (session_type in ('vocab', 'listening', 'speaking', 'writing')),
  sort_order   integer not null,
  type         text not null,
  source_type  text not null default 'none' check (source_type in ('word', 'sentence', 'none')),
  source_id    uuid,
  payload      jsonb not null default '{}'::jsonb,
  origin       text not null default 'generated' check (origin in ('generated', 'authored')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (lesson_id, session_type, sort_order)
);

-- File âm thanh sinh sẵn, tra theo mã băm của (văn bản, ngôn ngữ, giọng, model, tốc độ).
create table public.audio_assets (
  id           uuid primary key default gen_random_uuid(),
  content_hash text not null unique,
  text         text not null,
  lang         text not null references public.languages (code),
  voice        text not null,
  model        text not null,
  speed        numeric(3, 2) not null default 1.0,
  storage_path text not null,
  license      text,
  created_at   timestamptz not null default now()
);

create trigger courses_set_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger units_set_updated_at before update on public.units
  for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();
create trigger sentences_set_updated_at before update on public.sentences
  for each row execute function public.set_updated_at();
create trigger words_set_updated_at before update on public.words
  for each row execute function public.set_updated_at();
create trigger exercises_set_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();
