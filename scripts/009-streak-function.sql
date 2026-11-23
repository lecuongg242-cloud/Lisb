-- 009: Cập nhật chuỗi ngày học.
-- Người dùng không được tự sửa streak_count (xem 007), nên việc cập nhật đi qua hàm này.
-- Hàm chỉ tác động lên hồ sơ của chính người gọi, tính "hôm nay" theo múi giờ của họ.

create or replace function public.touch_streak()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_tz     text;
  v_last   date;
  v_today  date;
  v_streak integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select p.timezone, p.last_active_date, p.streak_count
    into v_tz, v_last, v_streak
  from public.profiles p
  where p.id = v_uid
  for update;

  -- Múi giờ do người dùng nhập; nếu không hợp lệ thì dùng UTC.
  begin
    v_today := (now() at time zone v_tz)::date;
  exception when others then
    v_today := (now() at time zone 'UTC')::date;
  end;

  if v_last is not distinct from v_today then
    return v_streak;
  elsif v_last = v_today - 1 then
    v_streak := v_streak + 1;
  else
    v_streak := 1;
  end if;

  update public.profiles p
  set streak_count     = v_streak,
      longest_streak   = greatest(p.longest_streak, v_streak),
      last_active_date = v_today
  where p.id = v_uid;

  return v_streak;
end;
$$;

revoke execute on function public.touch_streak() from public, anon;
grant execute on function public.touch_streak() to authenticated;
