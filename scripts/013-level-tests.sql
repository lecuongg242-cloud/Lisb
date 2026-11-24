-- 013: Bài kiểm tra cuối cấp.
--
-- Nguyên tắc: kết quả phải đáng tin, nên việc chấm nằm ở database.
--   - level_test_questions là ngân hàng câu hỏi kèm đáp án: người học KHÔNG đọc được bảng này.
--   - start_level_test() chọn ngẫu nhiên một bộ câu hỏi, tạo lượt làm bài và chỉ trả về đề (không có đáp án).
--   - submit_level_test() chấm bài và ghi kết quả. Người học không ghi trực tiếp được vào level_test_attempts.
-- Bài kiểm tra làm được bất cứ lúc nào, nên cũng dùng làm bài vượt cấp.

-- Chuẩn hóa câu trả lời gõ tay trước khi so sánh: chữ thường, bỏ dấu câu ở hai đầu mỗi từ, gộp khoảng trắng.
-- Phải cho cùng kết quả với normalize() trong lib/lang/<ngôn ngữ>.ts; tests/db/level-test.db.test.ts kiểm tra điều đó.
-- p_lang để dành cho ngôn ngữ đích có quy tắc khác; hiện mọi ngôn ngữ dùng quy tắc của chữ Latin.
create or replace function public.normalize_answer(p_text text, p_lang text default 'en')
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(string_agg(tok, ' ' order by ord), '')
  from (
    select ord,
           regexp_replace(
             lower(regexp_replace(raw, '^[^a-zA-Z0-9'']+|[^a-zA-Z0-9'']+$', '', 'g')),
             '^''+|''+$', '', 'g'
           ) as tok
    from unnest(regexp_split_to_array(btrim(translate(coalesce(p_text, ''), U&'\2018\2019\02BC`', '''''''''')), '\s+'))
         with ordinality as parts (raw, ord)
  ) cleaned
  where tok <> '';
$$;

create table public.level_tests (
  level_id       uuid primary key references public.levels (id) on delete cascade,
  status         text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  -- Số câu mỗi lượt làm; chia đều cho 4 loại câu hỏi nên phải chia hết cho 4.
  question_count smallint not null default 20 check (question_count > 0 and question_count % 4 = 0),
  pass_percent   smallint not null default 80 check (pass_percent between 1 and 100),
  version        integer not null default 1,
  updated_at     timestamptz not null default now()
);

-- Ngân hàng câu hỏi. payload chứa đáp án:
--   choose_word   { word_id, option_word_ids }
--   type_word     { word_id }
--   listen_choose { sentence_id, option_sentence_ids, audio_key }
--   listen_type   { sentence_id, audio_key }
create table public.level_test_questions (
  id          uuid primary key default gen_random_uuid(),
  level_id    uuid not null references public.levels (id) on delete cascade,
  unit_id     uuid references public.units (id) on delete set null,
  type        text not null check (type in ('choose_word', 'type_word', 'listen_choose', 'listen_type')),
  source_type text not null check (source_type in ('word', 'sentence')),
  source_id   uuid not null,
  payload     jsonb not null
);

create index level_test_questions_level_type_idx on public.level_test_questions (level_id, type);

create table public.level_test_attempts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  level_id      uuid not null references public.levels (id) on delete cascade,
  -- started: đang làm. submitted: đã nộp và đã chấm. expired: đề đổi khi chưa nộp.
  status        text not null default 'started' check (status in ('started', 'submitted', 'expired')),
  pass_percent  smallint not null,
  question_ids  uuid[] not null,
  answers       jsonb,
  correct_count smallint,
  total_count   smallint,
  percent       smallint,
  passed        boolean,
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz
);

create index level_test_attempts_user_idx on public.level_test_attempts (user_id, level_id, submitted_at);

alter table public.level_tests          enable row level security;
alter table public.level_test_questions enable row level security;
alter table public.level_test_attempts  enable row level security;

create policy level_tests_read on public.level_tests
  for select to authenticated using (status = 'published' or public.is_admin());
create policy level_tests_admin on public.level_tests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Chỉ quản trị đọc và ghi ngân hàng câu hỏi. Người học nhận đề qua start_level_test().
create policy level_test_questions_admin on public.level_test_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Người học chỉ đọc lượt làm bài của mình; không có policy ghi nên không tự ghi kết quả được.
create policy level_test_attempts_read on public.level_test_attempts
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- Quản trị nạp ngân hàng câu hỏi và mở bài kiểm tra.
-- security definer vì hàm phải đánh dấu hết hiệu lực các lượt đang làm dở, mà bảng lượt làm bài không cho ai
-- sửa trực tiếp (kể cả quản trị). Hàm tự kiểm tra người gọi là quản trị ngay ở dòng đầu.
create or replace function public.publish_level_test(p_level_id uuid, p_question_count integer, p_pass_percent integer, p_questions jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count   integer;
  v_minimum integer;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.levels l where l.id = p_level_id) then
    raise exception 'level not found';
  end if;

  -- Mỗi loại câu hỏi phải đủ cho một lượt làm bài.
  select min(n) into v_minimum
  from (
    select count(x.*) as n
    from unnest(array['choose_word', 'type_word', 'listen_choose', 'listen_type']) as wanted (type)
    left join jsonb_array_elements(p_questions) x on x ->> 'type' = wanted.type
    group by wanted.type
  ) per_type;
  if v_minimum < p_question_count / 4 then
    raise exception 'not enough questions';
  end if;

  -- Đề đổi thì các lượt đang làm dở không chấm được nữa.
  update public.level_test_attempts a set status = 'expired'
  where a.level_id = p_level_id and a.status = 'started';

  delete from public.level_test_questions q where q.level_id = p_level_id;
  insert into public.level_test_questions (level_id, unit_id, type, source_type, source_id, payload)
  select p_level_id,
         nullif(x ->> 'unit_id', '')::uuid,
         x ->> 'type',
         x ->> 'source_type',
         (x ->> 'source_id')::uuid,
         x -> 'payload'
  from jsonb_array_elements(p_questions) x;
  get diagnostics v_count = row_count;

  insert into public.level_tests (level_id, status, question_count, pass_percent)
  values (p_level_id, 'published', p_question_count, p_pass_percent)
  on conflict (level_id) do update
    set status = 'published',
        question_count = excluded.question_count,
        pass_percent = excluded.pass_percent,
        version = public.level_tests.version + 1,
        updated_at = now();

  return v_count;
end;
$$;

-- Bắt đầu một lượt làm bài: chọn câu hỏi và trả về đề (không có đáp án).
-- security definer vì người học không đọc được ngân hàng câu hỏi; hàm tự kiểm tra người gọi.
create or replace function public.start_level_test(p_level_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_test      public.level_tests%rowtype;
  v_course_id uuid;
  v_target    text;
  v_source    text;
  v_ids       uuid[];
  v_attempt   uuid := gen_random_uuid();
  v_questions jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_test from public.level_tests t where t.level_id = p_level_id and t.status = 'published';
  if not found then
    raise exception 'test not available';
  end if;

  select lv.course_id, c.target_lang into v_course_id, v_target
  from public.levels lv join public.courses c on c.id = lv.course_id
  where lv.id = p_level_id;

  select e.source_lang into v_source
  from public.enrollments e
  where e.user_id = v_uid and e.course_id = v_course_id;
  if v_source is null then
    raise exception 'not enrolled';
  end if;

  -- Mỗi loại lấy question_count / 4 câu, rải đều các chủ đề: lấy lần lượt mỗi chủ đề một câu rồi mới lấy vòng hai.
  with shuffled as (
    select q.id, q.type,
           row_number() over (partition by q.type, q.unit_id order by random()) as round_no,
           random() as tie
    from public.level_test_questions q
    where q.level_id = p_level_id
  ),
  picked as (
    select s.id, s.type, row_number() over (partition by s.type order by s.round_no, s.tie) as pick_no
    from shuffled s
  )
  select array_agg(p.id order by array_position(array['choose_word', 'type_word', 'listen_choose', 'listen_type'], p.type), p.pick_no)
    into v_ids
  from picked p
  where p.pick_no <= v_test.question_count / 4;

  if v_ids is null or array_length(v_ids, 1) < v_test.question_count then
    raise exception 'test not available';
  end if;

  insert into public.level_test_attempts (id, user_id, level_id, pass_percent, question_ids)
  values (v_attempt, v_uid, p_level_id, v_test.pass_percent, v_ids);

  -- Đề bài: chỉ có lời đề, lựa chọn và khóa file âm thanh. Không có trường nào cho biết đáp án.
  select jsonb_agg(
           jsonb_build_object(
             'id', q.id,
             'type', q.type,
             'prompt_target', (select wt.meaning from public.word_translations wt
                               where wt.word_id = (q.payload ->> 'word_id')::uuid and wt.locale = v_target),
             'prompt_source', (select wt.meaning from public.word_translations wt
                               where wt.word_id = (q.payload ->> 'word_id')::uuid and wt.locale = v_source),
             'audio_key', q.payload ->> 'audio_key',
             'options', case q.type
               when 'choose_word' then (
                 select jsonb_agg(jsonb_build_object('id', w.id, 'label', w.lemma) order by o.ord)
                 from jsonb_array_elements_text(q.payload -> 'option_word_ids') with ordinality as o (id, ord)
                 join public.words w on w.id = o.id::uuid)
               when 'listen_choose' then (
                 select jsonb_agg(jsonb_build_object('id', s.id, 'label', s.text) order by o.ord)
                 from jsonb_array_elements_text(q.payload -> 'option_sentence_ids') with ordinality as o (id, ord)
                 join public.sentences s on s.id = o.id::uuid)
               else null
             end
           )
           order by picked.ord
         )
    into v_questions
  from unnest(v_ids) with ordinality as picked (question_id, ord)
  join public.level_test_questions q on q.id = picked.question_id;

  return jsonb_build_object(
    'attempt_id', v_attempt,
    'pass_percent', v_test.pass_percent,
    'questions', v_questions
  );
end;
$$;

-- Nộp bài: chấm từng câu, ghi kết quả, trả về điểm và đáp án đúng để người học xem lại.
-- p_answers: { "<id câu hỏi>": "<id lựa chọn hoặc chữ đã gõ>" }. Câu không trả lời tính là sai.
create or replace function public.submit_level_test(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_attempt public.level_test_attempts%rowtype;
  v_lang    text;
  v_details jsonb;
  v_correct integer;
  v_total   integer;
  v_percent integer;
  v_passed  boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into v_attempt from public.level_test_attempts a
  where a.id = p_attempt_id and a.user_id = v_uid
  for update;
  if not found then
    raise exception 'attempt not found';
  end if;
  if v_attempt.status <> 'started' then
    raise exception 'attempt not open';
  end if;

  select c.target_lang into v_lang
  from public.levels lv join public.courses c on c.id = lv.course_id
  where lv.id = v_attempt.level_id;

  with graded as (
    select picked.ord,
           q.id,
           coalesce(p_answers ->> q.id::text, '') as answer,
           case q.type
             when 'choose_word' then coalesce(p_answers ->> q.id::text, '') = q.payload ->> 'word_id'
             when 'listen_choose' then coalesce(p_answers ->> q.id::text, '') = q.payload ->> 'sentence_id'
             when 'type_word' then
               public.normalize_answer(p_answers ->> q.id::text, v_lang) <> ''
               and public.normalize_answer(p_answers ->> q.id::text, v_lang) = public.normalize_answer(w.lemma, v_lang)
             when 'listen_type' then
               public.normalize_answer(p_answers ->> q.id::text, v_lang) <> ''
               and public.normalize_answer(p_answers ->> q.id::text, v_lang) in (
                 select public.normalize_answer(form, v_lang) from unnest(array[s.text] || s.accepted_forms) as forms (form))
             else false
           end as is_correct,
           coalesce(w.lemma, s.text) as correct_answer
    from unnest(v_attempt.question_ids) with ordinality as picked (question_id, ord)
    join public.level_test_questions q on q.id = picked.question_id
    left join public.words w on w.id = (q.payload ->> 'word_id')::uuid
    left join public.sentences s on s.id = (q.payload ->> 'sentence_id')::uuid
  )
  select jsonb_agg(jsonb_build_object('question_id', g.id, 'is_correct', g.is_correct, 'correct_answer', g.correct_answer) order by g.ord),
         count(*) filter (where g.is_correct),
         count(*)
    into v_details, v_correct, v_total
  from graded g;

  -- Mọi câu của lượt làm phải còn trong ngân hàng; nếu không thì đề đã đổi.
  if v_total is null or v_total <> array_length(v_attempt.question_ids, 1) then
    raise exception 'attempt not open';
  end if;

  v_percent := round(100.0 * v_correct / v_total);
  v_passed := v_percent >= v_attempt.pass_percent;

  update public.level_test_attempts a
  set status = 'submitted',
      answers = p_answers,
      correct_count = v_correct,
      total_count = v_total,
      percent = v_percent,
      passed = v_passed,
      submitted_at = now()
  where a.id = p_attempt_id;

  return jsonb_build_object(
    'correct', v_correct,
    'total', v_total,
    'percent', v_percent,
    'passed', v_passed,
    'pass_percent', v_attempt.pass_percent,
    'details', v_details
  );
end;
$$;

revoke execute on function public.publish_level_test(uuid, integer, integer, jsonb) from public, anon;
revoke execute on function public.start_level_test(uuid) from public, anon;
revoke execute on function public.submit_level_test(uuid, jsonb) from public, anon;
grant execute on function public.publish_level_test(uuid, integer, integer, jsonb) to authenticated;
grant execute on function public.start_level_test(uuid) to authenticated;
grant execute on function public.submit_level_test(uuid, jsonb) to authenticated;
