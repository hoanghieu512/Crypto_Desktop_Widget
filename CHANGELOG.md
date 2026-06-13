# Changelog

## [1.8.7] - 2026-06-13
### Fixed — Nút "Làm mới" tab Vàng kẹt loading vô hạn
- **Triệu chứng**: bấm "Làm mới" ở tab Vàng → spinner xoay mãi không thoát (>10 phút vẫn xoay) dù dữ liệu đã về (card + bảng có giá, timestamp nhảy). Tab Bạc không bị.
- **Nguyên nhân**: trong `useGoldPrice.fetchAll` (`src/hooks/useGoldPrice.ts`), block `finally` chỉ `setLoading(false)` mà **quên `setIsRefreshing(false)`**. Refresh sau first-load chạy nhánh `setIsRefreshing(true)` nhưng không bao giờ được clear → `isRefreshing` kẹt `true` mãi. Nút Làm mới gộp tab Vàng (v1.8.5) có `loading = isRefreshing(card) || extraRefreshing(bảng)`; nguồn bảng (`useVnMetalPrices`) clear cờ đúng, còn nguồn card thì kẹt → OR luôn `true` → spinner vô hạn. Tab Bạc dùng hook khác, một nguồn, không dính.
- **Cách sửa**: thêm `setIsRefreshing(false)` vào `finally` của `useGoldPrice.fetchAll` (đối xứng với `useVnMetalPrices` vốn đã clear đúng). Vì nằm trong `finally`, cờ luôn được gỡ kể cả khi một/cả hai nguồn lỗi hoặc timeout → nút thoát loading, flash check, về idle; không còn kẹt trong mọi nhánh.

## [1.8.6] - 2026-06-13
### Fixed — Futures mark price không load (REST fallback cho fstream)
- **Triệu chứng**: chuyển coin sang Futures thì giá Mark luôn "—" dù status bar báo `Futures: OK`; Futures Simulator và PnL Portfolio cũng trắng giá. Spot (LAST) vẫn chạy bình thường.
- **Nguyên nhân**: WS futures `wss://fstream.binance.com` bắt tay được (`onopen` fire → trạng thái `open` → "OK") nhưng KHÔNG đẩy message nào trên nhiều mạng (vd. VN) — nên `open` chỉ phản ánh handshake, không phản ánh dòng dữ liệu. Kết quả: kết nối "sống" mà giá mark không bao giờ tới nơi hiển thị.
- **Cách sửa** (`useRealtimePrice.ts`, trong `futuresHub` dùng chung cho row + simulator + portfolio):
  - Thêm fallback REST poll mark price qua `fapi.binance.com/fapi/v1/premiumIndex` (host này hoạt động kể cả khi fstream im lặng). Snapshot REST map đúng shape `FuturesMarkSnapshot` (markPrice, indexPrice, fundingRate ← `lastFundingRate`, nextFundingTime, eventTime) → đẩy vào CÙNG listeners như tick WS, một nguồn giá chung.
  - Poll mỗi 3s, tự bỏ qua khi WS đang đẩy tick trong vòng 5s (`FUT_WS_SILENCE_MS`) → mạng nào WS sống vẫn ưu tiên realtime WS, mạng nào WS chết thì REST gánh. Có primer ~1.2s để có giá sớm.
  - Sửa bug `onclose` null hoá nhầm socket hiện tại (chỉ `ws = null` khi đúng `nextWs`) — tránh xoá ref của WS vừa mở khi reconnect.
  - Listener id của hub đổi sang riêng theo từng instance hook (`instanceIdRef`) thay vì chỉ theo tập symbol — tránh watchlist và portfolio đụng id (Map ghi đè) khi trùng symbol, một bên mất dữ liệu.

