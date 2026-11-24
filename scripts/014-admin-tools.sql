-- 014: Công cụ quản trị nội dung.
--   1. Báo lỗi nội dung: thêm ghi chú, chặn báo trùng, siết quyền ghi của người học.
--   2. Nghe duyệt âm thanh: quản trị đánh dấu từng file giọng đọc là đạt hay sai.
-- Chỉ thêm cột, bảng, chỉ mục và sửa policy; không xóa dữ liệu.

-- ---------- 1. Báo lỗi nội dung ----------

-- reason là mã lý do (ý nghĩa hiển thị nằm ở messages: report.reason.*); note là lời mô tả tự do của người báo.
alter table public.content_reports add column if not exists note text;
alter table public.content_reports add column if not exists resolved_by uuid references public.profiles (id) on delete set null;

alter table public.content_reports drop constraint if exists content_reports_reason_length;
alter table public.content_reports add constraint content_reports_reason_length check (char_length(reason) between 1 and 40);
alter table public.content_reports drop constraint if exists content_reports_note_length;
alter table public.content_reports add constraint content_reports_note_length check (note is null or char_length(note) <= 500);

-- Một người không báo cùng một lỗi của cùng một mục hai lần khi báo cáo trước còn mở.
create unique index if not exists content_reports_open_unique
  on public.content_reports (user_id, owner_type, owner_id, reason)
  where status = 'open';

create index if not exists content_reports_owner_idx on public.content_reports (owner_type, owner_id);

-- Người học chỉ tạo được báo cáo đang mở cho chính mình, không tự đặt trạng thái xử lý.
alter policy content_reports_insert_own on public.content_reports
  with check (user_id = (select auth.uid()) and status = 'open' and resolved_at is null and resolved_by is null);

-- ---------- 2. Nghe duyệt âm thanh ----------

-- Mỗi dòng là kết luận của quản trị về một file public/audio/<voice>/<audio_key>.mp3.
-- File được sinh lại (sửa cách đọc) thì quản trị nghe lại và đánh dấu lại; dòng cũ được ghi đè.
create table if not exists public.audio_reviews (
  audio_key   text not null check (audio_key ~ '^[0-9a-f]{20}$'),
  voice       text not null check (char_length(voice) between 1 and 40),
  text        text not null,
  verdict     text not null check (verdict in ('ok', 'bad')),
  note        text check (note is null or char_length(note) <= 300),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz not null default now(),
  primary key (audio_key, voice)
);

alter table public.audio_reviews enable row level security;

drop policy if exists audio_reviews_admin on public.audio_reviews;
create policy audio_reviews_admin on public.audio_reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
