# 03. Kiến trúc kỹ thuật

Trạng thái: bản v2, viết lại ngày 2026-11-24 cho khớp với mã đang chạy và định hướng IELTS (tài liệu 07). Chờ duyệt.

Tài liệu này mô tả cả phần đã có lẫn phần dự định. Phần nào chưa có trong mã thì được ghi rõ là "chưa làm" hoặc "chưa dùng".

## 1. Công nghệ

| Lớp | Lựa chọn | Hiện trạng |
|---|---|---|
| Giao diện và máy chủ | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4. Không dùng thư viện thành phần giao diện | Đang dùng. Bản Next này khác nhiều so với các bản cũ, xem `AGENTS.md` |
| Cơ sở dữ liệu và đăng nhập | Supabase (Postgres, Auth) qua `@supabase/ssr`; đăng nhập bằng email hoặc Google | Đang dùng, một project thử nghiệm |
| Đa ngôn ngữ giao diện | next-intl, mọi chuỗi ở `messages/vi.json` | Đang dùng, mới có tiếng Việt |
| Lịch ôn | ts-fsrs | Đang dùng |
| Kiểm tra dữ liệu vào | zod ở mọi server action | Đang dùng |
| Âm thanh | File sinh sẵn bằng Kokoro, lưu trong kho mã | Đang dùng, xem mục 5 |
| Kiểm thử | Vitest cho logic, pglite cho database, Playwright cho luồng chính | Đang dùng, xem mục 11 |
| Triển khai | Vercel, máy chủ đặt tại Tokyo (`vercel.json`), tự triển khai khi đẩy lên nhánh `main` | Đang dùng, xem tài liệu 06 |
| AI trong app (sửa bài viết, nhận xét bài nói) | Gemini qua REST | Chưa làm, giai đoạn 3. Xem mục 6 |
| AI kiểm tra chéo nội dung | Một model khác hãng với model đã soạn nháp | Chưa làm, việc số 3 ở tài liệu 04. Xem mục 6 |

## 2. Quy trình làm việc

1. Toàn bộ mã do Claude viết trong kho này. v0 và Vercel chỉ dùng để triển khai (quyết định 2026-11-23).
2. Logic quan trọng (lịch ôn, chấm bài, sinh bài tập, chọn đáp án nhiễu) nằm trong `lib/` và có kiểm thử, không để lẫn trong component.
3. Schema là các file SQL đánh số trong `scripts/`, chạy bằng `run-sql`. Không sửa schema bằng tay trên giao diện Supabase.
4. Hiện chỉ có một project Supabase (thử nghiệm) và bản trên mạng cũng dùng nó. Vì vậy migration phải được thử trên Postgres cục bộ có dữ liệu giống thật trước khi chạy, và chạy xong mới đẩy mã phụ thuộc vào nó (tiêu chí ở tài liệu 04). Project chính thức tách riêng ở giai đoạn 4.
5. Sau mỗi lần đẩy mã, kiểm tra trạng thái triển khai (tài liệu 06, mục 6).

## 3. Mô hình dữ liệu đa ngôn ngữ

Nguyên tắc: nội dung bằng ngôn ngữ đích nằm ở bảng gốc; mọi thứ viết bằng ngôn ngữ nguồn nằm ở bảng dịch riêng, khóa theo mã ngôn ngữ. Thêm một ngôn ngữ nguồn là thêm dòng, không đổi cấu trúc.

