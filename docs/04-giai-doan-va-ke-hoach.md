# 04. Giai đoạn và kế hoạch

Trạng thái: bản nháp v1, chờ duyệt. Ngày: 2026-11-23.

Thời lượng dưới đây là ước lượng với việc bạn làm toàn thời gian (đã chốt 2026-11-23). Thời gian xây tính năng ngắn, nhưng các giai đoạn 1-3 còn bị giới hạn bởi thời gian dùng thật để kiểm chứng (14 ngày học liên tục, 4 tuần thử nghiệm), nên không rút ngắn hơn được bằng cách làm nhanh hơn. Trong lúc chờ kiểm chứng, làm trước nội dung và tính năng của giai đoạn sau.

## Tổng quan

| Giai đoạn | Tên | Người dùng | Thời lượng | Kết quả chính |
|---|---|---|---|---|
| 0 | Nền móng | Chưa có | 3-4 ngày | Tài liệu được duyệt, schema, thiết kế màn hình, 2 chủ đề mẫu |
| 1 | Bản cá nhân | Mình bạn | 1 tuần xây, 2 tuần dùng thử | Học được từ vựng và nghe hằng ngày với cấp Pre-A1 |
| 2 | Đủ 4 kỹ năng | Mình bạn | 1-2 tuần xây, 2 tuần dùng thử | Thêm nói, viết, hội thoại AI, công cụ soạn nội dung |
| 3 | Thử nghiệm kín | 10-30 người | 1-2 tuần xây, 4 tuần thử nghiệm | Sẵn sàng cho người lạ dùng, đủ nội dung A1 |
| 4 | Ra mắt công khai | Công chúng | 2 tuần rồi liên tục | Trang giới thiệu, pháp lý, giám sát, nội dung A2 |
| 5 | Ngôn ngữ đích thứ hai | Mở rộng | Lập sau | Người Việt học một ngôn ngữ khác trên cùng nền tảng |

Thời gian dùng thử của giai đoạn 1 và thời gian xây của giai đoạn 2 chạy chồng lên nhau, nên tổng thời gian từ bắt đầu tới hết thử nghiệm kín vào khoảng 10-12 tuần.

Nguyên tắc: không sang giai đoạn sau khi chưa đạt điều kiện qua giai đoạn. Bạn dùng app hằng ngày từ giai đoạn 1, nên mỗi giai đoạn đều được kiểm chứng bằng việc học thật.

## Giai đoạn 0: Nền móng

Việc cần làm:

- Duyệt 4 tài liệu, chốt các quyết định ở mục "Quyết định còn mở".
- Đặt tên sản phẩm, chọn phong cách giao diện.
- Vẽ sơ đồ màn hình cho luồng chính: trang chủ, trình phát phiên học, ôn tập.
- Viết file migration cho toàn bộ mô hình dữ liệu ở tài liệu 03 (kể cả các bảng đa ngôn ngữ).
- Soạn và kiểm tra chéo 2 chủ đề đầu của Pre-A1 để kiểm chứng mẫu bài học.
- Chuẩn bị danh sách từ và nguồn phiên âm, kiểm tra giấy phép.

Điều kiện qua giai đoạn: tài liệu được duyệt; 2 chủ đề mẫu qua kiểm tra tự động và kiểm tra chéo; schema chạy được trên Supabase thử nghiệm.

## Giai đoạn 1: Bản cá nhân

Việc cần làm:

- Đăng nhập, hồ sơ, ghi danh khóa học.
- Trang chủ với nút "Tôi có 2 phút", danh sách phiên trong ngày.
- Trình phát phiên học chạy theo dữ liệu bài tập, với các dạng của phiên từ vựng và phiên nghe.
- Ôn tập lặp lại ngắt quãng, có test cho thuật toán.
- Giao diện dùng next-intl ngay từ đầu, dù mới có tiếng Việt.
- Nội dung: đủ 6 chủ đề Pre-A1.

Điều kiện qua giai đoạn: bạn học 14 ngày liên tục mà không gặp lỗi chặn; học hết ít nhất 3 chủ đề; lịch ôn hoạt động đúng (thẻ đến hạn xuất hiện, thẻ sai quay lại sớm).

## Giai đoạn 2: Đủ 4 kỹ năng

Việc cần làm:

- Phiên viết với AI sửa bài và giải thích song ngữ.
- Phiên nói: nhắc lại theo mẫu, so chữ nhận diện, hội thoại nhập vai.
- Lỗi sai ở mọi phiên tự thành thẻ ôn.
- Lưu nhanh: dán văn bản, AI tách từ chưa học.
- Trang tiến độ theo từng kỹ năng.
- Công cụ quản trị: sinh nháp bài học, kiểm tra tự động, kiểm tra chéo, xuất bản.
- Trần lượt gọi AI và ghi nhận chi phí.
- Nội dung: 10 chủ đề đầu của A1.

Điều kiện qua giai đoạn: bạn hoàn thành đủ 4 phiên mỗi ngày trong 14 ngày; có số đo chi phí AI cho một người dùng một tháng; soạn một chủ đề mới bằng công cụ quản trị mất dưới 1 giờ.

## Giai đoạn 3: Thử nghiệm kín

Việc cần làm:

- Màn hình chào mừng, kiểm tra đầu vào, hướng dẫn cài lên điện thoại.
- PWA và nhắc học bằng thông báo.
- File âm thanh sinh sẵn thay cho giọng trình duyệt.
- Nút báo lỗi nội dung và hàng đợi xử lý.
- Ghi lỗi, sự kiện sản phẩm, trang số liệu quản trị.
- Toàn bộ nội dung Pre-A1 và A1 qua kiểm tra chéo bằng Claude; trang giới thiệu và trong app ghi rõ nội dung do AI soạn và kiểm tra, chưa có giáo viên duyệt.
- Rà soát bảo mật: phân quyền dữ liệu, giới hạn tần suất, kiểm tra đầu vào.
- Nội dung: đủ 20 chủ đề A1, bài kiểm tra cuối cấp.

Điều kiện qua giai đoạn: ít nhất 10 người dùng thử trong 4 tuần; có số liệu quay lại ngày 7 và ngày 30; không còn lỗi nghiêm trọng đang mở; biết chi phí trên mỗi người dùng hoạt động; nội dung A1 đã qua kiểm tra chéo; mọi báo lỗi nội dung từ người thử nghiệm đã được xử lý.

## Giai đoạn 4: Ra mắt công khai

Việc cần làm:

- Trang giới thiệu, tối ưu tìm kiếm, tên miền.
- Chính sách quyền riêng tư, điều khoản, xóa tài khoản.
- Miễn phí hoàn toàn. Mô-đun gói dịch vụ đã có sẵn trong schema nhưng chỉ có gói miễn phí; cổng thanh toán chỉ làm khi bạn quyết định thu phí.
- Chống lạm dụng: xác minh email, trần AI mỗi ngày cho mỗi người.
- Kế hoạch sao lưu và khôi phục dữ liệu.
- Nội dung: phát hành dần A2 theo từng mô-đun.

Điều kiện qua giai đoạn: hệ thống ổn định 4 tuần với người dùng thật; chi phí mỗi người dùng nằm trong ngưỡng đã đặt; có quy trình phát hành nội dung đều đặn.

## Giai đoạn 5: Ngôn ngữ đích thứ hai

Hướng đã chốt: người Việt học một ngôn ngữ khác. Chưa chọn ngôn ngữ nào; trước giai đoạn này chỉ cần nền tảng sẵn sàng mở rộng.

Việc cần làm:

- Chọn ngôn ngữ đích, khung trình độ của nó, nguồn từ vựng và phiên âm.
- Soạn lộ trình mới theo quy trình ở tài liệu 02; thêm cấp học chữ nếu ngôn ngữ đó không dùng chữ Latin.
- Viết bản cài đặt xử lý ngôn ngữ (tách từ, chuẩn hóa, so sánh đáp án, hiển thị phiên âm) cho ngôn ngữ mới.
- Sửa mọi chỗ còn ngầm định tiếng Anh lộ ra trong quá trình này.

