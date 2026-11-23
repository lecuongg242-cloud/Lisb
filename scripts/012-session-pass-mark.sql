-- 012: Ngưỡng đạt cho phiên học.
-- Phiên ôn cuối chủ đề chỉ tính là xong khi người học đúng từ ngưỡng này trở lên ở lần trả lời đầu.
-- pass_percent để null nghĩa là phiên luyện tập thường: học hết là xong.

alter table public.lesson_sessions
  add column pass_percent smallint check (pass_percent between 1 and 100);

-- Hàm xuất bản ghi thêm pass_percent của từng phiên. Chữ ký không đổi nên chỉ cần thay thân hàm.
create or replace function public.publish_lesson(p_lesson_id uuid, p_sessions jsonb, p_exercises jsonb)
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

  -- Danh sách phiên được thay toàn bộ.
  delete from public.lesson_sessions s where s.lesson_id = p_lesson_id;
  insert into public.lesson_sessions (lesson_id, session_no, session_type, kind, step_count, pass_percent)
  select p_lesson_id,
         (x ->> 'session_no')::smallint,
         x ->> 'session_type',
         x ->> 'kind',
         (x ->> 'step_count')::smallint,
         nullif(x ->> 'pass_percent', '')::smallint
  from jsonb_array_elements(p_sessions) x;

  -- Bài tập không còn trong danh sách mới.
  delete from public.exercises e
  where e.lesson_id = p_lesson_id
    and e.id not in (select (x ->> 'id')::uuid from jsonb_array_elements(p_exercises) x);

  -- Dời vị trí cũ ra khỏi vùng đang dùng để không đụng ràng buộc duy nhất khi ghi vị trí mới.
  update public.exercises e
  set sort_order = -e.sort_order - (e.session_no * 1000)
  where e.lesson_id = p_lesson_id;

  insert into public.exercises (id, lesson_id, session_type, session_no, sort_order, type, source_type, source_id, payload, origin)
  select (x ->> 'id')::uuid,
         p_lesson_id,
         x ->> 'session_type',
         (x ->> 'session_no')::smallint,
         (x ->> 'sort_order')::integer,
         x ->> 'type',
         x ->> 'source_type',
         nullif(x ->> 'source_id', '')::uuid,
         x -> 'payload',
         'generated'
  from jsonb_array_elements(p_exercises) x
  on conflict (id) do update
    set session_type = excluded.session_type,
        session_no   = excluded.session_no,
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
