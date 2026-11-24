# 04. Giai đoạn và kế hoạch

Trạng thái: bản v2, viết lại ngày 2026-11-23 theo định hướng IELTS (tài liệu 07). Chờ duyệt.

## Nguyên tắc làm việc

1. **Hoàn thiện rồi mới mở rộng.** Không bắt đầu giai đoạn sau khi giai đoạn trước còn việc dang dở.
2. **Mỗi hạng mục có tiêu chí hoàn thành** (mục bên dưới). Chưa đủ tiêu chí thì ghi là "đang làm", không ghi là "xong".
3. **Việc bỏ lại phải được ghi vào danh sách việc dang dở** ngay lúc bỏ lại, kèm lý do.
4. **Nghiên cứu và thiết kế trước, viết mã sau** với mọi thay đổi lớn (cấu trúc lộ trình, kỹ năng mới, dạng bài thi).
5. Mọi quyết định của chủ dự án được ghi vào bảng quyết định kèm ngày.

## Tiêu chí hoàn thành

Một hạng mục chỉ được coi là xong khi đủ các điều sau; phần nào không áp dụng thì ghi rõ lý do.

| Loại việc | Tiêu chí |
|---|---|
| Tính năng | Chạy đúng trên điện thoại và máy tính, ở cả chế độ sáng và tối; có trạng thái đang tải, trống và lỗi; logic có kiểm thử tự động; đã chạy thử trọn luồng trên bản triển khai thật; mọi cài đặt hiển thị cho người dùng đều có tác dụng thật |
| Nội dung bài học | Qua kiểm tra tự động không lỗi; qua kiểm tra chéo bằng model thứ hai; có đủ âm thanh; đã xuất bản và mở thử một bài trên bản thật |
| Âm thanh | Có file cho mọi từ và câu; một mẫu ngẫu nhiên đã được người nghe duyệt |
| Tài liệu | Phản ánh đúng hiện trạng; không còn mục mâu thuẫn với quyết định mới nhất |
| Migration | Chạy thử trên Postgres cục bộ đã có dữ liệu giống thật (nội dung, bài tập, nhật ký học), không chỉ trên database trống; chạy migration và xác nhận kết quả trước khi đẩy mã phụ thuộc vào nó |

## Các giai đoạn

| Giai đoạn | Tên | Kết quả chính | Điều kiện qua giai đoạn |
|---|---|---|---|
| 1 | Hoàn thiện cấp Khởi động | Một cấp học trọn vẹn, không còn việc dang dở | Hết danh sách "phải xong ở giai đoạn 1"; chủ dự án học hết cấp Khởi động trên bản thật |
| 2 | Ba nhánh và cấp A1 | Lộ trình ba nhánh, bài ngữ pháp có lý thuyết, kỹ năng đọc, kiểm tra đầu vào và vượt cấp, trọn cấp A1 | Trọn cấp A1 đạt tiêu chí nội dung; kiểm tra cuối cấp A1 hoạt động |
| 3 | Cấp A2 và kỹ năng tạo ra ngôn ngữ | Viết câu và đoạn có AI sửa, nói theo mẫu, nghe hiểu hội thoại, thêm giọng Anh, trang tiến độ, trọn cấp A2 | Trọn cấp A2; chi phí AI mỗi người dùng đã đo |
| 4 | Thử nghiệm kín | Project Supabase chính thức, nhắc học, giám sát lỗi, 10-30 người dùng thử | Có số liệu quay lại ngày 7 và ngày 30; không còn lỗi nghiêm trọng |
| 5 | Cấp B1 và kỹ năng thi phần 1 | Nhánh Kỹ năng thi, đủ dạng câu hỏi Listening và Reading, Writing Task 1 và 2 dạng rút gọn, Speaking Part 1 và 2, AI nhận xét theo tiêu chí công khai | Trọn cấp B1; đề luyện từng kỹ năng hoạt động |
| 6 | Cấp B2 và đề thi thử | Bài đọc và nghe dài như đề thật, đề thi thử tính giờ, ước lượng band | Trọn cấp B2; một đề thi thử đầy đủ |
| 7 | Ra mắt công khai | Trang giới thiệu, điều khoản, mô-đun thu phí nếu cần | Ổn định 4 tuần với người dùng thật |
| 8 | Mở rộng | Phần luyện định dạng TOEFL; ngôn ngữ đích thứ hai | Lập kế hoạch khi tới nơi |

