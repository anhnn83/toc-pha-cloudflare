# 🌳 Tộc Phả Cloudflare — Giải pháp Cây gia phả miễn phí và trưòng tồn

[![Framework](https://img.shields.io/badge/Framework-React%20%7C%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](#)
[![Platform](https://img.shields.io/badge/Platform-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Database](https://img.shields.io/badge/Database-Cloudflare%20D1-0051C3?style=for-the-badge&logo=cloudflare&logoColor=white)](#)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/cronpostps/toc-pha-cloudflare)
[![Demo Page](https://img.shields.io/badge/-Demo%20Page-blue?style=for-the-badge)](https://nguyen.cronpost.com)

> **Tộc Phả Cloudflare** là dự án quản lý và lưu trữ Cây Gia Phả/Tộc Phả hiện đại, bảo mật, tối ưu trải nghiệm trên máy tính cũng như thiết bị di động (PWA). Hệ thống được xây dựng hoàn toàn trên nền tảng Serverless Edge Computing của Cloudflare, giúp một gia tộc hoặc dòng họ dễ dàng số hóa cội nguồn một cách nhanh chóng và trực quan nhất.

---

> 💡 **Tip cho Coder:** Hãy copy-paste toàn bộ nội dung tài liệu này cho một AI (ChatGPT/Gemini/Claude...) để nó có ngữ cảnh và giúp bạn gỡ lỗi, deploy dự án nhanh chóng hơn!

---

## ✨ 1. Giới thiệu & Các tính năng cốt lõi

Dự án này thay thế hoàn toàn các cuốn sổ gia phả giấy truyền thống hoặc các trang web cũ kỹ bằng một ứng dụng web fullstack hiện đại (Frontend: **React/Vite** - Backend: **Cloudflare Workers & Pages Functions**).

**🚀 Ưu điểm vượt trội**

* **Chi phí vận hành 0đ:** Tận dụng tối đa chính sách Free Tier (Gói miễn phí) của Cloudflare. Dòng họ của bạn không cần tốn tiền mua Hosting, VPS hay gia hạn tên miền hàng năm. Hệ thống chạy vĩnh viễn miễn phí.
* **Tốc độ siêu tốc:** Nhờ kiến trúc Serverless Edge, toàn bộ API và giao diện được phân phối từ trung tâm dữ liệu gần người dùng nhất (Anycast Network), tải trang chỉ trong mili-giây.
* **Lưu trữ đám mây ổn định:** Sử dụng Cloudflare R2 Storage (tương thích AWS S3) giúp lưu trữ ảnh chân dung, ảnh tư liệu dòng họ với dung lượng lớn mà không làm chậm hệ thống.
* **Bảo mật tuyệt đối:** Cơ sở dữ liệu Cloudflare D1 được tự động sao lưu, bảo vệ bằng các lớp tường lửa (WAF) hàng đầu của Cloudflare.
* **Tiện ích gia tộc thông minh:** Theo dõi theo nhánh, xác định đích tôn, quy đổi ngày giỗ theo lịch Âm, nhắc nhở ngày giỗ/sinh nhật.

**👥 Phân quyền nhập liệu linh hoạt**

* **Thành viên dòng họ:** Sử dụng mã PIN bảo mật để vào xem cây gia phả, ngày giỗ, tiểu sử thành viên mà không sợ lộ thông tin nội bộ ra ngoài Internet.
* **Quản trị viên (Trưởng tộc):** Toàn quyền thêm, sửa, xóa thành viên, lập sơ đồ hôn nhân, đăng tải hình ảnh gia đình trực tiếp trên giao diện web.

---

## 🛠️ 2. Môi trường chuẩn bị

Để tự triển khai (deploy) dự án này từ con số 0, bạn cần chuẩn bị sẵn:

1. **Tài khoản GitHub:** Dùng để lưu trữ mã nguồn cá nhân và thiết lập chế độ tự động cập nhật web (CI/CD). Hãy tạo sẵn một Repository trống.
2. **Tài khoản Cloudflare:** Đăng ký hoàn toàn miễn phí tại dash.cloudflare.com.
3. **Thẻ VISA / Mastercard:** Cloudflare yêu cầu liên kết thẻ thanh toán quốc tế để kích hoạt tính năng lưu trữ ảnh R2 Storage. (Bạn nên sử dụng thẻ ảo hoặc thẻ có số dư bằng 0đ để an tâm tuyệt đối, hệ thống sẽ không bị trừ phí).
4. **Môi trường máy tính:** Đã cài sẵn Node.js (Phiên bản LTS từ 18 trở lên).

---

## 🚀 3. Hướng dẫn triển khai (Deploy) lần đầu

Thực hiện tuần tự theo các bước dưới đây để đưa hệ thống lên mạng:

**Bước 3.1: Tải mã nguồn về máy tính**
Mở Terminal (CMD / PowerShell) và chạy lệnh:
```bash
git clone [https://github.com/TEN_TAI_KHOAN_CUA_BAN/toc-pha-cloudflare.git](https://github.com/TEN_TAI_KHOAN_CUA_BAN/toc-pha-cloudflare.git)
cd toc-pha-cloudflare
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
cd .\toc-pha-cloudflare\
```
Đổi tên wrangler.toml.example -> wrangler.toml
Mở tệp `wrangler.toml` ra, điền các chuỗi mã ID mới của bạn vào thay thế cho các ID chờ sẵn.
Từ thư mục gốc dự án, khởi chạy SQL Schema để tạo các bảng dữ liệu cho D1:
```bash
npx wrangler d1 execute gia-pha-db --remote --file=./sql/schema.sql
```
*(Nếu tệp schema.sql nằm ở thư mục ngoài cùng, đổi lệnh thành --file=./schema.sql).*

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

Sau khi deploy thành công, hệ thống sẽ cấp cho bạn một đường link dạng: `https://ten-du-an.pages.dev`.

**⚙️ Cài đặt Biến môi trường & Trói buộc tài nguyên (Bindings)**
Truy cập vào phần Settings của dự án (Pages) trên Cloudflare:

1. **Environment variables:** Bấm Add variable. Tên biến: `JWT_SECRET` | Giá trị: Một chuỗi mật mã phức tạp bất kỳ.
2. **Bindings (Kéo xuống dưới cùng):**
* **D1 database:** Tên biến `DB` | Chọn `gia-pha-db`.
* **R2 bucket:** Tên biến `BUCKET` | Chọn `gia-pha-images`.
* **KV namespace:** Tên biến `KV` | Chọn `gia-pha-kv`.

**🔒 Thiết lập ban đầu trên giao diện Web**
1. Truy cập đến trang gia phả vừa dựng. Mã PIN Quản trị viên (Trưởng tộc) mặc định: `123456`.
2. Chuyển sang tab Quản trị và đăng nhập bằng ADMIN PIN.
3. Đổi mã PIN theo mong muốn của bạn để bảo mật.
4. Tạo Thủy tổ (Ông tổ của dòng họ): Đây là mốc quan trọng! Khi Cây gia phả trở nên lớn, việc thay đổi Thủy tổ là gần như không thể do hệ thống áp dụng quy tắc xóa an toàn theo chuỗi để tránh dữ liệu mồ côi.
5. Tiếp tục cập nhật Cây gia phả bắt đầu từ Thủy tổ theo hướng dẫn trên màn hình.

---

## ☎️ 5. Đóng góp & Mã nguồn mở

**Mọi đóng góp, tối ưu code & báo lỗi đều được hoan nghênh tại kho lưu trữ chính thức!**

**👨‍💻 Dev by ANHNN**

[![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/anhnn83)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:anhnn@dgd.vn)
[![website](https://img.shields.io/badge/Website-anhnn.cronpost.com-181717?style=for-the-badge&logo=google-chrome&logoColor=white)](https://anhnn.cronpost.com)

<hr>
<div align="center">
  &copy; 2026 <a href="https://github.com/cronpostps">anhnn</a>. Mọi quyền được bảo lưu.<br>
  <b>Tộc phả Cloudflare</b> được phát hành dưới giấy phép <a href="LICENSE">GNU GPLv3</a>.
</div>