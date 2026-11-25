# 09. Bảng tiến độ

Cập nhật lần cuối: 2026-11-24.

Đây là danh sách việc từ bây giờ tới đích IELTS 6.5, theo thứ tự làm. Mỗi lần xong một việc, dòng đó được đánh dấu và ghi ngày. Lý do, tiêu chí hoàn thành và chi tiết từng việc nằm ở tài liệu 04; tài liệu này chỉ để nhìn nhanh đang ở đâu.

Ký hiệu:

- `[x]` xong, đủ tiêu chí hoàn thành.
- `[~]` phần của Claude đã xong, đang chờ chủ dự án làm một việc (ghi rõ việc gì).
- `[ ]` chưa làm.

## Tổng quan

| Giai đoạn | Nội dung | Tình trạng |
|---|---|---|
| 1 | Hoàn thiện cấp Khởi động | Đang làm: 7 việc xong, 6 việc chờ chủ dự án, 2 việc chưa làm |
| 1B | Luyện nói và chấm phát âm cho cấp Khởi động | Hoãn từ 2026-11-24, làm sau khi có bài học cấp A1 |
| 2 | Ba nhánh và cấp A1 | Đang làm: khung A1 xong, chủ đề 1/21 đã xuất bản |
| 3 | Cấp A2, viết và nói | Chưa bắt đầu |
| 4 | Thử nghiệm kín | Chưa bắt đầu |
| 5 | Cấp B1 và kỹ năng thi | Chưa bắt đầu |
| 6 | Cấp B2 và đề thi thử | Chưa bắt đầu |
| 7 | Ra mắt công khai | Chưa bắt đầu |
| 8 | Mở rộng | Chưa bắt đầu |

## Việc đang chờ chủ dự án

Gom lại một chỗ để bạn biết mình cần làm gì. Làm xong việc nào thì báo, Claude đánh dấu và làm tiếp phần sau.

1. Thử app trên điện thoại theo tài liệu 08: học 3 bài có bấm giờ, ôn tập, bài ôn chủ đề, kiểm tra cuối cấp, gửi một báo lỗi, mở trang xem nội dung.
2. Nghe duyệt âm thanh ở Quản trị > Âm thanh: 26 chữ cái, số 0-20, khoảng 10 câu mỗi chủ đề, cả hai giọng.
3. Cấp khóa API của một hãng khác Anthropic (ví dụ Gemini) để kiểm tra chéo nội dung: tự dán vào `.env.local`, không gửi qua khung chat.
4. Tạo lại file `.env.local` trên máy đang làm việc theo `.env.example` (kết nối database, tài khoản thử): thiếu file này thì không xuất bản được bài mới và không chạy được kiểm thử luồng.
5. Dọn dẹp: đổi mật khẩu database, xóa file client secret trong thư mục Downloads, xử lý project Google Cloud thừa.
6. Đọc lại trang chính sách quyền riêng tư.

## Giai đoạn 1: hoàn thiện cấp Khởi động

Số trong ngoặc là số việc ở tài liệu 04.

- [x] Gỡ cài đặt "số thẻ mới mỗi ngày" không có tác dụng (2) — 2026-11-23
- [x] Trang lỗi và trang không tìm thấy (9) — 2026-11-24
- [x] Kiểm thử luồng chính trên trình duyệt (10) — 2026-11-24
- [x] Cập nhật tài liệu 01, 03, 06, README (13) — 2026-11-24
- [x] Bước kiểm tra trạng thái triển khai sau mỗi lần đẩy mã (14) — 2026-11-24
- [x] Đáp án nhiễu không còn lấy từ bài chữ cái (15) — 2026-11-24
- [x] Đối chiếu phiên âm với cách đọc giọng Mỹ (4) — 2026-11-24, sửa 30 từ
- [~] Chia phiên từ vựng thành phiên ngắn (1) — chờ bạn bấm giờ 3 bài
- [~] Nghe duyệt âm thanh (5) — công cụ đã có, chờ bạn nghe và đánh dấu; file sai sẽ được sinh lại
- [~] Bài ôn cuối chủ đề và kiểm tra cuối cấp (6) — chờ bạn làm thử trên bản thật
- [~] Nút báo lỗi nội dung (7) — chờ bạn gửi thử một báo lỗi
- [~] Trang xem nội dung bài cho quản trị (8) — chờ bạn mở thử
- [~] Kiểm chứng mọi màn hình trên điện thoại (11) — chờ bạn làm theo tài liệu 08
- [ ] Kiểm tra chéo nội dung 24 bài bằng model khác hãng (3) — đã đối chiếu với Cambridge Starters và Tatoeba ngày 2026-11-24, không thấy lỗi; phần chính chờ khóa API
- [ ] Dọn dẹp tài khoản thử và bí mật (12) — phần lớn cần bạn thao tác; tài khoản thử xóa sau cùng vì kiểm thử đang dùng