Schema thực tế nằm ở `scripts/001` đến `014`. Trong SQL, cột thứ tự tên là `sort_order` (vì `order` là từ khóa).

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
| `lessons` | unit_id, order, kind, status, version | kind: bài học, bài ôn cuối chủ đề, hoặc bài kiểm tra |
| `lesson_sessions` | lesson_id, session_no, session_type, kind, step_count, pass_percent | Các phiên ngắn của một bài, đánh số. pass_percent chỉ có ở phiên ôn cuối chủ đề |
| `sentences` | lesson_id, order, text, accepted_forms, pronunciation | text bằng ngôn ngữ đích. accepted_forms là danh sách các cách viết khác cũng được chấm đúng |
| `words` | course_id, lemma, pronunciation, part_of_speech, level_tag, frequency_rank | Từ điển của khóa, dùng chung giữa các bài |
| `lesson_words` | lesson_id, word_id, order, example_sentence_id | Từ nào được dạy ở bài nào |
| `sentence_words` | sentence_id, position, word_id, surface | Câu gồm những từ nào. Dùng để bấm vào từ xem nghĩa và để kiểm tra câu chỉ chứa từ đã dạy |
| `exercises` | id, lesson_id, session_no, order, session_type, type, source_type, source_id, payload, origin | Bài tập dạng dữ liệu, thuộc về một phiên. origin: sinh tự động hoặc soạn tay |
| `level_tests`, `level_test_questions` | cấp, số câu, mức đạt; câu hỏi kèm đáp án | Ngân hàng câu hỏi kiểm tra cuối cấp. Chỉ quản trị đọc được câu hỏi |
| `audio_reviews` | audio_key, voice, text, verdict, note, reviewed_by | Kết quả nghe duyệt từng file âm thanh. Chỉ quản trị đọc và ghi |
| `audio_assets` | content_hash, text, lang, voice, model, speed, storage_path, license | Chưa dùng. Hiện file âm thanh nằm trong kho mã (mục 5) |

Quy tắc cho nội dung:

- **Bài tập sinh tự động từ từ và câu.** Người soạn chỉ viết từ, câu, bản dịch. Khi xuất bản, mã sinh các phiên và bài tập rồi ghi vào `lesson_sessions` và `exercises` trong một transaction (hàm `publish_lesson`). Chưa có bài tập soạn tay.
- **ID bài tập được giữ khi xuất bản lại.** Bài tập cùng phiên, cùng loại, cùng từ hoặc câu nguồn thì dùng lại ID cũ, nên sửa chữ trong câu không làm mất lịch sử làm bài. Thứ tự và thành phần của mỗi phiên lưu trong dữ liệu, không chọn ngẫu nhiên lúc chạy.
- **Đáp án nhiễu** chỉ lấy từ những từ và câu người học đã gặp; cách chọn ở mục 4.
- **Âm thanh sinh theo phần thay đổi.** Tên file là mã băm của văn bản, nên câu nào đổi chữ thì chỉ câu đó được sinh thêm. File không còn được tham chiếu hiện chưa được dọn tự động.
- **Chưa làm:** chặn xuất bản khi một từ trong câu thiếu nghĩa ở ngôn ngữ nguồn đang bật. Hiện điều này do công cụ kiểm tra nội dung (`tools/content/build-content.mjs`) bảo đảm trước khi nạp, không phải do bước xuất bản.

### Lớp dịch (theo ngôn ngữ nguồn)

| Bảng | Cột chính |
|---|---|
| `unit_translations` | unit_id, locale, title, description |
| `lesson_translations` | lesson_id, locale, title, grammar_tip, pronunciation_tip |
| `sentence_translations` | sentence_id, locale, text, accepted_forms, note |
| `word_translations` | word_id, locale, meaning, accepted_forms, usage_note |

Mỗi dòng dịch có thêm `source_hash` (mã băm của văn bản gốc lúc dịch) và `status`. Dự định: khi văn bản gốc thay đổi, các bản dịch có mã băm cũ được đánh dấu cần dịch lại. Việc đánh dấu này chưa có trong mã.

Phần giải thích bằng chính ngôn ngữ đích (ví dụ nghĩa tiếng Anh đơn giản) cũng lưu trong các bảng dịch với locale bằng mã ngôn ngữ đích. Như vậy "giải thích song ngữ" chỉ là hiển thị hai locale cùng lúc.

