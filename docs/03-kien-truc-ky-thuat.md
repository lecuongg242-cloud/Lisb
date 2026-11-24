# 03. Kiến trúc kỹ thuật

Trạng thái: bản nháp v1, chờ duyệt. Ngày: 2026-11-23.

## 1. Công nghệ

| Lớp | Lựa chọn | Lý do |
|---|---|---|
| Giao diện và máy chủ | Next.js App Router, TypeScript, Tailwind, shadcn/ui | Là bộ v0 sinh ra tốt nhất, deploy thẳng lên Vercel |
| Cơ sở dữ liệu và đăng nhập | Supabase (Postgres, Auth, Storage) | Bạn đã quen, có sẵn công cụ `run-sql` để chạy migration |
| AI | Gemini qua REST, model `gemini-3.1-flash-lite` | Giống cách dora-1 đang dùng, rẻ và nhanh |
| AI kiểm tra chéo nội dung | Claude qua API Anthropic, chỉ chạy trong công cụ quản trị | Khác nhà cung cấp với model sinh nháp nên ít mắc cùng kiểu lỗi; chi phí chỉ phát sinh một lần cho mỗi bài |
| Đa ngôn ngữ giao diện | next-intl | Chuẩn phổ biến cho App Router |
| Âm thanh | Giai đoạn 1-2: giọng đọc của trình duyệt. Từ giai đoạn 3: file âm thanh sinh sẵn | Xem mục 5 |
| Kiểm thử | Vitest cho logic, Playwright cho luồng chính | Lịch ôn và chấm bài phải có test |

## 2. Quy trình làm việc với v0

1. v0 sinh giao diện và khung trang theo prompt của từng giai đoạn.
2. Project v0 đồng bộ với một repo GitHub. Mọi logic quan trọng (lịch ôn, chấm bài, gọi AI, kiểm tra nội dung) nằm trong `lib/` và có test, không để lẫn trong component.
3. Schema là các file SQL đánh số trong `scripts/`, chạy bằng `run-sql`. Không sửa schema bằng tay trên giao diện Supabase.
4. Hai môi trường Supabase tách biệt: thử nghiệm và chính thức. Migration luôn chạy ở thử nghiệm trước.

## 3. Mô hình dữ liệu đa ngôn ngữ

Nguyên tắc: nội dung bằng ngôn ngữ đích nằm ở bảng gốc; mọi thứ viết bằng ngôn ngữ nguồn nằm ở bảng dịch riêng, khóa theo mã ngôn ngữ. Thêm một ngôn ngữ nguồn là thêm dòng, không đổi cấu trúc.

### Ngôn ngữ và khóa học

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `languages` | code (BCP-47, ví dụ en-US), name, script, direction, tts_locale, stt_locale, has_word_spaces, pronunciation_system, special_characters | Cấu hình cho từng ngôn ngữ: hệ chữ, hướng chữ, giọng đọc, nhận diện giọng nói, có dấu cách giữa từ không, hệ phiên âm, phím ký tự đặc biệt |
| `courses` | id, target_lang, framework, status | Một khóa cho mỗi ngôn ngữ đích. framework là CEFR, JLPT, HSK... |
| `course_source_langs` | course_id, source_lang, status | Khóa này đã có lớp giải thích cho những ngôn ngữ nguồn nào |
| `enrollments` | user_id, course_id, source_lang, current_lesson_id | Người học chọn cặp ngôn ngữ |

Có ba vai trò ngôn ngữ độc lập, lưu ở ba chỗ khác nhau: ngôn ngữ đích (`courses.target_lang`), ngôn ngữ giải thích (`enrollments.source_lang`) và ngôn ngữ giao diện (`profiles.ui_locale`). Không suy ra cái này từ cái kia, vì tập ngôn ngữ được hỗ trợ của mỗi vai trò sẽ khác nhau theo thời gian. Mọi nơi dùng mã ngôn ngữ, không dùng tên ngôn ngữ làm khóa.

