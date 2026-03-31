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
- **Vàng / Bạc (Valuation widgets)** — UI tối giản tập trung **so sánh VN vs TG** và **spread** (màu: đỏ = VN cao hơn, xanh = VN thấp hơn). Nhỏ (300–360px) chỉ hiển thị dữ liệu thiết yếu; rộng hơn có thêm so sánh/chi tiết.
- **Niêm yết trong nước (tuỳ màn hình)** — Vàng SJC/DOJI/BTMC và bạc Phú Quý chỉ hiện chi tiết ở width đủ lớn để tránh “bảng dài” trên widget nhỏ.
- **Định dạng** — hiển thị số theo `FormatProvider` (VND/USD, v.v.).
- **Interaction system (subtle)** — tooltip phiên (3 dòng, delay ~140ms), hover nhẹ trên dòng watchlist và giá, focus ring tinh tế cho input, flash giá lên/xuống rất nhẹ.

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

## Design tokens (Tailwind)

- **Tailwind config**: `tailwind.config.js` (typography tokens như `text-meta`/`text-price`/`text-pnl`, semantic colors như `text-profit`/`text-loss`, radius tokens, `shadow-panel`).
- **Utilities bổ sung**: `src/index.css` (`app-panel`, `app-vstack-*`, `app-tooltip`, hiệu ứng flash/pulse rất nhẹ).

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
