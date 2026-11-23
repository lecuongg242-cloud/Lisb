-- 004: Lớp dịch theo ngôn ngữ giải thích (locale).
-- Giải thích bằng chính ngôn ngữ đích (ví dụ nghĩa tiếng Anh đơn giản) cũng lưu ở đây
-- với locale = mã ngôn ngữ đích. "Giải thích song ngữ" là hiển thị hai locale cùng lúc.
--
-- source_hash: mã băm của văn bản gốc lúc dịch. Khi văn bản gốc đổi, ứng dụng so mã băm
-- và chuyển status sang 'stale' để biết cần dịch lại.

create table public.unit_translations (
  unit_id             uuid not null references public.units (id) on delete cascade,
  locale              text not null references public.languages (code),
  title               text not null,
  description         text,
  can_do              text,
  grammar_focus       text,
  pronunciation_focus text,
  source_hash         text,
  status              text not null default 'ok' check (status in ('draft', 'ok', 'stale')),
  updated_at          timestamptz not null default now(),
  primary key (unit_id, locale)
);

create table public.lesson_translations (
  lesson_id         uuid not null references public.lessons (id) on delete cascade,
  locale            text not null references public.languages (code),
  title             text not null,
  grammar_tip       text,
  pronunciation_tip text,
  source_hash       text,
  status            text not null default 'ok' check (status in ('draft', 'ok', 'stale')),
  updated_at        timestamptz not null default now(),
  primary key (lesson_id, locale)
);

create table public.sentence_translations (
  sentence_id    uuid not null references public.sentences (id) on delete cascade,
  locale         text not null references public.languages (code),
  text           text not null,
  accepted_forms text[] not null default '{}',
  note           text,
  source_hash    text,
  status         text not null default 'ok' check (status in ('draft', 'ok', 'stale')),
  updated_at     timestamptz not null default now(),
  primary key (sentence_id, locale)
);

create table public.word_translations (
  word_id        uuid not null references public.words (id) on delete cascade,
  locale         text not null references public.languages (code),
  meaning        text not null,
  accepted_forms text[] not null default '{}',
  usage_note     text,
  source_hash    text,
  status         text not null default 'ok' check (status in ('draft', 'ok', 'stale')),
  updated_at     timestamptz not null default now(),
  primary key (word_id, locale)
);

create trigger unit_translations_set_updated_at before update on public.unit_translations
  for each row execute function public.set_updated_at();
create trigger lesson_translations_set_updated_at before update on public.lesson_translations
  for each row execute function public.set_updated_at();
create trigger sentence_translations_set_updated_at before update on public.sentence_translations
  for each row execute function public.set_updated_at();
create trigger word_translations_set_updated_at before update on public.word_translations
  for each row execute function public.set_updated_at();