### Nội dung

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `levels` | course_id, code, order | Pre-A1, A1... |
| `units` | level_id, order, slug, status | Chủ đề |
| `lessons` | unit_id, order, kind, status, version | kind: bài học hoặc bài ôn |
| `sentences` | lesson_id, order, text, accepted_forms, pronunciation | text bằng ngôn ngữ đích. accepted_forms là danh sách các cách viết khác cũng được chấm đúng |
| `words` | course_id, lemma, pronunciation, part_of_speech, level_tag, frequency_rank | Từ điển của khóa, dùng chung giữa các bài |
| `lesson_words` | lesson_id, word_id, order, example_sentence_id | Từ nào được dạy ở bài nào |
| `sentence_words` | sentence_id, position, word_id, surface | Câu gồm những từ nào. Dùng để bấm vào từ xem nghĩa và để kiểm tra câu chỉ chứa từ đã dạy |
| `exercises` | id cố định, lesson_id, session_type, order, type, source_type, source_id, payload, origin | Bài tập dạng dữ liệu. origin: sinh tự động hoặc soạn tay |
| `audio_assets` | content_hash, text, lang, voice, model, speed, storage_path, license | File âm thanh sinh sẵn, tra theo mã băm của (văn bản, giọng, model, tốc độ) |

Quy tắc cho nội dung:

- **Bài tập sinh tự động từ từ và câu.** Người soạn chỉ viết từ, câu, bản dịch. Khi xuất bản, code sinh các bài tập chuẩn (chọn nghĩa, ghép cặp, sắp xếp từ, nghe gõ lại, nhắc lại) và lưu thành dòng trong `exercises`. Chỉ các bài đặc biệt mới soạn tay.
- **ID bài tập cố định.** Sửa chữ trong câu không được làm đổi ID, nếu không tiến độ người học bị mất. Thứ tự và thành phần của mỗi phiên lưu trong dữ liệu, không chọn ngẫu nhiên lúc chạy.
- **Đáp án nhiễu chọn theo độ giống**, lấy từ các từ và câu đã học trong cùng khóa.
- **Chặn xuất bản nếu thiếu nghĩa.** Mọi từ trong `sentence_words` phải có bản dịch ở tất cả ngôn ngữ nguồn đang bật của khóa.
- **Âm thanh sinh lại theo phần thay đổi.** Câu nào đổi chữ thì mã băm đổi, chỉ câu đó được sinh lại; file không còn được tham chiếu thì dọn.

### Lớp dịch (theo ngôn ngữ nguồn)

| Bảng | Cột chính |
|---|---|
| `unit_translations` | unit_id, locale, title, description |
| `lesson_translations` | lesson_id, locale, title, grammar_tip, pronunciation_tip |
| `sentence_translations` | sentence_id, locale, text, accepted_forms, note |
| `word_translations` | word_id, locale, meaning, accepted_forms, usage_note |

Mỗi dòng dịch có thêm `source_hash` (mã băm của văn bản gốc lúc dịch) và `status`. Khi văn bản gốc thay đổi, các bản dịch có mã băm cũ tự được đánh dấu cần dịch lại.

Phần giải thích bằng chính ngôn ngữ đích (ví dụ nghĩa tiếng Anh đơn giản) cũng lưu trong các bảng dịch với locale bằng mã ngôn ngữ đích. Như vậy "giải thích song ngữ" chỉ là hiển thị hai locale cùng lúc.

