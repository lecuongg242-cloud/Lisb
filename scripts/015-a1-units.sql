-- 015: Khung chủ đề cấp A1 theo tools/content/syllabus/english-a1.json (2026-11-24).
--   - Chủ đề "Giờ và ngày tháng" (time-and-dates) tách thành "Số và giờ" (numbers-and-time) và
--     "Ngày và tháng" (days-and-months); các chủ đề từ thứ 5 trở đi lùi một bậc, cấp A1 có 21 chủ đề.
--   - Tên, mục tiêu, ngữ pháp và trọng tâm phát âm của mọi chủ đề A1 lấy theo khung mới.
-- Chỉ chạm vào chủ đề cấp A1. Dừng lại nếu chủ đề A1 nào đã có bài học, vì khi đó phải xử lý tay.

do $$
begin
  if exists (
    select 1 from public.lessons x
    join public.units u on u.id = x.unit_id
    join public.levels l on l.id = u.level_id
    join public.courses c on c.id = l.course_id
    where c.slug = 'english' and l.code = 'a1'
  ) then
    raise exception 'Chủ đề cấp A1 đã có bài học; migration này chỉ chạy trên khung rỗng';
  end if;
end $$;

create temporary table a1_units (
  sort_order       integer,
  slug             text,
  title_vi         text,
  title_en         text,
  can_do_vi        text,
  grammar_vi       text,
  pronunciation_vi text
) on commit drop;

insert into a1_units values
  (1, 'introducing-yourself', 'Giới thiệu bản thân', 'Introducing yourself', 'Giới thiệu mình, nói về một người khác, cho địa chỉ và email', 'Động từ be với mọi ngôi, câu phủ định và câu hỏi; tính từ sở hữu', 'Trọng âm từ hai âm tiết'),
  (2, 'family', 'Gia đình', 'Family', 'Nói về người thân: có ai, tên gì, trông thế nào', 'have và has; danh từ số nhiều; sở hữu cách ''s', '/ð/ trong mother, brother'),
  (3, 'jobs', 'Nghề nghiệp', 'Jobs', 'Hỏi và nói về công việc, nơi làm việc', 'a/an + nghề; What do you do?; do, does, don''t, doesn''t', '/dʒ/ trong job; phân biệt /ʃ/ và /s/'),
  (4, 'numbers-and-time', 'Số và giờ', 'Numbers and time', 'Đếm tới 100, hỏi và nói giờ, nói lịch làm việc', 'Số tới 100; at + giờ; What time is it?', 'Phân biệt thirteen và thirty'),
  (5, 'days-and-months', 'Ngày và tháng', 'Days and months', 'Nói thứ, tháng, ngày sinh nhật, lịch trong tuần', 'on + thứ, in + tháng; next, last', 'Trọng âm của các thứ trong tuần'),
  (6, 'daily-routine', 'Thói quen hằng ngày', 'Daily routine', 'Kể một ngày của mình', 'Hiện tại đơn với I, you, we, they; trạng từ tần suất', '/ɪ/ và /iː/'),
  (7, 'what-others-do', 'Người khác làm gì', 'What other people do', 'Kể thói quen của người khác', 'Hiện tại đơn với he, she: thêm -s, does, doesn''t; đại từ tân ngữ', 'Ba cách đọc đuôi -s'),
  (8, 'food-and-drink', 'Đồ ăn thức uống', 'Food and drink', 'Nói thích và không thích món gì', 'like, don''t like; some, any; danh từ đếm được và không đếm được', '/tʃ/ trong chicken, lunch'),
  (9, 'ordering-food', 'Gọi món', 'Ordering food', 'Gọi món, hỏi thêm, thanh toán ở quán', 'I''d like; Can I have; a glass of, a bottle of', 'Ngữ điệu lịch sự khi yêu cầu'),
  (10, 'shopping-and-prices', 'Mua sắm và giá cả', 'Shopping and prices', 'Hỏi giá, chọn hàng, thử đồ, trả tiền', 'How much; these, those; which', 'Đọc giá tiền, trọng âm số'),
  (11, 'home', 'Nhà cửa', 'Home', 'Mô tả nhà và các phòng, nói đồ vật ở đâu', 'There is, there are; giới từ chỉ vị trí', 'Nối âm there''s a, there are'),
  (12, 'asking-directions', 'Hỏi đường', 'Asking for directions', 'Hỏi và chỉ đường đơn giản', 'Câu mệnh lệnh; Where is...?; Is there a... near here?', 'Cụm phụ âm đầu: street, straight'),
  (13, 'getting-around', 'Đi lại', 'Getting around', 'Nói về phương tiện, lộ trình, chuyến đi', 'by bus, on foot; How do you get to...?; How long does it take?', '/æ/ trong taxi, /ʌ/ trong bus'),
  (14, 'hobbies', 'Sở thích', 'Hobbies', 'Nói về việc mình làm lúc rảnh', 'like, love, enjoy + V-ing', 'Âm /ŋ/ đuôi -ing'),
  (15, 'abilities', 'Khả năng', 'Abilities', 'Nói mình làm được gì, nhờ người khác làm', 'can, can''t; Can you...? để nhờ', 'Phân biệt can và can''t khi nghe'),
  (16, 'happening-now', 'Đang làm gì', 'What is happening now', 'Mô tả việc đang diễn ra', 'Hiện tại tiếp diễn', 'Dạng rút gọn I''m, he''s, they''re'),
  (17, 'weather-and-clothes', 'Thời tiết và quần áo', 'Weather and clothes', 'Nói về thời tiết, mùa, nên mặc gì', 'It''s + thời tiết; wear', '/w/ và /v/'),
  (18, 'health-and-feelings', 'Sức khỏe và cảm xúc', 'Health and feelings', 'Nói mình thấy thế nào, đau ở đâu, khuyên đơn giản', 'feel + tính từ; have a + bệnh; should, shouldn''t', '/h/ đầu từ'),
  (19, 'yesterday', 'Hôm qua', 'Yesterday', 'Nói hôm qua ở đâu, thế nào; nói về tuổi thơ', 'was, were, wasn''t, weren''t; ago', 'Dạng yếu của was, were'),
  (20, 'past-events', 'Chuyện đã qua', 'Past events', 'Kể việc đã làm', 'Quá khứ đơn có quy tắc và bất quy tắc thông dụng; did, didn''t', 'Ba cách đọc đuôi -ed'),
  (21, 'plans-and-invitations', 'Kế hoạch và hẹn gặp', 'Plans and invitations', 'Mời, hẹn, nói dự định', 'going to; Let''s; Would you like to...?', 'Ngữ điệu lên xuống trong câu hỏi');

