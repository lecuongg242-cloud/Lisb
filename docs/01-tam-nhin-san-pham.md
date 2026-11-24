# 01. Tầm nhìn sản phẩm

Trạng thái: bản v2, viết lại ngày 2026-11-24 theo định hướng IELTS (tài liệu 07). Chờ duyệt.

## 1. Sản phẩm là gì

LisB là một web app đưa người Việt từ số 0 tới IELTS Academic 6.5, học bằng nhiều phiên rất ngắn (2-3 phút) trong ngày. Nền tảng được thiết kế ngay từ đầu để thêm ngôn ngữ khác mà không phải viết lại.

Quãng đường chia làm hai chặng:

| Chặng | Cấp | Trọng tâm |
|---|---|---|
| Nền tảng | Khởi động (A0), A1, A2 | Xây vốn từ, ngữ pháp, nghe và phát âm. Chưa luyện đề |
| Luyện thi | B1, B2 | Tiếp tục xây ngôn ngữ, cộng thêm kỹ năng làm bài và đề thi thử |

Mục tiêu từng cấp, số giờ học và cơ sở của các con số nằm ở tài liệu 07.

## 2. Người dùng mục tiêu

| Nhóm | Mô tả | Thời điểm phục vụ |
|---|---|---|
| Người dùng số 1 | Chủ dự án: người Việt, đi làm, trình độ gần như số 0, học tranh thủ | Giai đoạn 1-3 |
| Nhóm thử nghiệm | 10-30 người quen có hoàn cảnh tương tự | Giai đoạn 4 |
| Công chúng | Người Việt đi làm hoặc sinh viên mất gốc, cần điểm IELTS | Giai đoạn 7 |
| Mở rộng | Người Việt học ngôn ngữ khác; người cần định dạng TOEFL | Giai đoạn 8 |

Số giai đoạn theo tài liệu 04.

## 3. Vấn đề cần giải quyết

- Người mất gốc không biết bắt đầu từ đâu. Tài liệu luyện IELTS giả định người học đã ở khoảng B1; các app cho người mới thì dừng ở giao tiếp cơ bản. Ở giữa không có một đường đi liền mạch.
- Người đi làm không có 30-60 phút liền mạch mỗi ngày.
- Học từ xong quên, vì không ôn đúng lúc và không gặp lại từ trong nghe, đọc, nói, viết.
- Không có ai sửa lỗi khi tự nói và tự viết.
- Quãng đường tới 6.5 dài 500-600 giờ học. Người học không biết mình đang ở đâu thì bỏ giữa chừng.

## 4. Nguyên tắc sản phẩm

1. **Một câu, nhiều lần gặp.** Cùng một nhóm từ và câu được luyện qua nhiều kỹ năng. Không có tính năng rời nhau.
2. **Phiên 2-3 phút, học liền nhiều phiên.** Mọi hoạt động chia nhỏ được, nhưng app khuyến khích học nối phiên, vì đích ở xa.
3. **Mở app là học.** Nút "Tôi có 2 phút" tự chọn việc đáng làm nhất, người học không phải quyết định.
4. **Lỗi là tài sản.** Từ và câu trả lời sai quay lại sớm trong lịch ôn.
5. **Giải thích song ngữ.** Tiếng đích đơn giản trước, tiếng mẹ đẻ ngay dưới.
6. **Nội dung có kiểm soát.** Bài học theo khung chuẩn, chỉ dùng từ đã học cộng từ mới của bài, qua kiểm tra trước khi xuất bản.
7. **Nói thật về quãng đường.** Mỗi cấp ghi rõ nó tương ứng band nào và còn cách đích bao xa. Không hứa mức điểm; band do app đưa ra luôn được ghi là ước lượng.
8. **Đa ngôn ngữ từ thiết kế.** Không có chỗ nào trong dữ liệu hay code mặc định "tiếng Anh" hoặc "tiếng Việt".

## 5. Chiến lược đa ngôn ngữ

Có hai trục độc lập:

- **Ngôn ngữ đích** (ngôn ngữ đang học): bắt đầu với tiếng Anh. Sau này có thể là Nhật, Trung, Hàn...
- **Ngôn ngữ nguồn** (ngôn ngữ dùng để giải thích và hiển thị giao diện): bắt đầu với tiếng Việt.

Một **khóa học** gắn với một ngôn ngữ đích và có lộ trình riêng, vì mỗi ngôn ngữ có khung trình độ và đặc thù riêng (tiếng Nhật cần học chữ, tiếng Trung cần thanh điệu). Phần **giải thích và bản dịch** tách thành lớp riêng theo ngôn ngữ nguồn, nên thêm một ngôn ngữ nguồn mới chỉ cần dịch, không cần soạn lại lộ trình.

| Hướng mở rộng | Công việc | Độ khó |
|---|---|---|
| Thêm ngôn ngữ nguồn (ví dụ người Thái học tiếng Anh) | Dịch giao diện, dịch lớp giải thích, chỉnh ghi chú phát âm theo lỗi đặc thù | Thấp đến trung bình |
| Thêm ngôn ngữ đích (ví dụ người Việt học tiếng Nhật) | Soạn lộ trình mới, giọng đọc, cách tách từ, hệ chữ và phiên âm | Cao |