### Dữ liệu người học

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `profiles` | id, display_name, role, ui_locale, daily_goal, reminder_times, timezone | |
| `cards` | user_id, course_id, kind, word_id, sentence_id, custom_front, custom_back, due_at, stability, difficulty, reps, lapses, state, last_review_at | Các cột lịch ôn theo cấu trúc thẻ của ts-fsrs |
| `review_logs` | id do máy khách sinh, card_id, user_id, grade, reviewed_at, elapsed_days | Giữ toàn bộ lịch sử. ID do máy khách sinh để gửi lại khi mạng lỗi không bị ghi trùng |
| `session_logs` | id do máy khách sinh, user_id, lesson_id, session_type, score, duration_sec | Cùng lý do chống ghi trùng |
| `exercise_attempts` | user_id, exercise_id, is_correct, answer, created_at | Để biết bài tập nào quá khó hoặc sai |
| `writing_entries` | user_id, lesson_id, original_text, corrected_text, feedback | |
| `chat_messages` | user_id, lesson_id, role, content, correction | |
| `content_reports` | user_id, owner_type, owner_id, reason, status | Người học báo lỗi nội dung |
| `ai_usage` | user_id, usage_date, feature, calls, input_tokens, output_tokens | Giới hạn và đo chi phí |
| `plans` | code, name, is_default, limits | Mô-đun gói dịch vụ. Hiện chỉ có gói `free` |
| `subscriptions` | user_id, plan_code, status, expires_at, provider | Trống cho tới khi thu phí; người không có dòng nào dùng gói mặc định |

Mô-đun gói dịch vụ tách riêng: code ứng dụng chỉ hỏi quyền và giới hạn qua một chỗ duy nhất (`lib/billing`), không kiểm tra gói rải rác. Khi cần thu phí chỉ phải thêm gói, gắn cổng thanh toán và sửa mô-đun này.

Schema thực tế nằm ở `scripts/001` đến `008`. Trong SQL, cột thứ tự tên là `sort_order` (vì `order` là từ khóa).

### Phân quyền

- Bảng nội dung: người đã đăng nhập đọc được các dòng đã xuất bản; chỉ quản trị ghi được.
- Bảng người học: chỉ chủ sở hữu đọc và ghi (`auth.uid() = user_id`).
- Row Level Security bật trên mọi bảng. Khóa service role chỉ dùng ở máy chủ.

## 4. Phần code phụ thuộc ngôn ngữ

Mọi xử lý phụ thuộc ngôn ngữ đi qua một giao diện chung, mỗi ngôn ngữ đích có một bản cài đặt riêng:

| Hàm | Việc | Bản tiếng Anh |
|---|---|---|
| `tokenize(text)` | Tách câu thành từ | Tách theo dấu cách và dấu câu |
| `normalize(text)` | Chuẩn hóa trước khi so sánh | Chữ thường, bỏ dấu câu, coi I'm và I am là một |
| `diff(expected, actual)` | So sánh đáp án nghe và nói | So theo từng từ |
| `renderPronunciation(word)` | Hiển thị phiên âm | IPA |

Giao diện không chứa chuỗi cố định bằng tiếng Việt; mọi chuỗi nằm trong file dịch của next-intl.

Quy tắc chấm bài được viết thành văn bản cho từng ngôn ngữ và dùng chung giữa máy khách và máy chủ: bỏ qua hoa thường và dấu câu, chấp nhận dạng rút gọn tương đương, cho phép sai một ký tự với từ dài (báo là "gần đúng"), và chấp nhận mọi mục trong `accepted_forms`.

Nơi chấm bài:

| Loại | Chấm ở đâu | Lý do |
|---|---|---|
| Bài tập trong phiên học và ôn tập | Máy khách chấm ngay, máy chủ ghi nhận | Phiên 2-3 phút cần phản hồi tức thì; gian lận chỉ hại chính người học |
| Kiểm tra đầu vào, kiểm tra cuối cấp | Chỉ máy chủ chấm, không gửi đáp án xuống trình duyệt | Kết quả quyết định việc mở cấp, phải đáng tin |

Cập nhật 2026-11-24, bài kiểm tra cuối cấp (`scripts/013-level-tests.sql`):

