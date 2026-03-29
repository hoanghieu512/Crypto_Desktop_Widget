# Hướng dẫn chạy Crypto Desktop Widget

## Yêu cầu

- [Node.js](https://nodejs.org/) (khuyến nghị LTS)
- npm (đi kèm Node)

## Cài đặt lần đầu

Trong thư mục gốc của project:

```bash
cd Crypto_Desktop_Widget (cd /Users/lavopavden/Documents/VibeCoding/Crypto_Desktop_Widget)
npm install
```

Chạy lại bước này nếu bạn xóa thư mục `node_modules` hoặc clone project mới.

## Chạy ứng dụng

### Giao diện web (Vite)

Phù hợp khi chỉ cần xem UI trong trình duyệt:

```bash
npm run dev
```

Mở địa chỉ terminal hiển thị (thường là `http://127.0.0.1:5173`).

### Ứng dụng desktop (Electron + Vite)

Chạy widget như app desktop:

```bash
npm run dev:electron
```

Lệnh này khởi động server Vite và mở cửa sổ Electron. Dừng bằng **Ctrl+C** trong terminal.

**Port 5173 bị chiếm:** thử:

```bash
npm run dev:electron:5174
```

## Build bản production

```bash
npm run build
```

Kết quả nằm trong thư mục `dist/`.

## Lệnh khác (tham khảo)

| Lệnh | Mô tả |
|------|--------|
| `npm run electron` | Chạy Electron (cần đã có bản build / cấu hình load đúng URL) |
| `npm run preview` | Xem trước bản build Vite |
| `npm run lint` | Chạy ESLint |

## Gợi ý xử lý sự cố

- **Lỗi khi `npm install`:** xóa `node_modules` và file lock (nếu cần), chạy lại `npm install`.
- **Cửa sổ Electron trống:** đảm bảo Vite đã chạy và không báo lỗi; thử đóng hết và chạy lại `npm run dev:electron`.
