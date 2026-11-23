# 01. Tầm nhìn sản phẩm

Trạng thái: bản nháp v1, chờ duyệt. Ngày: 2026-11-23.

> Cập nhật 2026-11-23: mục tiêu sản phẩm đã đổi thành **đưa người Việt từ số 0 tới IELTS 6.5**, lộ trình chia ba nhánh. Chi tiết ở tài liệu 07; phần "giao tiếp hằng ngày" bên dưới chỉ còn đúng cho chặng Nền tảng. Tài liệu này sẽ được cập nhật đầy đủ trong giai đoạn 1 (việc số 13 ở tài liệu 04).

## 1. Sản phẩm là gì

Một web app học ngoại ngữ cho người bắt đầu từ số 0, học bằng nhiều phiên rất ngắn (2-3 phút) trong ngày. Khóa đầu tiên là tiếng Anh giao tiếp hằng ngày cho người Việt. Nền tảng được thiết kế ngay từ đầu để thêm ngôn ngữ khác mà không phải viết lại.

## 2. Người dùng mục tiêu

| Nhóm | Mô tả | Thời điểm phục vụ |
|---|---|---|
| Người dùng số 1 | Chính bạn: người Việt, đi làm, trình độ gần như số 0, học tranh thủ | Giai đoạn 1-2 |
| Nhóm thử nghiệm | 10-30 người quen có hoàn cảnh tương tự | Giai đoạn 3 |
| Công chúng | Người Việt đi làm hoặc sinh viên mất gốc tiếng Anh | Giai đoạn 4 |
| Mở rộng | Người học ngôn ngữ khác, hoặc người nói ngôn ngữ khác học tiếng Anh | Giai đoạn 5 |

## 3. Vấn đề cần giải quyết

- Người mất gốc không biết bắt đầu từ đâu, các app phổ biến thường dạy từ rời rạc, thiếu giải thích bằng tiếng mẹ đẻ.
- Người đi làm không có 30-60 phút liền mạch mỗi ngày.
- Học từ xong quên, vì không ôn đúng lúc và không dùng lại từ trong nghe, nói, viết.
- Không có ai sửa lỗi khi tự nói và tự viết.

## 4. Nguyên tắc sản phẩm

1. **Một câu, bốn lần gặp.** Cùng một nhóm câu và từ được luyện qua 4 kỹ năng: từ vựng, nghe, nói, viết. Không có tính năng rời nhau.
2. **Phiên 2-3 phút.** Mọi hoạt động chia nhỏ được, dừng giữa chừng không mất tiến độ.
3. **Mở app là học.** Nút "Tôi có 2 phút" tự chọn việc đáng làm nhất, người học không phải quyết định.
4. **Lỗi là tài sản.** Mọi lỗi sai tự động quay lại trong lịch ôn.
5. **Giải thích song ngữ.** Tiếng đích đơn giản trước, tiếng mẹ đẻ ngay dưới.
6. **Nội dung có kiểm soát.** Bài học theo khung chuẩn, chỉ dùng từ đã học cộng từ mới của bài, được duyệt trước khi xuất bản.
7. **Đa ngôn ngữ từ thiết kế.** Không có chỗ nào trong dữ liệu hay code mặc định "tiếng Anh" hoặc "tiếng Việt".

## 5. Chiến lược đa ngôn ngữ

Có hai trục độc lập:

- **Ngôn ngữ đích** (ngôn ngữ đang học): bắt đầu với tiếng Anh. Sau này có thể là Nhật, Trung, Hàn...
- **Ngôn ngữ nguồn** (ngôn ngữ dùng để giải thích và hiển thị giao diện): bắt đầu với tiếng Việt. Sau này có thể là Anh, Thái, Indonesia...

Một **khóa học** gắn với một ngôn ngữ đích và có lộ trình riêng, vì mỗi ngôn ngữ có khung trình độ và đặc thù riêng (tiếng Nhật cần học chữ, tiếng Trung cần thanh điệu). Phần **giải thích và bản dịch** tách thành lớp riêng theo ngôn ngữ nguồn, nên thêm một ngôn ngữ nguồn mới chỉ cần dịch, không cần soạn lại lộ trình.