## [1.8.5] - 2026-06-12
### Changed — Phase 5: Panels teal cố định + gộp làm mới tab Vàng (không dependency mới)
- **Cả 3 panel (Portfolio / Simulator / Alerts) mang teal #2dd4a7 cố định**: root panel đặt `data-accent="crypto"` → mọi utility `accent` bên trong luôn teal, không theo tab. Viền teal mảnh dọc mép trái (`.app-panel-edge`, gradient 90%→15%) = dấu hiệu tool layer. Teal chỉ ở chrome — PnL/ROE/giá up-down bất biến, LONG/SHORT giữ xanh/đỏ ngữ nghĩa
- **Portfolio**: badge synced `Binance` → pill `Synced` teal mờ; nút Add / Add position → teal ghost (`bg-accent/[0.14] + border accent/50`); dot trạng thái đồng bộ connected → teal; note icon (có ghi chú) + nút Save note → teal; focus ring textarea → `accent/40`; cảnh báo stale-sync `bx-yellow` → `amber-400`
- **Simulator**: viền teal mép trái; badge `Futures` → teal pill; seg Ent/TP/SL và CROSS/ISOLATED → `SegmentedToggle` flat (cùng nhịp v1.8.3); **slider đòn bẩy mới** (range 1–125, track fill + thumb teal glow nhẹ, sync 2 chiều với input Lev — chỉ là cách nhập thứ hai, không đổi công thức); hàng MARK trên ladder → viền/nền teal mờ, `M` teal, 0% → secondary; khối PnL ring amber → ring teal nhạt; input focus ring → teal; nút chính "Lưu vào Portfolio" teal đặc chữ tối (label Việt hoá, bỏ emoji 📊), trạng thái Saved giữ xanh profit
- **Alerts**: badge đếm teal cạnh title (số alert pending đang bật); nút header → teal ghost "+ Thêm cảnh báo"; toggle bật/tắt alert 🔔/🔕 → switch teal (`role="switch"`, cùng handler); nút Reset → teal ghost "Kích hoạt lại"; Sound On/Off → `SegmentedToggle` flat
- **ApiKeySettings** (trong Portfolio): 2 nút Save → `bg-accent`; chữ READ-ONLY nhấn mạnh → teal
- **Hết #f0b90b trong panel**: mọi `bg-bx-yellow`/`text-bx-yellow` còn sót (AddPositionForm, AddAlertForm, PositionRow, PortfolioDashboard, ApiKeySettings) chuyển teal; amber chỉ còn cho warning semantic (hint nhập sai, mark fallback, stale sync)
- **Tab Vàng — một nút làm mới (mục D)**: gỡ nút "Làm mới bảng" (hàng meta vang.today giữ lại vì còn nội dung); nút "Làm mới" của card giờ refresh đồng thời card định giá (spot + FX) lẫn bảng chi tiết — `GoldDashboard` nhận `extraRefresh`/`extraRefreshing` từ `PreciousMetalsPanel`, loading = OR của 2 flag, flash check khi cả hai xong; `useVnMetalPrices` thêm `isRefreshing` (refresh sau first-load); `GoldDashboard` thêm listener `app:refresh` — phím R giờ refresh CẢ card (trước đây R chỉ refresh bảng). Hai nguồn lỗi độc lập, flag clear trong `finally` từng hook — một nguồn lỗi không kẹt nút

### Notes
- Panel chỉ mở được từ tab Crypto (logic cũ giữ nguyên) nhưng `data-accent="crypto"` chốt cứng teal phòng thay đổi sau
- Alert row chưa có pill FUT/SPOT như mockup — `PriceAlert` không lưu field market, thêm sẽ vượt phạm vi "chỉ đổi skin"
- Mockup tham chiếu: `mockup-phase5-panels-teal.svg`

## [1.8.4] - 2026-06-12
### Changed
- **Thanh spread (tab Vàng + Bạc) đảo vị trí VN/TG** (`SpreadRelBar` trong `ValuationWidget.tsx`): VN (accent tab) chuyển sang đầu TRÁI, TG (xám `bx-neutral`) sang đầu PHẢI — cùng phía với 2 card Việt Nam / Thế giới phía trên, mắt không phải đảo chiều khi đọc từ card xuống bar. Màu đi theo nhãn, không theo vị trí; tỷ lệ share, dòng "VN cao hơn/thấp hơn TG", nút Phụ phí, layout khối spread giữ nguyên

## [1.8.3] - 2026-06-12
### Added — UI Overhaul Phase 4/4: Controls & Feedback (không dependency mới)
- **`SegmentedToggle`** (`src/components/SegmentedToggle.tsx`): toggle 2 cấp, glider trượt bằng transform, cùng timing với limelight (300ms cubic-bezier(0.3,0.9,0.3,1), không bounce)
  - Cấp 1 `tier="glass"` (CHỈ 2 chỗ): VND/USD trong card Vàng/Bạc (`MetalCurrencySeg`) và Compact/Full toolbar Crypto — pill trắng mờ 6% + `backdrop-blur(6px)`, glider gradient `--app-accent` 38%→88% + glow mềm + viền sáng, chữ active tối (`bx-add-fg`); accent tự theo tab (gold/silver/teal)
  - Cấp 2 `tier="flat"`: Chung–Từng coin, Spot/Futures (toolbar) và mini SPOT|FUT per-row (`dense`) — glider phẳng `bx-border-medium`, không blur/glow (tránh chi phí backdrop-filter nhân theo N dòng). Per-row đổi từ nút đơn hover-reveal sang mini toggle 2 option, logic flip giữ nguyên (`onToggleRowMarket`)
  - Geometry: glider inset 2px khớp `p-0.5` của container (absolute không tự tính padding), width `calc((100%-4px)/n)`, bước trượt = `translateX(idx*100%)`