- Bảng `level_tests` (số câu, mức đạt), `level_test_questions` (ngân hàng câu hỏi kèm đáp án; chỉ quản trị đọc được), `level_test_attempts` (lượt làm; người học chỉ xem được lượt của mình và không tự ghi được).
- Người học chỉ đi qua hai hàm: `start_level_test` rút đề và trả câu hỏi không kèm đáp án; `submit_level_test` chấm và trả điểm kèm đáp án. Quản trị nạp ngân hàng bằng `publish_level_test`; nạp lại thì các lượt đang làm dở bị hủy.
- Hàm `normalize_answer` trong SQL phải cho kết quả giống `normalize()` trong `lib/lang/en.ts`; có kiểm thử so hai bên trên toàn bộ từ và câu của khóa học.
- Kiểm thử database nằm ở `tests/db/`, chạy bằng pglite cùng lệnh `npx vitest run`. Trên Windows phải đứng ở đường dẫn có ổ đĩa viết hoa (`D:/...`), nếu không Vitest báo không tìm thấy bộ kiểm thử.

Cập nhật 2026-11-24, công cụ quản trị (`scripts/014-admin-tools.sql`):

- Khu quản trị có ba mục: Bài học (`/admin/lessons`, mỗi bài có trang xem nội dung), Âm thanh (`/admin/audio`), Báo lỗi (`/admin/reports`). Quyền được chặn ở RLS và ở từng server action; phần giao diện chỉ ẩn mục với người không phải quản trị.
- Báo lỗi nội dung dùng bảng `content_reports`: `reason` là mã lý do (`lib/report.ts`), `note` là lời người báo. Người học chỉ tạo được báo cáo đang mở cho chính mình; chỉ mục duy nhất chặn báo trùng khi báo cáo trước còn mở.
- Nghe duyệt âm thanh dùng bảng `audio_reviews` (khóa file, giọng, đạt hoặc sai, ghi chú); chỉ quản trị đọc và ghi. Khóa file luôn được máy chủ tính lại từ văn bản.
- `lib/publish.ts` tách thành `prepareLesson` (sinh phiên và bài tập, chưa ghi) và `publishLesson` (ghi và xuất bản); trang xem trước dùng `prepareLesson`.

Cập nhật 2026-11-24, độ vững:

- Ba lớp kiểm thử: logic (`npx vitest run`, gồm cả kiểm thử database bằng pglite ở `tests/db/`), và luồng trên trình duyệt (`npm run test:e2e`, Playwright ở `tests/e2e/`, dùng Chrome cài sẵn, cần `E2E_EMAIL` và `E2E_PASSWORD` trong `.env.local`). Kiểm thử luồng ghi dữ liệu học thật cho tài khoản thử.
- Trang lỗi và trang không tìm thấy: `app/error.tsx`, `app/not-found.tsx` (toàn màn hình), `app/(app)/error.tsx`, `app/(app)/not-found.tsx` (giữ thanh điều hướng), `app/global-error.tsx` (khung gốc hỏng). Bản Next này truyền `retry` cho trang lỗi, không phải `reset`.
- Đáp án nhiễu của mọi loại bài (bài học, bài ôn, bài kiểm tra cuối cấp) đều do `lib/exercises/distractors.ts` chọn.

## 5. Âm thanh

| Giai đoạn | Giọng đọc | Chấm nói |
|---|---|---|
| 1-2 | `speechSynthesis` của trình duyệt, giọng en-US | `SpeechRecognition` của trình duyệt: so chữ nhận được với câu mẫu |
| 3 trở đi | File âm thanh sinh sẵn bằng dịch vụ đọc văn bản, lưu Supabase Storage, hai tốc độ | Giữ như trên; đánh giá thêm dịch vụ chấm phát âm đến từng âm |

Cập nhật 2026-11-23: phần giọng đọc đã chuyển sang file sinh sẵn ngay ở giai đoạn 1, vì giọng trình duyệt nghe khó chịu khi học thật.

