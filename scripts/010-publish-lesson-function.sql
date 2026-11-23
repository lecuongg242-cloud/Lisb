-- 010: Xuất bản bài học trong một transaction.
-- Ứng dụng sinh danh sách bài tập (lib/exercises/generate.ts) rồi gọi hàm này để:
--   1. thay bộ bài tập của bài (giữ id của các bài tập còn tồn tại, xóa bài tập không còn dùng),
--   2. chuyển bài, chủ đề, khóa học và các lớp giải thích sang trạng thái published.
-- Hàm chạy với quyền của người gọi (RLS vẫn áp dụng) và kiểm tra thêm quyền quản trị.

create or replace function public.publish_lesson(p_lesson_id uuid, p_exercises jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_unit_id   uuid;
  v_course_id uuid;
  v_count     integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select l.unit_id, lv.course_id
    into v_unit_id, v_course_id
  from public.lessons l
  join public.units u on u.id = l.unit_id
  join public.levels lv on lv.id = u.level_id
  where l.id = p_lesson_id;

  if v_unit_id is null then
    raise exception 'lesson not found';
  end if;

  -- Bài tập không còn trong danh sách mới.
  delete from public.exercises e
  where e.lesson_id = p_lesson_id
    and e.id not in (select (x ->> 'id')::uuid from jsonb_array_elements(p_exercises) x);

  -- Dời thứ tự cũ sang số âm để không đụng ràng buộc duy nhất khi ghi thứ tự mới.
  update public.exercises e
  set sort_order = -e.sort_order
  where e.lesson_id = p_lesson_id;

  insert into public.exercises (id, lesson_id, session_type, sort_order, type, source_type, source_id, payload, origin)
  select (x ->> 'id')::uuid,
         p_lesson_id,
         x ->> 'session_type',
         (x ->> 'sort_order')::integer,
         x ->> 'type',
         x ->> 'source_type',
         nullif(x ->> 'source_id', '')::uuid,
         x -> 'payload',
         'generated'
  from jsonb_array_elements(p_exercises) x
  on conflict (id) do update
    set session_type = excluded.session_type,
        sort_order   = excluded.sort_order,
        type         = excluded.type,
        source_type  = excluded.source_type,
        source_id    = excluded.source_id,
        payload      = excluded.payload;

  get diagnostics v_count = row_count;

  update public.lessons l
  set status = 'published', published_at = coalesce(l.published_at, now()), version = l.version + 1
  where l.id = p_lesson_id;

  update public.units u set status = 'published' where u.id = v_unit_id and u.status <> 'published';
  update public.courses c set status = 'published' where c.id = v_course_id and c.status <> 'published';
  update public.course_source_langs s set status = 'published'
  where s.course_id = v_course_id and s.status <> 'published';

  return v_count;
end;
$$;

revoke execute on function public.publish_lesson(uuid, jsonb) from public, anon;
grant execute on function public.publish_lesson(uuid, jsonb) to authenticated;