create temporary table a1_level on commit drop as
select l.id
from public.levels l
join public.courses c on c.id = l.course_id
where c.slug = 'english' and l.code = 'a1';

-- Đổi slug của chủ đề bị tách; chủ đề mới (days-and-months) được thêm ở dưới.
update public.units u set slug = 'numbers-and-time'
where u.level_id = (select id from a1_level) and u.slug = 'time-and-dates';

-- Dời thứ tự sang số âm trước để không đụng ràng buộc unique (level_id, sort_order).
update public.units u set sort_order = -u.sort_order
where u.level_id = (select id from a1_level);

insert into public.units (level_id, slug, sort_order, status)
select (select id from a1_level), s.slug, s.sort_order, 'draft'
from a1_units s
where not exists (select 1 from public.units u where u.level_id = (select id from a1_level) and u.slug = s.slug);

update public.units u set sort_order = s.sort_order
from a1_units s
where u.level_id = (select id from a1_level) and u.slug = s.slug;

do $$
begin
  if exists (select 1 from public.units u where u.level_id = (select id from a1_level) and u.sort_order < 0) then
    raise exception 'Còn chủ đề A1 không có trong khung mới';
  end if;
end $$;

insert into public.unit_translations (unit_id, locale, title, can_do, grammar_focus, pronunciation_focus)
select u.id, 'vi', s.title_vi, s.can_do_vi, s.grammar_vi, s.pronunciation_vi
from a1_units s
join public.units u on u.level_id = (select id from a1_level) and u.slug = s.slug
on conflict (unit_id, locale) do update
  set title = excluded.title, can_do = excluded.can_do,
      grammar_focus = excluded.grammar_focus, pronunciation_focus = excluded.pronunciation_focus;

insert into public.unit_translations (unit_id, locale, title)
select u.id, 'en-US', s.title_en
from a1_units s
join public.units u on u.level_id = (select id from a1_level) and u.slug = s.slug
on conflict (unit_id, locale) do update set title = excluded.title;
