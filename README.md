# LisB

Web app học ngoại ngữ cho người Việt bắt đầu từ số 0, học bằng nhiều phiên rất ngắn (2-3 phút) trong ngày. Khóa đầu tiên là tiếng Anh giao tiếp hằng ngày; nền tảng được thiết kế để thêm ngôn ngữ khác về sau.

Trạng thái: giai đoạn 1 (bản cá nhân): đăng nhập, học từ vựng, luyện nghe, ôn tập ngắt quãng.

## Chạy trên máy

Cần Node 20.9 trở lên. Chép `.env.example` thành `.env.local` và điền giá trị.

```
npm install
npm run dev        # http://localhost:3000
npm test           # kiểm thử logic trong lib/
npm run typecheck
npx eslint .
```

Mã ứng dụng dùng Next.js 16 (App Router). Phiên bản này khác nhiều so với các bản cũ; xem `AGENTS.md` trước khi sửa.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `app/`, `components/` | Giao diện và server action (Next.js) |
| `lib/` | Logic thuần có kiểm thử: chấm đáp án, sinh bài tập, lịch ôn, truy vấn |
| `messages/` | Chuỗi giao diện theo ngôn ngữ (next-intl) |
| `docs/` | Tài liệu dự án: tầm nhìn, lộ trình bài học, kiến trúc, giai đoạn, tài nguyên tham khảo |
| `scripts/` | Migration Postgres (Supabase), đánh số, chạy theo thứ tự |
| `content/` | Nội dung bài học dạng JSON, theo `khóa/cấp/chủ-đề.json` |
| `content/build/` | File SQL nạp nội dung, sinh tự động từ JSON |
| `tools/content/` | Công cụ kiểm tra nội dung và sinh SQL |

## Bắt đầu đọc từ đâu

1. [docs/01-tam-nhin-san-pham.md](docs/01-tam-nhin-san-pham.md)
2. [docs/04-giai-doan-va-ke-hoach.md](docs/04-giai-doan-va-ke-hoach.md) để biết đang ở đâu và việc gì tiếp theo

## Database

Chạy các file trong `scripts/` theo thứ tự số, mỗi file một transaction, rồi nạp nội dung:

```
run-sql scripts/001-helpers.sql
...
run-sql scripts/008-seed.sql
run-sql content/build/english-pre-a1.sql
```

File nội dung chạy lại nhiều lần được. Bài học nạp vào ở trạng thái `draft`.

## Soạn nội dung

Cần Node 20 trở lên.

```
node tools/content/build-content.mjs --check   # chỉ kiểm tra
node tools/content/build-content.mjs           # kiểm tra và sinh content/build/*.sql
```

Công cụ kiểm tra: mỗi bài đủ 5 câu và 5-8 từ mới, mọi từ trong câu đã được dạy, mọi từ mới xuất hiện trong ít nhất một câu, đủ nghĩa và mẹo ở cả tiếng Việt lẫn tiếng Anh, độ dài câu vừa cấp. Phiên âm lấy từ ipa-dict, cấp của từ đối chiếu với CEFR-J; hai bộ dữ liệu này tự tải về `tools/content/data/` ở lần chạy đầu.

## Nguồn dữ liệu

- Phiên âm: [ipa-dict](https://github.com/open-dict-data/ipa-dict), giấy phép MIT.
- Cấp của từ: CEFR-J Vocabulary Profile 1.5, Tono Laboratory, Tokyo University of Foreign Studies, lấy từ [olp-en-cefrj](https://github.com/openlanguageprofiles/olp-en-cefrj).
