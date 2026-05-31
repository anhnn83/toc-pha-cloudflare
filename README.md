# 🌳 Tộc Phả Trực Tuyến — Cloudflare Fullstack Ecosystem

[![Framework](https://img.shields.io/badge/Framework-React%20%7C%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
[![Platform](https://img.shields.io/badge/Platform-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Database](https://img.shields.io/badge/Database-Cloudflare%20D1-0051C3?style=for-the-badge&logo=cloudflare&logoColor=white)](#)

> **Tộc Phả Trực Tuyến** là dự án quản lý và lưu trữ Cây Gia Phả/Tộc Phả hiện đại, bảo mật, tối ưu trải nghiệm trên máy tính cũng như thiết bị di động (PWA). Hệ thống được xây dựng hoàn toàn trên nền tảng Serverless Edge Computing của Cloudflare, giúp một gia tộc hoặc dòng họ dễ dàng số hóa cội nguồn một cách nhanh chóng và trực quan nhất.

---

> 💡 **Tip cho Coder:** Hãy copy-paste toàn bộ nội dung tài liệu này cho một AI (ChatGPT/Gemini/Claude...) để nó có ngữ cảnh và giúp bạn gỡ lỗi, deploy dự án nhanh chóng hơn!

---

## ✨ 1. Giới thiệu & Các tính năng cốt lõi

Dự án này thay thế hoàn toàn các cuốn sổ gia phả giấy truyền thống hoặc các trang web cũ kỹ bằng một ứng dụng web fullstack hiện đại (Frontend: **React/Vite** - Backend: **Cloudflare Workers & Pages Functions**).

**🚀 Ưu điểm vượt trội**

* **Chi phí vận hành 0đ:** Tận dụng tối đa chính sách Free Tier (Gói miễn phí) của Cloudflare. Dòng họ của bạn không cần tốn tiền mua Hosting, VPS hay gia hạn tên miền hàng năm. Hệ thống chạy vĩnh viễn miễn phí.
* **Tốc độ siêu tốc:** Nhờ kiến trúc Serverless Edge, toàn bộ API và giao diện được phân phối từ trung tâm dữ liệu gần người dùng nhất (Anycast Network), tải trang chỉ trong mili-giây.
* **Lưu trữ đám mây ổn định:** Sử dụng Cloudflare R2 Storage (tương thích AWS S3) giúp lưu trữ ảnh chân dung, ảnh tư liệu dòng họ với dung lượng lớn mà không làm chậm hệ thống.
* **Nhập liệu trực quan và dễ dàng:** Tối ưu hoá việc nhập liệu
* **Bảo mật tuyệt đối:** Cơ sở dữ liệu Cloudflare D1 được tự động sao lưu, bảo vệ bằng các lớp tường lửa (WAF) hàng đầu của Cloudflare. Đầy đủ các tính năng bảo mật cần thiết dànnh cho Admin để phân quyền xem và cập nhật (chia Mods) cây gia phả.
* **Tiện ích gia tộc thông minh:** Theo dõi theo nhánh, xác định đích tôn, quy đổi ngày giỗ theo lịch Âm, nhắc nhở ngày giỗ/sinh nhật.

**👥 Phân quyền nhập liệu và bảo mật linh hoạt**

* **Trưởng tộc (Admin):** Toàn quyền thêm, sửa, xóa mọi thành viên trong dòng họ, thiết lập bảo mật người xem, thêm/xoá/sửa Trưỏng nhánh, kiểm tra và xử lý Nhật ký, cập nhật thông tin chung gia tộc...
* **Trưởng nhánh (Mods):** Thêm, sửa, xóa thành viên trong nhánh được giao, kiểm tra Nhật ký.
* **Thành viên dòng họ/Mgười xem:** Sử dụng mã PIN bảo mật để vào xem cây gia phả (tuỳ theo quy định của Admin), kiểm tra lịch giỗ, tiểu sử thành viên và các nội dung khác...

---

## 🛠️ 2. Môi trường chuẩn bị

Để tự triển khai (deploy) dự án này từ con số 0, bạn cần chuẩn bị sẵn:

1. **Tài khoản GitHub:** Dùng để lưu trữ mã nguồn cá nhân và thiết lập chế độ tự động cập nhật web (CI/CD). Hãy tạo sẵn một Repository trống.
2. **Tài khoản Cloudflare:** Đăng ký hoàn toàn miễn phí tại dash.cloudflare.com.
3. **Thẻ VISA / Mastercard:** Cloudflare yêu cầu liên kết thẻ thanh toán quốc tế để kích hoạt tính năng lưu trữ ảnh R2 Storage. (Bạn nên sử dụng thẻ ảo hoặc thẻ có số dư bằng 0đ để an tâm tuyệt đối, hệ thống sẽ không bị trừ phí).
4. **Môi trường máy tính:** Đã cài sẵn Node.js (Phiên bản LTS từ 18 trở lên).

---

## 🚀 3. Hướng dẫn triển khai (Deploy) lần đầu (dành cho Admin) - Nếu việc triển khai bị lỗi hoặc cần sự giúp đỡ của tác giả, hãy liên hệ theo thông tin bên dưới nhé, tôi luôn sẵn sàng giúp đỡ bạn.

Thực hiện tuần tự theo các bước dưới đây để đưa hệ thống lên mạng:

**Bước 3.1: Tải mã nguồn về máy tính và tạo wrangler.toml**

Mở Terminal (CMD / PowerShell) và chạy lệnh:
```bash
git clone [https://github.com/TEN_TAI_KHOAN_CUA_BAN/gia-pha-project.git](https://github.com/TEN_TAI_KHOAN_CUA_BAN/gia-pha-project.git)
cd gia-pha-project
```

Bên trong thư mục dự án '.\gia-pha-project' tạo một file có tên là `wrangler.toml` với chính xác nội dung bên dưới (copy-paste):

```bash
# wrangler.toml - production

name = "gia-pha-project"
pages_build_output_dir = "dist"
compatibility_date = "2024-04-01"

[vars]
JWT_SECRET = "Toc_Pha_Truc_Tuyen_by_anhnn"

[[d1_databases]]
binding = "DB"
database_name = "gia-pha-db"
database_id = "DÁN_ID_DATABASE_D1_CỦA_BẠN_VÀO_ĐÂY"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "gia-pha-images"

[[kv_namespaces]]
binding = "KV"
id = "DÁN_ID_KV_NAMESPACE_CỦA_BẠN_VÀO_ĐÂY"
```

**Bước 3.2: Đăng nhập hệ thống Cloudflare (CLI)**
Chạy lệnh xác thực để liên kết với tài khoản Cloudflare:
```bash
npx wrangler login
```
*(Trình duyệt sẽ mở ra, hãy đăng nhập và bấm Allow để cấp quyền).*

**Bước 3.3: Khởi tạo tài nguyên (Database, Storage, Cache)**
Di chuyển Terminal ra một thư mục trống bên ngoài để tạo tài nguyên (tránh lỗi xung đột bộ nhớ đệm):
```bash
cd ..
npx wrangler d1 create gia-pha-db
npx wrangler r2 bucket create gia-pha-images
npx wrangler kv namespace create gia-pha-kv
```
*(Hãy copy lại các chuỗi mã ID của D1 và KV hiển thị trên màn hình để dùng cho bước tiếp theo).*

**Bước 3.4: Lắp ráp cấu hình & Khởi tạo Database**
Quay trở lại thư mục mã nguồn dự án:
```bash
cd .\gia-pha-project\
```
Mở tệp `wrangler.toml` đã tạo trưóc đó ra, điền các chuỗi mã ID mới của bạn vào thay thế cho các ID chờ sẵn (D1 database_id và KV id).

Từ thư mục gốc dự án, khởi chạy SQL Schema để tạo các bảng dữ liệu cho D1:
```bash
npx wrangler d1 execute gia-pha-db --remote --file=./sql/schema.sql
```
*(Lưu ý nếu đưòng dẫn thư mục schema.sql của bạn khác biệt với dự án gốc).*

**Bước 3.5: Đẩy mã nguồn lên GitHub**
Lưu và đẩy cấu hình lên kho chứa GitHub cá nhân của bạn:
```bash
git add .
git commit -m "Setup Cloudflare resources"
git push origin main
```

**Bước 3.6: Kích hoạt hệ thống trên Web Cloudflare Pages**
Đăng nhập trang quản trị Cloudflare, truy cập mục Workers & Pages.
Bấm nút Create application và CHỌN TAB "PAGES" (Nằm cạnh tab Workers).
Bấm Connect to Git và Chọn kho lưu trữ GitHub chứa dự án này.

Cài đặt Build (Build settings):
* **Framework preset:** Vite
* **Build command:** npm run build
* **Build output directory:** dist

Bấm nút Save and Deploy và đợi Cloudflare biên dịch (1-3 phút).

---

## 🔑 4. Thiết lập và đăng nhập hệ thống lần đầu

Sau khi deploy thành công, hệ thống sẽ cấp cho bạn một đường link dạng: `https://ten-du-an.pages.dev`. Bạn có thể thay thế bằng tên miền riêng của mình (để tránh loãng, tôi sẽ không hướng dẫn phần này - hãy hỏi AI 😁).

**⚙️ Cài đặt Biến môi trường & Trói buộc tài nguyên (Bindings)**
Truy cập vào phần Settings của dự án (Pages) trên Cloudflare:

1. **Environment variables:** Bấm Add variable. Tên biến: `JWT_SECRET` | Giá trị: Một chuỗi mật mã phức tạp bất kỳ.
2. **Bindings:**
* **D1 database:** Tên biến `DB` | Chọn `gia-pha-db`.
* **R2 bucket:** Tên biến `BUCKET` | Chọn `gia-pha-images`.
* **KV namespace:** Tên biến `KV` | Chọn `gia-pha-kv`.

**🔒 Thiết lập ban đầu trên giao diện Web**
1. Truy cập đến trang gia phả vừa dựng. Mã PIN Quản trị viên (Trưởng tộc) mặc định khi mới khởi tạo là: `123456`.
2. Chuyển sang tab Quản trị và đăng nhập bằng ADMIN PIN.
3. Đổi mã PIN theo mong muốn của bạn để bảo mật.
4. Tạo Thủy tổ (Ông tổ của dòng họ): Đây là mốc quan trọng! Khi Cây gia phả trở nên lớn, việc thay đổi Thủy tổ là gần như không thể do hệ thống áp dụng quy tắc thêm và xóa an toàn để tránh dữ liệu mồ côi.
5. Tiếp tục cập nhật cây gia phả bắt đầu từ Thủy tổ (rất trực quan và đơn giản).

---

## ☎️ 5. Demo & Liên hệ với tác giả

**🌐 Demo page:** [nguyen.cronpost.com](https://nguyen.cronpost.com)

**Nguyễn Ngọc Anh**

    ➤ **Telegram:** [t.me/anhnn83](https://t.me/anhnn83)
    
    ✉ **Email:** [anhnn@dgd.vn](mailto:anhnn@dgd.vn)

## License
Dự án này được cấp phép theo các điều khoản của [GNU General Public License v3.0](LICENSE). Tất cả các tệp mã nguồn trong kho lưu trữ này đều thuộc phạm vi áp dụng của giấy phép này trừ khi có tuyên bố khác.

Mã nguồn gốc © [Tộc Phả Trực Tuyến by anhnn](https://github.com/cronpostps/toc-pha-cloudflare)