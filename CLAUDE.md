# Crypto Desktop Widget

## Mô tả
Desktop widget hiển thị real-time giá crypto (Binance WebSocket), vàng, bạc (REST polling) và tỷ giá USD/VND. Hỗ trợ watchlist Spot/Futures, sparklines, funding rate, price alerts, futures simulator, portfolio (manual + Binance API sync). Chạy trên browser hoặc đóng gói thành Electron window (frameless, always-on-top, placed bottom-right).

## Tech stack
- **Language:** TypeScript (strict, ES2023)
- **UI:** React 19 + Tailwind CSS 4
- **Build:** Vite 8 (`@vitejs/plugin-react`)
- **Desktop:** Electron 41 (CommonJS – `electron/main.cjs`, `electron/preload.cjs`)
- **Drag-and-drop:** @dnd-kit (core, sortable, utilities)
- **Lint:** ESLint 9 flat config + typescript-eslint + react-hooks + react-refresh
- **State:** localStorage (no backend, no database)
- **Tests:** Không có test suite (no Vitest/Jest/Playwright)
- **CI/CD:** Không có

## Commands
- `npm run dev` — Chạy web dev server (Vite, `http://127.0.0.1:5173`)
- `npm run dev:electron` — Chạy Electron + Vite dev server (concurrently)
- `npm run build` — Build production (`tsc -b && vite build` → `dist/`)
- `npm run lint` — Chạy ESLint
- `npm run preview` — Preview production build

## Conventions

### Naming
- **Components:** PascalCase (`WatchlistDashboard.tsx`, `FormatControls.tsx`)
- **Hooks:** `use` prefix + camelCase (`useRealtimePrice.ts`, `usePriceAlerts.ts`)
- **Utils / API:** camelCase (`formatPrice.ts`, `fetchWithRetry.ts`, `fetchGoldWithFallback.ts`)
- **Types:** lowercase camelCase trong `src/types/` (`alerts.ts`, `portfolio.ts`, `funding.ts`)
- **Constants:** `src/constants/` (`vnGoldLabels.ts`)

### Folder structure
```
src/
├── api/                    # API calls (Binance, gold, silver, USD/VND, funding)
├── components/             # React components
│   └── priceMovement/      # MiniSparkline, PriceChangeDisplay, PriceMovementStrip, VolatilityBadge
├── constants/              # vnGoldLabels.ts
├── hooks/                  # Custom React hooks
├── providers/              # FormatProvider (global number format context)
├── types/                  # alerts.ts, portfolio.ts, funding.ts
├── utils/                  # Utility/helper functions
├── App.tsx                 # Root: tab state, panel toggles, keyboard shortcuts wiring
├── main.tsx                # Entry point
└── index.css               # Global styles (Tailwind)
electron/
├── main.cjs                # Electron main process (CJS): window, IPC handlers
└── preload.cjs             # Exposes window.electronAPI (contextIsolation)
```

### Coding style
- ESM imports; dùng `import type { … }` cho type-only imports (`verbatimModuleSyntax`)
- TypeScript strict mode: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Electron code viết bằng CommonJS (`.cjs`), tách biệt khỏi Vite bundle
- Thứ tự import: React → local modules (providers, components, hooks, types)
- ESLint ignore: `dist/` và `electron/`

## Key types

### Tab
```typescript
type Tab = 'crypto' | 'gold' | 'silver'
```
Root state in `App.tsx`. Switching tab resets `cryptoConn`, `portfolioOpen`, `alertsOpen`.

### Market
```typescript
type Market = 'spot' | 'futures'
```
Per watchlist row. Determines which WebSocket stream and which Binance REST endpoints to use.

### RealtimeConnectionStatus
```typescript
type RealtimeConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'error'
```
Aggregated UI state from `useRealtimePrice`. Passed up via callback prop (`WatchlistDashboard` → `App`) and drives `ConnectionBanner`.

