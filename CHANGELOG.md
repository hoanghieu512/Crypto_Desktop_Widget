# Changelog

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