- Nguồn giọng: Kokoro-82M (mã nguồn mở, Apache 2.0), chạy trên máy bằng `tools/audio/generate.mjs`, không tốn phí và không cần khóa API.
- Hai giọng Mỹ: nữ `af_heart` và nam `am_michael`; người học đổi trong Cài đặt (lưu theo thiết bị).
- File nằm ở `public/audio/<giọng>/<khóa>.mp3`, khóa là 20 ký tự đầu của sha1(văn bản). Có file cho mọi từ, mọi câu và mọi từ xuất hiện trong câu.
- "Nghe chậm" phát cùng file ở tốc độ 0,7, giữ nguyên cao độ.
- Đoạn văn bản nào chưa có file (nội dung mới chưa sinh âm thanh) thì app tự dùng giọng trình duyệt.
- Sau khi thêm hoặc sửa nội dung, chạy lại `node tools/audio/generate.mjs`; chỉ các đoạn mới được sinh.
- Bảng `audio_assets` trong schema chưa được dùng; sẽ dùng khi chuyển file sang Supabase Storage.

Lý do ban đầu định đổi ở giai đoạn 3: giọng trình duyệt khác nhau giữa các máy và có máy đọc rất kém, không chấp nhận được khi có người dùng thật. Vì nội dung dùng chung nên chi phí sinh file chỉ phát sinh một lần cho mỗi câu. Nhận diện giọng nói của trình duyệt không chạy trên Firefox và hoạt động hạn chế trên iPhone, nên phiên nói phải có phương án thay thế (tự nghe lại bản ghi và tự đánh giá).

## 6. Lớp AI

- Toàn bộ lời gọi AI đi qua `lib/ai/`, chỉ chạy ở máy chủ. Tên model đặt ở một hằng số duy nhất.
- Mọi lời gọi yêu cầu trả về JSON theo schema, sau đó kiểm tra lại bằng zod. Sai schema thì gọi lại đúng một lần kèm thông báo lỗi; câu trả lời bị cắt do hết giới hạn token thì báo lỗi, không cố đọc phần dở.
- Khi sinh bài học, gửi kèm tóm tắt các bài trước trong chủ đề và danh sách câu đã dùng để tránh lặp.
- Ngôn ngữ nhận diện giọng nói lấy từ khóa học đã ghi danh ở máy chủ, không lấy từ trạng thái trên trình duyệt.
- Điểm phiên nói ở giai đoạn 1-2 là điểm "nhận diện được bao nhiêu từ", hiển thị đúng tên như vậy, không gọi là điểm phát âm.
- Trước khi mở công khai, thêm bước kiểm duyệt nội dung cho hội thoại tự do, không chỉ dựa vào lời dặn trong prompt.
- Prompt lưu thành file có phiên bản. Mỗi prompt nhận ngôn ngữ đích, ngôn ngữ nguồn và cấp của người học làm tham số, không viết cứng "English" hay "Vietnamese".
- Bốn chức năng: sửa bài viết, hội thoại nhập vai, tách từ từ văn bản dán vào, sinh nội dung bài học (chỉ quản trị).
- Kiểm soát chi phí: trần số lượt mỗi người mỗi ngày theo từng chức năng, giới hạn độ dài đầu vào, ghi token vào `ai_usage` cho mọi lời gọi AI, kể cả sinh nội dung của quản trị.
- Hội thoại nhập vai giới hạn trong vai và từ vựng của bài; nội dung người dùng nhập luôn được coi là dữ liệu, không phải chỉ dẫn cho AI.

## 7. PWA và nhắc học

- Cài được lên màn hình chính, mở toàn màn hình.
- Nhắc học bằng web push theo khung giờ người học chọn. Trên iPhone, web push chỉ hoạt động sau khi người dùng cài app lên màn hình chính, nên cần màn hình hướng dẫn cài.
- Giai đoạn 3 thêm chế độ ngoại tuyến cho phiên từ vựng và ôn tập (lưu tạm trên máy, đồng bộ khi có mạng).