Điều kiện đóng giai đoạn: mọi dòng trên là `[x]`, và bạn đã học hết cấp Khởi động trên bản thật.

## Giai đoạn 1B: luyện nói và chấm phát âm

**Hoãn theo quyết định 2026-11-24 của chủ dự án: ưu tiên làm bài học trước.** Các bước dưới đây giữ nguyên để làm sau. Khi quay lại cần chọn dịch vụ chấm, chưa quyết. Azure đã từ chối cho chủ dự án đăng ký ngày 2026-11-24, nên bước 1 bên dưới phải đổi theo phương án được chọn; các phương án còn lại ở tài liệu 04, mục Quyết định còn mở.

Quyết định 2026-11-24: dùng Azure Pronunciation Assessment để chấm tới từng âm. Phạm vi của giai đoạn này là từ và câu của cấp Khởi động; các cấp sau dùng lại.

Điều đã biết và chưa biết (tra ngày 2026-11-24):

- Mỗi lần chấm nhận tối đa 30 giây âm thanh, trả về điểm từng từ, từng âm tiết, từng âm, cùng độ trôi chảy.
- Giá: tính như chuyển giọng nói thành chữ. Một câu trả lời trên diễn đàn Microsoft nêu khoảng 1,32 USD mỗi giờ âm thanh và 5 giờ miễn phí mỗi tháng ở gói F0. **Chưa xác nhận được trên trang giá chính thức**; nếu đúng thì một người học dùng không hết phần miễn phí (5 giờ là khoảng 3.000 câu 6 giây).
- Có báo cáo của người dùng rằng điểm từng âm đôi khi thiếu chính xác. Vì vậy app sẽ ghi rõ đây là đánh giá của máy, và luôn cho nghe lại bản ghi cạnh giọng mẫu.

Các bước:

- [ ] 1. Bạn tạo tài nguyên Azure Speech (gói miễn phí F0), dán khóa và vùng vào `.env.local`
- [ ] 2. Xác nhận trên tài khoản thật: giá, mức miễn phí, định dạng âm thanh được nhận; gửi thử một file ghi âm và đọc kết quả
- [ ] 3. Thử ghi âm trên iPhone và Android thật: trình duyệt cho ra định dạng gì, có cần đổi sang WAV trước khi gửi không
- [ ] 4. Viết thiết kế vào tài liệu 03: luồng ghi âm, máy chủ gọi Azure (khóa không xuống trình duyệt), giới hạn số lần mỗi ngày, không lưu bản ghi âm, cách tính đạt hay chưa đạt
- [ ] 5. Migration: bảng lưu kết quả từng lần nói (điểm tổng, điểm từng từ, âm yếu) và đếm lượt dùng; thử trên dữ liệu giống thật
- [ ] 6. Màn hình luyện nói một từ hoặc một câu: nghe mẫu, ghi âm, xem điểm, từ và âm sai được tô màu, nghe lại bản ghi của mình
- [ ] 7. Thêm phiên "Luyện nói" vào mỗi bài của cấp Khởi động và xuất bản lại 24 bài
- [ ] 8. Âm bạn hay đọc sai được gom lại thành danh sách luyện riêng
- [ ] 9. Xử lý khi không dùng được: không cấp quyền micro, mất mạng, hết lượt, Azure lỗi
- [ ] 10. Kiểm thử tự động cho phần tính điểm và phân quyền; cập nhật chính sách quyền riêng tư (giọng nói được gửi tới Microsoft)
- [ ] 11. Bạn thử trên điện thoại: 10 từ và 5 câu, cho biết điểm có khớp cảm nhận không

Bước 2 và 3 quyết định cách làm các bước sau, nên không viết mã giao diện trước khi xong hai bước đó.

## Giai đoạn 2: ba nhánh và cấp A1

Thứ tự xếp lại ngày 2026-11-24 để có bài học mới sớm nhất: bài từ vựng chủ đề của cấp A1 dùng lại nguyên dạng bài đang có, nên soạn và xuất bản được trước khi làm ba nhánh và bài ngữ pháp.

Đợt 1, bài học dùng dạng bài đang có:

- [x] Lập danh sách từ và thứ tự ngữ pháp cấp A1 theo chương trình chuẩn (Cambridge A1 Movers, CEFR-J); chia thành chủ đề và bài — 2026-11-24, `tools/content/syllabus/english-a1.json`: 21 chủ đề, 84 bài, 544 từ mới, cộng dồn 688; kiểm bằng `node tools/content/syllabus-check.mjs`. Migration 015 đưa 21 chủ đề vào database
- [x] Đạt kiểm tra cuối cấp thì mở cấp sau; bài mới xuất bản sau bài cuối đã học không còn bị khóa — 2026-11-24 (kéo lên từ đợt 2 vì đã có A1)
- [ ] Thiết kế ba nhánh (Ngữ pháp, Từ vựng chủ đề, Từ vựng theo cấp CEFR) và viết lại tài liệu 02
- [ ] Công cụ kiểm tra chéo chạy tự động cho mọi bài mới (cần khóa API hãng khác; cũng đóng việc số 3 của giai đoạn 1)
- [ ] Soạn, kiểm tra, sinh âm thanh và xuất bản các bài từ vựng chủ đề cấp A1, từng chủ đề một. Đã xuất bản (chưa kiểm tra chéo, chưa nghe duyệt âm thanh):
  - [~] Chủ đề 1 Giới thiệu bản thân, 4 bài + bài ôn, 30 từ — 2026-11-24, chờ bạn học thử
  - [ ] Chủ đề 2-21

Đợt 2, dạng bài mới:

- [ ] Migration và trang Lộ trình cho ba nhánh; chuyển các bài hiện có vào nhánh Từ vựng chủ đề
- [ ] Loại bài lý thuyết ngữ pháp và các dạng bài tập ngữ pháp (điền dạng đúng, sửa lỗi, sắp xếp câu)
- [ ] Tách các điểm ngữ pháp của cấp Khởi động thành bài riêng; soạn bài ngữ pháp cấp A1
- [ ] Kỹ năng đọc: câu và đoạn ngắn, trắc nghiệm, ghép nối
- [ ] Kiểm tra đầu vào (phần mở cấp sau bằng kiểm tra cuối cấp đã làm ở đợt 1)
- [ ] Kiểm tra cuối cấp A1

## Giai đoạn 3: cấp A2, viết và nói

- [ ] Viết câu và đoạn ngắn, AI sửa lỗi; đo chi phí AI
- [ ] Nói theo gợi ý và trả lời câu hỏi ngắn (dùng lại phần chấm phát âm của 1B)
- [ ] Nghe hội thoại ngắn và trả lời; thêm giọng Anh
- [ ] Dạng bài điền chỗ trống, True/False; đọc đoạn 100-150 từ
- [ ] Trang tiến độ theo kỹ năng và theo band
- [ ] Soạn và xuất bản trọn cấp A2 (vốn từ cộng dồn 1.500)
- [ ] Kiểm tra cuối cấp A2

## Giai đoạn 4: thử nghiệm kín

- [ ] Project Supabase chính thức tách khỏi thử nghiệm
- [ ] Nhắc học và dùng khi mất mạng
- [ ] Giám sát lỗi và ghi sự kiện để tính các chỉ số ở tài liệu 01
- [ ] 10-30 người dùng thử; có số liệu quay lại ngày 7 và ngày 30

## Giai đoạn 5: cấp B1 và kỹ năng thi

- [ ] Nhánh Kỹ năng thi; đủ các dạng câu hỏi Listening và Reading
- [ ] Writing Task 1 và Task 2 dạng rút gọn, AI nhận xét theo bốn tiêu chí công khai
- [ ] Speaking Part 1 và Part 2
- [ ] Từ vựng học thuật (NAWL, AKL); nguồn giọng Úc
- [ ] Soạn và xuất bản trọn cấp B1 (vốn từ cộng dồn 2.750)

## Giai đoạn 6: cấp B2 và đề thi thử

- [ ] Bài đọc và bài nghe dài như đề thật
- [ ] Task 1, Task 2 đầy đủ; Speaking đủ ba phần
- [ ] Đề thi thử tính giờ và ước lượng band
- [ ] Soạn và xuất bản trọn cấp B2 (vốn từ cộng dồn 4.000)

## Giai đoạn 7 và 8

- [ ] Ra mắt công khai: trang giới thiệu, điều khoản, thu phí nếu cần
- [ ] Phần luyện định dạng TOEFL; ngôn ngữ đích thứ hai

Các giai đoạn từ 2 trở đi mới ở mức việc lớn. Mỗi giai đoạn sẽ được chia thành các bước nhỏ như giai đoạn 1B khi tới lượt, sau bước thiết kế.
