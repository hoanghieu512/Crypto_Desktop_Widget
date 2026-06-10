import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    /** Trùng với Electron / wait-on (127.0.0.1) — tránh chỉ bind IPv6 (::1) */
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
