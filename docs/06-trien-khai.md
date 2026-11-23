# 06. Triển khai

Trạng thái: hướng dẫn cho giai đoạn 1-2 (dùng cá nhân). Ngày: 2026-11-23.

Mã nguồn đã sẵn sàng triển khai: build production chạy được, app cài được lên màn hình chính của điện thoại. Các bước dưới đây phải làm trên tài khoản Vercel và Supabase của chủ dự án.

## 1. Đưa app lên mạng

v0 triển khai lên Vercel, nên có hai đường và kết quả như nhau:

- Nếu v0 có chức năng nhập kho GitHub có sẵn: nhập kho `lecuongg242-cloud/Lisb` rồi bấm triển khai.
- Hoặc làm thẳng trên Vercel: vào vercel.com/new, chọn "Import Git Repository", chọn kho `Lisb`. Vercel tự nhận ra đây là Next.js, không cần đổi cấu hình build.

Trước khi bấm Deploy, thêm hai biến môi trường (lấy giá trị từ `.env.local` trên máy):

| Tên | Ghi chú |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Địa chỉ project Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Khóa công khai, được phép lộ ra trình duyệt |

Không đưa `DATABASE_URL` lên Vercel: app không dùng nó, nó chỉ để chạy migration từ máy.

Sau khi triển khai xong, Vercel cấp một địa chỉ dạng `https://<tên>.vercel.app`. Từ đó mỗi lần đẩy mã lên nhánh `main`, Vercel tự triển khai lại.

## 2. Khai báo địa chỉ app với Supabase

Việc này bắt buộc, nếu không đường dẫn trong email xác nhận sẽ trỏ về `localhost` và không mở được trên điện thoại.

Trong Supabase Dashboard, vào Authentication > URL Configuration:

| Mục | Giá trị |
|---|---|
| Site URL | `https://<tên>.vercel.app` |
| Redirect URLs | Thêm `https://<tên>.vercel.app/**` và `http://localhost:3000/**` |

## 3. Tạo tài khoản và cấp quyền quản trị

1. Mở địa chỉ app, bấm "Tạo tài khoản", nhập email và mật khẩu.
2. Mở email xác nhận và bấm đường dẫn. Nếu không muốn dùng email xác nhận trong giai đoạn cá nhân, tắt "Confirm email" ở Authentication > Sign In / Providers > Email.
3. Cấp quyền quản trị cho tài khoản đó (cần để xuất bản bài học mới), chạy từ thư mục dự án:

```
run-sql -c "update public.profiles set role = 'admin' where id = (select id from auth.users where email = '<email của bạn>')"
```

Tài khoản mới sẽ bắt đầu từ bài đầu tiên của chủ đề bảng chữ cái.

## 4. Cài lên điện thoại

| Thiết bị | Cách cài |
|---|---|
| iPhone (Safari) | Mở địa chỉ app, bấm nút Chia sẻ, chọn "Thêm vào Màn hình chính" |
| Android (Chrome) | Mở địa chỉ app, mở menu ba chấm, chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính" |

App mở toàn màn hình như ứng dụng thường. Giọng đọc dùng giọng có sẵn của điện thoại.

## 5. Việc cần làm trước khi cho người khác dùng

Hiện app chạy trên project Supabase thử nghiệm. Dùng cho một mình chủ dự án thì ổn; trước giai đoạn thử nghiệm kín cần:

- Xóa tài khoản thử `tester@lisb.test` (đang có quyền quản trị).
- Đổi mật khẩu database, vì mật khẩu hiện tại đã được gửi qua khung chat; sau đó cập nhật `DATABASE_URL` trong `.env.local`.
- Tạo project Supabase riêng cho bản chính thức, chạy `scripts/001` đến `010` và `content/build/english-pre-a1.sql`, rồi xuất bản các bài trong trang Quản trị.
- Cấu hình dịch vụ gửi email riêng: dịch vụ email mặc định của Supabase giới hạn rất ít thư mỗi giờ, chỉ đủ để thử.

## 6. Kiểm tra sau khi triển khai

| Kiểm tra | Kết quả mong đợi |
|---|---|
| Mở địa chỉ app khi chưa đăng nhập | Chuyển về trang đăng nhập |
| Đăng ký, bấm đường dẫn trong email | Vào màn hình chào mừng, rồi trang chủ |
| Bấm "Tôi có 2 phút" | Vào phiên từ vựng của bài đầu tiên, nghe được giọng đọc |
| Học xong một phiên | Màn hình tổng kết hiện số ngày liên tục |
| Mở lại sau khoảng 10 phút | Trang chủ báo có thẻ đến hạn ôn |