- **`RefreshButton`** (`src/components/RefreshButton.tsx`): pattern loading chung — idle (icon vòng xoay + label) → loading (label `opacity-0` giữ nguyên bề rộng, spinner `--app-accent` đè giữa, `disabled` nhưng không mờ nút) → done (flash check xanh + viền `bx-green` ~1s, không toast). Áp cho: nút refresh mới trên toolbar Crypto (icon-only, cùng pipeline nonce với phím R qua `localRefreshNonce`), Làm mới card Vàng/Bạc (prop `refreshing` mới của `ValuationWidget` ← `isRefreshing`), Làm mới bảng (PreciousMetalsPanel), StaleBanner, Sync Portfolio (`bx.state.syncing`; nút Connect tách riêng giữ nguyên)
- **`ToastShell`** (`src/components/ToastShell.tsx`): visual chung cho AppErrorToasts + AlertToast — surface tối, border-left 3px theo type, icon SVG đầu dòng, title + mô tả, nút X. 4 type trong hệ app: success `bx-green` / error `bx-red` / warning `bx-yellow` / info-alert `accent-crypto` teal cố định (không xanh dương, không theo accent tab)

### Changed
- **AppErrorToasts / AlertToast**: engine giữ nguyên (event bus, 5s/9s auto-dismiss, copy lỗi tiếng Việt); thêm slide-in từ phải + fade (`app-toast-in` 220ms), stack overlap `-mt-7` — cái cũ `scale` nhỏ dần + mờ dần phía sau, mới nhất luôn trước; hover dừng auto-dismiss (error: đếm phần còn lại per-toast qua Map timer; alert: pause flag)
- **Cột actions watchlist theo mode**: `perCoin` chừa 120px cho mini toggle, `global` chỉ 36px cho nút X — symbol dài (BTCUSDT) hiển thị đầy đủ ở mode Chung tại 440px (trước đây luôn chiếm 92px kể cả khi không có toggle)

### Notes
- `package.json` không thêm dependency nào — toàn bộ glass/glider/spinner/toast bằng CSS thuần trong `index.css`
- Done-flash của RefreshButton cũng xuất hiện khi data load lần đầu (loading mount → xong) — nhất quán với yêu cầu phím R kích hoạt state trên nút từ bên ngoài
- Mockup tham chiếu: `mockup-phase4-controls-feedback.svg`

## [1.8.2] - 2026-06-11
### Added — UI Overhaul Phase 3/4: Tab Vàng / Bạc + dọn header
- **Token `--color-bx-neutral` #3a424d**: phần TG của spread bar — xám trung tính, phần VN mang accent tab

### Changed
- **Header (mọi tab)**: bỏ chấm trạng thái kết nối cạnh tab Crypto (trạng thái đã có ở status bar dưới — gỡ luôn state `cryptoConn` + prop `onConnectionStatusChange` không còn ai đọc); bỏ hẳn hàng strip "TIỀN TỆ / ĐỊNH DẠNG" dưới tab bar — mọi tab thu hồi một hàng chiều cao. `FormatControls.tsx` xoá (dead code)
- **Compact/Full** dời vào hàng toolbar Crypto (cạnh Chung/Từng coin, Spot/Futures), dùng chung style segment; **VND/USD** chỉ còn bản trong card (`MetalCurrencySeg`) — setting chung qua `FormatProvider`, đổi ở Vàng thì Bạc đổi theo
- **ValuationWidget** (core 2 tab kim loại): title + giá trị spread → `text-accent` (gold/silver tự theo tab qua `data-accent`, hết `sky-300` ở Bạc); mô tả "VN cao hơn TG" → secondary (theo mockup); spread bar TG `bg-bx-neutral` / VN `bg-accent` + nhãn hai đầu cùng hệ — hết `sky-500`/`amber-400`; hierarchy card: header card 11px semibold, nhãn Mua/Bán 11px muted, giá VN 14px bold profit/loss, giá TG 13px bold trắng trung tính (theo mockup — TG là giá tham chiếu)
- **Card niêm yết chi tiết**: title trắng trung tính (`AssetCard` titleAccent gold/silver → `text-bx-primary`); badge mã sản phẩm → tông accent nhạt (`Badge` gold/silver variant → `bg-accent/[0.14] text-accent ring-accent/30`; badge code ở Bạc tương tự); hàng Mua/Bán 12px bold profit/loss đối xứng (Bán trước đây to hơn Mua)
- **StaleBanner style mới**: nền `amber-400/[0.07]` + viền mảnh `amber-400/30`, icon ⚠ (spinner khi đang tải lại), chữ một dòng truncate + title tooltip; nút Làm mới ghost amber. Hành vi giữ nguyên. Các khối warning amber đậm (`bg-amber-950/*`) ở GoldDashboard / SilverDashboard / PreciousMetalsPanel đồng bộ cùng treatment nhạt

