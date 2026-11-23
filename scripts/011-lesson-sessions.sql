-- 011: Chia mỗi bài học thành nhiều phiên ngắn.
-- Trước đây một bài chỉ có 2 phiên (vocab, listening), phiên từ vựng dài tới 26 bước.
-- Giờ mỗi bài có một danh sách phiên đánh số; mỗi phiên có loại (session_type) và kiểu (kind).
--   kind: vocab_learn (học từ mới), vocab_recall (nhớ lại từ), listen_recognize (nghe hiểu),
--         listen_dictation (nghe chép). Các kiểu khác sẽ được thêm sau (ôn chủ đề, kiểm tra...).

create table public.lesson_sessions (
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  session_no   smallint not null check (session_no > 0),
  session_type text not null check (session_type in ('vocab', 'listening', 'speaking', 'writing')),
  kind         text not null,
  step_count   smallint not null default 0,
  primary key (lesson_id, session_no)
);

alter table public.lesson_sessions enable row level security;

create policy lesson_sessions_read on public.lesson_sessions
  for select to authenticated using (public.can_read_lesson(lesson_id));
create policy lesson_sessions_admin on public.lesson_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Bài tập thuộc về một phiên; thứ tự là duy nhất trong phiên.
alter table public.exercises add column session_no smallint not null default 1;
alter table public.exercises drop constraint exercises_lesson_id_session_type_sort_order_key;

-- Dữ liệu có sẵn: trước đây mỗi bài có đúng hai phiên (từ vựng rồi nghe), thứ tự bài tập đánh số riêng
-- trong từng loại. Gán phiên 1 cho từ vựng và phiên 2 cho nghe để thứ tự vẫn duy nhất trong phiên,
-- và tạo danh sách phiên tương ứng. Xuất bản lại bài sẽ thay các phiên này bằng các phiên ngắn mới.
update public.exercises set session_no = case when session_type = 'vocab' then 1 else 2 end;

insert into public.lesson_sessions (lesson_id, session_no, session_type, kind, step_count)
select e.lesson_id,
       e.session_no,
       min(e.session_type),
       case when min(e.session_type) = 'vocab' then 'vocab_learn' else 'listen_recognize' end,
       count(*)
from public.exercises e
group by e.lesson_id, e.session_no;
alter table public.exercises add constraint exercises_lesson_session_order_key unique (lesson_id, session_no, sort_order);

-- Nhật ký phiên học ghi phiên số mấy. Dòng cũ để null (trước khi có phiên đánh số).
alter table public.session_logs add column session_no smallint;
update public.session_logs set session_no = case when session_type = 'vocab' then 1 else 2 end
where lesson_id is not null and session_type in ('vocab', 'listening');
create index session_logs_user_lesson_session_idx on public.session_logs (user_id, lesson_id, session_no);

-- Hàm xuất bản nhận thêm danh sách phiên.
drop function public.publish_lesson(uuid, jsonb);

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
  insert into public.lesson_sessions (lesson_id, session_no, session_type, kind, step_count)
  select p_lesson_id,
         (x ->> 'session_no')::smallint,
         x ->> 'session_type',
         x ->> 'kind',
         (x ->> 'step_count')::smallint
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

revoke execute on function public.publish_lesson(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.publish_lesson(uuid, jsonb, jsonb) to authenticated;
