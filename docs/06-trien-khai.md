# 06. Triển khai

Trạng thái: hướng dẫn cho giai đoạn 1-3 (dùng cá nhân). Cập nhật 2026-11-24.

App đang chạy tại https://lisb.vercel.app, kho mã `lecuongg242-cloud/Lisb`, project Supabase thử nghiệm. Mục 1 đến 3 là các bước đã làm, giữ lại để làm lại khi tạo project chính thức.

Các bước dưới đây phải làm trên tài khoản Vercel và Supabase của chủ dự án.

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

Sau khi triển khai xong, Vercel cấp một địa chỉ dạng `https://<tên>.vercel.app`. Từ đó mỗi lần đẩy mã lên nhánh `main`, Vercel tự triển khai lại. Máy chủ đặt tại Tokyo (`regions` trong `vercel.json`) để gần database.

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
npm run sql -- -c "update public.profiles set role = 'admin' where id = (select id from auth.users where email = '<email của bạn>')"
```

Tài khoản mới sẽ bắt đầu từ bài đầu tiên của chủ đề bảng chữ cái.

## Đăng nhập bằng Google

Mã đã hỗ trợ sẵn. Nút "Tiếp tục với Google" tự hiện trên trang đăng nhập sau khi bật Google trong Supabase (trang đăng nhập hỏi lại Supabase mỗi phút); chưa bật thì nút không hiện.

Bước 1, tạo thông tin đăng nhập ở Google (console.cloud.google.com):

1. Tạo một project (hoặc chọn project có sẵn).
2. Vào APIs & Services > OAuth consent screen: chọn loại External, điền tên app (LisB), email hỗ trợ. Khi còn ở chế độ Testing, chỉ các email được thêm vào mục Test users mới đăng nhập được; bấm Publish app để mọi tài khoản Google dùng được.
3. Vào APIs & Services > Credentials > Create Credentials > OAuth client ID, loại Web application.
4. Ở Authorized redirect URIs thêm đúng một dòng: `https://tyovmslxlrcvihbqxttq.supabase.co/auth/v1/callback`
5. Lưu lại, chép Client ID và Client Secret.

Bước 2, bật trong Supabase:

1. Authentication > Sign In / Providers > Google: bật lên, dán Client ID và Client Secret, lưu.
2. Authentication > URL Configuration: bảo đảm Redirect URLs đã có `https://lisb.vercel.app/**` (và `http://localhost:3000/**` để chạy trên máy).

Lưu ý:

- Client Secret là thông tin bí mật: chỉ dán vào Supabase, không đưa vào kho mã hay file `.env`.
- Người đăng nhập bằng Google không cần email xác nhận.
- Nếu một email đã đăng ký bằng mật khẩu rồi đăng nhập bằng Google với cùng email đã xác minh, Supabase gộp vào cùng một tài khoản.
- Khi tạo project Supabase chính thức, phải thêm địa chỉ callback của project đó vào Authorized redirect URIs.

## 4. Cài lên điện thoại

| Thiết bị | Cách cài |
|---|---|
| iPhone (Safari) | Mở địa chỉ app, bấm nút Chia sẻ, chọn "Thêm vào Màn hình chính" |
| Android (Chrome) | Mở địa chỉ app, mở menu ba chấm, chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính" |

App mở toàn màn hình như ứng dụng thường. Giọng đọc là file sinh sẵn đi kèm app, nghe giống nhau trên mọi máy. App cần có mạng; chưa dùng được khi mất mạng.

## 5. Việc cần làm trước khi cho người khác dùng

Hiện app chạy trên project Supabase thử nghiệm. Dùng cho một mình chủ dự án thì ổn; trước giai đoạn thử nghiệm kín cần:

- Xóa tài khoản thử `tester@lisb.test` (đang có quyền quản trị).
- Đổi mật khẩu database, vì mật khẩu hiện tại đã được gửi qua khung chat; sau đó cập nhật `DATABASE_URL` trong `.env.local`.
- Xóa tài khoản thử xong thì trỏ `E2E_EMAIL`, `E2E_PASSWORD` trong `.env.local` sang một tài khoản thử khác không có quyền quản trị, nếu không `npm run test:e2e` sẽ hỏng.
- Tạo project Supabase riêng cho bản chính thức, chạy mọi file trong `scripts/` theo thứ tự số và `content/build/english-pre-a1.sql`, rồi trong trang Quản trị xuất bản các bài, các bài ôn chủ đề và nạp đề kiểm tra cuối cấp.
- Cấu hình dịch vụ gửi email riêng: dịch vụ email mặc định của Supabase giới hạn rất ít thư mỗi giờ, chỉ đủ để thử.

## 6. Kiểm tra sau khi triển khai

Sau mỗi lần đẩy mã, xem bản mới đã lên chưa. Từng có lần Vercel bỏ qua một commit và phải đẩy thêm một commit rỗng; nguyên nhân chưa rõ.

```
git rev-parse HEAD
curl -s https://api.github.com/repos/lecuongg242-cloud/Lisb/commits/<mã commit>/status
```

Trường `state` là `success` thì bản mới đã chạy; `pending` thì đợi một hai phút rồi xem lại; `failure` thì đọc nhật ký build trên Vercel. Nếu sau vài phút danh sách `statuses` vẫn trống thì Vercel đã bỏ qua commit đó: đẩy một commit rỗng (`git commit --allow-empty`).

Sau đó mở thử trên bản thật. Kiểm tra nhanh:

| Kiểm tra | Kết quả mong đợi |
|---|---|
| Mở địa chỉ app khi chưa đăng nhập | Chuyển về trang đăng nhập |
| Đăng nhập, bấm "Tôi có 2 phút" | Vào phiên học kế tiếp, nghe được giọng đọc |
| Học xong một phiên | Màn hình tổng kết hiện số ngày liên tục |

Danh sách đầy đủ từng màn hình, làm sau mỗi thay đổi lớn, nằm ở tài liệu 08.
