-- 006: Đo lượng dùng AI và mô-đun gói dịch vụ (tách riêng).

-- Cộng dồn theo người, ngày, chức năng. Ghi cho MỌI lời gọi AI, kể cả sinh nội dung của quản trị.
-- Chỉ máy chủ ghi.
create table public.ai_usage (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  usage_date    date not null,
  feature       text not null,
  calls         integer not null default 0,
  input_tokens  bigint not null default 0,
  output_tokens bigint not null default 0,
  primary key (user_id, usage_date, feature)
);

-- Mô-đun gói dịch vụ. Hiện tại chỉ có gói 'free' và mọi tính năng đều miễn phí.
-- Khi cần thu phí: thêm gói mới vào plans, gắn cổng thanh toán ghi vào subscriptions.
-- Code ứng dụng chỉ hỏi quyền qua một chỗ duy nhất (lib/billing), không kiểm tra gói rải rác.
create table public.plans (
  code       text primary key,
  name       text not null,
  is_default boolean not null default false,
  -- Ví dụ: {"ai_calls_per_day": 30}. Khóa không có trong limits nghĩa là không giới hạn.
  limits     jsonb not null default '{}'::jsonb,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Chỉ được có một gói mặc định.
create unique index plans_single_default_uidx on public.plans (is_default) where is_default;

-- Người không có dòng nào ở đây thì dùng gói mặc định.
create table public.subscriptions (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  plan_code    text not null references public.plans (code),
  status       text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  started_at   timestamptz not null default now(),
  expires_at   timestamptz,
  provider     text,
  provider_ref text,
  updated_at   timestamptz not null default now()
);

create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