### Dữ liệu người học

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `profiles` | id, display_name, role, ui_locale, daily_goal, timezone, streak_count, longest_streak, last_active_date | Chuỗi ngày học chỉ đổi qua hàm `touch_streak`, tính "hôm nay" theo múi giờ của người học |
| `cards` | user_id, course_id, kind, word_id, sentence_id, due_at, stability, difficulty, reps, lapses, state, last_review_at | Các cột lịch ôn theo cấu trúc thẻ của ts-fsrs. Thẻ được tạo khi người học xong phiên có từ hoặc câu đó |
| `review_logs` | id do máy khách sinh, card_id, user_id, grade, source, reviewed_at | Giữ toàn bộ lịch sử. ID do máy khách sinh để gửi lại khi mạng lỗi không bị ghi trùng |
| `session_logs` | id do máy khách sinh, user_id, lesson_id, session_no, session_type, score, duration_sec | Cùng lý do chống ghi trùng. Phiên được coi là xong khi có dòng ở đây (và đạt ngưỡng, nếu phiên có ngưỡng) |
| `exercise_attempts` | user_id, exercise_id, is_correct, answer, created_at | Để biết bài tập nào quá khó hoặc sai |
| `level_test_attempts` | user_id, cấp, câu hỏi đã rút, điểm, đạt hay không | Lượt làm bài kiểm tra cuối cấp. Người học chỉ xem được lượt của mình và không tự ghi được |
| `content_reports` | user_id, owner_type, owner_id, reason, note, status, resolved_by | Người học báo lỗi một từ hoặc một câu. reason là mã lý do (`lib/report.ts`). Chỉ mục duy nhất chặn báo trùng khi báo cáo trước còn mở |
| `writing_entries`, `chat_messages` | | Chưa dùng (giai đoạn 3) |
| `ai_usage` | user_id, usage_date, feature, calls, input_tokens, output_tokens | Chưa dùng. Để giới hạn và đo chi phí AI |
| `plans`, `subscriptions` | | Chỉ có gói `free`. Chưa có mã nào đọc hai bảng này |

Mô-đun gói dịch vụ mới có bảng, chưa có mã. Khi làm, mã ứng dụng chỉ hỏi quyền và giới hạn qua một chỗ duy nhất (`lib/billing`), không kiểm tra gói rải rác.

Cài đặt lưu theo thiết bị, không nằm trong database: giao diện sáng hoặc tối, giọng đọc nam hoặc nữ.

### Phân quyền

- Row Level Security bật trên mọi bảng. App chỉ dùng khóa công khai cùng phiên đăng nhập của người dùng; không dùng khóa service role ở đâu cả.
- Bảng nội dung: người đã đăng nhập đọc được các dòng đã xuất bản (`can_read_lesson`); chỉ quản trị ghi được (`is_admin`).
- Bảng người học: chỉ chủ sở hữu đọc và ghi (`auth.uid() = user_id`). Người học chỉ tạo được báo lỗi đang mở cho chính mình.
- Việc cần quyền cao hơn người gọi đi qua hàm trong database: `touch_streak`, `start_level_test`, `submit_level_test`.
- Ba lớp chặn, lớp sau không tin lớp trước: `proxy.ts` đưa người chưa đăng nhập về trang đăng nhập; mỗi trang và mỗi server action tự kiểm tra lại (`lib/auth.ts`, `lib/admin.ts`); RLS chặn ở database. Giao diện chỉ ẩn mục quản trị với người không phải quản trị, đó không phải là lớp bảo vệ.

## 4. Bài học, bài tập và chấm bài

### Phiên học

Mỗi bài học được chia thành 4-5 phiên ngắn, dài nhất 11 bước. Bài ôn cuối chủ đề có hai phiên, mỗi phiên phải đúng từ 80% ở lần trả lời đầu.

| Kiểu phiên | Việc | Loại bài tập |
|---|---|---|
| `vocab_learn` | Học từ mới (tối đa 5 từ mỗi phiên) | Giới thiệu từ, chọn nghĩa, ghép cặp |
| `vocab_recall` | Nhớ lại từ | Chọn từ theo nghĩa, gõ từ |
| `listen_recognize` | Nghe hiểu | Nghe chọn câu, nghe sắp xếp từ |
| `listen_dictation` | Nghe chép | Nghe gõ lại |
| `review_vocab`, `review_listening` | Ôn cuối chủ đề | Như trên, trộn từ và câu của cả chủ đề |