### Notes
- Link `text-violet-400` (vang.today, Phú Quý) giữ nguyên — tím, không thuộc diện "xanh dương" của brief
- Portfolio / Simulator / Alerts panel chưa đụng (phase 4)
- Mockup tham chiếu: `mockup-phase3-gold-silver.svg`

## [1.8.1] - 2026-06-11
### Added — UI Overhaul Phase 2/4: Limelight + Tab Crypto + Window State
- **Window state** (`electron/main.cjs`): nhớ size + vị trí qua `userData/window-state.json` — debounce 400ms khi move/resize, chốt lần cuối khi close. Vị trí lưu được validate với cấu hình màn hình hiện tại (cần ≥64px giao với workArea của một display); màn cũ không còn → giữ size, reset vị trí về bottom-right màn chính. Default mới 440×640 (đủ rộng cho 2 card Vàng VN/TG cạnh nhau — `grid-cols-2` từ ≥380px)
- **Limelight tab bar** (`.app-limelight` trong `index.css` + đo đạc trong `App.tsx`): thanh sáng 3px sát mép trên cửa sổ ngay phía trên tab active + nón ánh sáng gradient (clip-path trapezoid, 14% → 0) toả xuống chữ tab; trượt mượt 300ms (transform + width) khi chuyển tab, màu theo `--app-accent`. Vị trí đo bằng `offsetLeft/offsetWidth` của button active, `ResizeObserver` đo lại khi live-dot hiện/ẩn hoặc nav wrap. Thay thế hoàn toàn glow toàn đỉnh phase 1 (`.app-accent-glow` đã gỡ); underline `border-b-2` của tab active cũng gỡ — limelight là nguồn sáng duy nhất
- **Sparkline gradient fill** (`Sparkline.tsx`): area path dưới line, gradient theo hướng giá (up 0.28 / down 0.25 → 0), flat không fill; gradient id qua `useId()` — không đụng độ giữa các row, không thêm effect/state nên không gây giật khi list dài

### Changed
- **Hết #f0b90b trên tab Crypto**: nút "Thêm" → `bg-accent`; pill Alerts → chữ accent + bell SVG (thay emoji 🔔); dot status bar OK → accent; warning dot/banner/icon (`ConnectionBanner`, `ErrorIndicator`, `ErrorState` icon) → `amber-400` (semantic warning, không phải brand gold); nút Thử lại `ErrorState` → `bg-accent`
- **Badge SPOT** → tông trung tính sáng `bg-slate-600/40 text-slate-300` (cả toggle pill hover-reveal); FUT/MARK/LAST giữ nguyên
- **Hierarchy hàng giá**: symbol 13px semibold → 14px bold, giá 15px → 16px (vẫn `font-price` weight 600 + tabular-nums), `leading-5` khoá chiều cao hàng; divider giữa hàng → `border-bx-border-subtle/60` (mảnh/nhạt hơn)
- **Session pill** ASIA/EU/US: `rounded-full`, active = `bg-accent/15 text-accent ring-accent/50`, inactive nền surface chữ muted

### Notes
- Tab Vàng/Bạc (phase 3) và Portfolio/Simulator/Alerts panel (phase 4) chưa đụng — `bg-bx-yellow`/amber trong các panel đó giữ nguyên
- Mockup tham chiếu: `mockup-phase2-limelight-crypto.svg`

