# 05. Tài nguyên và mã nguồn tham khảo

Trạng thái: kết quả tìm kiếm ngày 2026-11-23. Thông tin giấy phép lấy từ kết quả tìm kiếm và README, chưa đọc trực tiếp file giấy phép của từng nguồn. Trước khi dùng nguồn nào cho sản phẩm thương mại, phải mở trang gốc để xác nhận.

## 1. Cách đọc cột "Dùng thế nào"

| Nhãn | Ý nghĩa |
|---|---|
| Dùng trực tiếp | Giấy phép cho phép dùng thương mại, có thể đưa vào sản phẩm (kèm ghi nguồn nếu yêu cầu) |
| Chỉ tham khảo | Đọc để học cách làm hoặc đối chiếu, không sao chép dữ liệu hay code vào sản phẩm |
| Cần xác nhận | Điều khoản chưa rõ, phải kiểm tra trước khi quyết định |

Lưu ý về giấy phép code: AGPL và GPL yêu cầu công khai mã nguồn của sản phẩm nếu bạn dùng code của họ. Với sản phẩm định thu phí, chỉ đọc để tham khảo ý tưởng, không sao chép code từ các dự án này.

## 2. Thư viện và dữ liệu nên dùng ngay

| Nguồn | Là gì | Giấy phép | Dùng thế nào | Dùng vào đâu |
|---|---|---|---|---|
| [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | Thư viện TypeScript cho thuật toán ôn tập FSRS (bản v6), cần Node 20 trở lên | MIT | Dùng trực tiếp | Lịch ôn tập. Thay cho việc tự viết SM-2 |
| [olp-en-cefrj](https://github.com/openlanguageprofiles/olp-en-cefrj) | CEFR-J Vocabulary Profile v1.5 (từ vựng gán cấp A1-B2) và CEFR-J Grammar Profile | Miễn phí cho nghiên cứu và thương mại, bắt buộc trích dẫn nguồn | Dùng trực tiếp | Danh sách từ cho phép theo cấp, kiểm tra tự động nội dung |
| [ipa-dict](https://github.com/open-dict-data/ipa-dict) | Từ điển phiên âm IPA nhiều ngôn ngữ, có en_US (dựa trên CMUdict) | MIT | Dùng trực tiếp | Phiên âm cho bảng `words`, thay cho AI tự sinh. Có sẵn nhiều ngôn ngữ nên hợp với hướng mở rộng |
| [Tatoeba](https://tatoeba.org/en/downloads) | Kho câu ví dụ song ngữ do cộng đồng đóng góp, có cặp Anh-Việt | CC BY 2.0 FR, một phần CC0 | Dùng trực tiếp, kèm ghi nguồn | Nguồn câu ví dụ để đối chiếu với câu AI sinh. Chất lượng không đều, vẫn phải qua duyệt |
| [NGSL](https://www.newgeneralservicelist.com/) | Danh sách khoảng 2800 từ tiếng Anh thông dụng nhất theo tần suất | Nguồn thứ cấp ghi CC BY-SA 4.0 | Cần xác nhận trên trang gốc | Thứ tự ưu tiên dạy từ |

## 3. Tài liệu để thiết kế lộ trình

| Nguồn | Là gì | Dùng thế nào |
|---|---|---|
| [CEFR descriptors (Hội đồng châu Âu)](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors-search) | Công cụ tra các mô tả "làm được gì" theo từng cấp, bản cập nhật 2020 | Chỉ tham khảo. Dùng để viết mục tiêu cho từng chủ đề |
| [Bảng tự đánh giá CEFR](https://www.kcl.ac.uk/language-centre/assets/can-do-statements-cefr.pdf) | Bản tóm tắt can-do theo kỹ năng | Chỉ tham khảo. Cơ sở cho bài kiểm tra đầu vào |
| [Cambridge A2 Key Vocabulary List](https://www.cambridgeenglish.org/Images/506886-a2-key-2020-vocabulary-list.pdf) | Danh sách từ chính thức cho kỳ thi A2, có nhóm theo chủ đề | Chỉ tham khảo, có bản quyền. Đối chiếu xem lộ trình có thiếu chủ đề nào không |
| [Cambridge Pre-A1 đến A2 word list](https://www.cambridgeenglish.org/Images/starters-word-list-picture-book.pdf) | Danh sách từ cho người mới bắt đầu (bản cho thiếu nhi) | Chỉ tham khảo, có bản quyền |
| [English Grammar Profile](https://www.englishprofile.org/) | Ngữ pháp tiếng Anh gán theo cấp CEFR | Chỉ tham khảo. Nguồn thứ cấp ghi miễn phí cho mục đích phi thương mại |
| CEFR-J Grammar Profile (trong olp-en-cefrj ở trên) | Ngữ pháp gán cấp, cho phép dùng thương mại | Dùng trực tiếp. Mới dịch một phần từ tiếng Nhật |

Bổ sung 2026-11-24, theo quyết định dùng chương trình chuẩn làm khung (tài liệu 04):

| Nguồn | Giấy phép | Dùng thế nào |
|---|---|---|
| Danh sách từ các kỳ thi Cambridge (Pre-A1 Starters, A1 Movers, A2 Flyers và Key, B1 Preliminary, B2 First), tải miễn phí ở cambridgeenglish.org | Có bản quyền | Chỉ đối chiếu: kiểm tra từ của mỗi cấp có nằm trong danh sách của kỳ thi cùng cấp không. Không đưa file danh sách vào kho mã |
| [Tatoeba](https://tatoeba.org/vi/downloads), kho câu do cộng đồng đóng góp, có cặp câu Anh-Việt | CC BY 2.0 FR (một phần CC0), phải ghi nguồn | Đối chiếu câu mẫu và nghĩa tiếng Việt; chất lượng không đều nên chỉ dùng để phát hiện chỗ lệch, không dùng làm đáp án. File tiếng Việt 0,4 MB, tiếng Anh 25 MB, bảng liên kết 150 MB |
| [kaikki.org](https://kaikki.org/dictionary/English/) (Wiktionary dạng JSON) | CC BY-SA | Chưa dùng: file tiếng Anh nặng 3,4 GB. Xét lại khi cần định nghĩa và ví dụ cho cấp B1 trở lên |

## 4. Mã nguồn mở để tham khảo cách làm

| Dự án | Là gì | Giấy phép | Giá trị tham khảo |
|---|---|---|---|
| [freelingo](https://github.com/ArtCC/freelingo) | App học ngoại ngữ bằng AI, Next.js 16 và FastAPI, có XP, chuỗi ngày, điểm kỹ năng, giao diện 6 ngôn ngữ. Đang được bảo trì | AGPL-3.0, kèm giấy phép thương mại riêng (đã đọc file LICENSE trong kho mã; kết quả tìm kiếm ghi Apache 2.0 là sai) | Chỉ tham khảo. Gần với sản phẩm của bạn nhất. Xem cách họ tổ chức bài học do AI sinh, cấu trúc đa ngôn ngữ, cách ghép giọng đọc và nhận diện giọng nói |
| [LibreLingo](https://github.com/LibreLingo/LibreLingo) | Nền tảng học ngoại ngữ do cộng đồng sở hữu, khóa học định nghĩa bằng file YAML | AGPL-3.0 | Chỉ tham khảo. Đáng học nhất là định dạng khóa học: cách mô tả kỹ năng, từ, câu và sinh bài tập từ dữ liệu |
| [FluencyPal](https://github.com/dmowski/fluencypal) | App luyện nói với AI bằng giọng nói thời gian thực, Next.js 16 | Chưa kiểm tra | Luồng hội thoại bằng giọng nói |
| [polycloze](https://github.com/lggruspe/polycloze) | Học từ bằng điền chỗ trống kết hợp ôn tập ngắt quãng, tự dựng khóa học từ kho câu | Chưa kiểm tra | Cách tự động sinh bài tập từ kho câu (hợp với Tatoeba) |
| [Learning with Texts](https://github.com/HugoFara/lwt) | Học qua đọc văn bản tự nhập, đánh dấu từ đã biết và chưa biết | Chưa kiểm tra | Tính năng "Lưu nhanh": tách từ chưa học từ văn bản dán vào |
| [OpenPronounce](https://github.com/Halleck45/OpenPronounce) | Chấm phát âm đến từng âm bằng Wav2Vec2, tự mô tả là thay thế tự chạy cho Azure. Dự án nhỏ | Chưa kiểm tra | Cách so chuỗi âm nhận được với chuỗi âm chuẩn |
| [Koel Labs](https://github.com/koellabs) | Dự án cộng đồng về phản hồi phát âm thời gian thực | Chưa kiểm tra | Hướng chấm phát âm tự chạy |
| Các bản "duolingo-clone" bằng Next.js | Bài tập lập trình dựng lại giao diện Duolingo | Khác nhau | Không khuyến nghị dùng làm nền. Chỉ xem để tham khảo cấu trúc trang; không sao chép giao diện hay hình ảnh của Duolingo |

## 5. Giọng đọc và chấm phát âm

| Phương án | Chi phí và điều kiện | Nhận xét |
|---|---|---|
| Gemini TTS (cùng `GEMINI_API_KEY`) | Bản Flash-Lite TTS xem trước: khoảng 6 USD cho 1 triệu token âm thanh, 25 token mỗi giây. Giá ghi là tăng gấp đôi từ 2027-01-01 | Tiện nhất vì dùng chung khóa với phần AI. Ước tính của tôi: 1000 câu ngắn đọc ở hai tốc độ tốn khoảng 1-2 USD, và chỉ tốn một lần vì nội dung dùng chung. Cần xác nhận giá trên trang chính thức |
| [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) | Mã nguồn mở, Apache 2.0, tự chạy | Giọng được cộng đồng đánh giá là tự nhiên. Miễn phí nhưng phải có máy để chạy; hợp để sinh file hàng loạt trên máy của bạn |
| Piper | Bản mới chuyển sang GPL-3.0, giấy phép giọng đọc khác nhau | Nhanh, nhẹ nhưng giọng máy hơn. Không khuyến nghị |
| [Azure Pronunciation Assessment](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment) | Tính giá như chuyển giọng nói thành chữ; một nguồn cộng đồng nêu khoảng 1,3 USD mỗi giờ âm thanh, chưa xác nhận | Chấm đến từng âm, chất lượng thương mại. Ứng viên chính cho chấm phát âm từ giai đoạn 3 |
| Wav2Vec2 chạy trong trình duyệt | Miễn phí, tự viết phần chấm điểm | Rủi ro kỹ thuật cao, để sau |

## 6. Chưa tìm được hoặc chưa xác nhận

- **Từ điển Anh-Việt mở có giấy phép dùng thương mại rõ ràng**: chưa tìm được nguồn tốt. Các dự án trên SourceForge (Open Vietnamese Dictionary Project) dùng GPLv2. Nghĩa tiếng Việt vì vậy vẫn do AI sinh rồi qua kiểm tra chéo và người duyệt.
- **kaikki.org** (dữ liệu Wiktionary dạng JSON, có nghĩa, phiên âm, ví dụ): chưa tra được trong lần tìm này, cần xem riêng.
- **Giấy phép gốc của CMUdict** (ipa-dict en_US dựa trên nó): cần xác nhận.
- **Giá chính xác** của Gemini TTS và Azure: các con số ở trên lấy từ trang giá và nguồn cộng đồng, cần xác nhận lại lúc triển khai.

## 7. Tác động lên kế hoạch

1. **Lịch ôn tập dùng ts-fsrs ngay từ giai đoạn 1**, không tự viết SM-2. Ít code hơn, chính xác hơn, không phải chuyển đổi về sau. Tài liệu 02 và 03 đã cập nhật.
2. **Kiểm tra tự động nội dung có dữ liệu thật để dựa vào**: từ của bài phải nằm trong CEFR-J đúng cấp, phiên âm lấy từ ipa-dict.
3. **Âm thanh sinh sẵn rẻ hơn dự tính.** Đã làm ngay ở giai đoạn 1 bằng Kokoro chạy trên máy, không tốn phí (tài liệu 03, mục 5).
4. **Việc đầu tiên của giai đoạn 0**: đọc mã nguồn freelingo và định dạng khóa học của LibreLingo trước khi chốt mô hình dữ liệu.
