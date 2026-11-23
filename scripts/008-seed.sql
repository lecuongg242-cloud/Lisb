-- 008: Dữ liệu khởi tạo: ngôn ngữ, gói miễn phí, khóa tiếng Anh, các cấp và khung chủ đề.
-- Chỉ tạo khung (chưa có bài học). Mọi thứ ở trạng thái draft cho tới khi có nội dung.

insert into public.languages
  (code, name_en, name_native, script, direction, tts_locale, stt_locale, has_word_spaces, pronunciation_system)
values
  ('en-US', 'English (US)', 'English',    'Latn', 'ltr', 'en-US', 'en-US', true, 'IPA'),
  ('vi',    'Vietnamese',   'Tiếng Việt', 'Latn', 'ltr', 'vi-VN', 'vi-VN', true, null);

-- Miễn phí hoàn toàn cho tới khi chủ dự án quyết định thu phí.
insert into public.plans (code, name, is_default, limits)
values ('free', 'Miễn phí', true, '{"ai_calls_per_day": 30}'::jsonb);

insert into public.courses (slug, target_lang, framework, status)
values ('english', 'en-US', 'CEFR', 'draft');

-- Lớp giải thích: tiếng Việt, và tiếng Anh đơn giản (locale = ngôn ngữ đích).
insert into public.course_source_langs (course_id, source_lang, status)
select c.id, v.lang, 'draft'
from public.courses c
cross join (values ('vi'), ('en-US')) as v (lang)
where c.slug = 'english';

insert into public.levels (course_id, code, sort_order)
select c.id, v.code, v.sort_order
from public.courses c
cross join (values ('pre-a1', 1), ('a1', 2), ('a2', 3), ('b1', 4)) as v (code, sort_order)
where c.slug = 'english';

-- Khung chủ đề theo tài liệu docs/02-lo-trinh-bai-hoc.md (đã duyệt 2026-11-23).
create temporary table seed_units (
  level_code          text,
  sort_order          integer,
  slug                text,
  title_vi            text,
  title_en            text,
  can_do_vi           text,
  grammar_vi          text,
  pronunciation_vi    text
) on commit drop;