## [1.8.0] - 2026-06-11
### Added — UI Overhaul Phase 1/4: Foundation "Metal Accent"
- **Token v2** (`src/index.css` `@theme`): 3 brand accent — `--color-accent-crypto` #2dd4a7, `--color-accent-gold` #f0b90b, `--color-accent-silver` #c0c7d1; `--color-accent` động theo tab đang active. Hai quy tắc cứng: (a) brand accent chỉ sống ở chrome (tab active, underline, glow, connection dot, floating button) — không vào ô số liệu giá; (b) semantic giá up #26a17b / down #f6465d bất biến, không đổi theo tab
- **Accent động theo tab**: `data-accent={tab}` trên app shell + `--app-accent` đăng ký qua `@property` (syntax `<color>`) → chuyển tab là transition màu 280ms mượt trên mọi điểm chrome, kể cả trong gradient. Lưu ý kỹ thuật: `--color-accent: var(--app-accent)` phải redeclare trên `[data-accent]` (var() trong custom property substitute tại element khai báo — chỉ khai báo ở `:root` thì override theo tab không có tác dụng)
- **Glow đỉnh cửa sổ**: `.app-accent-glow` — radial gradient từ đỉnh, `color-mix` 15% accent, cao 116px, `pointer-events: none` (không ảnh hưởng drag region Electron)

### Changed
- **#f0b90b đổi vai — chỉ còn thuộc tab Vàng**: tab active / underline / pin always-on-top / connection dot / badge đếm (Alerts, Portfolio) chuyển từ `bx-yellow` cứng sang `accent` động; bell-alert toggle trong watchlist row và session chip active (`SessionBar`) chuyển sang `accent` (= teal trong tab Crypto)
- **FloatingPortfolioButton**: nền `bg-accent/[0.92]` + glyph bar-chart SVG tối (theo mockup) thay cho nền surface + emoji 📊; badge đếm chuyển sang inverse (nền tối viền medium) tránh accent-chồng-accent
- **Connection dot** (tab Crypto, trạng thái live): `bx-green` → `accent` + glow nhẹ
- **Keyframes token-correct**: `app-input-pulse` (feedback input simulator) từ gold cứng → `color-mix` theo accent; `bx-price-flash` (flash neutral khi giá đổi) từ gold → trắng mờ 12% — brand accent không vào ô giá

### Notes
- Phạm vi CHỈ foundation/chrome — watchlist rows, cards Vàng/Bạc, Portfolio/Simulator/Alerts panel giữ nguyên (phase 2–4)
- CTA `bg-bx-yellow` (nút Thêm/Save) và warning amber giữ nguyên — không phải active state, sẽ xử lý ở phase sau
- Mockup tham chiếu: `mockup-phase1-metal-accent.svg`

## [1.7.2] - 2026-06-11
### Added
- **macOS app icon** (concept "3 đồng xu"): squircle nền gradient dark, 3 xu chồng nhau — bạc "Ag" (sau-trái), vàng "Au" (sau-phải), xu crypto xanh "₿" to nhất (trước-giữa) — tương ứng 3 tab Crypto / Vàng / Bạc
  - Source SVG: `build/icon.svg` (full detail) + `build/icon-small.svg` (simplified cho 16/32px — bỏ chữ, bỏ grid lines, outline đậm tách 3 xu)
  - `build/icon.icns` (đủ size 16→1024 + @2x) khai báo trong `build.mac.icon` — Dock / Finder / Launchpad / Cmd-Tab dùng icon này ở bản đóng gói
  - `build/icon.png` (512px) dùng cho `app.dock.setIcon()` ở dev mode (macOS only, guard try/catch)
- `.gitignore`: `build/` → `build/*` + exceptions cho 4 icon assets (gitignore không negate được file trong thư mục đã ignore nguyên cả thư mục)

### Changed
- Thêm soft shadow dưới xu crypto trong `icon.svg` so với concept gốc — tách xu trước khỏi 2 xu sau rõ hơn ở size trung bình

## [1.7.1] - 2026-06-10
### Added
- **macOS distribution packaging**: `electron-builder` added as devDependency; `build` config in `package.json` targets macOS x64 DMG (no code-signing, Gatekeeper bypass via right-click → Open on first launch); output to `release/`; new script `npm run dist:mac` runs Vite build then electron-builder in one step

### Changed
- `electron/main.cjs`: production renderer path now uses `app.getAppPath()` instead of `path.join(__dirname, '..')` for correct resolution inside `.asar` archives

