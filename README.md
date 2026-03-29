# Crypto Desktop Widget

Widget desktop và web theo dõi **giá crypto** (Binance realtime), **vàng** và **bạc** (quy đổi + niêm yết VN), gọn trên một cửa sổ.

---

## Overview

Ứng dụng **React + Vite**, có thể chạy trong trình duyệt hoặc đóng gói **Electron** (cửa sổ nhỏ, always-on-top). Dữ liệu crypto qua **WebSocket** Binance; vàng/bạc qua **REST** và polling định kỳ. Watchlist crypto lưu **localStorage**, không cần backend riêng.

Thanh cuộn trong app dùng kiểu **overlay** (ẩn mặc định, hé hiện khi hover) để giao diện gọn, đặc biệt trên Electron.

Chi tiết kiến trúc, luồng dữ liệu và hạn chế: xem **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)**.

---

## Features

- **Crypto** — watchlist cặp USDT, Spot / Futures (mark), sắp xếp kéo thả, phiên giao dịch UTC (Asia / EU / US).
- **Futures Simulator** — mở từ dòng **Futures** trong watchlist: panel nổi (snap mép phải, có thể kéo + snap cạnh), làm mờ nền, đóng bằng **ESC** hoặc click ra ngoài. Tính PnL / TP–SL / R:R / liq gần đúng; **thang giá** (price ladder) click để điền Entry / TP / SL.
- **Vàng** — XAU quy đổi VND, SJC/VN, so sánh với thế giới; bảng niêm yết SJC / DOJI / BTMC.
- **Bạc** — XAG thế giới + niêm yết VN (khi có dữ liệu).
- **Định dạng** — hiển thị số theo `FormatProvider` (VND/USD, v.v.).

---

## Tech stack

| Lớp | Công nghệ |
|-----|-----------|
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Build | Vite 8 |
| Desktop | Electron |
| Realtime | WebSocket (Binance spot + futures mark) |
| Lưu trữ cục bộ | `localStorage` (watchlist) |

---

## Cách chạy (How to run)

### Yêu cầu

- [Node.js](https://nodejs.org/) (khuyến nghị LTS)
- npm (đi kèm Node)

### Cài đặt

```bash
cd Crypto_Desktop_Widget
npm install
```

Chạy lại nếu xóa `node_modules` hoặc clone repo mới.

### Development

**Chỉ web (Vite):**

```bash
npm run dev
```

Mở URL terminal in ra (thường `http://127.0.0.1:5173`).

**Desktop (Electron + Vite):**

```bash
npm run dev:electron
```

Dừng: **Ctrl+C** trong terminal. Nếu port **5173** bị chiếm:

```bash
npm run dev:electron:5174
```

### Build production

```bash
npm run build
```

Output: thư mục `dist/`.

### Lệnh khác

| Lệnh | Mô tả |
|------|--------|
| `npm run preview` | Xem trước bản build Vite |
| `npm run lint` | ESLint |
| `npm run electron` | Electron (cần bundle / URL load phù hợp) |

### Xử lý sự cố nhanh

- **`npm install` lỗi:** xóa `node_modules` (và lockfile nếu cần), cài lại.
- **Electron trống:** đảm bảo Vite chạy không lỗi; thử tắt hết và `npm run dev:electron` lại.

---

## Tài liệu

- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** — tổng quan, kiến trúc, luồng dữ liệu (song ngữ + Mermaid).
