# Crypto Desktop Widget

Widget desktop và web theo dõi **giá crypto** (Binance realtime), **vàng** và **bạc** (quy đổi + niêm yết VN), gọn trên một cửa sổ.

---

## Overview

Ứng dụng **React + Vite**, có thể chạy trong trình duyệt hoặc đóng gói **Electron** (cửa sổ nhỏ, always-on-top). Dữ liệu crypto qua **WebSocket** Binance; vàng/bạc qua **REST** và polling định kỳ. Trạng thái quan trọng (watchlist, portfolio, simulator, cảnh báo giá, credentials Binance nếu bật đồng bộ) lưu **localStorage** — không cần backend riêng.

Thanh cuộn trong app dùng kiểu **overlay** (ẩn mặc định, hé hiện khi hover) để giao diện gọn, đặc biệt trên Electron.

Chi tiết kiến trúc, luồng dữ liệu và hạn chế: xem **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)**.

---

## Features

- **Metal Accent (identity, v1.8.x)** — mỗi tab mang màu kim loại riêng: Crypto **teal**, Vàng **gold**, Bạc **silver**; accent chỉ sống ở chrome (tab bar, nút, badge, glider) — không bao giờ vào ô số liệu giá, màu up/down bất biến. **Limelight tab bar**: thanh sáng sát mép trên + nón gradient trên tab active, trượt mượt khi chuyển tab. Icon app macOS 3 đồng xu cùng concept.
- **Crypto** — watchlist cặp USDT, Spot / Futures (mark), toolbar (chế độ market + **Compact/Full** + nút **làm mới**), header cột, status bar, sắp xếp kéo thả, phiên giao dịch UTC (Asia / EU / US, pill active mang accent).
  - **Sparkline** — biểu đồ mini SVG theo dòng (Klines REST) có **gradient fill** theo hướng giá; lên = xanh, xuống = đỏ.
  - **Funding rate** — hiện rate hiện tại + thời gian kế tiếp trên status bar khi đang xem cặp Futures.
  - **SPOT/FUT theo dòng** — mini toggle 2 option (hover hiện) ở chế độ Từng coin.
- **Price alerts (crypto)** — cảnh báo giá Above/Below, toast nổi + tuỳ chọn âm thanh + thông báo hệ thống (khi được cấp quyền); thêm nhanh từ icon chuông trên mỗi dòng watchlist; panel quản lý từ nút **Alerts** trên tab Crypto.
- **Toast hợp nhất (v1.8.3)** — alert giá và lỗi dùng chung một visual (**ToastShell**): border-left màu theo type (success xanh / error đỏ / warning gold / alert **teal**), icon, nút X; slide-in từ phải, nhiều toast chồng stack (cũ thu nhỏ/mờ phía sau), hover tạm dừng auto-dismiss.
- **Nút làm mới (v1.8.3)** — pattern chung mọi nơi (toolbar Crypto, card Vàng/Bạc, bảng nội địa, StaleBanner, Sync Portfolio): đang load thì label trong suốt (giữ nguyên bề rộng) + spinner mang accent ngữ cảnh, xong flash check xanh ~1s, không toast cho thao tác thành công.
- **Toggle 2 cấp (v1.8.3)** — VND/USD (trong card kim loại) và Compact/Full (toolbar) kiểu **glass** (blur + glider gradient accent + glow); các toggle còn lại (Chung–Từng coin, Spot/Futures, SPOT/FUT theo dòng) kiểu **phẳng** — cùng nhịp trượt với limelight.
- **Keyboard shortcuts** — `1`/`2`/`3` đổi tab; `P` mở Portfolio; `A` mở Alerts; `/` focus ô tìm cặp; `R` làm mới tab hiện tại; `?` xem trợ giúp phím tắt; `Esc` đóng panel/modal (xem modal trợ giúp để biết đầy đủ).
- **Loading & errors (UX)** — skeleton (watchlist, vàng/bạc, portfolio) khi tải dữ liệu; banner kết nối + **Thử lại** khi WebSocket lỗi/đang kết nối lại; thông báo lỗi thân thiện (tiếng Việt) + retry cho gold/silver/sync Binance/funding/sparkline; toast lỗi ngắn khi sync Binance hoặc đầy `localStorage`.
- **Stale / offline banner (vàng/bạc)** — banner cảnh báo khi trình duyệt mất mạng hoặc đang hiển thị dữ liệu cache (hiện thời gian cache, nút **Làm mới**).
- **Price movement strip (vàng/bạc)** — mini sparkline + % thay đổi + badge biến động (Low/Med/High) trên card kim loại, dựa trên lịch sử giá ngắn hạn.
- **Futures Simulator** — mở từ dòng **Futures** trong watchlist: panel nổi (snap mép phải, có thể kéo + snap cạnh), làm mờ nền, đóng bằng **ESC** hoặc click ra ngoài.  
  - **Terminology (Binance-style)**: user nhập **MARGIN (USDT)**, chọn **LEVERAGE** → app tính **NOTIONAL = margin × lev** và **SIZE (coins) = notional / entry**.
  - **State persistence** theo symbol (đóng/mở lại không mất Entry/Margin/Lev/TP/SL/Side) + nút **Reset**.
  - **Locale number parsing**: hỗ trợ nhập `808,8` hoặc `808.8`.
