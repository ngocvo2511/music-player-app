
# 🎵 ỨNG DỤNG CHƠI NHẠC ONLINE

---
👤 **Họ tên:** Võ Xuân Ngọc  
🎓 **MSSV:** 23521034

## ✨ Tính Năng

- **Danh sách phát nhạc:**
  - Hiển thị danh sách bài hát.
  - Cho phép tạo và lưu nhiều playlist bằng `LocalStorage`.
  - Hỗ trợ thêm bài hát thủ công vào thư mục `music` và cấu hình trong `script.js`.

- **Trình phát nhạc:**
  - Phát / tạm dừng / chuyển bài.
  - Hiển thị tên bài hát đang phát.
  - Hiển thị và điều chỉnh thanh tiến trình (seek).
  - Tua nhanh / tua lại.
  - Điều chỉnh âm lượng.
  - Chỉnh tốc độ phát (Playback Speed).
  - Hiệu ứng **Visualizer** sống động.
  - Chế độ **Hẹn Giờ Tắt Nhạc**.

- **Trải nghiệm người dùng:**
  - Hỗ trợ giao diện **Dark Mode / Light Mode**.
  - Hiển thị **Thông báo đang phát** bằng Notification API.
  - Hỗ trợ **Chia sẻ bài hát** qua liên kết URL.

---

## 🚀 Cách Sử Dụng

### 1. Yêu cầu

Dùng web server, có thể dùng một trong các server nội bộ dưới đây:

#### 🔹 Dùng Live Server trong Visual Studio Code (Khuyên dùng)
- Mở thư mục dự án bằng VS Code.
- Chuột phải vào `index.html` → Chọn `Open with Live Server`.
- Truy cập: `http://localhost:5500` (hoặc cổng được hiển thị).

#### 🔹 Dùng Node.js
```bash
npx serve
```
Truy cập đường dẫn được hiển thị, ví dụ: `http://localhost:3000`.

#### 🔹 Dùng Python (nếu đã cài đặt sẵn)
```bash
# Python 3
python -m http.server
```
Truy cập tại `http://localhost:8000`.

---

## 📁 Thêm Bài Hát Mới

- Thêm file `.mp3` vào thư mục `music/`.
- Mở file `script.js`, chỉnh sửa mảng `availableSongs` theo mẫu:

```js
const availableSongs = [
    { file: 'baotienmotmobinhyen.mp3', title: 'Bao Tiền Một Mớ Bình Yên' },
    { file: 'ChuyenCuaMuaDong.mp3', title: 'Chuyện Của Mùa Đông' },
    { file: 'thapdrilltudo.mp3', title: 'Tháp Drill Tự Do' },
    { file: 'yeu5.mp3', title: 'Yêu 5' }
];
```

---

## 📌 Ghi chú

- Ứng dụng hoạt động tốt nhất trên trình duyệt hiện đại như Chrome, Edge, Firefox.
- Không cần backend — hoàn toàn chạy ở phía client.

---