Mã liên quan: `lib/exercises/generate.ts` (bài học), `review.ts` (bài ôn), `types.ts` (schema của từng loại bài tập, là hợp đồng giữa bộ sinh và trình phát), `lib/level-test/pool.ts` (ngân hàng câu hỏi kiểm tra), `lib/publish.ts` (`prepareLesson` sinh mà chưa ghi, dùng cho trang xem trước; `publishLesson` ghi và xuất bản).

Chưa có: phiên đọc, viết, nói; bài lý thuyết ngữ pháp; khái niệm nhánh. Thiết kế ở đầu giai đoạn 2 (tài liệu 07, mục 5).

### Đáp án nhiễu

`lib/exercises/distractors.ts` chọn cho mọi loại bài (bài học, bài ôn, kiểm tra cuối cấp). Thứ tự ưu tiên: cùng loại nội dung (chữ cái với chữ cái, câu đánh vần với câu đánh vần), rồi cùng chủ đề, cùng từ loại, chữ viết gần. Không lấy từ đồng nghĩa với đáp án. Có kiểm thử chạy trên nội dung thật của 24 bài.

### Phần phụ thuộc ngôn ngữ

Mọi xử lý phụ thuộc ngôn ngữ đi qua một giao diện chung (`lib/lang/`), mỗi ngôn ngữ đích có một bản cài đặt riêng. Hiện có bản tiếng Anh (`en.ts`).

| Hàm | Việc | Bản tiếng Anh |
|---|---|---|
| `tokenize` | Tách câu thành từ | Tách theo dấu cách và dấu câu |
| `normalize` | Chuẩn hóa trước khi so sánh | Chữ thường, bỏ dấu câu, coi I'm và I am là một |
| `checkAnswer` | Chấm câu trả lời gõ vào: đúng, gần đúng, sai | Cho phép sai một ký tự với từ dài (báo "gần đúng"); chấp nhận mọi mục trong `accepted_forms` |
| `diffWords` | Chỉ ra từ nào khác với đáp án | So theo từng từ |

Giao diện không chứa chuỗi cố định bằng tiếng Việt; mọi chuỗi nằm trong file dịch của next-intl.

Việc sẽ cần khi tới B1 (tài liệu 07, mục 7): chấp nhận cả chính tả Anh và Mỹ. Chưa làm.

### Nơi chấm bài

| Loại | Chấm ở đâu | Lý do |
|---|---|---|
| Bài tập trong phiên học và ôn tập | Máy khách chấm ngay, máy chủ ghi nhận | Phiên 2-3 phút cần phản hồi tức thì; gian lận chỉ hại chính người học |
| Kiểm tra cuối cấp (và kiểm tra đầu vào, khi có) | Chỉ database chấm, không gửi đáp án xuống trình duyệt | Kết quả quyết định việc mở cấp, phải đáng tin |

Bài kiểm tra cuối cấp (`scripts/013-level-tests.sql`):

- Người học chỉ đi qua hai hàm: `start_level_test` rút đề và trả câu hỏi không kèm đáp án; `submit_level_test` chấm và trả điểm kèm đáp án. Quản trị nạp ngân hàng bằng `publish_level_test`; nạp lại thì các lượt đang làm dở bị hủy.
- Hàm `normalize_answer` trong SQL phải cho kết quả giống `normalize()` trong `lib/lang/en.ts`; có kiểm thử so hai bên trên toàn bộ từ và câu của khóa học.
- Đạt thì cấp được ghi là hoàn thành. Dùng kết quả này để mở khóa cấp sau, và kiểm tra đầu vào, là việc của giai đoạn 2.

### Ôn tập

Xong một phiên thì từ và câu của phiên đó thành thẻ; thẻ của câu trả lời sai đến hạn sớm hơn. Trang Ôn tập cho lật thẻ rồi tự chấm Quên, Khó, Nhớ, Dễ; `lib/srs/fsrs.ts` tính lịch bằng ts-fsrs. Khi có từ 5 thẻ đến hạn, trang chủ ưu tiên ôn trước khi học bài mới.