- **Vàng / Bạc (Valuation widgets)** — UI tối giản tập trung **so sánh VN vs TG** và **spread**; thanh spread: đoạn **VN (accent tab) bên trái**, đoạn **TG (xám trung tính) bên phải** — cùng phía với 2 card VN/TG phía trên (v1.8.4); tiêu đề + giá trị spread mang accent tab; giá Mua/Bán VN to đậm xanh/đỏ, giá TG trắng trung tính. Nhỏ (300–360px) chỉ hiển thị dữ liệu thiết yếu; rộng hơn có thêm chi tiết. Bạc VN: niêm yết **Phú Quý** (giabac.phuquygroup.vn).
- **Niêm yết trong nước (tuỳ màn hình)** — Vàng SJC/DOJI/BTMC và bạc **Phú Quý** chỉ hiện chi tiết ở width đủ lớn để tránh “bảng dài” trên widget nhỏ.
- **Định dạng** — `FormatProvider` toàn app: **Compact/Full** nằm trên toolbar Crypto, **VND/USD** nằm trong card Vàng/Bạc (setting chung — đổi ở một tab thì tab kia đổi theo). Không còn hàng strip riêng dưới tab bar (v1.8.2).
- **Interaction system (subtle)** — tooltip phiên (3 dòng, delay ~140ms), hover nhẹ trên dòng watchlist và giá, focus ring tinh tế cho input, flash giá lên/xuống rất nhẹ.
- **Version display** — số version (`v1.x.x`) hiện nhỏ, mờ cạnh nút minimize/close trên Electron; đọc từ `package.json` lúc build, không hard-code.
- **Window state (Electron, v1.8.1)** — nhớ size + vị trí cửa sổ qua các lần mở (`userData/window-state.json`); vị trí được validate với cấu hình màn hình hiện tại (màn cũ không còn → về bottom-right màn chính); default 440×640 đủ rộng cho 2 card Vàng VN/TG cạnh nhau.
- **Portfolio (Futures)** — quản lý vị thế futures theo kiểu Binance:
  - **Manual positions**: nhập tay (Add/Clear/Delete); có trường **ghi chú** (tùy chọn, tối đa 500 ký tự).
  - **Binance API sync (READ-ONLY)**: đồng bộ từ tài khoản Binance Futures qua endpoint `GET /fapi/v2/positionRisk` (không có trade/withdraw).  
    - Auto-refresh ~60s khi mở panel, có nút **Sync** + hiển thị trạng thái/last synced.
    - Hỗ trợ **Mainnet/Testnet**.
    - **Synced positions** là read-only (không có nút Delete).
  - **Backup / import** — menu **⚙** trên panel Portfolio: tải file JSON (watchlist, portfolio, alerts, simulator) và khôi phục có xác nhận.

---

## Tech stack

| Lớp | Công nghệ |
|-----|-----------|
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Build | Vite 8 |
| Desktop | Electron |
| Realtime | WebSocket (Binance spot + futures mark) |
| Lưu trữ cục bộ | `localStorage` (watchlist, portfolio, simulator, price alerts, cài đặt alerts; API keys Binance mã hoá) |
| Binance sync | REST (signed HMAC SHA256 via WebCrypto) |

---

## Design tokens (Tailwind)

- **Tailwind config**: `tailwind.config.js` (typography tokens như `text-meta`/`text-price`/`text-pnl`, semantic colors như `text-profit`/`text-loss`, radius tokens, `shadow-panel`).
- **Brand accent (v1.8.x)**: `--color-accent-crypto` #2dd4a7 · `--color-accent-gold` #f0b90b · `--color-accent-silver` #c0c7d1; accent động `--color-accent` theo `data-accent` trên shell, transition mượt nhờ `--app-accent` đăng ký qua `@property`. Quy tắc cứng: accent chỉ ở chrome, không vào ô giá; up #26a17b / down bất biến.
- **Utilities bổ sung**: `src/index.css` (`app-panel`, `app-vstack-*`, `app-tooltip`, `app-limelight`, `app-seg-glider-*`, `app-spinner`, toast keyframes, token `bx-*` + `bx-neutral`, shimmer skeleton `.skeleton-shimmer`).

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

### Build production (web bundle)

```bash
npm run build
```

Output: thư mục `dist/`.

### Đóng gói macOS (.dmg)

```bash
npm run dist:mac
```

Chạy Vite build rồi đóng gói Electron thành file `.dmg` trong thư mục `release/`. Mở file → kéo app vào Applications → **chuột phải → Open** (bỏ qua Gatekeeper lần đầu). Không cần dev server hay terminal để chạy.

### Lệnh khác

| Lệnh | Mô tả |
|------|--------|
| `npm run dist:mac` | Đóng gói macOS x64 → `release/*.dmg` |
| `npm run preview` | Xem trước bản build Vite |
| `npm run lint` | ESLint |
| `npm run electron` | Electron (cần bundle / URL load phù hợp) |

### Xử lý sự cố nhanh

- **`npm install` lỗi:** xóa `node_modules` (và lockfile nếu cần), cài lại.
- **Electron trống:** đảm bảo Vite chạy không lỗi; thử tắt hết và `npm run dev:electron` lại.

---

## Tài liệu

- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** — tổng quan, kiến trúc, luồng dữ liệu (song ngữ + Mermaid).

---

## Security note (Binance API keys)

- **Khuyến nghị**: tạo API key Binance với **READ-ONLY** (không bật Trading/Withdrawal).
- **Lưu trữ**: key/secret được lưu **local** trong `localStorage` và được **mã hoá/obfuscate** (AES-GCM qua WebCrypto, khoá dẫn xuất theo thiết bị).  
  Lưu ý: đây **không** phải cơ chế bảo mật tuyệt đối trong client-only app; chỉ giúp tránh nhìn lộ ngay trong storage.
- **Không có server**: app không gửi keys tới server ngoài. Keys chỉ dùng để gọi API Binance trực tiếp từ máy bạn.