Thử nghiệm kín (giai đoạn 4) có thể chạy song song với giai đoạn 5 khi cấp A2 đã xong.

Thời lượng không ghi cứng ở đây. Khối lượng lớn nhất là nội dung, và tốc độ soạn chỉ biết được sau khi quy trình soạn, kiểm tra chéo và sinh âm thanh chạy trơn ở giai đoạn 1. Ước lượng sẽ được bổ sung khi giai đoạn 1 kết thúc.

## Giai đoạn 1: hoàn thiện cấp Khởi động

Đây là giai đoạn hiện tại. Danh sách dưới đây là toàn bộ những gì đã làm dở hoặc làm chưa tới nơi, ghi nhận ngày 2026-11-23.

### Phải xong ở giai đoạn 1

| # | Việc dang dở | Hiện trạng | Tiêu chí hoàn thành |
|---|---|---|---|
| 1 | Phiên từ vựng quá dài | **Đã làm 2026-11-23, chờ đo thời gian thật.** Mỗi bài giờ gồm 4-5 phiên ngắn (học từ mới, nhớ lại từ, nghe hiểu, nghe chép), dài nhất 11 bước; có kiểm thử giới hạn độ dài; đã chạy thử trọn một phiên trên máy | Còn lại: chủ dự án học 3 bài trên bản thật và cho biết thời gian mỗi phiên |
| 2 | Cài đặt "số thẻ mới mỗi ngày" không có tác dụng | **Xong 2026-11-23.** Đã gỡ khỏi giao diện: nhịp học do số phiên mỗi ngày quyết định, và khi có từ 5 thẻ đến hạn thì trang chủ ưu tiên ôn trước. Cột trong database được giữ lại, không dùng | Đủ |
| 3 | Nội dung chưa qua kiểm tra chéo | 24 bài do một model soạn, chỉ qua kiểm tra tự động | Có công cụ kiểm tra chéo bằng model thứ hai; cả 24 bài đã chạy qua và các vấn đề được xử lý. Cần khóa API Anthropic từ chủ dự án |
| 4 | Phiên âm có chỗ không chuẩn giọng Mỹ | Lấy thẳng từ ipa-dict, ví dụ "new" ra /nju/ | Công cụ nội dung đối chiếu phiên âm với phiên âm của model giọng đọc; chỗ lệch được sửa hoặc ghi nhận |
| 5 | Âm thanh chưa được nghe duyệt | 618 file, mới nghe 24 mẫu thử | Có trang nghe duyệt cho quản trị; chủ dự án nghe hết chữ cái, số và một mẫu câu; từ đọc sai được sinh lại |
| 6 | Chưa có bài ôn cuối chủ đề và kiểm tra cuối cấp | **Đã làm 2026-11-24, chờ chủ dự án thử trên bản thật.** Bài ôn cuối chủ đề đã có cho cả 6 chủ đề: hai phần (ôn từ, ôn nghe), mỗi phần phải đúng từ 80% ở lần trả lời đầu. Bài kiểm tra cuối cấp Khởi động: 20 câu (5 chọn từ, 5 gõ từ, 5 nghe chọn câu, 5 nghe chép) rút ngẫu nhiên từ ngân hàng 264 câu trải đều 6 chủ đề; đề được rút và chấm ở database, đáp án không gửi xuống trình duyệt; đạt 80% thì cấp được ghi là hoàn thành; làm lại được nhiều lần, làm được bất cứ lúc nào nên cũng là bài vượt cấp. Có kiểm thử tự động chạy trên Postgres trong bộ nhớ (quyền truy cập, chấm điểm, quy tắc chuẩn hóa khớp với mã TypeScript). Đã chạy thử trên máy cả trường hợp đạt và không đạt, ở máy tính và điện thoại, chế độ sáng và tối | Còn lại: chủ dự án làm thử một bài ôn và bài kiểm tra cuối cấp trên bản thật, nghe thử câu hỏi nghe. Chưa làm ở giai đoạn này (để giai đoạn 2): dùng kết quả kiểm tra để mở khóa cấp A1 và kiểm tra đầu vào |
| 7 | Chưa có nút báo lỗi nội dung | Bảng dữ liệu có, giao diện chưa có | Người học báo lỗi được trên từng từ và câu; quản trị xem được danh sách |
| 8 | Trang quản trị không xem được nội dung bài | Chỉ có nút xuất bản | Quản trị xem trước từ, câu, bài tập của một bài trước khi xuất bản |
| 9 | Chưa có trang lỗi và trang không tìm thấy riêng | Dùng trang mặc định | Có trang lỗi và trang 404 bằng tiếng Việt, có đường quay về |
| 10 | Chưa có kiểm thử luồng chính | Chỉ có kiểm thử logic | Kiểm thử tự động cho luồng đăng nhập, học một phiên, ôn tập |
| 11 | Luồng sau đăng nhập trên bản thật chưa được kiểm chứng đầy đủ | Mới kiểm trên máy; bản thật do chủ dự án dùng | Chủ dự án xác nhận từng màn hình trên điện thoại theo danh sách kiểm tra |
| 12 | Dọn dẹp tài khoản và bí mật | Tài khoản thử có quyền quản trị; mật khẩu database đã đi qua khung chat; file client secret trong thư mục Downloads; project Google Cloud "Lisbon" thừa | Xóa tài khoản thử; đổi mật khẩu database; xóa file bí mật; xử lý project thừa. Phần lớn cần chủ dự án thao tác |
| 13 | Tài liệu 01, 02, 03 chưa khớp với định hướng IELTS | Mới có ghi chú trỏ sang tài liệu 07 | Cập nhật 01 và 03; tài liệu 02 viết lại ở đầu giai đoạn 2 cùng thiết kế ba nhánh |
| 14 | Triển khai đôi lúc không tự chạy | Một lần Vercel bỏ qua commit, phải đẩy commit rỗng | Biết nguyên nhân, hoặc có bước kiểm tra trạng thái triển khai sau mỗi lần đẩy |