### PriceMapEntry
```typescript
type PriceMapEntry =
  | { market: 'spot'; snapshot: TickerSnapshot; lastUpdated: number }
  | { market: 'futures'; snapshot: FuturesMarkSnapshot; lastUpdated: number }
```
Keyed by `priceMapKey(symbol, market)` — format `"BTCUSDT:spot"` or `"BTCUSDT:futures"`.

### FuturesPosition
```typescript
interface FuturesPosition {
  id: string; symbol: string; source: 'manual' | 'binance';
  side: 'LONG' | 'SHORT'; marginMode: 'cross' | 'isolated';
  entryPrice: number; quantity: number; leverage: number;
  margin: number; initialMargin?: number;
}
```
`source: 'binance'` positions come from Binance API sync and are overwritten on next sync. `source: 'manual'` positions are user-entered and never auto-deleted.

### PriceAlert
```typescript
interface PriceAlert {
  id: string; symbol: string; targetPrice: number;
  condition: 'above' | 'below'; enabled: boolean; triggered: boolean;
  createdAt: number; triggeredAt?: number;
}
```
One-shot: once triggered, `triggered = true` and the alert becomes inactive until manually re-armed.

### EncryptedPayload
```typescript
type EncryptedPayload = { v: 1; iv: string; ct: string }
```
AES-256-GCM. `iv` = base64 of 12-byte random IV. `ct` = base64 of ciphertext. Stored in `localStorage` under `binance-api-creds-v1`.

## localStorage keys — đọc TRƯỚC khi thêm key mới

| Key | Hook/util | Content |
|-----|-----------|---------|
| `watchlist-v2` | `WatchlistDashboard` | `WatchPriceEntry[]` (symbol, market, key) |
| `futures-portfolio-v1` | `usePortfolio` | `PortfolioState { positions: FuturesPosition[] }` |
| `price-alerts-v1` | `usePriceAlerts` | `PriceAlert[]` |
| `price-alerts-settings-v1` | `usePriceAlerts` | `PriceAlertSettings { v: 1, soundEnabled: boolean }` |
| `binance-api-creds-v1` | `ApiKeySettings` / `useBinanceSync` | `EncryptedPayload` (AES-GCM encrypted key+secret) |
| `format-settings` | `FormatProvider` | `FormatSettings` (decimal precision, VND/USD display) |

All keys are parsed with `safeParseX()` guards — never assume valid JSON on read.

## Key features

### Binance WebSocket (useRealtimePrice)
Combined-stream endpoint — một socket cho tất cả symbols: `wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker` (spot) và `wss://fstream.binance.com/stream?streams=btcusdt@markPrice/ethusdt@markPrice` (futures). Reconnect với exponential backoff.

`priceMapKey(symbol, market)` → `"BTCUSDT:spot"` — dùng làm key trong `Map<string, PriceMapEntry>`. **Không** dùng symbol bare vì cùng symbol có thể có cả spot lẫn futures trong watchlist.

`/* eslint-disable react-hooks/set-state-in-effect */` ở đầu file — cố ý, vì WebSocket teardown cần reset state bên trong effect cleanup.

### CORS bypass (Electron only)
VN domestic metal prices (sjc.com.vn, pnj.com.vn) bị CORS block từ renderer. Giải pháp: renderer gọi `window.electronAPI.fetchText(url)` → IPC → `main.cjs` fetch từ main process → trả `{ ok, status, text }`. Renderer check `typeof window.electronAPI?.fetchText === 'function'` trước khi dùng — graceful fallback khi chạy web-only (browser).

IPC channel: `'electron-fetch-text'` (ipcMain.handle / ipcRenderer.invoke).

URL validation trong `main.cjs`: chỉ chấp nhận `https?://` — không allow arbitrary protocols.

### Electron IPC channels
| Channel | Direction | Purpose |
|---------|-----------|---------|
| `window-minimize` | renderer → main | ipcMain.on, minimize window |
| `window-close` | renderer → main | ipcMain.on, close window |
| `electron-set-always-on-top` | renderer → main | ipcMain.handle, trả `boolean` |
| `electron-is-always-on-top` | renderer → main | ipcMain.handle, trả `boolean` |
| `electron-fetch-text` | renderer → main | ipcMain.handle, CORS bypass fetch |