## 5. Âm thanh

- Nguồn giọng: Kokoro-82M (mã nguồn mở, Apache 2.0), chạy trên máy bằng `tools/audio/generate.mjs`, không tốn phí và không cần khóa API.
- Hai giọng Mỹ: nữ `af_heart` và nam `am_michael`; người học đổi trong Cài đặt (lưu theo thiết bị).
- File nằm ở `public/audio/<giọng>/<khóa>.mp3`, khóa là 20 ký tự đầu của sha1(văn bản). Có file cho mọi từ, mọi câu và mọi từ xuất hiện trong câu. Hiện khoảng 310 đoạn mỗi giọng, tổng 7 MB.
- "Nghe chậm" phát cùng file ở tốc độ 0,7, giữ nguyên cao độ.
- Đoạn văn bản nào chưa có file thì app tự dùng giọng đọc của trình duyệt. Trang nghe duyệt của quản trị thì chỉ phát file sinh sẵn, thiếu file thì báo thiếu.
- Sau khi thêm hoặc sửa nội dung, chạy lại `node tools/audio/generate.mjs`; chỉ các đoạn mới được sinh.
- Sửa file đọc sai: ghi cách viết thay thế vào `tools/audio/overrides.json` rồi chạy `node tools/audio/generate.mjs --redo "<văn bản>"`. Tên file vẫn tính theo văn bản gốc. Cách này chưa được kiểm chứng trên một file sai thật.
- Nghe duyệt: trang Quản trị > Âm thanh, kết quả lưu ở `audio_reviews`. Khóa file luôn được máy chủ tính lại từ văn bản.

Dự định:

| Việc | Khi nào |
|---|---|
| Chuyển file sang Supabase Storage và dùng bảng `audio_assets` | Khi âm thanh vượt khoảng 50 MB |
| Thêm giọng Anh cho bài nghe (Kokoro có sẵn); tìm nguồn giọng Úc | Từ A2; giọng Úc ở giai đoạn 5 |
| Chấm nói: nhận diện giọng nói của trình duyệt, so chữ nhận được với câu mẫu | Giai đoạn 3 |

Nhận diện giọng nói của trình duyệt không chạy trên Firefox và hoạt động hạn chế trên iPhone, nên phiên nói phải có phương án thay thế (tự nghe lại bản ghi và tự đánh giá). Điểm của cách so chữ là "nhận diện được bao nhiêu từ", phải hiển thị đúng tên như vậy, không gọi là điểm phát âm.

## 6. Lớp AI

Chưa có dòng mã nào gọi AI trong app. Nội dung 24 bài cấp Khởi động do Claude soạn trong lúc xây dựng kho này, lưu thành JSON ở `content/`; phiên âm và cấp của từ lấy từ dữ liệu thật (ipa-dict, CEFR-J), không do AI sinh.

Hệ quả cho bước kiểm tra chéo (việc số 3 ở tài liệu 04): model kiểm tra phải khác hãng với model đã soạn, nếu không hai bên dễ mắc cùng kiểu lỗi. Vì bản nháp do Claude soạn, model kiểm tra nên là của hãng khác (ví dụ Gemini). Quyết định này còn mở, xem tài liệu 04.

Nguyên tắc khi làm lớp AI:

- Toàn bộ lời gọi AI đi qua `lib/ai/`, chỉ chạy ở máy chủ. Tên model đặt ở một hằng số duy nhất.
- Mọi lời gọi yêu cầu trả về JSON theo schema, sau đó kiểm tra lại bằng zod. Sai schema thì gọi lại đúng một lần kèm thông báo lỗi; câu trả lời bị cắt do hết giới hạn token thì báo lỗi, không cố đọc phần dở.
- Prompt lưu thành file có phiên bản. Mỗi prompt nhận ngôn ngữ đích, ngôn ngữ nguồn và cấp của người học làm tham số, không viết cứng "English" hay "Vietnamese".
- Nội dung người dùng nhập luôn được coi là dữ liệu, không phải chỉ dẫn cho AI.
- Kiểm soát chi phí: trần số lượt mỗi người mỗi ngày theo từng chức năng, giới hạn độ dài đầu vào, ghi token vào `ai_usage` cho mọi lời gọi, kể cả của quản trị.
- Ngôn ngữ nhận diện giọng nói lấy từ khóa học đã ghi danh ở máy chủ, không lấy từ trạng thái trên trình duyệt.

