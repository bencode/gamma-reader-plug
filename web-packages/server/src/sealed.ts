import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const algorithm = 'aes-256-gcm'
const ivLength = 12
const tagLength = 16
// Browsers keep a cookie 400 days at most, and Hono refuses a longer one.
const maxCookieAge = 400 * 24 * 60 * 60

// A value only this server can read or forge, for keeping a credential in the user's browser.
export const seal = (key: Buffer, value: unknown) => {
  const iv = randomBytes(ivLength)
  const cipher = createCipheriv(algorithm, key, iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url')
}

// Null for anything this key did not seal, such as a cookie sealed before the key changed.
export const open = (key: Buffer, sealed: string): unknown => {
  const bytes = Buffer.from(sealed, 'base64url')
  if (bytes.length <= ivLength + tagLength) return null
  const decipher = createDecipheriv(algorithm, key, bytes.subarray(0, ivLength))
  decipher.setAuthTag(bytes.subarray(ivLength, ivLength + tagLength))
  try {
    const data = Buffer.concat([
      decipher.update(bytes.subarray(ivLength + tagLength)),
      decipher.final(),
    ])
    return JSON.parse(data.toString('utf8'))
  } catch (cause) {
    // Node reports a failed authentication this way and in no other form.
    if (cause instanceof Error && cause.message.includes('unable to authenticate')) return null
    throw cause
  }
}

// A sealed cookie holding one kind of value; read checks its shape. Each read that finds a value
// sets it again, so a cookie in use never reaches the browsers' limit.
export const sealedCookie = <T>(
  name: string,
  key: Buffer,
  secure: boolean,
  read: (value: unknown) => T | null,
) => {
  const set = (c: Context, value: T) =>
    setCookie(c, name, seal(key, value), {
      httpOnly: true,
      secure,
      sameSite: 'Lax',
      path: '/',
      maxAge: maxCookieAge,
    })
  return {
    get: (c: Context): T | null => {
      const raw = getCookie(c, name)
      const opened = raw === undefined ? null : open(key, raw)
      const value = opened === null ? null : read(opened)
      if (value !== null) set(c, value)
      return value
    },
    set,
    clear: (c: Context) => deleteCookie(c, name, { path: '/', secure }),
  }
}

export type SealedCookie<T> = ReturnType<typeof sealedCookie<T>>