| Hướng mở rộng | Công việc | Độ khó |
|---|---|---|
| Thêm ngôn ngữ nguồn (ví dụ người Thái học tiếng Anh) | Dịch giao diện, dịch lớp giải thích, chỉnh ghi chú phát âm theo lỗi đặc thù | Thấp đến trung bình |
| Thêm ngôn ngữ đích (ví dụ người Việt học tiếng Nhật) | Soạn lộ trình mới, giọng đọc, cách tách từ, hệ chữ và phiên âm | Cao |

Đã chốt (2026-11-23): hướng mở rộng là **ngôn ngữ đích** mới cho người Việt, bắt đầu bằng tiếng Anh. Chưa chọn ngôn ngữ thứ hai; yêu cầu hiện tại chỉ là nền tảng có khả năng mở rộng. Lớp dịch tách riêng vẫn được giữ vì gần như không tốn thêm công và để ngỏ hướng còn lại. Chi tiết kỹ thuật ở tài liệu 03.

Thu phí: miễn phí hoàn toàn cho tới khi chủ dự án quyết định khác. Phần gói dịch vụ là một mô-đun riêng, có sẵn trong schema với một gói miễn phí duy nhất.

## 6. Phạm vi

Trong phạm vi (đến hết giai đoạn 4):

- Lộ trình tiếng Anh từ Pre-A1 đến hết A2 theo khung CEFR.
- 4 loại phiên học, ôn tập lặp lại ngắt quãng, sửa bài viết và hội thoại bằng AI.
- Web app cài được lên điện thoại (PWA), có nhắc học.
- Công cụ quản trị nội dung.

Ngoài phạm vi (chưa làm, có thể xét lại sau):

- App native trên App Store và Google Play.
- Luyện thi chứng chỉ (IELTS, TOEIC).
- Lớp học trực tiếp, giáo viên thật, tính năng mạng xã hội.
- Nội dung cho trẻ em dưới 13 tuổi (kéo theo yêu cầu pháp lý riêng về dữ liệu trẻ em).

## 7. Chỉ số thành công

| Chỉ số | Ý nghĩa | Mục tiêu sơ bộ |
|---|---|---|
| Số phiên mỗi ngày trên mỗi người dùng hoạt động | Thói quen học tranh thủ có hình thành không | Từ 3 trở lên |
| Tỷ lệ quay lại ngày 7 và ngày 30 | App có giữ chân không | Ngày 7: 30%, ngày 30: 15% |
| Tỷ lệ hoàn thành bài học đã bắt đầu | Bài có vừa sức không | Trên 80% |
| Độ chính xác khi ôn thẻ đến hạn | Lịch ôn có hiệu quả không | 80-90% |
| Chi phí AI trên mỗi người dùng hoạt động mỗi tháng | Có mở công khai được không | Đo ở giai đoạn 3 rồi mới đặt ngưỡng |

Các mục tiêu trên là điểm xuất phát để so sánh, sẽ chỉnh lại sau khi có số liệu thật ở giai đoạn 3.

## 8. Bộ tài liệu

| Tài liệu | Nội dung |
|---|---|
| 01. Tầm nhìn sản phẩm | Tài liệu này |
| 02. Lộ trình bài học | Phương pháp, khung trình độ, danh sách chủ đề, cấu trúc bài, quy trình soạn và duyệt nội dung |
| 03. Kiến trúc kỹ thuật | Công nghệ, mô hình dữ liệu đa ngôn ngữ, lớp AI, âm thanh, bảo mật |
| 04. Giai đoạn và kế hoạch | Các giai đoạn, sản phẩm bàn giao, điều kiện qua giai đoạn, rủi ro, quyết định còn mở |
| 05. Tài nguyên và mã nguồn tham khảo | Thư viện, dữ liệu mở, tài liệu lộ trình, dự án mã nguồn mở tương tự, kèm ghi chú giấy phép |
| 06. Triển khai | Đưa app lên mạng, cấu hình Supabase, cài lên điện thoại, việc cần làm trước khi cho người khác dùng |
| 07. Định hướng IELTS | Nghiên cứu về IELTS và TOEFL, mục tiêu từng cấp theo band, cấu trúc ba nhánh, kỹ năng và dạng bài theo thời gian |