Chức năng dự định, theo tài liệu 07:

| Chức năng | Giai đoạn |
|---|---|
| Kiểm tra chéo nội dung bài học (chỉ quản trị) | 1 |
| Sửa câu và đoạn văn người học viết | 3 |
| Nhận xét Writing Task 1, Task 2 và Speaking theo bốn tiêu chí công khai của IELTS, đưa khoảng band kèm ghi chú là ước lượng | 5 và 6 |

Trước khi mở công khai, thêm bước kiểm duyệt nội dung cho phần người dùng viết tự do, không chỉ dựa vào lời dặn trong prompt.

## 7. PWA và nhắc học

- Đã có: cài được lên màn hình chính, mở toàn màn hình (`app/manifest.ts`).
- Chưa có: service worker, nên không dùng được khi mất mạng và chưa có nhắc học.
- Giai đoạn 4: nhắc học bằng web push theo khung giờ người học chọn, và chế độ ngoại tuyến cho phiên học và ôn tập. Trên iPhone, web push chỉ hoạt động sau khi người dùng cài app lên màn hình chính, nên cần màn hình hướng dẫn cài.

## 8. Giao diện quản trị và trang lỗi

- Khu quản trị có ba mục: Bài học (`/admin/lessons`, xuất bản bài, nạp đề kiểm tra, xem nội dung từng bài kèm toàn bộ bài tập và đáp án), Âm thanh (`/admin/audio`), Báo lỗi (`/admin/reports`).
- Trang lỗi và trang không tìm thấy: `app/error.tsx`, `app/not-found.tsx` (toàn màn hình), `app/(app)/error.tsx`, `app/(app)/not-found.tsx` (giữ thanh điều hướng), `app/global-error.tsx` (khung gốc hỏng). Bản Next này truyền `retry` cho trang lỗi, không phải `reset`.

## 9. Bảo mật và pháp lý

Đã có: kiểm tra đầu vào bằng zod ở mọi server action; giới hạn 30 báo lỗi mỗi người mỗi ngày; trang chính sách quyền riêng tư (bản nháp, chủ dự án cần đọc lại).

Trước khi mở công khai:

- Giới hạn tần suất gọi cho các thao tác còn lại.
- Điều khoản sử dụng; nêu rõ bài viết và bài nói được gửi tới dịch vụ AI.
- Ghi rõ app không liên kết với các tổ chức sở hữu IELTS và TOEFL; không dùng đề thi thật (tài liệu 07, mục 9).
- Cho người dùng xóa tài khoản và dữ liệu.
- Không lưu bản ghi âm giọng nói trừ khi người dùng đồng ý.

## 10. Bài học rút từ dự án mã nguồn mở

Đã đọc mã nguồn và tài liệu của freelingo và LibreLingo ngày 2026-11-23. Cả hai dùng giấy phép AGPL nên chỉ rút ý tưởng, không sao chép code.