`isElectron()` helper trong `App.tsx`: `Boolean(window.electronAPI?.isElectron)` — dùng để ẩn window controls khi chạy trên browser.

### FormatProvider (global format context)
`src/providers/FormatProvider.tsx` — context cho toàn app. Cung cấp:
- `formatPrice(value, currency)` — định dạng giá theo VND/USD preference
- `formatVnd(value)` — VND compact với suffix K/M/B
- Settings: decimal precision, hiển thị VND hay USD

Wrap toàn bộ app trong `<FormatProvider>`. Dùng `useFormatPrice()` hook trong component để lấy formatter — không import `formatPrice` util trực tiếp.

### fetchWithRetry
`src/utils/fetchWithRetry.ts` — exponential backoff (base 1s, cap 30s, max 3 retries). Retry: network errors, 5xx, 429, 408. Không retry: 4xx khác. Dùng cho tất cả REST polling APIs (gold, silver, USD/VND, funding history).

### Price alerts flow
`usePriceAlerts` nhận `pricesBySymbol: Record<string, number | null>` từ `App.tsx`. App build map này từ `alertPrices` state được cập nhật bởi `WatchlistDashboard` qua callback prop. Alert check chạy mỗi khi `pricesBySymbol` thay đổi (useEffect dependency). Khi trigger: set `triggered = true`, ghi localStorage, fire `AlertToast`, dispatch `'price-alerts:change'` event.

Cross-component sync dùng custom DOM event `'price-alerts:change'` — tránh prop drilling.

### Binance API sync (useBinanceSync)
HMAC-SHA256 signature cho Binance signed endpoints (`/fapi/v2/positionRisk`, `/fapi/v2/account`). Key/secret được encrypt bằng AES-GCM trước khi lưu localStorage. Decrypt mỗi lần sync — không giữ plaintext key trong memory sau khi dùng.

`source: 'binance'` positions từ API sync: bị overwrite toàn bộ mỗi lần sync thành công. `source: 'manual'` positions: không bao giờ bị xóa bởi sync.

### Funding rate
`useFundingData` quản lý funding PnL per position:
- Current rate TTL: 3 min
- History TTL: 12 min
- Auto-refresh: mỗi 5 min
- Fetch history: phân trang backwards by `endTime` (Binance trả newest first), tối đa 6 pages × 100 records

### Export/Import
`exportImport.ts` — export JSON gồm watchlist + portfolio + alerts. Import validate schema trước khi overwrite. `ImportConfirmDialog` hỏi xác nhận. `BackupImportFlash` hiện flash banner sau import thành công.

### Keyboard shortcuts
`useKeyboardShortcuts.ts` — global `keydown` listener. Ignore khi focus trong `<input>` / `<textarea>` / `contenteditable`. Shortcuts: `1/2/3` tabs, `F` / `/` focus search (id `wl-symbol-input`), `R` refresh, `P` portfolio, `A` alerts, `Esc` close panels, `?` help modal.

`focusSearch` trong `App.tsx` dùng `requestAnimationFrame` khi tab phải switch trước khi focus — đảm bảo DOM đã render WatchlistDashboard trước khi getElementById.

### Skeleton / Error states
`Skeleton.tsx` base component (pulse animation). `CardSkeleton` / `WatchlistSkeleton` / `PortfolioSkeleton` dùng khi chưa có data. `ErrorState` full-panel fallback. `ErrorIndicator` inline badge. `AppErrorToasts` lắng nghe `'app:error-toast'` custom event từ `appToast.ts` event bus — decoupled khỏi component tree.

## KHÔNG làm những điều này

