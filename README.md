# LisB

Web app đưa người Việt từ số 0 tới IELTS 6.5, học bằng nhiều phiên ngắn (2-3 phút) trong ngày. Nền tảng được thiết kế để thêm ngôn ngữ khác về sau.

Trạng thái: giai đoạn 1, hoàn thiện cấp Khởi động. Kế hoạch và danh sách việc dang dở ở docs/04; định hướng IELTS ở docs/07.

## Chạy trên máy

Cần Node 20.9 trở lên. Chép `.env.example` thành `.env.local` và điền giá trị.

```
npm install
npm run dev        # http://localhost:3000
npm test           # kiểm thử logic (lib/) và database (tests/db/, Postgres trong bộ nhớ)
npm run test:e2e   # kiểm thử luồng trên Chrome; cần E2E_EMAIL, E2E_PASSWORD trong .env.local
npm run typecheck
npx eslint .
```

Mã ứng dụng dùng Next.js 16 (App Router). Phiên bản này khác nhiều so với các bản cũ; xem `AGENTS.md` trước khi sửa.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `app/`, `components/` | Giao diện và server action (Next.js) |
| `lib/` | Logic có kiểm thử: chấm đáp án, sinh bài tập, đáp án nhiễu, lịch ôn, bài kiểm tra cuối cấp, truy vấn |
| `tests/db/`, `tests/e2e/` | Kiểm thử database (pglite) và kiểm thử luồng trên trình duyệt (Playwright) |
| `messages/` | Chuỗi giao diện theo ngôn ngữ (next-intl) |
| `docs/` | Tài liệu dự án, đánh số 01 đến 08; danh sách ở cuối tài liệu 01 |
| `scripts/` | Migration Postgres (Supabase), đánh số, chạy theo thứ tự |
| `content/` | Nội dung bài học dạng JSON, theo `khóa/cấp/chủ-đề.json` |
| `content/build/` | File SQL nạp nội dung, sinh tự động từ JSON |
| `tools/content/` | Công cụ kiểm tra nội dung và sinh SQL |
| `tools/audio/` | Công cụ sinh file giọng đọc (Kokoro) cho mọi từ và câu |
| `public/audio/` | File giọng đọc sinh sẵn, theo từng giọng |

## Bắt đầu đọc từ đâu

1. [docs/01-tam-nhin-san-pham.md](docs/01-tam-nhin-san-pham.md)
2. [docs/04-giai-doan-va-ke-hoach.md](docs/04-giai-doan-va-ke-hoach.md) để biết đang ở đâu và việc gì tiếp theo
3. [docs/03-kien-truc-ky-thuat.md](docs/03-kien-truc-ky-thuat.md) trước khi sửa mã

## Database

Chạy các file trong `scripts/` theo thứ tự số, mỗi file một transaction, rồi nạp nội dung:

```
run-sql scripts/001-helpers.sql
...
run-sql scripts/014-admin-tools.sql
run-sql content/build/english-pre-a1.sql
```

File nội dung chạy lại nhiều lần được. Bài học nạp vào ở trạng thái `draft`; xuất bản bài, bài ôn chủ đề và nạp đề kiểm tra cuối cấp ở trang Quản trị > Bài học.

App trên mạng dùng chung database này, nên migration phải được thử trước theo tiêu chí ở docs/04.

## Soạn nội dung

Cần Node 20 trở lên.

```
node tools/content/build-content.mjs --check   # chỉ kiểm tra
node tools/content/build-content.mjs           # kiểm tra và sinh content/build/*.sql
```

Công cụ kiểm tra: mỗi bài đủ 5 câu và 5-8 từ mới, mọi từ trong câu đã được dạy, mọi từ mới xuất hiện trong ít nhất một câu, đủ nghĩa và mẹo ở cả tiếng Việt lẫn tiếng Anh, độ dài câu vừa cấp. Phiên âm lấy từ ipa-dict, cấp của từ đối chiếu với CEFR-J; hai bộ dữ liệu này tự tải về `tools/content/data/` ở lần chạy đầu.

Sau khi thêm hoặc sửa nội dung, sinh âm thanh cho các đoạn mới (chạy trên máy, không cần khóa API):

```
node tools/audio/generate.mjs
```

Câu mẫu, nghĩa tiếng Việt và mẹo trong bài do AI soạn, chưa có người duyệt. Phiên âm và cấp của từ lấy từ hai bộ dữ liệu dưới đây.

## Nguồn dữ liệu

- Phiên âm: [ipa-dict](https://github.com/open-dict-data/ipa-dict), giấy phép MIT.
- Cấp của từ: CEFR-J Vocabulary Profile 1.5, Tono Laboratory, Tokyo University of Foreign Studies, lấy từ [olp-en-cefrj](https://github.com/openlanguageprofiles/olp-en-cefrj).