## [1.7.0] - 2026-06-09
### Added
- **Version display**: App version shown as a small muted `v1.x.x` label next to the minimize/close buttons in Electron; value read from `package.json` at build time via Vite `define` (`__APP_VERSION__`), never hard-coded

## [1.6.0] - 2026-04-02
### Added
- **Skeleton loaders** (ADD 1): `Skeleton.tsx` base pulse-animation component; `CardSkeleton.tsx` (AssetCard loading state), `WatchlistSkeleton.tsx` (watchlist row stubs), `PortfolioSkeleton.tsx` (portfolio panel stubs) — all shown while first WebSocket tick hasn't arrived or data is loading
- **Error state components** (ADD 2): `ErrorState.tsx` (full-panel error with retry button), `ErrorIndicator.tsx` (inline icon badge), `AppErrorToasts.tsx` (global toast renderer driven by `appToast.ts` event bus) — replaces bare `console.error` paths with user-visible feedback
- **Connection banner** (ADD 3): `ConnectionBanner.tsx` — yellow/red banner shown when crypto WebSocket is reconnecting or in error state; pulled from `RealtimeConnectionStatus` passed up from `WatchlistDashboard` → `App`
- **Keyboard shortcuts** (ADD 4): `useKeyboardShortcuts.ts` hook + `ShortcutsHelpModal.tsx`; bindings: `1/2/3` switch tabs, `F` or `/` focus search, `R` refresh current tab, `P` toggle portfolio, `A` toggle alerts, `Esc` close panels; `?` opens help modal
- **`fetchWithRetry` utility** (ADD 5): `fetchWithRetry.ts` — exponential backoff (base 1s, cap 30s), retries network failures + 5xx + 429/408; does NOT retry 4xx; used by gold, silver, USD/VND polling APIs
- **`friendlyErrors` utility** (ADD 6): `friendlyErrors.ts` with `ViErrors` object mapping common HTTP/network error codes to user-readable Vietnamese strings; used by `showErrorToast` calls in hooks
- **`appToast` event bus** (ADD 7): `appToast.ts` — `showErrorToast(msg)` dispatches `'app:error-toast'` custom DOM event; `AppErrorToasts` listens and renders; decouples error notification from component tree

### Changed
- Enhanced `useFundingData`, `useFuturesSimulator`, `useGoldPrice`, `usePortfolio`, `usePriceAlerts`, `useRealtimePrice`, `useSilverPrice`, `useSparklineData` with `showErrorToast` calls and `ViErrors` messages on fetch failures
- `useBinanceSync` retries Binance API sync on 401/403 with key validation before toast

## [1.5.0] - 2026-04-01
### Added
- **Funding rate system** (ADD 1): `src/api/fundingRate.ts` — fetches current funding rate (`/fapi/v1/premiumIndex`) and history (`/fapi/v1/fundingRate`) from Binance Futures REST; `useFundingData.ts` hook manages per-position funding PnL with 3-min current TTL, 12-min history TTL, 5-min auto-refresh; `fundingCalculator.ts` computes cumulative funding payments per position; `FundingRateInfo` / `FundingPayment` types in `src/types/funding.ts`; displayed inline in `PositionRow` and aggregated in `PortfolioDashboard`
- **Export / Import system** (ADD 2): `exportImport.ts` — JSON backup of watchlist + portfolio + alerts; download via `Blob` + `URL.createObjectURL`; import with schema validation; `BackupImportFlash.tsx` — flash confirmation on successful import; `ImportConfirmDialog.tsx` — modal confirmation before overwriting state
- **Portfolio settings menu** (ADD 3): `PortfolioSettingsMenu.tsx` — dropdown with Export, Import, Clear actions; triggered from `PortfolioDashboard` header
- **Trading session tracking** (ADD 4): `tradingSession.ts` + `SessionBar.tsx` updated — tracks session start time and P&L delta from session open; funding PnL included in session total; `SessionBar` shows live session duration + cumulative PnL
- **`formatPnl` utility** (ADD 5): `formatPnl.ts` — formats PnL numbers with sign, 2 decimal places, color class; used in `PositionRow` and `ValuationWidget`
- **`useSparklineData` enhanced**: paginated candle fetch via Binance REST klines endpoint; supports multiple intervals; cache TTL per interval

### Changed
- `ValuationWidget` refactored: split total equity into unrealized PnL + funding PnL columns; shows per-position liquidation distance
- `WatchlistDashboard` adds funding rate column for futures rows (sourced from `useFundingData`)
- `GoldDashboard` / `SilverDashboard` unified USD display formatting via shared util