### Để sang giai đoạn sau (có lý do)

| Việc | Lý do hoãn | Giai đoạn |
|---|---|---|
| Kỹ năng nói, viết, đọc | Cần thiết kế cùng cấu trúc ba nhánh | 2 và 3 |
| Trang tiến độ theo kỹ năng | Có ý nghĩa khi có nhiều hơn hai kỹ năng | 3 |
| Nhắc học, dùng khi mất mạng | Thuộc phần chuẩn bị cho người dùng ngoài | 4 |
| Giám sát lỗi | Thuộc phần chuẩn bị cho người dùng ngoài | 4 |
| Project Supabase chính thức tách khỏi thử nghiệm | Cần trước khi có người dùng ngoài | 4 |
| Bảng `audio_assets` và lưu âm thanh trên Supabase Storage | File tĩnh trong kho mã đủ dùng ở quy mô hiện tại | Khi âm thanh vượt khoảng 50 MB |

### Đã làm trong giai đoạn 1

| Việc | Ghi chú |
|---|---|
| Schema, phân quyền, migration 001-010 | Đã chạy trên project thử nghiệm; có kiểm tra phân quyền tự động trên Postgres cục bộ |
| Đăng nhập email và Google, ghi danh | Chạy trên bản thật |
| Phiên từ vựng, phiên nghe, ôn tập ngắt quãng | Chạy được; còn việc số 1 và 2 ở trên |
| 24 bài cấp Khởi động | Đã xuất bản; còn việc số 3 và 4 |
| Giọng đọc sinh sẵn, nam và nữ | Còn việc số 5 |
| Chế độ sáng và tối | Xong |
| Trang lộ trình có cột cấp độ và đường đi đánh số; trang bài học | Xong ở dạng một nhánh; ba nhánh làm ở giai đoạn 2 |
| Triển khai Vercel, máy chủ đặt tại Tokyo | Xong; còn việc số 14 |
| Trang chính sách quyền riêng tư | Bản nháp, chủ dự án cần đọc lại |

