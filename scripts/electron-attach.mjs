#!/usr/bin/env node
/**
 * Chờ cổng Vite (TCP), in log rõ ràng, rồi spawn Electron.
 * Dùng khi terminal 1 đã chạy: npm run dev
 */
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const host = '127.0.0.1'
const port = Number(process.env.VITE_DEV_PORT || 5173)
const maxWaitMs = 120_000
const intervalMs = 400

function tryPortOpen() {
  return new Promise((resolve) => {
    const s = net.createConnection({ host, port }, () => {
      s.end()
      resolve(true)
    })
    s.on('error', () => resolve(false))
    s.setTimeout(2000, () => {
      try {
        s.destroy()
      } catch {
        /* ignore */
      }
      resolve(false)
    })
  })
}

function resolveElectronCli() {
  const require = createRequire(path.join(root, 'package.json'))
  return require.resolve('electron/cli.js')
}

console.log('')
console.log('[electron:attach] Chờ dev server tại http://' + host + ':' + port)
console.log('[electron:attach] → Terminal khác: npm run dev  (trong cùng thư mục project)')
console.log('')

const start = Date.now()
let ticks = 0

for (;;) {
  if (Date.now() - start > maxWaitMs) {
    console.error(
      '\n[electron:attach] Hết thời gian 120s. Chưa có gì lắng nghe cổng ' +
        port +
        '. Chạy `npm run dev` rồi chạy lại `npm run electron:attach`.',
    )
    process.exit(1)
  }

  if (await tryPortOpen()) {
    break
  }

  await new Promise((r) => setTimeout(r, intervalMs))
  ticks += 1
  if (ticks % 12 === 0) {
    const sec = Math.round((Date.now() - start) / 1000)
    process.stdout.write(`\n  (${sec}s) vẫn đợi… đã bật \`npm run dev\` chưa?\n`)
  } else {
    process.stdout.write('.')
  }
}

console.log('\n[electron:attach] Đã thấy cổng — khởi động Electron.\n')

let cli
try {
  cli = resolveElectronCli()
} catch {
  console.error('[electron:attach] Không tìm thấy gói electron. Chạy: npm install')
  process.exit(1)
}

const env = {
  ...process.env,
  ELECTRON_DEV: '1',
  VITE_DEV_SERVER_URL: `http://${host}:${port}`,
}

const child = spawn(process.execPath, [cli, '.'], {
  cwd: root,
  env,
  stdio: 'inherit',
})

child.on('error', (err) => {
  console.error('[electron:attach]', err.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) process.exit(1)
  process.exit(code ?? 0)
})
