/// <reference types="vite/client" />

declare global {
  const __APP_VERSION__: string
  interface Window {
    electronAPI?: {
      isElectron: boolean
      minimize: () => void
      close: () => void
      setAlwaysOnTop: (on: boolean) => Promise<boolean>
      isAlwaysOnTop: () => Promise<boolean>
      /** Main-process fetch — bỏ qua CORS */
      fetchText?: (
        url: string,
      ) => Promise<{ ok: boolean; status?: number; text?: string }>
    }
  }
}

export {}