## 8. Bảo mật và pháp lý (trước khi mở công khai)

- Kiểm tra đầu vào bằng zod ở mọi API, giới hạn tần suất gọi.
- Chính sách quyền riêng tư và điều khoản sử dụng; nêu rõ bài viết và hội thoại được gửi tới dịch vụ AI.
- Cho người dùng xóa tài khoản và dữ liệu.
- Không lưu bản ghi âm giọng nói trừ khi người dùng đồng ý.

## 9. Bài học rút từ dự án mã nguồn mở

Đã đọc mã nguồn và tài liệu của freelingo và LibreLingo ngày 2026-11-23. Cả hai dùng giấy phép AGPL nên chỉ rút ý tưởng, không sao chép code.

| Bài học | Nguồn | Đã đưa vào thiết kế ở đâu |
|---|---|---|
| Trộn văn bản giải thích vào nội dung khóa học khiến muốn dạy cho người nói ngôn ngữ khác phải chép và dịch lại cả khóa | LibreLingo | Lớp dịch tách riêng (mục 3) |
| Sinh bài học riêng cho từng người, có sẵn tiếng mẹ đẻ bên trong, thì tốn kém và không dùng chung được | freelingo | Nội dung sinh một lần, dùng chung; lớp dịch riêng |
| Ngôn ngữ đích, ngôn ngữ giải thích và ngôn ngữ giao diện phải là ba trường độc lập | freelingo | Mục 3 |
| Sinh bài tập tự động từ từ và câu, người soạn chỉ viết nội dung một lần | LibreLingo | Quy tắc cho nội dung (mục 3) |
| Dùng mã băm nội dung làm ID bài tập làm mất tiến độ khi sửa chữ | LibreLingo | ID cố định |
| Không quy định cách chuẩn hóa đáp án và không có thông tin hệ chữ thì không mở rộng được sang chữ không phải Latin | LibreLingo | Bảng `languages`, quy tắc chấm bài (mục 4) |
| Danh sách đáp án được chấp nhận phải thực sự được dùng khi chấm | LibreLingo | `accepted_forms` |
| Tin kết quả chấm do trình duyệt gửi lên trong bài kiểm tra xếp cấp là lỗ hổng | freelingo | Nơi chấm bài (mục 4) |
| Chỉ đo token cho hội thoại, bỏ sót phần sinh nội dung, làm chi phí không kiểm soát được | freelingo | Ghi `ai_usage` cho mọi lời gọi (mục 6) |
| Nhận diện giọng nói từng âm thầm coi mọi bản ghi là tiếng Anh | freelingo | Ngôn ngữ nhận diện lấy từ máy chủ (mục 6) |
| So chữ nhận diện được rồi gọi là "điểm phát âm" gây hiểu lầm | freelingo | Gọi đúng tên điểm (mục 6) |
| Gửi lại yêu cầu khi mạng lỗi làm ghi trùng điểm và lượt ôn | freelingo | ID do máy khách sinh |
| Bài 20-30 phút và bộ máy trạng thái dày đặc sinh ra nhiều lỗi tranh chấp khi đổi ngôn ngữ | freelingo | Giữ phiên 2-3 phút, trạng thái tối thiểu |

## 10. Theo dõi vận hành

- Ghi lỗi máy chủ và trình duyệt (Sentry hoặc tương đương).
- Sự kiện sản phẩm: bắt đầu phiên, hoàn thành phiên, ôn thẻ, dùng AI. Đủ để tính các chỉ số ở tài liệu 01.
- Trang quản trị: số người dùng hoạt động, chi phí AI theo ngày, bài tập có tỷ lệ sai bất thường, báo lỗi nội dung đang chờ.
