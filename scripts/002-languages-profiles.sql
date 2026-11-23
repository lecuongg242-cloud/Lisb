-- 002: Ngôn ngữ và hồ sơ người dùng.

-- Cấu hình cho từng ngôn ngữ. Mọi nơi tham chiếu ngôn ngữ bằng code (BCP-47), không dùng tên.
create table public.languages (
  code                 text primary key,
  name_en              text not null,
  name_native          text not null,
  script               text not null default 'Latn',
  direction            text not null default 'ltr' check (direction in ('ltr', 'rtl')),
  tts_locale           text,
  stt_locale           text,
  has_word_spaces      boolean not null default true,
  pronunciation_system text,
  special_characters   text[] not null default '{}',
  created_at           timestamptz not null default now()
);

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text,
  role              text not null default 'user' check (role in ('user', 'admin')),
  ui_locale         text not null default 'vi' references public.languages (code),
  daily_goal        integer not null default 4 check (daily_goal between 1 and 20),
  new_cards_per_day integer not null default 10 check (new_cards_per_day between 0 and 50),
  reminder_times    time[] not null default '{}',
  timezone          text not null default 'Asia/Ho_Chi_Minh',
  streak_count      integer not null default 0,
  longest_streak    integer not null default 0,
  last_active_date  date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Dùng trong các policy RLS. security definer để không bị chính RLS của profiles chặn.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Tự tạo hồ sơ khi có người đăng ký.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