| Bài học | Nguồn | Đã đưa vào thiết kế ở đâu |
|---|---|---|
| Trộn văn bản giải thích vào nội dung khóa học khiến muốn dạy cho người nói ngôn ngữ khác phải chép và dịch lại cả khóa | LibreLingo | Lớp dịch tách riêng (mục 3) |
| Sinh bài học riêng cho từng người, có sẵn tiếng mẹ đẻ bên trong, thì tốn kém và không dùng chung được | freelingo | Nội dung soạn một lần, dùng chung; lớp dịch riêng |
| Ngôn ngữ đích, ngôn ngữ giải thích và ngôn ngữ giao diện phải là ba trường độc lập | freelingo | Mục 3 |
| Sinh bài tập tự động từ từ và câu, người soạn chỉ viết nội dung một lần | LibreLingo | Quy tắc cho nội dung (mục 3) |
| Dùng mã băm nội dung làm ID bài tập làm mất tiến độ khi sửa chữ | LibreLingo | ID được giữ khi xuất bản lại (mục 3) |
| Không quy định cách chuẩn hóa đáp án và không có thông tin hệ chữ thì không mở rộng được sang chữ không phải Latin | LibreLingo | Bảng `languages`, `lib/lang/` (mục 4) |
| Danh sách đáp án được chấp nhận phải thực sự được dùng khi chấm | LibreLingo | `accepted_forms` |
| Tin kết quả chấm do trình duyệt gửi lên trong bài kiểm tra xếp cấp là lỗ hổng | freelingo | Nơi chấm bài (mục 4) |
| Chỉ đo token cho hội thoại, bỏ sót phần sinh nội dung, làm chi phí không kiểm soát được | freelingo | Ghi `ai_usage` cho mọi lời gọi (mục 6, chưa làm) |
| Nhận diện giọng nói từng âm thầm coi mọi bản ghi là tiếng Anh | freelingo | Ngôn ngữ nhận diện lấy từ máy chủ (mục 6, chưa làm) |
| So chữ nhận diện được rồi gọi là "điểm phát âm" gây hiểu lầm | freelingo | Gọi đúng tên điểm (mục 5, chưa làm) |
| Gửi lại yêu cầu khi mạng lỗi làm ghi trùng điểm và lượt ôn | freelingo | ID do máy khách sinh |
| Bài 20-30 phút và bộ máy trạng thái dày đặc sinh ra nhiều lỗi tranh chấp khi đổi ngôn ngữ | freelingo | Giữ phiên 2-3 phút, trạng thái tối thiểu |

## 11. Kiểm thử

| Lớp | Lệnh | Phạm vi |
|---|---|---|
| Logic | `npm test` | Chấm đáp án, sinh bài tập, đáp án nhiễu (cả trên nội dung thật), lịch ôn, tiến độ. File `*.test.ts` nằm cạnh mã trong `lib/` |
| Database | `npm test` (cùng lệnh) | `tests/db/`: chạy các file `scripts/` trên Postgres trong bộ nhớ (pglite) rồi kiểm tra phân quyền, chấm bài kiểm tra, báo lỗi, nghe duyệt |
| Luồng trên trình duyệt | `npm run test:e2e` | `tests/e2e/`, Playwright trên Chrome cài sẵn ở kích thước điện thoại: chưa đăng nhập, sai mật khẩu, đăng nhập, học trọn một phiên, trả lời sai, ôn một thẻ |

Lưu ý:

- Trên Windows phải chạy Vitest từ đường dẫn có ổ đĩa viết hoa (`D:/...`), nếu không nó báo không tìm thấy bộ kiểm thử.
- Kiểm thử luồng chạy app ở máy với database thử và cần `E2E_EMAIL`, `E2E_PASSWORD` trong `.env.local`. Nó ghi dữ liệu học thật cho tài khoản thử.
- Chưa có kiểm thử nào chạy tự động khi đẩy mã.
- Không chạy `next build` khi máy chủ phát triển đang chạy: build ghi đè thư mục `.next` và làm máy chủ đó báo lỗi ở mọi trang.

## 12. Theo dõi vận hành

Chưa có gì ngoài nhật ký của Vercel. Dự định cho giai đoạn 4:

- Ghi lỗi máy chủ và trình duyệt (Sentry hoặc tương đương).
- Sự kiện sản phẩm: bắt đầu phiên, hoàn thành phiên, ôn thẻ, dùng AI. Đủ để tính các chỉ số ở tài liệu 01.
- Trang quản trị: số người dùng hoạt động, chi phí AI theo ngày, bài tập có tỷ lệ sai bất thường. (Báo lỗi nội dung đang chờ thì đã có.)