Đã chốt (2026-11-23): hướng mở rộng là **ngôn ngữ đích** mới cho người Việt. Chưa chọn ngôn ngữ thứ hai; yêu cầu hiện tại chỉ là nền tảng có khả năng mở rộng. Phần luyện thi (dạng câu hỏi, tiêu chí chấm, ước lượng band) gắn với từng bài thi, nên là phần riêng của khóa tiếng Anh, không thuộc nền tảng chung. Chi tiết kỹ thuật ở tài liệu 03.

Thu phí: miễn phí hoàn toàn cho tới khi chủ dự án quyết định khác. Phần gói dịch vụ là một mô-đun riêng, có sẵn trong schema với một gói miễn phí duy nhất.

## 6. Phạm vi

Trong phạm vi (đến hết giai đoạn 7):

- Lộ trình tiếng Anh từ Khởi động đến hết B2, mỗi cấp ba nhánh (Ngữ pháp, Từ vựng chủ đề, Từ vựng theo cấp CEFR), thêm nhánh Kỹ năng thi từ B1.
- Đủ bốn kỹ năng nghe, đọc, viết, nói; ôn tập lặp lại ngắt quãng; AI sửa bài viết và nhận xét bài nói.
- Kiểm tra đầu vào, kiểm tra cuối cấp và vượt cấp, đề thi thử theo định dạng IELTS Academic, ước lượng band.
- Web app cài được lên điện thoại (PWA), có nhắc học.
- Công cụ quản trị nội dung.

Ngoài phạm vi (chưa làm, có thể xét lại sau):

- App native trên App Store và Google Play.
- IELTS General Training, TOEIC và các chứng chỉ khác. TOEFL để giai đoạn 8.
- Mức trên 6.5 (C1 trở lên).
- Đề thi thật và nội dung sách luyện thi có bản quyền: mọi câu hỏi do dự án tự soạn theo định dạng công khai.
- Lớp học trực tiếp, giáo viên thật, tính năng mạng xã hội.
- Nội dung cho trẻ em dưới 13 tuổi (kéo theo yêu cầu pháp lý riêng về dữ liệu trẻ em).

IELTS và TOEFL là nhãn hiệu của các tổ chức sở hữu; app ghi rõ không liên kết với và không được bảo trợ bởi các tổ chức này.

## 7. Chỉ số thành công

| Chỉ số | Ý nghĩa | Mục tiêu sơ bộ |
|---|---|---|
| Số phiên mỗi ngày trên mỗi người dùng hoạt động | Thói quen học tranh thủ có hình thành không | Từ 3 trở lên |
| Số phút học mỗi ngày | Có tới đích trong thời gian chấp nhận được không (24 phút mỗi ngày là khoảng 4 năm, xem tài liệu 07) | Đo ở giai đoạn 4 rồi mới đặt ngưỡng |
| Tỷ lệ quay lại ngày 7 và ngày 30 | App có giữ chân không | Ngày 7: 30%, ngày 30: 15% |
| Tỷ lệ hoàn thành bài học đã bắt đầu | Bài có vừa sức không | Trên 80% |
| Độ chính xác khi ôn thẻ đến hạn | Lịch ôn có hiệu quả không | 80-90% |
| Tỷ lệ đạt bài kiểm tra cuối cấp ở lần đầu | Cấp học có dạy đủ để qua không | Đo ở giai đoạn 4 |
| Chi phí AI trên mỗi người dùng hoạt động mỗi tháng | Có mở công khai được không | Đo ở giai đoạn 3 rồi mới đặt ngưỡng |

Các mục tiêu trên là điểm xuất phát để so sánh, sẽ chỉnh lại sau khi có số liệu thật ở giai đoạn 4. App hiện chưa ghi sự kiện để tính các chỉ số này ngoài nhật ký phiên học và nhật ký ôn tập.

## 8. Bộ tài liệu

| Tài liệu | Nội dung |
|---|---|
| 01. Tầm nhìn sản phẩm | Tài liệu này |
| 02. Lộ trình bài học | Phương pháp, cấp Khởi động, quy trình soạn và duyệt nội dung. Bản cũ, sẽ viết lại ở đầu giai đoạn 2 cùng thiết kế ba nhánh |
| 03. Kiến trúc kỹ thuật | Công nghệ, mô hình dữ liệu, bài tập và chấm bài, âm thanh, kiểm thử; phần nào đã có và phần nào mới là dự định |
| 04. Giai đoạn và kế hoạch | Các giai đoạn, tiêu chí hoàn thành, danh sách việc dang dở, quyết định, rủi ro, sự cố |
| 05. Tài nguyên và mã nguồn tham khảo | Thư viện, dữ liệu mở, dự án mã nguồn mở tương tự, kèm ghi chú giấy phép |
| 06. Triển khai | Đưa app lên mạng, cấu hình Supabase, cài lên điện thoại, việc cần làm trước khi cho người khác dùng |
| 07. Định hướng IELTS | Nghiên cứu về IELTS và TOEFL, mục tiêu từng cấp theo band, cấu trúc ba nhánh, kỹ năng và dạng bài theo thời gian |
| 08. Kiểm tra trên thiết bị thật | Danh sách kiểm tra từng màn hình cho chủ dự án |
| 09. Bảng tiến độ | Mọi việc từ bây giờ tới đích, có ô đánh dấu xong hay chưa và việc nào đang chờ chủ dự án |
