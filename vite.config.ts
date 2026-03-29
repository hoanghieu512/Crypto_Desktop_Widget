import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    /** Trùng với Electron / wait-on (127.0.0.1) — tránh chỉ bind IPv6 (::1) */
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