## [1.4.0] - 2026-04-01
### Added
- **Price alerts** (ADD 1): `usePriceAlerts.ts` — manages `PriceAlert[]` in `localStorage` (`price-alerts-v1`), checks alert conditions on every price tick, fires `'price-alerts:change'` custom DOM event for cross-component sync; supports `above` / `below` conditions with one-shot trigger + manual re-arm; `AddAlertForm.tsx` with symbol autocomplete from watchlist, prefill from AssetCard; `AlertsPanel.tsx` — full alert list with toggle/delete/re-arm; `AlertToast.tsx` — transient toast on trigger (8s auto-dismiss, sound optional via `soundEnabled` setting); alert settings (sound on/off) persisted under `price-alerts-settings-v1`
- **Binance API sync** (ADD 2): `src/api/binanceAccount.ts` — fetches `/fapi/v2/positionRisk` and `/fapi/v2/account` using HMAC-SHA256 signed requests; `useBinanceSync.ts` hook polls every 30s when API key configured; merges server positions into portfolio state; server positions flagged as `source: 'binance'` vs manual `source: 'manual'`
- **API key settings** (ADD 3): `ApiKeySettings.tsx` — enter Binance API key + secret; stored via `encryption.ts` (AES-GCM, device-stable key derived from `navigator.userAgent + screen dims`); key displayed masked; sync toggle and manual sync button
- **`encryption.ts`** (ADD 4): AES-256-GCM encrypt/decrypt using Web Crypto API; `EncryptedPayload { v, iv, ct }` schema; stored in `localStorage` under `binance-api-creds-v1`; key derivation is device-heuristic only (not true security — deters casual inspection of localStorage)
- **`formatNumber` utility** (ADD 5): `formatNumber.ts` — compact number formatting (K/M/B suffixes), locale-aware decimal formatting
- **`FuturesSimulatorPanel` full implementation**: liquidation price, margin ratio, risk level display; leverage slider; long/short toggle; PnL curve preview

### Changed
- `PortfolioDashboard` gains Binance sync status indicator (last synced, sync error badge)
- `PositionRow` shows source badge (`MANUAL` / `BINANCE`) and unrealized PnL from live mark price
- `usePortfolio` extended: merge logic for Binance positions, handles `initialMargin` field migration (legacy `notional` → `margin`)
- `useRealtimePrice` refactored: combined WebSocket stream (`/stream?streams=...`) replaces per-symbol sockets; handles spot `@ticker` + futures `@markPrice` in a single multiplexed connection; exponential reconnect backoff; `MarketWsStatus` per market + `RealtimeConnectionStatus` gated aggregate for UI

## [1.3.0] - 2026-03-31
### Added
- **Portfolio system** (ADD 1): `usePortfolio.ts` — manages `FuturesPosition[]` in `localStorage` (`futures-portfolio-v1`); CRUD with `arrayMove` for drag-and-drop reorder; positions subscribe to live mark prices via `useRealtimePrice`; `FuturesPosition` / `PortfolioState` types in `src/types/portfolio.ts`
- **Portfolio UI** (ADD 2): `PortfolioDashboard.tsx` — side panel with position list; `PositionRow.tsx` — per-position row with unrealized PnL; `AddPositionForm.tsx` — form for manual entry (symbol, side, leverage, entry price, quantity/margin); `PortfolioSidePanel.tsx` — slide-in wrapper; `FloatingPortfolioButton.tsx` — floating action button in bottom-right
- **Futures Simulator** (ADD 3): `FuturesSimulatorPanel.tsx` — standalone modal panel; enter hypothetical position and see PnL at given price; `futuresPriceLadder.ts` generates price levels around entry
- **`ValuationWidget`** (ADD 4): summary widget in portfolio panel showing total equity, total unrealized PnL, largest position
- **Tailwind CSS config** (ADD 5): `tailwind.config.js` added with custom color tokens, `safelist` for dynamic PnL color classes; `index.css` major update with portfolio-specific utility classes

### Changed
- `App.tsx`: tab state management, portfolio panel open/close, `PortfolioSidePanel` wired to `FloatingPortfolioButton`
- `SessionBar.tsx`: trading session clock + session PnL delta display
- `GoldDashboard` / `SilverDashboard`: unified card layout, consistent number formatting