insert into seed_units values
  ('pre-a1', 1, 'alphabet-and-sounds', 'Bảng chữ cái và âm', 'Alphabet and sounds', 'Đọc và đánh vần tên mình', null, '26 chữ cái, phân biệt tên chữ và âm'),
  ('pre-a1', 2, 'greetings', 'Chào hỏi và tạm biệt', 'Greetings and goodbyes', 'Chào, hỏi thăm, cảm ơn, xin lỗi', 'Câu cố định', 'Âm cuối /t/ /k/ /d/'),
  ('pre-a1', 3, 'numbers-0-20', 'Số 0-20', 'Numbers 0-20', 'Đếm, nói số điện thoại', null, '/θ/ trong three, /v/ trong five, seven'),
  ('pre-a1', 4, 'name-age-origin', 'Tên, tuổi, quê quán', 'Name, age, and where you are from', 'Tự giới thiệu 3 câu', 'I am, You are, câu hỏi với be', 'Nối âm trong I''m, you''re'),
  ('pre-a1', 5, 'things-around-us', 'Đồ vật quanh ta', 'Things around us', 'Hỏi và gọi tên đồ vật', 'this, that, a, an', 'Âm cuối /s/ /z/'),
  ('pre-a1', 6, 'colors-and-descriptions', 'Màu sắc và mô tả', 'Colors and descriptions', 'Mô tả đồ vật bằng tính từ', 'It is + tính từ', '/r/ và /l/'),

  ('a1', 1, 'introducing-yourself', 'Giới thiệu bản thân', 'Introducing yourself', 'Giới thiệu mình và hỏi người khác', 'Động từ be, my, your', 'Trọng âm từ 2 âm tiết'),
  ('a1', 2, 'family', 'Gia đình', 'Family', 'Nói về người thân', 'have, his, her, số nhiều', '/ð/ trong mother, brother'),
  ('a1', 3, 'jobs', 'Nghề nghiệp', 'Jobs', 'Hỏi và nói về công việc', 'a/an + nghề, What do you do?', '/dʒ/ trong job, /ʃ/ và /s/'),
  ('a1', 4, 'time-and-dates', 'Giờ và ngày tháng', 'Time and dates', 'Hỏi giờ, nói ngày, hẹn giờ', 'Số đến 100, at, on, in', 'Phân biệt thirteen và thirty'),
  ('a1', 5, 'daily-routine', 'Thói quen hằng ngày', 'Daily routine', 'Kể một ngày của mình', 'Hiện tại đơn với I, you, we, they', '/ɪ/ và /iː/'),
  ('a1', 6, 'what-others-do', 'Người khác làm gì', 'What other people do', 'Kể thói quen của người khác', 'Hiện tại đơn với he, she, thêm -s', 'Ba cách đọc đuôi -s'),
  ('a1', 7, 'food-and-drink', 'Đồ ăn thức uống', 'Food and drink', 'Nói thích và không thích', 'like, don''t like, some, any', '/tʃ/ trong chicken, lunch'),
  ('a1', 8, 'ordering-food', 'Gọi món', 'Ordering food', 'Gọi món và thanh toán ở quán', 'I''d like, Can I have', 'Ngữ điệu lịch sự khi yêu cầu'),
  ('a1', 9, 'shopping-and-prices', 'Mua sắm và giá cả', 'Shopping and prices', 'Hỏi giá, chọn hàng, trả tiền', 'How much, these, those', 'Đọc giá tiền, trọng âm số'),
  ('a1', 10, 'home', 'Nhà cửa', 'Home', 'Mô tả nhà và phòng', 'There is, there are, giới từ chỉ vị trí', 'Nối âm there''s a, there are'),
  ('a1', 11, 'asking-directions', 'Hỏi đường', 'Asking for directions', 'Hỏi và chỉ đường đơn giản', 'Câu mệnh lệnh, Where is', 'Cụm phụ âm đầu: street, straight'),
  ('a1', 12, 'getting-around', 'Đi lại', 'Getting around', 'Nói về phương tiện và lộ trình', 'by bus, How do you get to', '/æ/ trong taxi, /ʌ/ trong bus'),
  ('a1', 13, 'hobbies', 'Sở thích', 'Hobbies', 'Nói về thời gian rảnh', 'like + V-ing, trạng từ tần suất', 'Âm /ŋ/ đuôi -ing'),
  ('a1', 14, 'abilities', 'Khả năng', 'Abilities', 'Nói mình làm được gì', 'can, can''t', 'Phân biệt can và can''t khi nghe'),
  ('a1', 15, 'happening-now', 'Đang làm gì', 'What is happening now', 'Mô tả việc đang diễn ra', 'Hiện tại tiếp diễn', 'Dạng rút gọn I''m, he''s, they''re'),
  ('a1', 16, 'weather-and-clothes', 'Thời tiết và quần áo', 'Weather and clothes', 'Nói về thời tiết, trang phục', 'It''s + thời tiết, wear', '/w/ và /v/'),
  ('a1', 17, 'health-and-feelings', 'Sức khỏe và cảm xúc', 'Health and feelings', 'Nói mình thấy thế nào, khuyên đơn giản', 'feel, have a + bệnh, should', '/h/ đầu từ, âm câm'),
  ('a1', 18, 'yesterday', 'Hôm qua', 'Yesterday', 'Nói về hôm qua ở đâu, thế nào', 'was, were', 'Dạng yếu của was, were'),
  ('a1', 19, 'past-events', 'Chuyện đã qua', 'Past events', 'Kể việc đã làm', 'Quá khứ đơn có quy tắc và bất quy tắc thông dụng', 'Ba cách đọc đuôi -ed'),
  ('a1', 20, 'plans-and-invitations', 'Kế hoạch và hẹn gặp', 'Plans and invitations', 'Mời, hẹn, nói dự định', 'going to, Let''s, Would you like to', 'Ngữ điệu lên xuống trong câu hỏi');

insert into public.units (level_id, slug, sort_order, status)
select l.id, s.slug, s.sort_order, 'draft'
from seed_units s
join public.levels l on l.code = s.level_code
join public.courses c on c.id = l.course_id and c.slug = 'english';

insert into public.unit_translations (unit_id, locale, title, can_do, grammar_focus, pronunciation_focus)
select u.id, 'vi', s.title_vi, s.can_do_vi, s.grammar_vi, s.pronunciation_vi
from seed_units s
join public.levels l on l.code = s.level_code
join public.courses c on c.id = l.course_id and c.slug = 'english'
join public.units u on u.level_id = l.id and u.slug = s.slug;

insert into public.unit_translations (unit_id, locale, title)
select u.id, 'en-US', s.title_en
from seed_units s
join public.levels l on l.code = s.level_code
join public.courses c on c.id = l.course_id and c.slug = 'english'
join public.units u on u.level_id = l.id and u.slug = s.slug;