- Không bundle `discord.js` hay server-side libs vào Vite build
- Không dùng `role: "system"` kiểu OpenAI — project này không có AI
- Không thêm backend / database — state chỉ ở localStorage
- Không import `formatPrice` util trực tiếp trong components — dùng `useFormatPrice()` hook từ `FormatProvider`
- Không đọc Binance API key dưới dạng plaintext từ localStorage — luôn decrypt qua `encryption.ts`
- Không gọi VN metal price endpoints trực tiếp từ renderer — phải qua `electronAPI.fetchText` IPC (CORS)
- Không thêm `waitOn` hay `concurrently` vào dependencies — đã có trong devDependencies
- Không sửa `priceMapKey` format (`"SYMBOL:market"`) — nhiều hook phụ thuộc string này để key vào Map

## Known quirks — ĐỌC TRƯỚC KHI SỬA

- **`/* eslint-disable react-hooks/set-state-in-effect */`** ở đầu `useRealtimePrice.ts` — cố ý. WebSocket event handlers cần set state bên trong effect mà không cần re-run effect. Đừng remove disable comment.
- **`window.electronAPI?.isElectron`** — preload.cjs set `isElectron: true` trên object này. Nếu undefined (browser), `isElectron()` trả false và window controls bị ẩn. Đây là behavior mong muốn.
- **Tailwind CSS 4 + `@tailwindcss/vite`** — không dùng `tailwind.config.js` theo style Tailwind 3. Config nằm ở `tailwind.config.js` nhưng chỉ để define `safelist` cho dynamic PnL color classes (những class không xuất hiện trong JSX tĩnh nên bị purge).
- **`safeParseState` trong `usePortfolio`** — xử lý migration từ field `notional` (legacy) sang `margin`. Nếu cả hai đều missing, tính lại từ `entryPrice * quantity / leverage`. Đừng rename field này mà không cập nhật migration path.
- **Electron window position** — `placeInBottomRight` chạy trong `ready-to-show` event, dùng `screen.getPrimaryDisplay().workArea` (excludes taskbar). Window `show: false` khi tạo → chỉ show sau khi đã position.
- **`wl-symbol-input`** — id này hardcoded trong `useKeyboardShortcuts.ts` để focus search. Nếu rename input trong `WatchlistDashboard`, phải update cả hook.
- **Funding history paging** — Binance `/fapi/v1/fundingRate` trả newest first, tối đa 100/page. `fetchHistoryPaged` page backwards bằng cách giảm `endTime`. Tối đa 6 pages để tránh quá nhiều requests.
- **AES-GCM key derivation** — `stableDeviceKeyMaterial()` trong `encryption.ts` dùng `navigator.userAgent + screen dimensions` — không phải bảo mật thực sự, chỉ để obfuscate key khỏi casual inspection. Binance API key có thể bị recover nếu ai đó biết device fingerprint.
- **`arrayMove` trong usePortfolio** — import từ `@dnd-kit/sortable`, không phải tự implement. Dnd-kit handles optimistic reorder trong UI, hook persist sau drop event.

## Release checklist — sau mỗi lần chỉnh sửa có thay đổi version

Sau mỗi lần implement xong, chạy theo thứ tự:

1. `tsc --noEmit` — phải pass clean trước khi bump version
2. Bump `"version"` trong `package.json`
3. Cập nhật `## Current version:` trong `CLAUDE.md`
4. Thêm entry `## [X.Y.Z]` vào đầu `CHANGELOG.md`
5. Cập nhật `PROJECT_OVERVIEW.md` — module notes + Known Issues table + footer version/date
6. Cập nhật `README.md` — các bullet liên quan đến feature bị thay đổi
7. Cập nhật memory file `/Users/lavopavden/.claude/projects/-Users-lavopavden-Dev-projects-OnChainRep/memory/project_overview.md` — version + version history table row

Bước 5–7 chỉ cần làm khi user yêu cầu "update docs/readme/overview" sau khi code xong, hoặc khi thay đổi ảnh hưởng đến flow được mô tả trong các file đó.

## Current version: 1.7.1