## [1.2.0] - 2026-03-31
### Changed
- **`WatchlistDashboard` refactor** (CHANGE 1): drag-and-drop reorder via `@dnd-kit/sortable`; spot/futures market toggle per row; symbol search input (`id="wl-symbol-input"` — referenced by keyboard shortcut); add/remove symbols; sparkline column; 24h change badge; all state in `localStorage` (`watchlist-v2`)
- **`App.tsx` refactor** (CHANGE 2): tab navigation (`crypto` / `gold` / `silver`); `alwaysOnTop` toggle wired to `electron-set-always-on-top` IPC; `RealtimeConnectionStatus` propagated from child via callback prop
- **`SessionBar` redesign** (CHANGE 3): compact header bar with minimize/close buttons for Electron frameless window; always-on-top toggle button

## [1.1.0] - 2026-03-30
### Added
- **VN silver prices** (ADD 1): `src/api/fetchVnSilverPrices.ts` — scrapes VN domestic silver price tables from `sjc.com.vn` and `pnj.com.vn` via Electron `electron-fetch-text` IPC (bypasses CORS); `useVnMetalPrices.ts` hook polls every 5 min
- **`ConnectionStatusDot`** (ADD 2): animated dot indicator (green/yellow/red) for WebSocket state; shown in `WatchlistDashboard` header
- **`StaleBanner`** (ADD 3): yellow banner shown when last successful data fetch is older than threshold; used in gold/silver dashboards
- **Online status hook** (ADD 4): `useOnlineStatus.ts` wraps `navigator.onLine` + `online`/`offline` events; pauses polling when offline
- **Fetch resilience** (ADD 5): `fetchErrors.ts` — typed error classification (`NetworkError`, `HttpError`, `ParseError`); `fetchResilience.ts` — retry with jitter wrapper for REST polling APIs
- **Electron IPC CORS bypass** (ADD 6): `electron-fetch-text` IPC handler in `main.cjs` fetches arbitrary HTTPS URLs from main process and returns `{ ok, status, text }` — used for VN metal price scraping that CORS blocks in renderer

### Changed
- `useGoldPrice` + `useSilverPrice` refactored with resilience wrappers, fallback chains, and `fetchWithRetry`
- `fetchUsdVnd.ts` expanded with multiple fallback endpoints and error typing
- `electron/preload.cjs` exposes `electronAPI.fetchText(url)` for renderer → main CORS bypass
- `electron/main.cjs` adds `electron-fetch-text` IPC handle + validate URL scheme before fetch

## [1.0.0] - 2026-03-29
### Added
- Initial project structure (React 19 + Vite 8 + Tailwind CSS 4 + Electron 41 frameless window)
- **`WatchlistDashboard`**: Binance WebSocket price feed (spot + futures mark price), symbol management, sparklines, price change badges, priceMovement subfolder (`MiniSparkline`, `PriceChangeDisplay`, `PriceMovementStrip`, `VolatilityBadge`)
- **`GoldDashboard`** + **`SilverDashboard`**: REST polling for SJC/PNJ gold and domestic/world silver prices; `PreciousMetalsPanel` + `SilverPanel` tab wrappers
- **`useRealtimePrice`**: Binance combined-stream WebSocket (`wss://stream.binance.com:9443/stream` spot, `wss://fstream.binance.com/stream` futures), initial reconnect logic
- **`useGoldPrice`** + **`useSilverPrice`**: polling hooks with fallback source chain
- **`fetchGoldWithFallback`** + **`fetchSilverWorldWithFallback`**: multi-source fetch with CORS proxy fallbacks
- **`fetchUsdVnd`**: USD/VND rate fetch from public API
- **`FormatProvider`** + **`useFormatSettings`**: global number format preferences (VND vs USD display, decimal precision); persisted in `localStorage`
- **`FormatControls`**: UI panel for format preferences
- **Electron window**: frameless, `always-on-top`, placed bottom-right via `screen.getPrimaryDisplay().workArea`; IPC: `window-minimize`, `window-close`, `electron-set-always-on-top`, `electron-is-always-on-top`
- **`AssetCard`**, **`Badge`**, **`Sparkline`**, **`SessionBar`** base components
- **`cryptoPair`** + **`formatPrice`** + **`formatVndSmart`** + **`goldDisplay`** + **`goldPrice`** + **`metalSpot`** + **`priceMovementMath`** + **`vnSilverFromPrices`** utils
- **`vnGoldLabels`** constants (SJC/PNJ label strings)
