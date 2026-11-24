# Đối chiếu nội dung với nguồn tham khảo

Hai script Python (3.10 trở lên, không cần cài thêm gì) so nội dung cấp Khởi động với hai nguồn bên ngoài. Kết quả chỉ để người soạn xem lại, không chặn việc build nội dung.

## Dữ liệu

Tải thủ công vào `tools/content/data/ref/` (thư mục này không đưa lên kho mã):

| File | Nguồn | Giấy phép |
|---|---|---|
| `starters.pdf` | Danh sách từ Pre-A1 Starters, cambridgeenglish.org | Có bản quyền, chỉ đối chiếu |
| `vie_sentences.tsv.bz2`, `eng_sentences.tsv.bz2` | downloads.tatoeba.org/exports/per_language/ | CC BY 2.0 FR |
| `links.tar.bz2` | downloads.tatoeba.org/exports/ | CC BY 2.0 FR |

Chuyển PDF thành chữ: `pdftotext -layout starters.pdf starters.txt`.

## Chạy

```
python -I tools/content/reference/build-pairs.py tools/content/data/ref     # tạo eng-vie.tsv, khoảng 23.000 cặp câu
python -I tools/content/reference/crosscheck.py . bao-cao.txt
```

Báo cáo gồm ba phần: từ của bài không có trong danh sách Starters; câu mẫu trùng với một câu tiếng Anh trong Tatoeba, kèm bản dịch của hai bên; từ có bản dịch một từ trong Tatoeba.

## Giới hạn

- Tatoeba chỉ có khoảng 23.000 cặp Anh-Việt, nên phần lớn câu mẫu không có gì để so. Bản dịch ở đó do cộng đồng viết, có chỗ dùng tiếng địa phương hoặc khẩu ngữ: khác nhau chưa chắc là bài sai.
- Danh sách Starters được đọc từ chữ trong PDF, không tách cụm từ. Một từ được coi là "có" nếu mọi chữ của nó xuất hiện ở đâu đó trong danh sách.
- Hai nguồn này không kiểm tra được mẹo ngữ pháp và mẹo phát âm.
