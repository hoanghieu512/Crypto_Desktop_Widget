export type EncryptedPayload = {
  v: 1
  /** base64(12-byte iv) */
  iv: string
  /** base64(ciphertext) */
  ct: string
}

function b64encode(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function b64decode(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // Ensure we pass a plain ArrayBuffer (not SharedArrayBuffer / ArrayBufferLike) for TS/DOM typings.
  const c = new Uint8Array(bytes.byteLength)
  c.set(bytes)
  return c.buffer
}

function stableDeviceKeyMaterial(): string {
  // This is *not* true security in a client-only app; it only deters casual inspection.
  // Do not treat this as a guarantee that secrets can't be extracted from localStorage.
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as any)
  const scr = typeof screen !== 'undefined' ? screen : ({} as any)
  return [
    nav.userAgent ?? '',
    nav.language ?? '',
    nav.platform ?? '',
    String(scr.width ?? ''),
    String(scr.height ?? ''),
    'bx-portfolio-aes-v1',
  ].join('|')
}

async function deriveAesKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const material = stableDeviceKeyMaterial()
  const saltBytes = enc.encode('binance-api-credentials-salt-v1')
  const salt = saltBytes.buffer.slice(saltBytes.byteOffset, saltBytes.byteOffset + saltBytes.byteLength)
  const matBytes = enc.encode(material)
  const mat = matBytes.buffer.slice(matBytes.byteOffset, matBytes.byteOffset + matBytes.byteLength)
  const baseKey = await crypto.subtle.importKey('raw', mat, 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 120_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptString(plaintext: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey()
  const enc = new TextEncoder()
  const pt = enc.encode(plaintext)
  const ctBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(pt),
  )
  return { v: 1, iv: b64encode(iv), ct: b64encode(new Uint8Array(ctBuf)) }
}

export async function decryptString(payload: EncryptedPayload): Promise<string> {
  if (!payload || payload.v !== 1) throw new Error('Unsupported payload')
  const iv = b64decode(payload.iv)
  const ct = b64decode(payload.ct)
  const key = await deriveAesKey()
  const ptBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ct),
  )
  return new TextDecoder().decode(ptBuf)
}