Điều kiện qua giai đoạn: thêm được ngôn ngữ mới mà không đổi cấu trúc dữ liệu và không sửa code của trình phát phiên học.

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Nội dung AI sinh có lỗi mà bạn không tự phát hiện được, và không có người duyệt | Cao | Kiểm tra tự động theo CEFR-J và ipa-dict, kiểm tra chéo bằng Claude, bài tập do code sinh chứ không do AI viết, nút báo lỗi trên mọi câu, ghi rõ cho người dùng là nội dung do AI soạn. Rủi ro còn lại: lỗi cả hai model cùng bỏ sót vẫn có thể lọt |
| Mất động lực giữa chừng, dự án dở dang | Cao | Giai đoạn 1 nhỏ, dùng được thật trong 3-4 tuần; bạn là người dùng hằng ngày |
| Phạm vi phình ra | Cao | Điều kiện qua giai đoạn cố định; ý tưởng mới ghi vào danh sách chờ, không chen vào giai đoạn đang làm |
| Giọng đọc và nhận diện giọng nói của trình duyệt không đồng đều | Trung bình | File âm thanh sinh sẵn từ giai đoạn 3; phiên nói có phương án thay thế |
| Chi phí AI tăng khi mở công khai | Trung bình | Nội dung dùng chung, trần lượt gọi, đo chi phí từ giai đoạn 2 |
| Code v0 sinh ra khó bảo trì | Trung bình | Logic quan trọng nằm trong `lib/` có test; v0 chỉ lo giao diện |
| Giấy phép danh sách từ | Thấp | Kiểm tra điều khoản ở giai đoạn 0, ghi nguồn |
| Người dùng không quay lại | Trung bình | Nhắc học, chuỗi ngày, phiên rất ngắn; đo ở giai đoạn 3 trước khi đầu tư ra mắt |

## Quyết định đã chốt (2026-11-23)

| # | Quyết định | Kết quả |
|---|---|---|
| 1 | Quỹ thời gian | Toàn thời gian |
| 2 | Ai duyệt nội dung tiếng Anh | Không có người duyệt; chỉ dùng AI kiểm tra chéo |
| 3 | Thu phí | Miễn phí hoàn toàn cho tới khi chủ dự án báo cần thu phí; phần thu phí làm thành mô-đun riêng |
| 4 | Hướng mở rộng ngôn ngữ | Người Việt học ngôn ngữ khác, bắt đầu bằng tiếng Anh; chỉ cần nền tảng có khả năng mở rộng |
| 5 | Danh sách chủ đề Pre-A1 và A1 | Duyệt như tài liệu 02 |
| 6 | Model kiểm tra chéo | Claude (cần một khóa API Anthropic) |

## Quyết định còn mở

| # | Quyết định | Khuyến nghị |
|---|---|---|
| 1 | Tên sản phẩm và tên miền | Chọn tên không gắn với "English" để còn mở rộng |
| 2 | Có làm app native không | Chưa, dùng PWA đến hết giai đoạn 4 |
| 3 | Dịch vụ sinh âm thanh và chấm phát âm | Đánh giá ở đầu giai đoạn 3, so sánh chất lượng giọng và giá |

## Tiến độ giai đoạn 0

| Việc | Trạng thái |
|---|---|
| Tài liệu 01-05 | Xong bản nháp, đã cập nhật theo các quyết định |
| Đọc mã nguồn tham khảo (freelingo, LibreLingo) | Xong, bài học ghi ở tài liệu 03 mục 9 |
| File migration `scripts/001` đến `008` | Xong, đã chạy thử trên Postgres cục bộ kèm kiểm tra phân quyền; chưa chạy lên Supabase vì chưa có project |
| Tên sản phẩm | LisB. Chưa kiểm tra tên miền và nhãn hiệu |
| Kho mã | github.com/lecuongg242-cloud/Lisb |
| Soạn 2 chủ đề mẫu của Pre-A1 | Xong: "Chào hỏi và tạm biệt", "Tên, tuổi, quê quán" (8 bài, 40 câu, 53 từ mới). Do Claude soạn, qua kiểm tra tự động, chưa qua kiểm tra chéo bởi model thứ hai |
| Công cụ kiểm tra nội dung và sinh SQL | Xong (`tools/content/build-content.mjs`) |
| Project Supabase thử nghiệm | Đã có (tyovmslxlrcvihbqxttq, vùng ap-northeast-1). Đã chạy migration 001-008 và nạp 2 chủ đề mẫu ngày 2026-11-23 |
| Project Supabase chính thức | Chưa, tạo trước giai đoạn 3 |
| Prompt v0 cho giai đoạn 1 | Xong (`v0-prompt.md`), viết theo schema hiện tại |