## Quyết định

| Ngày | Quyết định | Kết quả |
|---|---|---|
| 2026-11-23 | Quỹ thời gian | Toàn thời gian |
| 2026-11-23 | Duyệt nội dung | Không có người duyệt; AI kiểm tra chéo bằng Claude |
| 2026-11-23 | Thu phí | Miễn phí cho tới khi chủ dự án quyết định khác; mô-đun gói dịch vụ tách riêng |
| 2026-11-23 | Mở rộng ngôn ngữ | Người Việt học ngôn ngữ khác, bắt đầu bằng tiếng Anh; chỉ cần nền tảng có khả năng mở rộng |
| 2026-11-23 | Vai trò của v0 | Chỉ để triển khai; toàn bộ mã do Claude viết trong kho này |
| 2026-11-23 | Tên sản phẩm | LisB |
| 2026-11-23 | Giọng đọc | Kokoro, giọng nữ af_heart và giọng nam am_michael, người học tự chọn |
| 2026-11-23 | Giao diện | Có chế độ sáng và tối; lộ trình rõ ràng theo kiểu cột cấp độ và đường đi đánh số |
| 2026-11-23 | Bài thi mục tiêu | IELTS Academic là chính; TOEFL thêm sau |
| 2026-11-23 | Điểm đích | IELTS 6.5 |
| 2026-11-23 | Cấu trúc lộ trình | Ba nhánh: Ngữ pháp, Từ vựng chủ đề, Từ vựng theo cấp CEFR; thêm Kỹ năng thi từ B1 |
| 2026-11-23 | Cách làm | Hoàn thiện cái đang có rồi mới mở rộng |

## Quyết định còn mở

| Quyết định | Cần trước khi |
|---|---|
| Khóa API Anthropic cho bước kiểm tra chéo | Việc số 3 của giai đoạn 1 |
| Có thuê người duyệt nội dung khi tới B1 không | Giai đoạn 5 |
| Nguồn giọng Úc cho bài nghe | Giai đoạn 5 |
| Tên miền riêng | Giai đoạn 7 |

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Làm dở rồi chuyển việc khác | Cao | Tiêu chí hoàn thành và danh sách việc dang dở ở trên; không mở giai đoạn mới khi còn việc "phải xong" |
| Khối lượng nội dung tới B2 | Cao | Quy trình soạn, kiểm tra và sinh âm thanh phải tự động hóa tốt ở giai đoạn 1 và 2 |
| Nội dung sai mà không ai phát hiện | Cao | Kiểm tra tự động, kiểm tra chéo, nút báo lỗi, ghi rõ nội dung do AI soạn |
| Người học bỏ cuộc trên quãng đường 500-600 giờ | Cao | Hiện tiến độ theo band; mốc nhỏ; khuyến khích học nhiều phiên liền nhau |
| AI chấm viết và nói lệch so với giám khảo | Cao | Chỉ nhận xét theo tiêu chí và khoảng band, kèm ghi chú là ước lượng |
| Chi phí AI khi có nhiều người dùng | Trung bình | Nội dung dùng chung; trần lượt gọi mỗi ngày; đo từ giai đoạn 3 |

## Sự cố đã xảy ra

| Ngày | Sự cố | Nguyên nhân | Cách phòng |
|---|---|---|---|
| 2026-11-23 | Bản trên mạng lỗi vài phút khi chia phiên ngắn | Migration 011 chỉ được thử trên database trống nên không lộ xung đột với bài tập có sẵn; lệnh đẩy mã lại được nối ngay sau lệnh chạy migration | Tiêu chí hoàn thành cho migration ở trên: thử trên dữ liệu giống thật, xác nhận kết quả rồi mới đẩy mã |
| 2026-11-23 | Trang web chậm, bấm nút như không phản hồi | Máy chủ ở Mỹ, database ở Tokyo | Đã chuyển máy chủ về Tokyo, thêm màn hình chờ |
